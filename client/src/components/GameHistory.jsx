import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Chess } from "chess.js";
import { FiClock, FiPlay, FiPause, FiRotateCcw, FiChevronLeft } from "react-icons/fi";
import Chessboard from "./Chessboard";
import { getGames } from "../lib/api";
import { useThemes } from "../hooks/useBoardTheme";

const STEP_MS = 900;

export default function GameHistory({ compact = false, onGameSelect }) {
  const { user } = useUser();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch games on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchGames() {
      try {
        setLoading(true);
        setError(null);
        const data = await getGames();
        if (!cancelled) setGames(data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || "Failed to load games");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGames();

    // Listen for manual game saves from PlayStockfish to refresh the list instantly
    window.addEventListener("gameSaved", fetchGames);
    return () => { 
      cancelled = true; 
      window.removeEventListener("gameSaved", fetchGames);
    };
  }, []);

  return (
    <div className={`flex flex-col h-full ${compact ? 'p-[16px]' : 'py-[96px]'}`}>
      {!compact && (
        <div className="container mb-[44px]">
          <p className="section-label">YOUR GAMES</p>
          <h2 className="mt-[10px] text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold">
            Game History
          </h2>
          <p className="mt-[8px] text-mist text-[0.92rem]">
            Welcome back, <span className="text-violet-2 font-medium">{user?.username}</span>.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-[40px]">
          <div className="w-[20px] h-[20px] border-[2px] border-line border-t-violet rounded-full animate-spin" />
          <span className="ml-[10px] text-mist text-[0.85rem]">Loading…</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-[10px] p-[16px] text-center mb-[20px]">
          <p className="text-red-400 text-[0.85rem]">{error}</p>
        </div>
      )}

      {!loading && !error && games.length === 0 && (
        <div className="bg-ink border border-ink-3 rounded-[12px] p-[24px] text-center">
          <p className="text-[2rem] mb-[8px]">♟</p>
          <p className="text-paper font-display font-semibold text-[0.95rem]">No games yet</p>
          <p className="mt-[6px] text-mist text-[0.82rem] leading-[1.5]">
            Play against Stockfish and it will appear here.
          </p>
        </div>
      )}

      {!loading && !error && games.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              compact={compact}
              onClick={() => onGameSelect?.(game)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game, onClick, compact }) {
  const date = new Date(game.createdAt);
  
  const isPlaying = game.result === "playing";
  
  let resultLabel = game.result;
  let resultColor = "text-mist";
  
  if (game.result === "playing") {
    resultLabel = "In Progress";
    resultColor = "text-blue-400 animate-pulse";
  } else if (game.result === "draw") {
    resultLabel = "Draw";
    resultColor = "text-yellow-400";
  } else if (game.result === `${game.playerColor}_win`) {
    resultLabel = "Victory";
    resultColor = "text-green-400";
  } else if (game.result === "white_win" || game.result === "black_win") {
    resultLabel = "Defeat";
    resultColor = "text-red-400";
  }

  const formattedDate = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const formattedTime = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  
  const opponentName = game.isPvP ? game.opponent : `Stockfish (${game.difficulty})`;

  return (
    <button
      onClick={onClick}
      className={`w-full bg-ink border ${isPlaying ? 'border-blue-500/50' : 'border-ink-3'} rounded-[12px] text-left cursor-pointer transition-all duration-200 hover:border-violet/50 hover:bg-ink-2/80 group ${
        compact ? 'p-[12px]' : 'p-[18px] flex items-center gap-[18px]'
      }`}
    >
      {!compact && (
        <div className={`w-[48px] h-[48px] rounded-[12px] bg-ink-3 flex items-center justify-center text-[1.4rem] flex-none transition-colors duration-200 ${isPlaying ? 'bg-blue-500/20 text-blue-400' : 'group-hover:bg-violet/20'}`}>
          {isPlaying ? <FiClock /> : "♟"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-[10px]">
          <span className={`font-display font-semibold ${compact ? 'text-[0.85rem]' : 'text-[0.95rem]'} text-paper truncate`}>
            {formattedTime} {formattedDate}. vs {opponentName}
          </span>
        </div>
        <div className={`mt-[4px] flex items-center gap-[10px] text-mist ${compact ? 'text-[0.72rem] flex-wrap' : 'text-[0.8rem]'}`}>
          <span className={`font-semibold ${resultColor}`}>{resultLabel}</span>
          <span>•</span>
          <span>{game.totalMoves} moves</span>
          <span>•</span>
          <span>{game.playerColor}</span>
        </div>
      </div>
      {!compact && (
        isPlaying 
          ? <span className="text-blue-400 text-[0.85rem] font-semibold group-hover:text-blue-300 transition-colors duration-200 flex-none mr-2">Rejoin</span> 
          : <FiPlay className="text-mist group-hover:text-violet-2 transition-colors duration-200 flex-none" />
      )}
    </button>
  );
}

export function GameReplay({ game, onBack, onResume }) {
  const [moveIndex, setMoveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { boardTheme, pieceSet } = useThemes();
  const totalMoves = game.moves.length;

  const { board, lastMove } = useMemo(() => {
    const chess = new Chess();
    let last = null;
    for (let i = 0; i < moveIndex; i++) {
      try {
        const move = chess.move(game.moves[i]);
        last = move ? { from: move.from, to: move.to } : last;
      } catch {
        break;
      }
    }
    return { board: chess.board(), lastMove: last };
  }, [moveIndex, game.moves]);

  // Auto-play
  useEffect(() => {
    if (!playing || moveIndex >= totalMoves) {
      if (moveIndex >= totalMoves) setPlaying(false);
      return;
    }
    const t = setTimeout(() => setMoveIndex((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, moveIndex, totalMoves]);

  const resultLabel = {
    white_win: "White wins",
    black_win: "Black wins",
    draw: "Draw",
  }[game.result] || game.result;

  const finished = moveIndex >= totalMoves;

  function handleToggle() {
    if (finished) {
      setMoveIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }

  return (
    <div className="flex flex-col items-center justify-center py-[32px] px-[24px]">
      <div className="w-full max-w-[600px]">
        <button
          onClick={onBack}
          className="flex items-center gap-[6px] text-mist text-[0.88rem] mb-[24px] bg-transparent border-none cursor-pointer p-0 transition-colors duration-150 hover:text-paper"
        >
          <FiChevronLeft /> Back to History
        </button>

        <p className="section-label">GAME REPLAY</p>
        <h2 className="mt-[10px] text-[clamp(1.4rem,3vw,2rem)] font-semibold">
          vs Stockfish ({game.difficulty})
        </h2>
        <p className="mt-[4px] text-mist text-[0.85rem]">
          {new Date(game.createdAt).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          {" · "}
          {resultLabel}
        </p>

        <div className="mt-[32px] flex flex-col items-center w-full">
          <div className="w-full">
            <Chessboard
              board={board}
              lastMove={lastMove}
              orientation={game.playerColor}
              boardTheme={boardTheme}
              pieceTheme={pieceSet}
              ariaLabel={`Game replay — move ${moveIndex} of ${totalMoves}`}
            />

            <div className="flex items-center gap-[12px] mt-[16px]">
              <button
                className="w-[34px] h-[34px] rounded-full border border-line bg-transparent text-paper flex items-center justify-center cursor-pointer flex-none transition-colors duration-150 hover:border-violet-2 hover:bg-[rgba(139,123,240,0.1)]"
                onClick={handleToggle}
                aria-label={finished ? "Replay" : playing ? "Pause" : "Play"}
              >
                {finished ? <FiRotateCcw /> : playing ? <FiPause /> : <FiPlay />}
              </button>
              <div
                className="flex-1 h-[4px] rounded-full bg-ink-3 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={totalMoves}
                aria-valuenow={moveIndex}
              >
                <div
                  className="h-full bg-[linear-gradient(90deg,var(--color-violet),var(--color-gold))] transition-[width] duration-300 ease-in-out"
                  style={{ width: `${totalMoves > 0 ? (moveIndex / totalMoves) * 100 : 0}%` }}
                />
              </div>
              <span className="font-mono text-[0.78rem] text-mist flex-none">
                {moveIndex}/{totalMoves}
              </span>
            </div>

            <div className="flex items-center gap-[8px] mt-[12px] justify-center">
              <button
                className="btn btn-ghost !py-[8px] !px-[14px] !text-[0.82rem]"
                onClick={() => { setPlaying(false); setMoveIndex(0); }}
              >
                ⏮ Start
              </button>
              <button
                className="btn btn-ghost !py-[8px] !px-[14px] !text-[0.82rem]"
                onClick={() => { setPlaying(false); setMoveIndex((i) => Math.max(0, i - 1)); }}
                disabled={moveIndex === 0}
              >
                ◀ Prev
              </button>
              <button
                className="btn btn-ghost !py-[8px] !px-[14px] !text-[0.82rem]"
                onClick={() => { setPlaying(false); setMoveIndex((i) => Math.min(totalMoves, i + 1)); }}
                disabled={finished}
              >
                Next ▶
              </button>
              <button
                className="btn btn-ghost !py-[8px] !px-[14px] !text-[0.82rem]"
                onClick={() => { setPlaying(false); setMoveIndex(totalMoves); }}
              >
                End ⏭
              </button>
            </div>
            {onResume && (
              <div className="mt-[16px] flex justify-center">
                <button
                  className="btn btn-primary !py-[10px] !px-[20px] !text-[0.85rem] !bg-violet/90 hover:!bg-violet"
                  onClick={() => onResume(game.moves.slice(0, moveIndex), game.difficulty, game.playerColor, game.id)}
                >
                  <FiPlay className="mr-[6px]"/> Resume from here
                </button>
              </div>
            )}
          </div>

          <aside className="w-full mt-[24px] bg-ink-2 border border-ink-3 rounded-[14px] p-[16px] max-h-[520px] overflow-y-auto">
            <p className="section-label">MOVES</p>
            {game.moves.length === 0 ? (
              <p className="mt-[15px] text-[0.85rem] text-mist">No moves recorded.</p>
            ) : (
              <ol className="mt-[15px] mb-0 mx-0 p-0 list-none font-mono text-[0.85rem]">
                {chunkMoves(game.moves).map(([n, w, b]) => (
                  <li key={n} className="grid grid-cols-[26px_1fr_1fr] gap-[6px] py-[3px] px-0">
                    <span className="text-mist">{n}.</span>
                    <span
                      className={`cursor-pointer rounded-[4px] px-[4px] transition-colors duration-100 ${
                        moveIndex >= (n - 1) * 2 + 1 ? "text-paper" : "text-mist"
                      } hover:bg-violet/20`}
                      onClick={() => { setPlaying(false); setMoveIndex((n - 1) * 2 + 1); }}
                    >
                      {w}
                    </span>
                    <span
                      className={`cursor-pointer rounded-[4px] px-[4px] transition-colors duration-100 ${
                        b && moveIndex >= (n - 1) * 2 + 2 ? "text-paper" : "text-mist"
                      } hover:bg-violet/20`}
                      onClick={() => { if (b) { setPlaying(false); setMoveIndex((n - 1) * 2 + 2); } }}
                    >
                      {b || ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function chunkMoves(moves) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push([i / 2 + 1, moves[i], moves[i + 1]]);
  }
  return rows;
}
