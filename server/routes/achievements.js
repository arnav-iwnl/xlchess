import { Router } from "express";
import { getAuth } from "@clerk/express";
import prisma from "../lib/prisma.js";
import { evaluateAchievements, ACHIEVEMENTS } from "../lib/achievements.js";

const router = Router();

/**
 * GET /api/achievements
 * Returns all achievement definitions.
 */
router.get("/", async (_req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: [{ category: "asc" }, { xpReward: "asc" }],
    });

    // If no achievements in DB yet, return hardcoded definitions
    if (achievements.length === 0) {
      return res.json({
        achievements: ACHIEVEMENTS.map((a) => ({
          key: a.key,
          name: a.name,
          description: a.desc,
          icon: a.icon,
          category: a.category,
          xpReward: a.xpReward,
          coinReward: a.coinReward,
        })),
      });
    }

    res.json({ achievements });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

/**
 * GET /api/achievements/mine
 * Returns the current user's unlocked achievements.
 */
router.get("/mine", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    });

    res.json({
      unlocked: unlocked.map((ua) => ({
        key: ua.achievement.key,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        xpReward: ua.achievement.xpReward,
        coinReward: ua.achievement.coinReward,
        unlockedAt: ua.unlockedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching user achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

/**
 * POST /api/achievements/check
 * Evaluate and unlock any new achievements for the current user.
 * Should be called after every game save.
 */
router.post("/check", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const newlyUnlocked = await evaluateAchievements(user.id);

    res.json({
      newlyUnlocked: newlyUnlocked.map((a) => ({
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
        coinReward: a.coinReward,
      })),
    });
  } catch (error) {
    console.error("Error checking achievements:", error);
    res.status(500).json({ error: "Failed to check achievements" });
  }
});

export default router;
