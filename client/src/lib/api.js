import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Attach the Clerk session token to every request.
 * The token getter is set once by calling `setTokenGetter`.
 */
let getToken = null;

export function setTokenGetter(fn) {
  getToken = fn;
}

api.interceptors.request.use(async (config) => {
  if (getToken) {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // If token fetch fails, send the request without auth
    }
  }
  return config;
});

// ---------- User API ----------

export async function syncUser() {
  const { data } = await api.post("/api/users/sync");
  return data.user;
}

// ---------- Games API (direct DB) ----------

export async function saveGame({ moves, result, difficulty, playerColor }) {
  const { data } = await api.post("/api/games", {
    moves,
    result,
    difficulty,
    playerColor,
  });
  return data.game;
}

export async function getGames() {
  const { data } = await api.get("/api/games");
  return data.games;
}

export async function getGameById(id) {
  const { data } = await api.get(`/api/games/${id}`);
  return data.game;
}

// ---------- Redis-cached Game Session API ----------

export async function startGameSession({ difficulty, playerColor, initialMoves, resumeGameId }) {
  const { data } = await api.post("/api/games/session", {
    difficulty,
    playerColor,
    initialMoves,
    resumeGameId,
  });
  return data.sessionId;
}

export async function cacheMove(sessionId, move) {
  const { data } = await api.post("/api/games/move", {
    sessionId,
    move,
  });
  return data;
}

export async function flushGame(sessionId, result, endSession = true) {
  const { data } = await api.post("/api/games/flush", {
    sessionId,
    result,
    endSession,
  });
  return data;
}

export async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (getToken) {
    try {
      const token = await getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default api;
