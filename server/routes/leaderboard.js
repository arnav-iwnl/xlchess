import { Router } from "express";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";

const router = Router();

/**
 * GET /api/leaderboard/weekly
 * Top 50 by total wins this week (AI + PvP combined).
 */
router.get("/weekly", async (req, res) => {
  try {
    const cacheKey = "leaderboard:weekly";
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return res.json(typeof cached === "string" ? JSON.parse(cached) : cached);
      } catch (e) {
        await redis.del(cacheKey);
      }
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // AI wins this week
    const aiWins = await prisma.game.groupBy({
      by: ["username"],
      where: {
        createdAt: { gte: weekAgo },
        OR: [
          { result: "white_win", playerColor: "white" },
          { result: "black_win", playerColor: "black" },
        ],
      },
      _count: { id: true },
    });

    // Build a map: username -> wins
    const winsMap = {};
    for (const row of aiWins) {
      winsMap[row.username] = (winsMap[row.username] || 0) + row._count.id;
    }

    // PvP wins this week
    const pvpWinsWhite = await prisma.pvPGame.groupBy({
      by: ["whiteUserId"],
      where: { createdAt: { gte: weekAgo }, result: "white_win" },
      _count: { id: true },
    });
    const pvpWinsBlack = await prisma.pvPGame.groupBy({
      by: ["blackUserId"],
      where: { createdAt: { gte: weekAgo }, result: "black_win" },
      _count: { id: true },
    });

    // We need to map userId -> username for PvP wins
    const pvpUserIds = new Set([
      ...pvpWinsWhite.map((r) => r.whiteUserId),
      ...pvpWinsBlack.map((r) => r.blackUserId),
    ]);

    if (pvpUserIds.size > 0) {
      const pvpUsers = await prisma.user.findMany({
        where: { id: { in: [...pvpUserIds] } },
        select: { id: true, username: true },
      });
      const idToUsername = Object.fromEntries(pvpUsers.map((u) => [u.id, u.username]));

      for (const row of pvpWinsWhite) {
        const uname = idToUsername[row.whiteUserId];
        if (uname) winsMap[uname] = (winsMap[uname] || 0) + row._count.id;
      }
      for (const row of pvpWinsBlack) {
        const uname = idToUsername[row.blackUserId];
        if (uname) winsMap[uname] = (winsMap[uname] || 0) + row._count.id;
      }
    }

    // Sort and take top 50
    const leaderboard = Object.entries(winsMap)
      .map(([username, wins]) => ({ username, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 50)
      .map((entry, i) => ({ rank: i + 1, ...entry }));

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify({ leaderboard }), { ex: 300 });

    res.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching weekly leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

/**
 * GET /api/leaderboard/rating
 * Top 100 by Elo rating.
 */
router.get("/rating", async (req, res) => {
  try {
    const cacheKey = "leaderboard:rating";
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return res.json(typeof cached === "string" ? JSON.parse(cached) : cached);
      } catch (e) {
        await redis.del(cacheKey);
      }
    }

    const topPlayers = await prisma.user.findMany({
      where: { ratingGames: { gt: 0 } }, // Only show rated players
      orderBy: { rating: "desc" },
      take: 100,
      select: {
        username: true,
        rating: true,
        ratingPeak: true,
        ratingGames: true,
        level: true,
      },
    });

    const leaderboard = topPlayers.map((p, i) => ({
      rank: i + 1,
      ...p,
    }));

    await redis.set(cacheKey, JSON.stringify({ leaderboard }), { ex: 300 });

    res.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching rating leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

/**
 * GET /api/leaderboard/climbers
 * Top 20 players by rating gained this week.
 */
router.get("/climbers", async (req, res) => {
  try {
    const cacheKey = "leaderboard:climbers";
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return res.json(typeof cached === "string" ? JSON.parse(cached) : cached);
      } catch (e) {
        await redis.del(cacheKey);
      }
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get all PvP games from this week with rating deltas
    const recentGames = await prisma.pvPGame.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: {
        whiteUserId: true,
        blackUserId: true,
        whiteRatingBefore: true,
        whiteRatingAfter: true,
        blackRatingBefore: true,
        blackRatingAfter: true,
      },
    });

    // Calculate net rating change per player
    const ratingChanges = {};
    for (const g of recentGames) {
      ratingChanges[g.whiteUserId] =
        (ratingChanges[g.whiteUserId] || 0) + (g.whiteRatingAfter - g.whiteRatingBefore);
      ratingChanges[g.blackUserId] =
        (ratingChanges[g.blackUserId] || 0) + (g.blackRatingAfter - g.blackRatingBefore);
    }

    // Get top 20 climbers
    const topClimberIds = Object.entries(ratingChanges)
      .filter(([, delta]) => delta > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    if (topClimberIds.length === 0) {
      return res.json({ leaderboard: [] });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: topClimberIds.map(([id]) => id) } },
      select: { id: true, username: true, rating: true, level: true },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const leaderboard = topClimberIds.map(([id, delta], i) => ({
      rank: i + 1,
      username: userMap[id]?.username || "Unknown",
      rating: userMap[id]?.rating || 0,
      level: userMap[id]?.level || 1,
      ratingGained: delta,
    }));

    await redis.set(cacheKey, JSON.stringify({ leaderboard }), { ex: 300 });

    res.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching climbers:", error);
    res.status(500).json({ error: "Failed to fetch climbers" });
  }
});

export default router;
