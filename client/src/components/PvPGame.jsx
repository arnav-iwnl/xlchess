import { useState, useEffect, useMemo, useRef } from "react";
import Chessboard from "./Chessboard";
import { usePvP } from "../hooks/usePvP";
import { Link, useNavigate } from "react-router-dom";
import { useStockfish } from "../hooks/useStockfish";
import Clock from "./Clock";
import { useThemes } from "../hooks/useBoardTheme";

const TIME_CONTROLS = [
  { value: "1+0", label: "1 min (Blitz)" },
  { value: "3+0", label: "3 min" },
  { value: "5+0", label: "5 min" },
  { value: "10+0", label: "10 min" },
  { value: "unlimited", label: "Unlimited" }
];

export default function PvPGame({ challengeId = null }) {
  const { gameState, chess, fen, joinQueue, leaveQueue, makeMove, resign, createChallenge, acceptChallenge, offerDraw, acceptDraw, declineDraw, offerRematch, declineRematch } = usePvP();
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [copied, setCopied] = useState(false);
  const [selectedTimeControl, setSelectedTimeControl] = useState("5+0");
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const navigate = useNavigate();

  const { boardTheme, pieceSet } = useThemes();

  const { ready, requestEvaluation, scoreCp, scoreMate } = useStockfish();
  const evalSideRef = useRef(chess.turn());

  const board = useMemo(() => chess.board(), [fen, chess]);

  const lastMoveObj = useMemo(() => {
    const h = chess.history({ verbose: true });
    const last = h[h.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  }, [fen, chess]);

  const checkSquare = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    for (const row of chess.board()) {
      for (const p of row) {
        if (p && p.type === "k" && p.color === turn) return p.square;
      }
    }
    return null;
  }, [fen, chess]);

  useEffect(() => {
    if (challengeId && gameState.status === "idle" && gameState.isConnected) {
      acceptChallenge(challengeId);
    }
  }, [challengeId, gameState.status, gameState.isConnected, acceptChallenge]);

  useEffect(() => {
    if (gameState.status === "challenge_waiting" && !challengeId) {
      navigate(`/challenge/${gameState.challengeId}`);
    }
  }, [gameState.status, gameState.challengeId, challengeId, navigate]);

  useEffect(() => {
    if (gameState.status === "matched" || gameState.status === "playing") {
      if (gameState.gameId && challengeId !== gameState.gameId) {
        navigate(`/challenge/${gameState.gameId}`, { replace: true });
      }
    }
  }, [gameState.status, gameState.gameId, challengeId, navigate]);

  useEffect(() => {
    if (gameState.playAgainOffer === 'declined' && redirectCountdown === null) {
      setRedirectCountdown(3);
    }
  }, [gameState.playAgainOffer, redirectCountdown]);

  useEffect(() => {
    if (redirectCountdown === null) return;
    
    if (redirectCountdown <= 0) {
      navigate('/home');
      return;
    }
    
    const t = setTimeout(() => {
      setRedirectCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [redirectCountdown, navigate]);

  const handleDeclineRematch = () => {
    declineRematch();
    setRedirectCountdown(3);
  };

  useEffect(() => {
    if (!ready || !fen) return;
    evalSideRef.current = chess.turn();
    requestEvaluation(fen);
  }, [fen, ready, requestEvaluation, chess]);

  const handleSquareClick = (square) => {
    if (gameState.status !== "playing") return;
    if (chess.turn() !== gameState.color.charAt(0)) return;

    if (selectedSquare) {
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      const isLegal = legalMoves.find((m) => m.to === square);
      if (isLegal) {
        // Move
        const moveObj = { from: selectedSquare, to: square };
        if (isLegal.promotion) moveObj.promotion = "q"; // Auto-queen for simplicity
        
        makeMove(moveObj);
        setSelectedSquare(null);
        setLegalMoves([]);
      } else {
        // Select new piece
        const piece = chess.get(square);
        if (piece && piece.color === gameState.color.charAt(0)) {
          setSelectedSquare(square);
          setLegalMoves(chess.moves({ square, verbose: true }));
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    } else {
      const piece = chess.get(square);
      if (piece && piece.color === gameState.color.charAt(0)) {
        setSelectedSquare(square);
        setLegalMoves(chess.moves({ square, verbose: true }));
      }
    }
  };

  const handleCopyChallenge = () => {
    const link = `${window.location.origin}/challenge/${gameState.challengeId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Rendering logic based on state
  if (gameState.status === "idle") {
    return (
      <div className="flex flex-col items-center pt-12 pb-24 bg-gradient-to-b from-ink-2 to-ink rounded-3xl border border-line px-10 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet to-transparent opacity-50" />
        <div className="w-[80px] h-[80px] mb-6 rounded-full bg-violet/10 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(105,82,234,0.3)]">
          ⚔️
        </div>
        <h2 className="text-4xl font-display font-bold text-paper mb-4 tracking-tight">Live PvP</h2>
        <p className="text-mist mb-8 max-w-md leading-relaxed text-[1.05rem]">Test your skills against players worldwide. Our matchmaking system will pair you with a worthy opponent.</p>
        
        <div className="mb-8 w-full max-w-[400px]">
          <div className="text-left mb-2 text-mist text-sm font-semibold tracking-wide">TIME CONTROL</div>
          <select 
            value={selectedTimeControl} 
            onChange={(e) => setSelectedTimeControl(e.target.value)}
            className="w-full bg-ink-3 border border-line rounded-xl px-4 py-3 text-paper font-medium focus:outline-none focus:border-violet transition-colors"
          >
            {TIME_CONTROLS.map(tc => (
              <option key={tc.value} value={tc.value}>{tc.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[400px]">
          <button onClick={() => joinQueue(selectedTimeControl)} className="flex-1 btn btn-primary !py-[14px] !text-[1rem] shadow-[0_4px_14px_rgba(105,82,234,0.4)] hover:shadow-[0_6px_20px_rgba(105,82,234,0.6)] transition-all transform hover:-translate-y-[2px]">Find Match</button>
          <button onClick={() => createChallenge(selectedTimeControl)} className="flex-1 btn btn-ghost border border-ink-3 !py-[14px] !text-[1rem] text-paper hover:bg-ink-3 hover:border-violet/30 transition-all">Play a Friend</button>
        </div>
      </div>
    );
  }

  if (gameState.status === "queue") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-ink-2 rounded-3xl border border-violet/30 p-10 text-center shadow-[0_0_50px_rgba(105,82,234,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(105,82,234,0.1)_0%,transparent_70%)]" />
        <div className="relative">
          <div className="w-[80px] h-[80px] mb-8 mx-auto rounded-full border-[3px] border-violet/20 border-t-violet animate-spin" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+16px)] text-2xl">♟</div>
        </div>
        <h2 className="text-3xl font-display font-bold text-paper mb-3 relative">Searching the globe...</h2>
        <p className="text-violet-2 mb-10 relative font-medium">Expanding rating bracket</p>
        <button onClick={leaveQueue} className="btn btn-ghost border border-line px-8 relative hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">Cancel Search</button>
      </div>
    );
  }

  if (gameState.status === "challenge_waiting") {
    const link = `${window.location.origin}/challenge/${gameState.challengeId}`;
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-ink-2 rounded-3xl border border-line p-10 text-center shadow-xl">
        <div className="w-[70px] h-[70px] mb-6 rounded-full bg-blue-500/10 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-blue-500/20">
          🔗
        </div>
        <h2 className="text-3xl font-display font-bold text-paper mb-4">Challenge Ready</h2>
        <p className="text-mist mb-8 max-w-sm leading-relaxed text-[1.05rem]">Send this link to a friend. The match will begin immediately when they join.</p>
        
        <div className="flex items-center gap-2 mb-10 bg-ink-3 p-3 rounded-xl border border-ink-3 shadow-inner w-full max-w-md hover:border-violet/30 transition-colors">
          <input type="text" readOnly value={link} className="bg-transparent text-paper text-[0.95rem] flex-1 outline-none px-3 font-mono" />
          <button onClick={handleCopyChallenge} className={`btn px-6 py-2 text-[0.9rem] font-semibold rounded-lg transition-all ${copied ? 'bg-green-500 text-ink shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'btn-primary shadow-[0_4px_14px_rgba(105,82,234,0.3)] hover:shadow-[0_6px_20px_rgba(105,82,234,0.5)]'}`}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    );
  }

  if (gameState.status === "matched") {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gradient-to-br from-ink-2 via-ink to-ink-2 rounded-3xl border border-violet/40 shadow-[0_0_60px_rgba(105,82,234,0.2)] overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet via-gold to-violet animate-pulse" />
        <div className="text-center animate-bounce-slight">
          <div className="text-6xl mb-6">⚔️</div>
          <h2 className="text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-violet to-violet-2 mb-4 drop-shadow-lg">Match Found!</h2>
          <p className="text-paper text-xl font-medium tracking-wide">You are playing as <span className={`font-bold uppercase ${gameState.color === 'white' ? 'text-gray-200' : 'text-gray-500'}`}>{gameState.color}</span></p>
        </div>
      </div>
    );
  }

  const isWhite = gameState.color === "white";

  const evalPawns = scoreMate !== null
    ? (scoreMate > 0 ? 99 : -99) * (evalSideRef.current === "w" ? 1 : -1)
    : scoreCp !== null
      ? (scoreCp / 100) * (evalSideRef.current === "w" ? 1 : -1)
      : 0;
  const evalClamped = Math.max(-6, Math.min(6, evalPawns));
  const evalPct = 50 + (evalClamped / 6) * 50;

  const isWhiteWinning = evalPawns >= 0;
  const whiteAtBottom = gameState.color === "white";
  const textAtWinningSide = isWhiteWinning === whiteAtBottom;

  const displayEval = scoreMate !== null 
    ? `M${Math.abs(scoreMate)}` 
    : Math.abs(evalPawns).toFixed(1);

  const tooltipEval = scoreMate !== null
    ? `Mate in ${Math.abs(scoreMate)}`
    : (evalPawns > 0 ? "+" : "") + evalPawns.toFixed(2);

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-6 items-center md:items-start justify-center p-4">
      <div className="w-full max-w-[600px] flex gap-4">
        
        {/* Desktop Vertical Eval Bar */}
        <div 
          className={`hidden min-[980px]:flex flex-col w-[30px] shrink-0 bg-[#1c2245] items-center border border-ink-3 relative group cursor-pointer ${whiteAtBottom ? 'justify-end' : 'justify-start'}`} 
          aria-hidden="true"
        >
          <div className="w-full bg-[#eef1d8] transition-[height] duration-600 ease" style={{ height: `${evalPct}%` }} />
          <div className={`absolute left-0 right-0 flex justify-center pointer-events-none ${textAtWinningSide ? 'bottom-[6px]' : 'top-[6px]'}`}>
            <span className={`text-[12px] font-bold ${isWhiteWinning ? 'text-[#1c2245]' : 'text-[#eef1d8]'}`}>
              {displayEval}
            </span>
          </div>
          <div className={`absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 ${isWhiteWinning ? 'bg-[#eef1d8] text-[#1c2245]' : 'bg-[#1c2245] text-[#eef1d8]'} border border-ink-3 font-mono text-[12px] py-[6px] px-[10px] rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50 shadow-xl`}>
            {tooltipEval}
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col items-center min-w-0">
          <div className="w-full flex justify-between items-center mb-2 px-1">
            <span className="font-mono text-sm text-mist">{gameState.opponent}</span>
            {gameState.timeControl !== "unlimited" && (
              <Clock 
                timeMs={isWhite ? gameState.blackTimeLeft : gameState.whiteTimeLeft} 
                isRunning={gameState.status === "playing" && chess.turn() !== gameState.color.charAt(0) && chess.history().length > 0} 
              />
            )}
          </div>

          <div className="w-full relative">
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
            </div>

            <Chessboard 
              board={board} 
              orientation={gameState.color}
              interactive={gameState.status === "playing" && chess.turn() === gameState.color.charAt(0)}
              onSquareClick={handleSquareClick}
              selected={selectedSquare}
              legalTargets={legalMoves.map(m => m.to)}
              lastMove={lastMoveObj}
              checkSquare={checkSquare}
              boardTheme={boardTheme}
              pieceTheme={pieceSet}
            />
          </div>

          <div className="w-full flex justify-between items-center mt-2 px-1">
            <span className="font-mono text-sm text-paper">You</span>
            {gameState.timeControl !== "unlimited" && (
              <Clock 
                timeMs={isWhite ? gameState.whiteTimeLeft : gameState.blackTimeLeft} 
                isRunning={gameState.status === "playing" && chess.turn() === gameState.color.charAt(0) && chess.history().length > 0} 
              />
            )}
          </div>

          <div className="mt-[18px] font-mono text-[0.82rem] text-mist text-center min-h-[1.2em]">
            {gameState.status === "playing" && (
              chess.turn() === gameState.color.charAt(0) 
                ? <span className="text-blue-400">Your move ({gameState.color.charAt(0).toUpperCase() + gameState.color.slice(1)}).</span>
                : "Waiting for opponent..."
            )}
          </div>
        </div>
      </div>

      <div className="w-full md:w-[280px] flex flex-col gap-[20px] max-[980px]:col-span-full">
        {gameState.status === "playing" ? (
          <div className="bg-ink-2 border border-ink-3 rounded-[14px] p-[16px] flex flex-col gap-4 shadow-xl">
            <h3 className="section-label">Match Actions</h3>
            
            {gameState.drawOffer === 'received' ? (
              <div className="flex flex-col mb-2 bg-ink-2 border border-yellow-500/30 p-4 rounded-[12px] shadow-lg">
                <p className="text-yellow-400 text-[0.9rem] font-semibold mb-3 tracking-wide">Opponent offered a draw</p>
                <div className="grid grid-cols-2 gap-[10px]">
                  <button onClick={acceptDraw} className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] border border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50 transition-colors">
                    Accept
                  </button>
                  <button onClick={declineDraw} className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-[10px]">
                <button onClick={resign} className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors">
                  Resign
                </button>
                <button 
                  onClick={offerDraw} 
                  disabled={gameState.drawOffer === 'sent'}
                  className="btn btn-ghost justify-center !py-[11px] !px-[10px] !text-[0.86rem] border border-ink-3 text-mist hover:text-paper hover:border-line disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {gameState.drawOffer === 'sent' ? 'Draw Sent' : 'Offer Draw'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-auto text-center bg-gradient-to-b from-ink-3 to-ink-2 p-6 rounded-[16px] border border-line shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet/50 to-transparent" />
            <h3 className="text-2xl p-4 font-display font-bold text-paper mb-1">Game Over</h3>
            <p className={`mb-8 uppercase  tracking-widest text-sm font-bold ${gameState.result === "draw" ? "text-yellow-400" : gameState.result === `${gameState.color}_win` ? "text-green-400" : "text-red-400"}`}>
              {gameState.result === "draw" ? "Draw" : 
               gameState.result === `${gameState.color}_win` ? "Victory" : "Defeat"}
            </p>
            
            {redirectCountdown !== null ? (
              <button 
                disabled
                className="btn w-full mt-2 !py-[14px] !text-[1rem] font-medium transition-all bg-red-500/10 text-red-200 border border-red-500/30 cursor-not-allowed"
              >
                Rematch Declined. <span className="font-bold text-red-400">Going Home...</span> ({redirectCountdown})
              </button>
            ) : gameState.playAgainOffer === 'received' ? (
              <div className="flex flex-col mt-2">
                <p className="text-violet-2 pb-4 text-sm font-semibold mb-3 tracking-wide">Rematch requested</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => acceptChallenge(gameState.rematchChallengeId)} className="btn btn-primary justify-center !py-[12px] !text-[0.95rem] shadow-lg shadow-green-500/20 bg-green-500 text-white hover:bg-green-600 transition-colors">
                    Accept
                  </button>
                  <button onClick={handleDeclineRematch} className="btn btn-ghost justify-center !py-[12px] !text-[0.95rem] border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => offerRematch(selectedTimeControl)} 
                disabled={gameState.playAgainOffer === 'sent'}
                className={`btn w-full mt-2 p-5 !py-[14px] !text-[1rem] font-medium transition-all ${
                  gameState.playAgainOffer === 'sent' 
                    ? 'bg-ink-3 text-mist border border-line cursor-not-allowed opacity-70' 
                    : 'btn-primary shadow-lg shadow-violet/20 hover:shadow-violet/40 hover:-translate-y-[1px]'
                }`}
              >
                {gameState.playAgainOffer === 'sent' ? 'Request Sent...' : 'Play Again'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
