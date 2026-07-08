import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { FiRotateCcw, FiRepeat, FiZap } from "react-icons/fi";
import Chessboard from "./Chessboard";
import { useStockfish, DIFFICULTIES } from "../hooks/useStockfish";
import { trackEvent } from "../lib/analytics";

export default function PlayStockfish() {
  const { ready, error, requestBestMove, scoreCp, scoreMate } = useStockfish();
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [selected, setSelected] = useState(null);
  const [difficultyIdx, setDifficultyIdx] = useState(2);
  const [orientation, setOrientation] = useState("white");
  const [hint, setHint] = useState(null);
  const [engineTurn, setEngineTurn] = useState(false);
  const evalSideRef = useRef("b"); // side to move when the last eval was captured

  const difficulty = DIFFICULTIES[difficultyIdx];

  const chess = gameRef.current;
  const board = useMemo(() => chess.board(), [fen]); // eslint-disable-line react-hooks/exhaustive-deps
  const history = useMemo(() => chess.history(), [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  const gameOver = chess.isGameOver();
  const status = describeStatus(chess, gameOver);

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [selected, chess, fen]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastMoveObj = useMemo(() => {
    const h = chess.history({ verbose: true });
    const last = h[h.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  }, [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkSquare = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    for (const row of chess.board()) {
      for (const p of row) {
        if (p && p.type === "k" && p.color === turn) return p.square;
      }
    }
    return null;
  }, [fen]); // eslint-disable-line react-hooks/exhaustive-deps

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
        chess.move({ from, to, promotion });
        setFen(chess.fen());
      } catch {
        // Defensive: ignore an illegal engine move rather than crash the UI.
      }
    }
    setEngineTurn(false);
  }, [chess, difficulty, requestBestMove]);

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
    return true;
  }

  function handleSquareClick(sq) {
    if (engineTurn || gameOver || !ready) return;
    const piece = chess.get(sq);

    if (selected) {
      if (legalTargets.includes(sq)) {
        applyPlayerMove(selected, sq);
        return;
      }
      if (piece && piece.color === chess.turn()) {
        setSelected(sq);
        return;
      }
      setSelected(null);
      return;
    }

    if (piece && piece.color === chess.turn()) {
      setSelected(sq);
    }
  }

  // Trigger the engine whenever it becomes Black's turn (engine plays Black).
  useEffect(() => {
    if (gameOver) return;
    if (chess.turn() === "b") {
      const t = setTimeout(requestEngineMove, 350);
      return () => clearTimeout(t);
    }
  }, [fen, gameOver, chess, requestEngineMove]);

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

  function handleReset() {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setSelected(null);
    setHint(null);
    trackEvent("play_reset");
  }

  async function handleHint() {
    if (engineTurn || gameOver || chess.turn() !== "w") return;
    trackEvent("play_hint");
    evalSideRef.current = "w";
    const uci = await requestBestMove(chess.fen(), { skill: 18, movetime: 500 });
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

  return (
    <section id="play" className="py-[96px] border-t border-line bg-[linear-gradient(180deg,transparent,rgba(139,123,240,0.05))]">
      <div className="container">
        <p className="section-label">TEST YOURSELF</p>
        <h2 className="mt-[10px] text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold">Play against Stockfish</h2>

        <div className="mt-[44px] grid grid-cols-[14px_minmax(0,560px)_320px] max-[980px]:grid-cols-[14px_1fr] max-[560px]:grid-cols-1 gap-[20px] items-start justify-center">
          <div className="h-[min(560px,100%)] rounded-[7px] bg-[#1c2245] overflow-hidden flex items-end self-stretch border border-ink-3 max-[560px]:hidden" aria-hidden="true">
            <div className="w-full bg-[#eef1d8] transition-[height] duration-600 ease" style={{ height: `${evalPct}%` }} />
          </div>

          <div className="min-w-0">
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
            <p className="mt-[12px] font-mono text-[0.82rem] text-mist text-center min-h-[1.2em]" aria-live="polite">
              {!ready && !error && "Loading engine…"}
              {Boolean(error) && error}
              {ready && (engineTurn ? "Stockfish is thinking…" : status)}
            </p>
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
              <button className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] disabled:opacity-40 disabled:cursor-not-allowed" onClick={handleHint} disabled={engineTurn || gameOver}>
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
            </div>

            <div className="bg-ink-2 border border-ink-3 rounded-[14px] p-[16px] flex-1 min-h-[160px] max-h-[320px] overflow-y-auto">
              <p className="section-label">Moves</p>
              {history.length === 0 ? (
                <p className="mt-[10px] text-[0.85rem] text-mist leading-[1.5]">No moves yet. You're playing White — make a move on the board.</p>
              ) : (
                <ol className="mt-[10px] mb-0 mx-0 p-0 list-none font-mono text-[0.85rem]">
                  {chunk(history).map(([n, w, b]) => (
                    <li key={n} className="grid grid-cols-[26px_1fr_1fr] gap-[6px] py-[3px] px-0">
                      <span className="text-mist">{n}.</span>
                      <span>{w}</span>
                      <span>{b || ""}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function chunk(moves) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([i / 2 + 1, moves[i], moves[i + 1]]);
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
