import { Router } from "express";
import { randomUUID } from "crypto";
import { getAuth, clerkClient } from "@clerk/express";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";
import { flushSessionToDb } from "../lib/inactivityMonitor.js";

const router = Router();

// ─── Helper: resolve username from Clerk auth ───────────────────────────────

async function resolveUsername(req) {
  const { userId } = getAuth(req);
  if (!userId) return null;

  // Check our DB first
  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (user) return user.username;

  // Auto-sync from Clerk
  const clerkUser = await clerkClient.users.getUser(userId);
  const username = clerkUser.username;
  if (!username) return null;

  user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: { username },
    create: { clerkId: userId, username },
  });
  return user.username;
}

// ─── Redis-cached game session endpoints ─────────────────────────────────────

/**
 * POST /api/games/session
 * Start a new game session. Stores metadata in Redis.
 * Body: { difficulty: string, playerColor: string }
 */
router.post("/session", async (req, res) => {
  try {
    const username = await resolveUsername(req);
    if (!username) return res.status(401).json({ error: "Unauthorized" });

    const { difficulty, playerColor, initialMoves, resumeGameId } = req.body;
    if (!difficulty || !playerColor) {
      return res.status(400).json({ error: "Missing difficulty or playerColor" });
    }

    let sessionId;
    if (resumeGameId) {
      const existingGame = await prisma.game.findUnique({ where: { id: resumeGameId } });
      if (existingGame) {
        sessionId = existingGame.sessionId;
        if (!sessionId) {
          sessionId = randomUUID();
          await prisma.game.update({ where: { id: resumeGameId }, data: { sessionId } });
        }
      } else {
        sessionId = randomUUID();
      }
    } else {
      sessionId = randomUUID();
    }

    const sessionKey = `game:${username}:session:${sessionId}`;

    // Clear any lingering data for this session to ensure a clean slate
    await redis.del(sessionKey);
    await redis.del(`${sessionKey}:moves`);

    // Store session metadata as a hash
    await redis.hset(sessionKey, {
      username,
      difficulty,
      playerColor,
      startedAt: Date.now().toString(),
      lastActivity: Date.now().toString(),
      result: "in_progress",
    });

    if (initialMoves && Array.isArray(initialMoves) && initialMoves.length > 0) {
      await redis.rpush(`${sessionKey}:moves`, ...initialMoves);
    }

    res.status(201).json({ sessionId });
  } catch (error) {
    console.error("Error creating game session:", error);
    res.status(500).json({ error: "Failed to create game session" });
  }
});

/**
 * POST /api/games/move
 * Cache a single move in Redis.
 * Body: { sessionId: string, move: string }
 */
router.post("/move", async (req, res) => {
  try {
    const username = await resolveUsername(req);
    if (!username) return res.status(401).json({ error: "Unauthorized" });

    const { sessionId, move } = req.body;
    if (!sessionId || !move) {
      return res.status(400).json({ error: "Missing sessionId or move" });
    }

    const sessionKey = `game:${username}:session:${sessionId}`;
    const movesKey = `${sessionKey}:moves`;

    // Verify the session exists
    const exists = await redis.exists(sessionKey);
    if (!exists) {
      return res.status(404).json({ error: "Game session not found" });
    }

    // Append the move and update last activity timestamp
    await redis.rpush(movesKey, move);
    await redis.hset(sessionKey, { lastActivity: Date.now().toString() });

    // Get current move count
    const moveCount = await redis.llen(movesKey);

    res.json({ ok: true, moveCount });
  } catch (error) {
    console.error("Error caching move:", error);
    res.status(500).json({ error: "Failed to cache move" });
  }
});

/**
 * POST /api/games/flush
 * Flush a game session from Redis to NeonDB.
 * Body: { sessionId: string, result: string }
 */
router.post("/flush", async (req, res) => {
  try {
    const username = await resolveUsername(req);
    if (!username) return res.status(401).json({ error: "Unauthorized" });

    const { sessionId, result, endSession = true } = req.body;
    if (!sessionId || !result) {
      return res.status(400).json({ error: "Missing sessionId or result" });
    }

    const sessionKey = `game:${username}:session:${sessionId}`;

    // Update the result before flushing
    await redis.hset(sessionKey, { result });

    // Flush to DB
    await flushSessionToDb(sessionKey, endSession);

    res.json({ ok: true, message: "Game saved to database" });
  } catch (error) {
    console.error("Error flushing game:", error);
    res.status(500).json({ error: "Failed to flush game" });
  }
});

// ─── Direct DB endpoints (existing) ─────────────────────────────────────────

/**
 * POST /api/games
 * Save a completed game directly to NeonDB (fallback for non-cached saves).
 * Body: { moves: string[], result: string, difficulty: string, playerColor: string }
 */
router.post("/", async (req, res) => {
  try {
    const username = await resolveUsername(req);
    if (!username) return res.status(401).json({ error: "Unauthorized" });

    const { moves, result, difficulty, playerColor } = req.body;

    if (!moves || !result || !difficulty || !playerColor) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!Array.isArray(moves) || moves.length === 0) {
      return res.status(400).json({ error: "Moves must be a non-empty array" });
    }

    const game = await prisma.game.create({
      data: {
        username,
        moves,
        result,
        difficulty,
        playerColor,
        totalMoves: moves.length,
      },
    });

    res.status(201).json({ game });
  } catch (error) {
    console.error("Error saving game:", error);
    res.status(500).json({ error: "Failed to save game" });
  }
});

/**
 * GET /api/games
 * Get all games for the authenticated user, sorted by most recent first.
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return res.json({ games: [] });

    const games = await prisma.game.findMany({
      where: { username: user.username },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sessionId: true,
        username: true,
        result: true,
        difficulty: true,
        playerColor: true,
        totalMoves: true,
        createdAt: true,
      }
    });

    res.json({ games });
  } catch (error) {
    console.error("Error fetching games:", error);
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

/**
 * GET /api/games/:id
 * Get a single game by ID (for replay). Must belong to the authenticated user.
 */
router.get("/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const game = await prisma.game.findFirst({
      where: { id: req.params.id, username: user.username },
    });
    if (!game) return res.status(404).json({ error: "Game not found" });

    res.json({ game });
  } catch (error) {
    console.error("Error fetching game:", error);
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

export default router;
