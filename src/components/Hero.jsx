import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { motion } from "framer-motion";
import { FiPlay, FiPause, FiRotateCcw } from "react-icons/fi";
import Chessboard from "./Chessboard";
import { famousGames } from "../data/famousGames";
import { trackEvent } from "../lib/analytics";

const FEATURED = famousGames[0]; // The Evergreen Game
const STEP_MS = 1100;

export default function Hero() {
  const [moveIndex, setMoveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const chessRef = useRef(new Chess());

  const totalMoves = FEATURED.moves.length;

  const { board, lastMove, isCheckmate } = useMemo(() => {
    const chess = new Chess();
    let last = null;
    for (let i = 0; i < moveIndex; i++) {
      const move = chess.move(FEATURED.moves[i]);
      last = move ? { from: move.from, to: move.to } : last;
    }
    chessRef.current = chess;
    return { board: chess.board(), lastMove: last, isCheckmate: chess.isCheckmate() };
  }, [moveIndex]);

  useEffect(() => {
    if (!playing) return;
    if (moveIndex >= totalMoves) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setMoveIndex((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, moveIndex, totalMoves]);

  const movesLeft = totalMoves - moveIndex;
  const finished = moveIndex >= totalMoves;

  function handleToggle() {
    if (finished) {
      setMoveIndex(0);
      setPlaying(true);
      trackEvent("hero_game_replay", { game: FEATURED.id });
      return;
    }
    setPlaying((p) => {
      trackEvent(p ? "hero_game_pause" : "hero_game_play", { game: FEATURED.id });
      return !p;
    });
  }

  function handleReset() {
    setMoveIndex(0);
    setPlaying(true);
    trackEvent("hero_game_replay", { game: FEATURED.id });
  }

  return (
    <section id="top" className="relative py-[64px] pb-[96px] bg-[radial-gradient(ellipse_900px_500px_at_15%_-10%,rgba(139,123,240,0.22),transparent_60%),radial-gradient(ellipse_700px_500px_at_90%_10%,rgba(182,169,255,0.12),transparent_60%)] max-[520px]:py-[40px] max-[520px]:pb-[64px]">
      <div className="container grid grid-cols-[1.05fr_0.95fr] gap-[56px] items-center max-[980px]:grid-cols-1 max-[980px]:gap-[40px]">
        <div className="flex flex-col">
          <p className="eyebrow">Play · Learn · Compete</p>
          <h1 className="mt-[24px] text-[clamp(1.9rem,7vw,3.6rem)] font-bold text-paper leading-[1.1] tracking-[-0.01em]">
            Build the Future of
            <br />
            <span className="bg-[linear-gradient(100deg,var(--color-violet-2),var(--color-violet))] bg-clip-text text-transparent">Online Chess</span>
          </h1>
          <p className="mt-[32px] font-display font-medium text-[0.95rem] sm:text-[1.15rem] text-paper">Making the Best Move on the Way to the Top</p>
          <p className="mt-[20px] max-w-[46ch] max-[980px]:max-w-none text-mist text-[0.9rem] sm:text-[1rem] leading-[1.6]">
          Challenge an adaptive Stockfish opponent or study legendary games that shaped chess history.
          </p>
          <div className="mt-[40px] flex gap-[14px] flex-wrap max-[520px]:flex-col max-[520px]:items-stretch">
            <a href="#play" className="btn btn-primary max-[520px]:justify-center" onClick={() => trackEvent("cta_play_click", { location: "hero" })}>
              <span aria-hidden="true">♟</span> Play
            </a>
            <a href="#games" className="btn btn-ghost max-[520px]:justify-center">
              Watch a legendary game
            </a>
          </div>
          <p className="mt-[24px] font-mono py-[9px] text-[0.68rem] sm:text-[0.76rem] text-mist tracking-[0.01em]">
            3 legendary games to replay · Stockfish opponent, 5 difficulty levels · Free, no signup to play
          </p>
        </div>

        <motion.div
          className="bg-ink-2 border border-ink-3 rounded-[18px] p-[18px]"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <Chessboard
            board={board}
            lastMove={lastMove}
            ariaLabel={`${FEATURED.title} — move ${moveIndex} of ${totalMoves}`}
          />
          <div className="flex items-end justify-between mt-[16px]">
            <div>
              <p className="section-label">{FEATURED.title.toUpperCase()}</p>
              <p className="font-display font-semibold text-[0.98rem] mt-[4px]">
                {FEATURED.players}, {FEATURED.year}
              </p>
            </div>
            <div className="border border-line rounded-[10px] py-[6px] px-[14px] text-center font-mono text-violet-2 leading-[1.1]" aria-hidden="true">
              <span className="block text-[1.15rem] font-bold">{finished ? (isCheckmate ? "MATE" : "DONE") : movesLeft}</span>
              {!finished && <small className="text-[0.6rem] text-mist tracking-[0.08em] uppercase">left</small>}
            </div>
          </div>

          <div className="flex items-center gap-[12px] mt-[16px]">
            <button className="w-[34px] h-[34px] rounded-full border border-line bg-transparent text-paper flex items-center justify-center cursor-pointer flex-none transition-colors duration-150 hover:border-violet-2 hover:bg-[rgba(139,123,240,0.1)]" onClick={handleToggle} aria-label={finished ? "Replay game" : playing ? "Pause autoplay" : "Resume autoplay"}>
              {finished ? <FiRotateCcw /> : playing ? <FiPause /> : <FiPlay />}
            </button>
            <div className="flex-1 h-[4px] rounded-full bg-ink-3 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={totalMoves} aria-valuenow={moveIndex}>
              <div className="h-full bg-[linear-gradient(90deg,var(--color-violet),var(--color-gold))] transition-[width] duration-300 ease-in-out" style={{ width: `${(moveIndex / totalMoves) * 100}%` }} />
            </div>
            <button className="w-[34px] h-[34px] rounded-full border border-line bg-transparent text-paper flex items-center justify-center cursor-pointer flex-none transition-colors duration-150 hover:border-violet-2 hover:bg-[rgba(139,123,240,0.1)]" onClick={handleReset} aria-label="Restart game">
              <FiRotateCcw />
            </button>
          </div>
          <p className="mt-[10px] font-mono text-[0.74rem] text-mist text-center" aria-live="polite">
            {finished ? `Game complete — ${FEATURED.result}` : playing ? "Autoplay in progress…" : "Paused"}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
