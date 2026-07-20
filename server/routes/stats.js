import { Router } from "express";
import { getAuth } from "@clerk/express";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";

const router = Router();

/**
 * GET /api/stats/:username
 * Returns comprehensive stats for a user. Cached in Redis for 1 hour.
 */
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const cacheKey = `stats:${username}`;

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return res.json(typeof cached === "string" ? JSON.parse(cached) : cached);
      } catch (e) {
        console.warn(`Cache error for ${cacheKey}, deleting...`);
        await redis.del(cacheKey);
      }
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        games: { orderBy: { createdAt: "desc" } },
        pvpGamesWhite: { orderBy: { createdAt: "desc" } },
        pvpGamesBlack: { orderBy: { createdAt: "desc" } },
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: "desc" },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // --- AI Game Stats ---
    const aiGames = user.games;
    const aiWins = aiGames.filter(
      (g) =>
        (g.playerColor === "white" && g.result === "white_win") ||
        (g.playerColor === "black" && g.result === "black_win")
    );
    const aiLosses = aiGames.filter(
      (g) =>
        (g.playerColor === "white" && g.result === "black_win") ||
        (g.playerColor === "black" && g.result === "white_win")
    );
    const aiDraws = aiGames.filter((g) => g.result === "draw");

    // Win rate by difficulty
    const byDifficulty = {};
    for (const g of aiGames) {
      if (!byDifficulty[g.difficulty]) {
        byDifficulty[g.difficulty] = { played: 0, won: 0 };
      }
      byDifficulty[g.difficulty].played++;
      const isWin =
        (g.playerColor === "white" && g.result === "white_win") ||
        (g.playerColor === "black" && g.result === "black_win");
      if (isWin) byDifficulty[g.difficulty].won++;
    }

    // --- PvP Game Stats ---
    const pvpGames = [...user.pvpGamesWhite, ...user.pvpGamesBlack];
    const pvpWins = pvpGames.filter(
      (g) =>
        (g.whiteUserId === user.id && g.result === "white_win") ||
        (g.blackUserId === user.id && g.result === "black_win")
    );
    const pvpLosses = pvpGames.filter(
      (g) =>
        (g.whiteUserId === user.id && g.result === "black_win") ||
        (g.blackUserId === user.id && g.result === "white_win")
    );
    const pvpDraws = pvpGames.filter((g) => g.result === "draw");

    // Win rate by time control
    const byTimeControl = {};
    for (const g of pvpGames) {
      const tc = g.timeControl || "unlimited";
      if (!byTimeControl[tc]) {
        byTimeControl[tc] = { played: 0, won: 0 };
      }
      byTimeControl[tc].played++;
      const isWin =
        (g.whiteUserId === user.id && g.result === "white_win") ||
        (g.blackUserId === user.id && g.result === "black_win");
      if (isWin) byTimeControl[tc].won++;
    }

    // --- Total Stats ---
    const totalGames = aiGames.length + pvpGames.length;
    const totalWins = aiWins.length + pvpWins.length;
    const totalLosses = aiLosses.length + pvpLosses.length;
    const totalDraws = aiDraws.length + pvpDraws.length;

    // --- Total Moves ---
    const totalMoves = [...aiGames, ...pvpGames].reduce(
      (sum, g) => sum + (g.totalMoves || 0),
      0
    );

    // --- Win Streak (all games chronologically) ---
    const allGames = [...aiGames, ...pvpGames].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    let longestStreak = 0;
    let currentStreak = 0;
    for (const g of allGames.reverse()) {
      const isWin =
        (g.playerColor === "white" && g.result === "white_win") ||
        (g.playerColor === "black" && g.result === "black_win") ||
        (g.whiteUserId === user.id && g.result === "white_win") ||
        (g.blackUserId === user.id && g.result === "black_win");
      if (isWin) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // --- Most Used Openings (first move) ---
    const openingCounts = {};
    for (const g of [...aiGames, ...pvpGames]) {
      if (g.moves && g.moves.length > 0) {
        const opening = g.moves[0];
        openingCounts[opening] = (openingCounts[opening] || 0) + 1;
      }
    }
    const favoriteOpenings = Object.entries(openingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([move, count]) => ({ move, count }));

    // --- Monthly Breakdown ---
    const now = new Date();
    const thisMonth = allGames.filter(
      (g) =>
        new Date(g.createdAt).getMonth() === now.getMonth() &&
        new Date(g.createdAt).getFullYear() === now.getFullYear()
    ).length;
    const lastMonth = allGames.filter((g) => {
      const d = new Date(g.createdAt);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        d.getMonth() === lastMonthDate.getMonth() &&
        d.getFullYear() === lastMonthDate.getFullYear()
      );
    }).length;

    // --- Chess Personality ---
    const avgMoves =
      totalGames > 0
        ? totalMoves / totalGames
        : 0;
    let personality = "The Explorer";
    if (avgMoves > 0 && avgMoves < 25) personality = "The Blitz Attacker";
    else if (avgMoves < 40) personality = "The Aggressive Tactician";
    else if (avgMoves < 60) personality = "The Solid Strategist";
    else personality = "The Endgame Grinder";

    const stats = {
      user: {
        username: user.username,
        level: user.level,
        xp: user.xp,
        rating: user.rating,
        ratingPeak: user.ratingPeak,
        xlCoins: user.xlCoins,
        memberSince: user.createdAt,
      },
      totals: {
        games: totalGames,
        wins: totalWins,
        losses: totalLosses,
        draws: totalDraws,
        winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
        totalMoves,
        longestStreak,
      },
      ai: {
        games: aiGames.length,
        wins: aiWins.length,
        losses: aiLosses.length,
        draws: aiDraws.length,
        byDifficulty,
      },
      pvp: {
        games: pvpGames.length,
        wins: pvpWins.length,
        losses: pvpLosses.length,
        draws: pvpDraws.length,
        byTimeControl,
      },
      favoriteOpenings,
      monthly: { thisMonth, lastMonth },
      personality,
      achievements: user.achievements.map((ua) => ({
        key: ua.achievement.key,
        name: ua.achievement.name,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        unlockedAt: ua.unlockedAt,
      })),
    };

    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(stats), { ex: 3600 });

    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
