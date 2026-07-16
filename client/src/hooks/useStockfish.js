import { useCallback, useEffect, useRef, useState } from "react";

// Maps the platform's 1–5 difficulty ladder onto Stockfish's internal
// Skill Level (0–20) and a search time budget. Kept intentionally coarse —
// large gaps between rungs so each difficulty step is actually felt,
// matching the design brief's "Intermediate (1600)"-style labelling.
export const DIFFICULTIES = [
  { level: 1, label: "Beginner", elo: 800, skill: 1, movetime: 300 },
  { level: 2, label: "Easy", elo: 1200, skill: 5, movetime: 500 },
  { level: 3, label: "Intermediate", elo: 1600, skill: 9, movetime: 800 },
  { level: 4, label: "Advanced", elo: 2000, skill: 14, movetime: 1200 },
  { level: 5, label: "Expert", elo: 2400, skill: 20, movetime: 1800 },
];

/**
 * Loads Stockfish (single-threaded WASM build) in a Web Worker and exposes
 * a small promise-based API. The engine process is entirely isolated from
 * the render thread, so a slow search never blocks board interaction.
 */
export function useStockfish() {
  const workerRef = useRef(null);
  const pendingRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [thinking, setThinking] = useState(false);
  // Centipawn score for the side to move in the most recent search,
  // read off Stockfish's own "info ... score cp X" lines. Used to drive
  // the evaluation bar. Null until the first search completes.
  const [scoreCp, setScoreCp] = useState(null);
  const [scoreMate, setScoreMate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let worker;
    try {
      worker = new Worker("/engine/stockfish-18-lite-single.js");
    } catch {
      setError("Engine failed to load in this browser.");
      return;
    }
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const line = typeof e.data === "string" ? e.data : "";
      if (line === "uciok" || line.startsWith("readyok")) {
        if (!cancelled) setReady(true);
        return;
      }
      if (line.startsWith("info") && line.includes("score")) {
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (cpMatch) {
          setScoreCp(parseInt(cpMatch[1], 10));
          setScoreMate(null);
        } else if (mateMatch) {
          setScoreMate(parseInt(mateMatch[1], 10));
        }
      }
      if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        const uci = parts[1];
        setThinking(false);
        if (pendingRef.current) {
          pendingRef.current(uci === "(none)" ? null : uci);
          pendingRef.current = null;
        }
      }
    };
    worker.onerror = () => {
      if (!cancelled) setError("Engine crashed. Try refreshing the page.");
    };

    worker.postMessage("uci");
    worker.postMessage("isready");

    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, []);

  const requestEvaluation = useCallback((fen) => {
    const worker = workerRef.current;
    if (!worker || pendingRef.current) return;
    // Stop any existing background search before starting a new one
    worker.postMessage("stop");
    worker.postMessage(`position fen ${fen}`);
    // Run a quick search to get an updated evaluation score
    worker.postMessage(`go depth 8`);
  }, []);

  /** Resolves with a UCI move string (e.g. "e2e4", "e7e8q") or null. */
  const requestBestMove = useCallback((fen, { skill = 9, movetime = 800 } = {}) => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker) return resolve(null);
      setThinking(true);
      pendingRef.current = resolve;
      worker.postMessage(`setoption name Skill Level value ${skill}`);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go movetime ${movetime}`);
    });
  }, []);

  return { ready, error, thinking, requestBestMove, requestEvaluation, scoreCp, scoreMate };
}
