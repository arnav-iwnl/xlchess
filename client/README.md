# XLChess — Hero Section & Homepage

Stage 2 technical assessment submission. This took **Option 3 (redesign)** as
its starting point for the hero, then built out the rest of the homepage
described in the brief conversation: a library of historical games, a
playable Stockfish opponent, reviews, and a contact form.

**Live deployment:** _add your Vercel URL here after deploying_
**Repository:** _add your GitHub URL here_

---

## Setup and installation

Requires Node.js 18+.

```bash
npm install
npm run dev       # local dev server, http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

No environment variables or backend are required — everything, including
the chess engine, runs entirely in the browser.

### Deploying

This is a static Vite build, so it deploys to Vercel with zero
configuration: build command `npm run build`, output directory `dist`.
The one thing to double check after import is that `public/engine/*` (the
Stockfish WASM files) is included in the deployment — Vercel includes
everything under `public/` by default, so this should work out of the box.

---

## Technologies and libraries used

| Purpose | Choice | Why |
|---|---|---|
| Framework / build | React 19 + Vite | Fast HMR, small production bundle, no framework opinions to fight |
| Chess rules engine | [chess.js](https://github.com/jhlywa/chess.js) v1 | Move generation/validation, SAN/FEN handling, check/mate/draw detection — the single source of truth for legality everywhere on the page |
| Chess opponent | [Stockfish 18](https://www.npmjs.com/package/stockfish) (WASM, single-threaded "lite" build) | Runs in a Web Worker so the UI thread never blocks; single-threaded build avoids needing `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers on deploy, which is a common source of "works locally, breaks on Vercel" bugs with the multithreaded build |
| Animation | Framer Motion | Page-load and hero entrance motion, loading screen |
| Icons | react-icons (Feather set) | Consistent, lightweight, tree-shaken |
| Chessboard rendering | Hand-built component (`Chessboard.jsx`), not a third-party board library | The board is the one truly reusable piece of UI on this page (hero autoplay, game replays, and the interactive game all need one) — reusable enough to justify writing once, small enough that a dependency wasn't worth the bundle weight or the fight to make a third-party board match this visual design |

`react-bits`-style UI patterns (segmented controls, icon buttons, card
layouts) were built directly as plain CSS components rather than pulled in
as a dependency, since `react-bits` ships as copy-in source rather than an
installable package — the same effect without the extra install step.

---

## Design decisions

- **Kept the existing brand, improved the execution.** XLChess already has
  a distinct identity (navy/violet, a knight mark, green-and-cream board).
  Rather than replace it, this leans into it: a proper type scale (Space
  Grotesk for display, Inter for body, JetBrains Mono for anything
  chess-notation-shaped — move lists, coordinates, the difficulty ladder),
  a coordinate-strip motif reused as a structural device (footer, section
  dividers), and more considered spacing/motion than the reference.
- **The hero's board isn't decorative — it's real.** The autoplay panel
  actually plays out the Evergreen Game move-by-move using chess.js, not a
  looping video or static image. It's pausable, replayable, and the move
  counter and status text are real state, not copy.
- **One board component powers three different experiences.** The hero
  autoplay, the famous-games replayer, and the interactive Stockfish game
  all render through the same `<Chessboard />`, just with different
  props (interactive vs. read-only, highlighted squares, orientation).
  This kept the three sections visually consistent for free and means a
  fix or improvement to square rendering, piece glyphs, or accessibility
  lands everywhere at once.
- **Difficulty is felt, not just labelled.** The five difficulty levels
  map to real, widely-spaced Stockfish skill levels (1, 5, 9, 14, 20) and
  search-time budgets, not evenly-spaced numbers that all end up playing
  similarly.

### Beyond the stated requirements

Per the brief's hint about thinking past the literal spec: a chess site's
underlying goal is retention and skill growth, not just "render a hero."
That shaped a few choices beyond what was asked:

- **A visible progression ladder** (5 difficulty levels with Elo-style
  labels) gives players a reason to come back and climb it, rather than
  a single fixed-strength bot.
- **The hint button** answers the actual reason beginners bounce off
  engine opponents — not knowing what to do next — without just handing
  them the engine's move outright (it's opt-in, and only for the current
  position).
- **The historical games section** ties instruction to entertainment:
  replaying the Evergreen Game or the Immortal Game is a two-minute way to
  see a real attacking idea, which is a proven engagement pattern for
  chess platforms (Chess.com and Lichess both do a version of this).
- **Loading screen, Google Analytics, and this README's own production
  notes** below, matching what the brief said a passing submission
  included.

---

## Assumptions made

- The player always plays **White** against Stockfish, which plays
  **Black**. A board-flip control is provided for viewing preference, but
  there's no color-picker — adding one is straightforward (see
  "improvements" below) but out of scope for the assessment window.
- **Pawn promotion always promotes to a queen.** No promotion-choice UI.
  Under-promotion is a real but rare competitive tactic; auto-queen is the
  correct default for a casual/beginner-leaning product and removes a
  whole class of modal-UI edge cases.
- **No accounts, ratings, or saved game history.** The brief's reference
  screenshots don't show authentication, and adding it would mean
  designing a backend that's out of scope for a hero-section assessment.
  Reviews and the three historical games are static content, not
  fetched from a CMS.
- **The contact form has no real backend.** It validates properly and
  simulates a network round trip (including a small, realistic failure
  rate so the error state is actually reachable and testable) rather than
  silently pretending to submit. See the "trade-offs" section for what a
  production version would need.
- **The Google Analytics measurement ID is a placeholder**
  (`G-XXXXXXXXXX`) since a real property wasn't provisioned for this
  assessment. The loading and event-tracking code is real and wired up in
  `src/lib/analytics.js` — swapping in a real ID is a one-line change.

---

## Trade-offs considered

- **Single-threaded Stockfish vs. multithreaded.** The multithreaded WASM
  build is meaningfully faster at higher search depths, but requires
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` response headers to unlock
  `SharedArrayBuffer` — headers that are easy to forget on a platform like
  Vercel and that can silently break other embeds on the page (iframes,
  some third-party widgets) if set globally. For a difficulty range
  topping out around club level (not a tournament-strength engine), the
  single-threaded build's extra search time is not noticeable, so this
  traded a small amount of engine strength for a deploy target that can't
  silently fail.
- **Hand-rolled chessboard vs. a library.** A library (e.g.
  `react-chessboard`) would have been faster to integrate but would have
  fought the custom visual design (the specific square colors, coordinate
  placement, piece glyphs, selection/legal-move styling) and added a
  dependency for something used in exactly three places. Writing it once
  and reusing it kept the bundle smaller and the visuals consistent.
- **Unicode glyphs vs. SVG piece sets.** Piece rendering uses styled
  Unicode chess symbols rather than an SVG/PNG piece set. This avoids
  bundling or fetching image assets entirely (good for performance and
  for working offline once cached) at a small cost in piece fidelity
  compared to a dedicated art set — an acceptable trade for a section
  where the board is one part of a larger page, not the entire product.
- **Auto-scroll depth vs. move-list virtualization.** Move lists are
  rendered as plain DOM lists, not virtualized. Every game here tops out
  around 45 plies, so this is fine; it would need revisiting if the
  platform later supported arbitrarily long live games in the same
  layout.

---

## What I'd improve with more time

- **Server-authoritative play.** Right now the "opponent" is a client-side
  WASM engine with no server component — fine for a casual practice
  board, but a real multiplayer or rated mode needs move validation and
  game state to live server-side.
- **Color choice and time controls** before starting a game against
  Stockfish, plus a resign/draw-offer flow.
- **Real contact form backend** (e.g. a serverless function that emails
  through a transactional provider, or a lightweight forms service),
  server-side validation to match the client-side rules, and basic
  spam protection.
- **Expand the historical games library** beyond three fixed games, ideally
  loaded from a small dataset/CMS so it can grow without a code change,
  and add a PGN import so players can replay their own games.
- **Automated testing.** Given the time box, verification here was manual
  code review plus targeted Node scripts validating the chess.js PGNs and
  the Stockfish UCI protocol handshake (see git history / dev notes).
  A production version would add component tests for the board's
  selection/legal-move logic and an end-to-end test for a full game
  against the engine at each difficulty level.
- **Deeper accessibility pass.** Keyboard move entry (select a piece with
  Tab/Enter, not just click) for the interactive board, and a
  screen-reader-friendly move announcement live region.

---

## Performance & production considerations

- **Loading screen** covers the initial paint while fonts and the app
  shell settle, so there's never a flash of unstyled content.
- **Google Analytics (GA4)** is wired up in `index.html` +
  `src/lib/analytics.js`, gated so a blocked or failed analytics load
  never breaks the app (see "assumptions" above re: the placeholder ID).
- **Stockfish loads lazily and off the main thread.** The ~7 MB WASM
  engine only downloads once the "Play" section's hook mounts, and all
  search happens in a Web Worker — a slow search never causes input lag
  or jank elsewhere on the page.
- **Fonts** are loaded via `<link rel="preconnect">` + a single Google
  Fonts stylesheet request with `display=swap`, so text renders
  immediately in a fallback face rather than blocking on font download.
- **Reduced motion is respected globally** (`prefers-reduced-motion`),
  and all interactive elements have visible keyboard focus states.
- **A Google PageSpeed Insights report should be run against the live
  Vercel URL once deployed** and linked here — that step needs a public
  URL to test against, so it's the one item in this list that has to
  happen after deployment rather than before.
