import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiRewind } from "react-icons/fi";
import Chessboard from "./Chessboard";
import { famousGames } from "../data/famousGames";
import { trackEvent } from "../lib/analytics";

const STEP_MS = 900;

export default function FamousGames() {
  const [activeId, setActiveId] = useState(famousGames[0].id);
  const [moveIndex, setMoveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const listRef = useRef(null);

  const game = useMemo(() => famousGames.find((g) => g.id === activeId), [activeId]);
  const totalMoves = game.moves.length;

  const { board, lastMove, checkSquare } = useMemo(() => {
    const chess = new Chess();
    let last = null;
    for (let i = 0; i < moveIndex; i++) {
      const move = chess.move(game.moves[i]);
      last = move ? { from: move.from, to: move.to } : last;
    }
    let checkSq = null;
    if (chess.inCheck()) {
      const turn = chess.turn();
      for (const row of chess.board()) {
        for (const p of row) {
          if (p && p.type === "k" && p.color === turn) checkSq = p.square;
        }
      }
    }
    return { board: chess.board(), lastMove: last, checkSquare: checkSq };
  }, [game, moveIndex]);

  useEffect(() => {
    if (!playing) return;
    if (moveIndex >= totalMoves) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setMoveIndex((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, moveIndex, totalMoves]);

  useEffect(() => {
    // Auto-scroll the move list to keep the current move in view.
    const el = listRef.current?.querySelector('[data-current="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [moveIndex]);

  function selectGame(id) {
    setActiveId(id);
    setMoveIndex(0);
    setPlaying(false);
    trackEvent("famous_game_select", { game: id });
  }

  return (
    <section id="games" className="py-[96px] border-t border-line">
      <div className="container">
        <p className="section-label">A LIBRARY OF THE GREATEST GAMES EVER PLAYED</p>
        <h2 className="mt-[10px] text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold max-w-[20ch]">Games that taught chess how to attack</h2>

        <div className="mt-[44px] grid grid-cols-[0.85fr_1fr_0.75fr] max-[1080px]:grid-cols-2 max-[700px]:grid-cols-1 gap-[28px] items-start">
          <ul className="list-none m-0 p-0 flex flex-col gap-[12px] max-[1080px]:col-span-full max-[1080px]:flex-row max-[1080px]:flex-wrap" role="list">
            {famousGames.map((g) => (
              <li key={g.id} className="max-[1080px]:flex-[1_1_260px]">
                <button
                  className={`w-full text-left bg-ink-2 border rounded-[14px] p-[18px] cursor-pointer text-paper transition-all duration-150 ease hover:border-violet-2 hover:-translate-y-[2px] ${g.id === activeId ? "border-violet-2 bg-[linear-gradient(160deg,rgba(139,123,240,0.14),var(--color-ink-2))]" : "border-ink-3"}`}
                  onClick={() => selectGame(g.id)}
                  aria-pressed={g.id === activeId}
                >
                  <div className="flex justify-between items-baseline gap-[10px]">
                    <span className="font-display font-semibold text-[1.02rem]">{g.title}</span>
                    <span className="font-mono text-[0.76rem] text-mist">{g.year}</span>
                  </div>
                  <p className="mt-[6px] text-[0.86rem] text-violet-2">{g.players}</p>
                  <p className="mt-[8px] text-[0.86rem] text-mist leading-[1.5]">{g.blurb}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="min-w-0">
            <Chessboard board={board} lastMove={lastMove} checkSquare={checkSquare} ariaLabel={`${game.title}, move ${moveIndex} of ${totalMoves}`} />

            <div className="mt-[14px] flex items-center gap-[10px]">
              <button className="w-[34px] h-[34px] rounded-full border border-line bg-transparent text-paper flex items-center justify-center cursor-pointer flex-none transition-colors duration-150 hover:border-violet-2 hover:bg-[rgba(139,123,240,0.1)]" aria-label="Restart" onClick={() => { setMoveIndex(0); setPlaying(false); }}>
                <FiRewind />
              </button>
              <button className="w-[34px] h-[34px] rounded-full border border-line bg-transparent text-paper flex items-center justify-center cursor-pointer flex-none transition-colors duration-150 hover:border-violet-2 hover:bg-[rgba(139,123,240,0.1)]" aria-label="Previous move" onClick={() => setMoveIndex((i) => Math.max(0, i - 1))}>
                <FiSkipBack />
              </button>
              <button
                className="w-[34px] h-[34px] rounded-full border flex items-center justify-center cursor-pointer flex-none transition-colors duration-150 bg-violet border-violet text-white hover:bg-[#7a68e8]"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => {
                  if (moveIndex >= totalMoves) setMoveIndex(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? <FiPause /> : <FiPlay />}
              </button>
              <button className="w-[34px] h-[34px] rounded-full border border-line bg-transparent text-paper flex items-center justify-center cursor-pointer flex-none transition-colors duration-150 hover:border-violet-2 hover:bg-[rgba(139,123,240,0.1)]" aria-label="Next move" onClick={() => setMoveIndex((i) => Math.min(totalMoves, i + 1))}>
                <FiSkipForward />
              </button>
              <span className="ml-auto font-mono text-[0.78rem] text-mist">{moveIndex}/{totalMoves}</span>
            </div>
          </div>

          <div className="bg-ink-2 border border-ink-3 rounded-[14px] p-[16px] max-h-[420px] max-[700px]:max-h-[240px] overflow-y-auto font-mono text-[0.86rem]" ref={listRef} aria-label="Move list">
            {chunkMoves(game.moves).map(([num, w, b], idx) => (
              <div className="grid grid-cols-[28px_1fr_1fr] gap-[6px] py-[3px]" key={num}>
                <span className="text-mist">{num}.</span>
                <span
                  className={`py-[2px] px-[6px] rounded-[6px] ${idx * 2 + 1 === moveIndex ? 'bg-violet text-white' : 'text-paper'}`}
                  data-current={idx * 2 + 1 === moveIndex}
                  aria-current={idx * 2 + 1 === moveIndex ? "step" : undefined}
                >
                  {w}
                </span>
                {b && (
                  <span
                    className={`py-[2px] px-[6px] rounded-[6px] ${idx * 2 + 2 === moveIndex ? 'bg-violet text-white' : 'text-paper'}`}
                    data-current={idx * 2 + 2 === moveIndex}
                    aria-current={idx * 2 + 2 === moveIndex ? "step" : undefined}
                  >
                    {b}
                  </span>
                )}
              </div>
            ))}
            <p className="mt-[12px] text-right text-gold font-semibold">{game.result}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function chunkMoves(moves) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push([i / 2 + 1, moves[i], moves[i + 1]]);
  }
  return rows;
}
