import { memo, useMemo } from "react";
import { BOARD_THEMES } from "../data/themes";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECE_GLYPHS = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
};

function squareId(file, rank) {
  return `${FILES[file]}${rank}`;
}

/**
 * Presentational, controlled chessboard.
 *
 * - `board`: chess.js `.board()` 8x8 array (rank 8 -> rank 1).
 * - `interactive`: when true, squares are buttons and call onSquareClick.
 * - `lastMove` / `selected` / `legalTargets` / `checkSquare`: highlight sets.
 * - `orientation`: "white" | "black" — which side sits at the bottom.
 */
function ChessboardBase({
  board,
  interactive = false,
  onSquareClick,
  selected = null,
  legalTargets = [],
  lastMove = null,
  checkSquare = null,
  orientation = "white",
  ariaLabel = "Chess board",
  boardTheme = "classic",
  pieceTheme = "standard",
}) {
  const ranks = useMemo(
    () => (orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]),
    [orientation]
  );
  const files = useMemo(
    () => (orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]),
    [orientation]
  );

  const legalSet = useMemo(() => new Set(legalTargets), [legalTargets]);

  return (
    <div className="w-full aspect-square overflow-hidden border border-ink-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.45)]">
      <div
        className="grid grid-rows-8 w-full h-full"
        role={interactive ? "grid" : "img"}
        aria-label={ariaLabel}
      >
        {ranks.map((rank) => (
          <div className="grid grid-cols-8" role={interactive ? "row" : undefined} key={rank}>
            {files.map((fileIdx) => {
              const rowFromTop = 8 - rank; // index into board[] (rank 8 at top)
              const piece = board?.[rowFromTop]?.[fileIdx];
              const sq = squareId(fileIdx, rank);
              const isDark = (fileIdx + rank) % 2 === 0;
              const isSelected = selected === sq;
              const isLegal = legalSet.has(sq);
              const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
              const isCheck = checkSquare === sq;

              const classes = [
                "relative flex items-center justify-center p-0 m-0 border-none outline-none font-inherit transition-colors duration-300",
                interactive ? "cursor-pointer focus-visible:outline-[3px] focus-visible:outline-violet-2 focus-visible:outline-offset-[-3px] focus-visible:z-10 group" : "cursor-default",
                isSelected ? "[box-shadow:inset_0_0_0_3px_var(--color-gold)]" : "",
                isLastMove ? "bg-[image:linear-gradient(rgba(224,176,57,0.35),rgba(224,176,57,0.35))]" : "",
                isCheck ? "[box-shadow:inset_0_0_0_3px_#e05a4e]" : "",
              ]
                .filter(Boolean)
                .join(" ");

              const themeObj = BOARD_THEMES.find(t => t.id === boardTheme) || BOARD_THEMES[0];
              const bgColor = isDark ? themeObj.colors.dark : themeObj.colors.light;
              const textColor = isDark ? themeObj.colors.light : themeObj.colors.dark;

              const label = piece
                ? `${sq}, ${piece.color === "w" ? "white" : "black"} ${pieceName(piece.type)}`
                : `${sq}, empty`;

              const Tag = interactive ? "button" : "div";

              const isPieceWhite = piece?.color === "w";
              let pieceStyle = {};
              switch(pieceTheme) {
                case 'minimal': pieceStyle = { color: isPieceWhite ? '#fff' : '#333', fontWeight: '300', textShadow: 'none' }; break;
                case 'crystal': pieceStyle = { color: isPieceWhite ? '#e0f7fa' : '#006064', textShadow: isPieceWhite ? '0 0 10px #00bcd4' : '0 0 10px #000' }; break;
                case 'golden': pieceStyle = { color: isPieceWhite ? '#ffd700' : '#8b6508', textShadow: '0 2px 4px #4a3600' }; break;
                case 'obsidian': pieceStyle = { color: isPieceWhite ? '#7f8c8d' : '#1a1a2e', textShadow: '0 0 5px #000' }; break;
                case 'classic': pieceStyle = { color: isPieceWhite ? '#f4d03f' : '#5c4033', textShadow: '2px 2px 0px #3e2723' }; break;
                default: pieceStyle = isPieceWhite 
                  ? { color: '#fbfbf8', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.55))' } 
                  : { color: '#171a24', filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.25))' };
              }

              return (
                <Tag
                  key={sq}
                  type={interactive ? "button" : undefined}
                  className={classes}
                  style={{ backgroundColor: bgColor, color: textColor }}
                  role={interactive ? "gridcell" : undefined}
                  aria-label={interactive ? label : undefined}
                  onClick={interactive ? () => onSquareClick?.(sq) : undefined}
                  tabIndex={interactive ? 0 : -1}
                >
                  {piece && (
                    <span
                      className={`text-[clamp(1.4rem,5.4vw,2.6rem)] leading-none select-none transition-transform duration-150 ease-in-out ${interactive ? 'group-hover:scale-[1.08]' : ''}`}
                      style={pieceStyle}
                      aria-hidden="true"
                    >
                      {PIECE_GLYPHS[piece.type]}
                    </span>
                  )}
                  {isLegal && !piece && <span className="absolute w-[26%] h-[26%] rounded-full bg-[rgba(11,16,36,0.35)]" aria-hidden="true" />}
                  {isLegal && piece && <span className="absolute inset-[6%] rounded-full [box-shadow:inset_0_0_0_3px_rgba(11,16,36,0.4)]" aria-hidden="true" />}
                  {fileIdx === files[0] && (
                    <span className="absolute font-mono text-[0.6rem] font-semibold opacity-55 pointer-events-none top-[2px] left-[3px]" aria-hidden="true">{rank}</span>
                  )}
                  {rank === ranks[7] && (
                    <span className="absolute font-mono text-[0.6rem] font-semibold opacity-55 pointer-events-none bottom-[2px] right-[3px]" aria-hidden="true">{FILES[fileIdx]}</span>
                  )}
                </Tag>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function pieceName(type) {
  return { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }[type];
}

export default memo(ChessboardBase);
