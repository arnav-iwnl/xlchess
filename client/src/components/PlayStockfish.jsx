import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useUser } from "@clerk/clerk-react";
import { FiRotateCcw, FiRepeat, FiZap, FiSave } from "react-icons/fi";
import Chessboard from "./Chessboard";
import { useStockfish, DIFFICULTIES } from "../hooks/useStockfish";
import { trackEvent } from "../lib/analytics";
import { startGameSession, cacheMove, flushGame } from "../lib/api";

export default function PlayStockfish({ 
  enableCaching = false, 
  initialMoves = [], 
  initialDifficulty = "Intermediate", 
  initialOrientation = "white",
  resumeGameId = null
}) {
  const { ready, error, requestBestMove, requestEvaluation, scoreCp, scoreMate } = useStockfish();
  const { isSignedIn } = useUser();
  
  const gameRef = useRef(null);
  if (!gameRef.current) {
    const chess = new Chess();
    for (const move of initialMoves) {
      try { chess.move(move); } catch (e) { console.warn("Invalid initial move", move); }
    }
    gameRef.current = chess;
  }
  
  const [fen, setFen] = useState(() => gameRef.current.fen());
  const [selected, setSelected] = useState(null);
  const [difficultyIdx, setDifficultyIdx] = useState(() => {
    const idx = DIFFICULTIES.findIndex(d => d.label === initialDifficulty);
    return idx !== -1 ? idx : 2;
  });
  const [orientation, setOrientation] = useState(initialOrientation);
  const [hint, setHint] = useState(null);
  const [engineTurn, setEngineTurn] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [viewIndex, setViewIndex] = useState(null);
  
  // Track the initial state locally so we can clear it if the user hits "Reset"
  const activeInitialMovesRef = useRef(initialMoves);
  const activeResumeGameIdRef = useRef(resumeGameId);

  const lastSavedMoveCount = useRef(initialMoves.length); // start tracking from initial state
  const sessionIdRef = useRef(null); // Redis game session ID
  const evalSideRef = useRef(initialMoves.length % 2 === 0 ? "w" : "b"); // side to move

  const difficulty = DIFFICULTIES[difficultyIdx];

  const chess = gameRef.current;
  const history = useMemo(() => chess.history(), [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayedChess = useMemo(() => {
    if (viewIndex === null) return chess;
    const temp = new Chess();
    for (const m of activeInitialMovesRef.current) {
      try { temp.move(m); } catch (e) {}
    }
    if (viewIndex >= 0) {
      const h = chess.history();
      for (let i = 0; i <= viewIndex; i++) {
        if (h[i]) temp.move(h[i]);
      }
    }
    return temp;
  }, [fen, viewIndex, chess]);

  const displayedFen = useMemo(() => displayedChess.fen(), [displayedChess]);
  const board = useMemo(() => displayedChess.board(), [displayedFen]); 
  
  const isRealGameOver = chess.isGameOver();
  const isDisplayedGameOver = displayedChess.isGameOver();
  const status = describeStatus(displayedChess, isDisplayedGameOver);

  const useCaching = enableCaching && isSignedIn;

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return displayedChess.moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [selected, displayedChess]); 

  const lastMoveObj = useMemo(() => {
    const h = displayedChess.history({ verbose: true });
    const last = h[h.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  }, [displayedFen]); 

  const checkSquare = useMemo(() => {
    if (!displayedChess.inCheck()) return null;
    const turn = displayedChess.turn();
    for (const row of displayedChess.board()) {
      for (const p of row) {
        if (p && p.type === "k" && p.color === turn) return p.square;
      }
    }
    return null;
  }, [displayedFen]); 

  // Start a Redis game session when caching is enabled and first move is made
  async function ensureSession() {
    if (!useCaching || sessionIdRef.current) return;
    try {
      const sid = await startGameSession({
        difficulty: difficulty.label,
        playerColor: orientation,
        initialMoves: activeInitialMovesRef.current,
        resumeGameId: activeResumeGameIdRef.current,
      });
      sessionIdRef.current = sid;
    } catch (err) {
      console.warn("Failed to start game session:", err.message);
    }
  }

  // Cache a move to Redis
  async function cacheMoveToRedis(san) {
    if (!useCaching) return;
    if (!sessionIdRef.current) {
      await ensureSession();
    }
    if (!sessionIdRef.current) return;
    try {
      await cacheMove(sessionIdRef.current, san);
    } catch (err) {
      console.warn("Failed to cache move:", err.message);
    }
  }

  const requestEngineMove = useCallback(async () => {
    if (chess.isGameOver()) return;
    setEngineTurn(true);
    evalSideRef.current = chess.turn();
    const uci = await requestBestMove(chess.fen(), difficulty);
    if (uci) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4) : undefined;
      try {
        const move = chess.move({ from, to, promotion });
        setFen(chess.fen());
        setViewIndex(null);
        // Cache the engine's move to Redis
        if (move) cacheMoveToRedis(move.san);
      } catch {
        // Defensive: ignore an illegal engine move rather than crash the UI.
      }
    }
    setEngineTurn(false);
  }, [chess, difficulty, requestBestMove, useCaching]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyPlayerMove(from, to) {
    let move;
    try {
      move = chess.move({ from, to, promotion: "q" }); // auto-queen; see README
    } catch {
      return false;
    }
    if (!move) return false;
    setFen(chess.fen());
    setSelected(null);
    setHint(null);
    trackEvent("play_move", { san: move.san });

    // Start session on first move, then cache the move
    cacheMoveToRedis(move.san);

    return true;
  }

  function handleSquareClick(sq) {
    if (engineTurn || isDisplayedGameOver || !ready) return;
    if (displayedChess.turn() !== "w") {
      setSelected(null);
      return;
    }

    const piece = displayedChess.get(sq);

    if (selected) {
      if (legalTargets.includes(sq)) {
        if (viewIndex !== null) {
          const targetLength = viewIndex + 1;
          while (chess.history().length > targetLength) {
            chess.undo();
          }
          setViewIndex(null);
        }
        applyPlayerMove(selected, sq);
        return;
      }
      if (piece && piece.color === displayedChess.turn()) {
        setSelected(sq);
        return;
      }
      setSelected(null);
      return;
    }

    if (piece && piece.color === displayedChess.turn()) {
      setSelected(sq);
    }
  }

  // Trigger the engine whenever it becomes Black's turn (engine plays Black).
  useEffect(() => {
    if (!ready) return;
    if (chess.turn() === "b" && !chess.isGameOver()) {
      const t = setTimeout(requestEngineMove, 350);
      return () => clearTimeout(t);
    } 
  }, [fen, ready, chess, requestEngineMove]);

  // Trigger evaluation whenever displayedFEN changes
  useEffect(() => {
    if (!ready) return;
    evalSideRef.current = displayedChess.turn();
    requestEvaluation(displayedFen);
  }, [displayedFen, ready, requestEvaluation, displayedChess]);

  function handleUndo() {
    // Undo both the engine's reply and the player's move so it's always
    // the player's turn again.
    if (engineTurn) return;
    const h = chess.history();
    if (h.length === 0) return;
    chess.undo();
    if (chess.turn() === "b" && chess.history().length > 0) chess.undo();
    setFen(chess.fen());
    setSelected(null);
    setHint(null);
    trackEvent("play_undo");
  }

  async function handleSave() {
    if (!useCaching || !sessionIdRef.current || history.length === 0 || lastSavedMoveCount.current === history.length) return;
    
    setSaveStatus("saving");
    try {
      const result = chess.isGameOver()
        ? chess.isCheckmate()
          ? (chess.turn() === "w" ? "black_win" : "white_win")
          : "draw"
        : "abandoned";
      // Pass endSession = false because the user is just manually saving and can keep playing
      await flushGame(sessionIdRef.current, result, false);
      setSaveStatus("saved");
      lastSavedMoveCount.current = history.length;
      window.dispatchEvent(new Event("gameSaved"));
    } catch {
      setSaveStatus("error");
    }
  }

  async function handleReset() {
    // If caching is active and there are unsaved moves, flush to NeonDB first
    if (useCaching && sessionIdRef.current && history.length > 0 && lastSavedMoveCount.current < history.length) {
      setSaveStatus("saving");
      try {
        const result = chess.isGameOver()
          ? chess.isCheckmate()
            ? (chess.turn() === "w" ? "black_win" : "white_win")
            : "draw"
          : "abandoned";
        // Reset ends the session completely
        await flushGame(sessionIdRef.current, result, true);
        setSaveStatus("saved");
        window.dispatchEvent(new Event("gameSaved"));
      } catch {
        setSaveStatus("error");
      }
    }

    // Clear active resume states so the new game is fully independent
    activeInitialMovesRef.current = [];
    activeResumeGameIdRef.current = null;

    sessionIdRef.current = null;
    lastSavedMoveCount.current = 0;
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setSelected(null);
    setHint(null);
    setViewIndex(null);
    // Clear save status after a short delay for visual feedback
    setTimeout(() => setSaveStatus(null), 2000);
    trackEvent("play_reset");
  }

  // Auto-flush game from Redis → NeonDB when it ends (only when caching is active)
  useEffect(() => {
    if (!isRealGameOver || !useCaching || lastSavedMoveCount.current === history.length) return;
    if (history.length === 0 || !sessionIdRef.current) return;

    lastSavedMoveCount.current = history.length;

    const result = chess.isCheckmate()
      ? (chess.turn() === "w" ? "black_win" : "white_win")
      : "draw";

    setSaveStatus("saving");
    // End of game means end of session
    flushGame(sessionIdRef.current, result, true)
      .then(() => {
        setSaveStatus("saved");
        sessionIdRef.current = null;
        window.dispatchEvent(new Event("gameSaved"));
      })
      .catch(() => setSaveStatus("error"));
  }, [isRealGameOver, useCaching, history, chess]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleHint() {
    if (engineTurn || isDisplayedGameOver || displayedChess.turn() !== "w") return;
    trackEvent("play_hint");
    evalSideRef.current = "w";
    const uci = await requestBestMove(displayedFen, { skill: 18, movetime: 500 });
    if (uci) {
      setHint({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
      setTimeout(() => setHint(null), 2500);
    }
  }

  const evalPawns = scoreMate !== null
    ? (scoreMate > 0 ? 99 : -99) * (evalSideRef.current === "w" ? 1 : -1)
    : scoreCp !== null
      ? (scoreCp / 100) * (evalSideRef.current === "w" ? 1 : -1)
      : 0;
  const evalClamped = Math.max(-6, Math.min(6, evalPawns));
  const evalPct = 50 + (evalClamped / 6) * 50;

  const isWhiteWinning = evalPawns >= 0;
  const whiteAtBottom = orientation === "white";
  const textAtWinningSide = isWhiteWinning === whiteAtBottom;

  const displayEval = scoreMate !== null 
    ? `M${Math.abs(scoreMate)}` 
    : Math.abs(evalPawns).toFixed(1);

  const tooltipEval = scoreMate !== null
    ? `Mate in ${Math.abs(scoreMate)}`
    : (evalPawns > 0 ? "+" : "") + evalPawns.toFixed(2);

  return (
    <div id="play" className="pt-[16px] pb-[32px] w-full">
      <div className="w-full">
        <p className="section-label">TEST YOURSELF</p>
        <h2 className="mt-[10px] text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold">Play against Stockfish</h2>

        <div className="mt-[44px] grid grid-cols-[30px_minmax(0,560px)_320px] max-[980px]:grid-cols-[minmax(0,560px)] gap-[20px] items-start justify-center">
          {/* Desktop Vertical Eval Bar */}
          <div 
            className={`hidden min-[980px]:flex flex-col h-[min(560px,100%)] bg-[#1c2245] items-center self-stretch border border-ink-3 relative group cursor-pointer ${whiteAtBottom ? 'justify-end' : 'justify-start'}`} 
            aria-hidden="true"
          >
            <div className="w-full bg-[#eef1d8] transition-[height] duration-600 ease" style={{ height: `${evalPct}%` }} />
            <div className={`absolute left-0 right-0 flex justify-center pointer-events-none ${textAtWinningSide ? 'bottom-[6px]' : 'top-[6px]'}`}>
              <span className={`text-[12px] font-bold ${isWhiteWinning ? 'text-[#1c2245]' : 'text-[#eef1d8]'}`}>
                {displayEval}
              </span>
            </div>
            
            {/* Custom Tooltip */}
            <div className={`absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 ${isWhiteWinning ? 'bg-[#eef1d8] text-[#1c2245]' : 'bg-[#1c2245] text-[#eef1d8]'} border border-ink-3 font-mono text-[12px] py-[6px] px-[10px] rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50 shadow-xl`}>
              {tooltipEval}
            </div>
          </div>

          <div className="min-w-0">
            {/* Mobile Horizontal Eval Bar */}
            <div 
              className={`min-[980px]:hidden w-full h-[22px] bg-[#1c2245] flex items-stretch border border-ink-3 relative mb-[12px] group cursor-pointer ${whiteAtBottom ? 'flex-row' : 'flex-row-reverse'}`} 
              aria-hidden="true"
            >
              <div className="bg-[#eef1d8] transition-[width] duration-600 ease" style={{ width: `${evalPct}%` }} />
              <div className={`absolute top-0 bottom-0 flex items-center pointer-events-none px-[6px] ${textAtWinningSide ? 'left-0' : 'right-0'}`}>
                <span className={`text-[12px] font-bold ${isWhiteWinning ? 'text-[#1c2245]' : 'text-[#eef1d8]'}`}>
                  {displayEval}
                </span>
              </div>
              
              {/* Custom Tooltip */}
              <div className={`absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 ${isWhiteWinning ? 'bg-[#eef1d8] text-[#1c2245]' : 'bg-[#1c2245] text-[#eef1d8]'} border border-ink-3 font-mono text-[12px] py-[6px] px-[10px] rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50 shadow-xl`}>
                {tooltipEval}
              </div>
            </div>
            
            <Chessboard
              board={board}
              interactive
              onSquareClick={handleSquareClick}
              selected={selected}
              legalTargets={legalTargets}
              lastMove={hint || lastMoveObj}
              checkSquare={checkSquare}
              orientation={orientation}
              ariaLabel="Interactive game against Stockfish"
            />
            <p className="mt-[18px] font-mono text-[0.82rem] text-mist text-center min-h-[1.2em]" aria-live="polite">
              {!ready && !error && "Loading engine…"}
              {Boolean(error) && error}
              {ready && (engineTurn ? "Stockfish is thinking…" : status)}
            </p>
            {saveStatus && (
              <p className={`mt-[6px] font-mono text-[0.75rem] text-center flex items-center justify-center gap-[6px] ${
                saveStatus === "saved" ? "text-green-400" : saveStatus === "error" ? "text-red-400" : "text-mist"
              }`}>
                <FiSave className="text-[0.7rem]" />
                {saveStatus === "saving" && "Saving game…"}
                {saveStatus === "saved" && "Game saved to your history!"}
                {saveStatus === "error" && "Failed to save game"}
              </p>
            )}
          </div>

          <aside className="flex flex-col gap-[20px] max-[980px]:col-span-full">
            <div className="bg-ink-2 border border-ink-3 rounded-[14px] p-[16px]">
              <p className="section-label">Difficulty</p>
              <p className="mt-[4px] font-display font-semibold text-[1.05rem]">
                {difficulty.label} <span className="text-mist font-normal text-[0.85rem]">({difficulty.elo})</span>
              </p>
              <div className="mt-[12px] flex border border-ink-3 rounded-[10px] overflow-hidden" role="group" aria-label="Difficulty level">
                {DIFFICULTIES.map((d, i) => (
                  <button
                    key={d.level}
                    className={`flex-1 py-[9px] px-0 border-none border-r border-ink-3 cursor-pointer font-mono text-[0.85rem] last:border-r-0 ${i === difficultyIdx ? 'bg-violet text-white' : 'bg-transparent text-mist'}`}
                    onClick={() => setDifficultyIdx(i)}
                    aria-pressed={i === difficultyIdx}
                  >
                    {d.level}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[10px]">
              <button className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] disabled:opacity-40 disabled:cursor-not-allowed" onClick={handleHint} disabled={engineTurn || isDisplayedGameOver}>
                <FiZap /> Hint
              </button>
              <button className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] disabled:opacity-40 disabled:cursor-not-allowed" onClick={handleUndo} disabled={engineTurn || history.length === 0}>
                <FiRotateCcw /> Undo
              </button>
              <button className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] disabled:opacity-40 disabled:cursor-not-allowed" onClick={handleReset}>
                Reset
              </button>
              <button
                className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
                aria-label="Flip board"
              >
                <FiRepeat /> Flip
              </button>
              {useCaching && (
                <button 
                  className="btn btn-primary col-span-2 justify-center !py-[11px] !px-[10px] !text-[0.86rem] disabled:opacity-40 disabled:cursor-not-allowed" 
                  onClick={handleSave} 
                  disabled={history.length === 0 || lastSavedMoveCount.current === history.length || engineTurn}
                >
                  <FiSave /> {lastSavedMoveCount.current === history.length && history.length > 0 ? "Saved" : "Save Game"}
                </button>
              )}
            </div>

            <div className="bg-ink-2 border border-ink-3 rounded-[14px] p-[16px] flex-1 min-h-[160px] max-h-[320px] overflow-y-auto">
              <p className="section-label">Moves</p>
              {history.length === 0 ? (
                <p className="mt-[15px] text-[0.85rem] text-mist leading-[1.5]">No moves yet. You're playing White — make a move on the board.</p>
              ) : (
                <ol className="mt-[15px] mb-0 mx-0 p-0 list-none font-mono text-[0.85rem]">
                  {chunk(history).map(([n, w, b, wIdx, bIdx]) => {
                    const isWActive = viewIndex === wIdx || (viewIndex === null && wIdx === history.length - 1);
                    const isBActive = viewIndex === bIdx || (viewIndex === null && bIdx === history.length - 1);
                    return (
                      <li key={n} className="grid grid-cols-[26px_1fr_1fr] gap-[6px] py-[3px] px-0">
                        <span className="text-mist">{n}.</span>
                        <span 
                          className={`cursor-pointer hover:bg-ink-3 rounded px-1 -ml-1 transition-colors ${isWActive ? 'bg-ink-3 text-white' : ''}`}
                          onClick={() => setViewIndex(wIdx === history.length - 1 ? null : wIdx)}
                        >{w}</span>
                        {b ? (
                          <span 
                            className={`cursor-pointer hover:bg-ink-3 rounded px-1 -ml-1 transition-colors ${isBActive ? 'bg-ink-3 text-white' : ''}`}
                            onClick={() => setViewIndex(bIdx === history.length - 1 ? null : bIdx)}
                          >{b}</span>
                        ) : <span />}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function chunk(moves) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([i / 2 + 1, moves[i], moves[i + 1], i, i + 1]);
  return rows;
}

function describeStatus(chess, gameOver) {
  if (gameOver) {
    if (chess.isCheckmate()) return `Checkmate — ${chess.turn() === "w" ? "Black" : "White"} wins.`;
    if (chess.isStalemate()) return "Stalemate — it's a draw.";
    if (chess.isDraw()) return "Draw.";
    return "Game over.";
  }
  if (chess.inCheck()) return `${chess.turn() === "w" ? "White" : "Black"} is in check.`;
  return chess.turn() === "w" ? "Your move (White)." : "Waiting for Black.";
}
