import redis from "./redis.js";
import prisma from "./prisma.js";

const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // check every 1 minute

/**
 * Monitors Redis for stale game sessions and auto-flushes them to NeonDB.
 * A session is considered stale if its lastActivity timestamp is older than
 * the threshold.
 */
export async function flushSessionToDb(sessionKey, endSession = true) {
  try {
    const meta = await redis.hgetall(sessionKey);
    if (!meta || !meta.username) return;

    const movesKey = `${sessionKey}:moves`;
    const moves = await redis.lrange(movesKey, 0, -1);
    
    // Extract sessionId from the key: "game:username:session:sessionId"
    const parts = sessionKey.split(":");
    const sessionId = parts[parts.length - 1];

    // Only save if there are actual moves
    if (moves && moves.length > 0) {
      const data = {
        sessionId,
        username: meta.username,
        moves,
        result: meta.result || "abandoned",
        difficulty: meta.difficulty || "Unknown",
        playerColor: meta.playerColor || "white",
        totalMoves: moves.length,
      };

      await prisma.game.upsert({
        where: { sessionId },
        update: { ...data, createdAt: new Date() },
        create: data,
      });
      console.log(`[InactivityMonitor] Saved session ${sessionId} (${moves.length} moves)`);
    }

    if (endSession) {
      // Clean up Redis keys
      await redis.del(sessionKey, movesKey);
    }
  } catch (error) {
    console.error(`[InactivityMonitor] Error flushing session ${sessionKey}:`, error);
  }
}

async function checkStaleSessions() {
  try {
    // Scan for all active game session keys
    let cursor = 0;
    const staleKeys = [];

    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: "game:*:session:*",
        count: 100,
        type: "hash",
      });
      cursor = typeof nextCursor === "number" ? nextCursor : parseInt(nextCursor, 10);

      for (const key of keys) {
        // Skip keys that end with :moves (those are lists, not session hashes)
        if (key.endsWith(":moves")) continue;

        const lastActivity = await redis.hget(key, "lastActivity");
        if (lastActivity) {
          const elapsed = Date.now() - parseInt(lastActivity, 10);
          if (elapsed > INACTIVITY_THRESHOLD_MS) {
            staleKeys.push(key);
          }
        }
      }
    } while (cursor !== 0);

    // Flush all stale sessions
    for (const key of staleKeys) {
      await flushSessionToDb(key);
    }
  } catch (error) {
    console.error("[InactivityMonitor] Error scanning for stale sessions:", error);
  }
}

let intervalId = null;

export function startInactivityMonitor() {
  console.log("[InactivityMonitor] Started — checking every 60s, threshold 5min");
  intervalId = setInterval(checkStaleSessions, CHECK_INTERVAL_MS);
}

export function stopInactivityMonitor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[InactivityMonitor] Stopped");
  }
}
