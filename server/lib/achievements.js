/**
 * Achievement Definitions & Evaluation Engine
 *
 * Each achievement has a unique key, display info, category, and rewards.
 * The `evaluate` function checks if a user qualifies for any new achievements
 * based on their current game data.
 */

import prisma from "./prisma.js";
import { levelFromXp } from "./xp.js";

/** All available achievements */
export const ACHIEVEMENTS = [
  // PvP
  { key: "first_blood",      name: "First Blood",      icon: "⚔️",  category: "pvp",     xpReward: 50,  coinReward: 10,  desc: "Win your first PvP game" },
  { key: "streak_3",         name: "Hat Trick",         icon: "🎩",  category: "pvp",     xpReward: 75,  coinReward: 15,  desc: "Win 3 PvP games in a row" },
  { key: "streak_5",         name: "Streak Master",     icon: "🔥",  category: "pvp",     xpReward: 150, coinReward: 30,  desc: "Win 5 PvP games in a row" },
  { key: "underdog",         name: "Giant Killer",      icon: "🎯",  category: "pvp",     xpReward: 200, coinReward: 50,  desc: "Beat someone 200+ rating above you" },
  { key: "social_butterfly",  name: "Social Butterfly",  icon: "🦋",  category: "social",  xpReward: 100, coinReward: 20,  desc: "Play against 10 different opponents" },

  // AI Mastery
  { key: "beat_beginner",    name: "First Steps",       icon: "👣",  category: "mastery", xpReward: 25,  coinReward: 5,   desc: "Beat Beginner AI" },
  { key: "beat_easy",        name: "Warming Up",        icon: "🌤️",  category: "mastery", xpReward: 35,  coinReward: 5,   desc: "Beat Easy AI" },
  { key: "beat_intermediate", name: "Solid Player",     icon: "⚡",  category: "mastery", xpReward: 75,  coinReward: 15,  desc: "Beat Intermediate AI" },
  { key: "beat_advanced",    name: "Tactician",         icon: "🧠",  category: "mastery", xpReward: 150, coinReward: 25,  desc: "Beat Advanced AI" },
  { key: "beat_expert",      name: "Engine Slayer",     icon: "🗡️",  category: "mastery", xpReward: 300, coinReward: 75,  desc: "Beat Expert AI" },
  { key: "scholars_mate",    name: "Scholar's Mate",    icon: "📚",  category: "mastery", xpReward: 50,  coinReward: 10,  desc: "Checkmate in 4 moves or fewer" },

  // Volume
  { key: "games_10",         name: "Getting Started",   icon: "🎮",  category: "volume",  xpReward: 50,  coinReward: 10,  desc: "Play 10 games" },
  { key: "games_50",         name: "Regular",           icon: "⭐",  category: "volume",  xpReward: 100, coinReward: 25,  desc: "Play 50 games" },
  { key: "games_100",        name: "Centurion",         icon: "💯",  category: "volume",  xpReward: 200, coinReward: 50,  desc: "Play 100 games" },
  { key: "games_500",        name: "Veteran",           icon: "🏅",  category: "volume",  xpReward: 500, coinReward: 100, desc: "Play 500 games" },
];

/**
 * Seed achievement definitions into the database.
 * Safe to call multiple times — uses upsert.
 */
export async function seedAchievements() {
  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: ach.key },
      update: {
        name: ach.name,
        description: ach.desc,
        icon: ach.icon,
        category: ach.category,
        xpReward: ach.xpReward,
        coinReward: ach.coinReward,
      },
      create: {
        key: ach.key,
        name: ach.name,
        description: ach.desc,
        icon: ach.icon,
        category: ach.category,
        xpReward: ach.xpReward,
        coinReward: ach.coinReward,
      },
    });
  }
}

/**
 * Evaluate and unlock any new achievements for a user.
 * Returns an array of newly unlocked achievement objects.
 */
export async function evaluateAchievements(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      achievements: { include: { achievement: true } },
      games: true,
      pvpGamesWhite: true,
      pvpGamesBlack: true,
    },
  });

  if (!user) return [];

  const unlockedKeys = new Set(user.achievements.map((ua) => ua.achievement.key));
  const newlyUnlocked = [];

  // Helper: total AI games
  const aiGames = user.games;
  const aiWins = aiGames.filter((g) => {
    if (g.playerColor === "white" && g.result === "white_win") return true;
    if (g.playerColor === "black" && g.result === "black_win") return true;
    return false;
  });

  // Helper: total PvP games
  const pvpGames = [...user.pvpGamesWhite, ...user.pvpGamesBlack];
  const pvpWins = pvpGames.filter((g) => {
    if (g.whiteUserId === userId && g.result === "white_win") return true;
    if (g.blackUserId === userId && g.result === "black_win") return true;
    return false;
  });

  const totalGames = aiGames.length + pvpGames.length;

  // --- Volume Achievements ---
  if (totalGames >= 10) await tryUnlock("games_10");
  if (totalGames >= 50) await tryUnlock("games_50");
  if (totalGames >= 100) await tryUnlock("games_100");
  if (totalGames >= 500) await tryUnlock("games_500");

  // --- AI Mastery Achievements ---
  const diffWins = new Set(aiWins.map((g) => g.difficulty));
  if (diffWins.has("Beginner")) await tryUnlock("beat_beginner");
  if (diffWins.has("Easy")) await tryUnlock("beat_easy");
  if (diffWins.has("Intermediate")) await tryUnlock("beat_intermediate");
  if (diffWins.has("Advanced")) await tryUnlock("beat_advanced");
  if (diffWins.has("Expert")) await tryUnlock("beat_expert");

  // Scholar's Mate: checkmate in 4 moves or fewer
  const quickWins = [...aiWins, ...pvpWins].filter((g) => g.totalMoves <= 8); // 4 moves = 8 half-moves max
  if (quickWins.length > 0) await tryUnlock("scholars_mate");

  // --- PvP Achievements ---
  if (pvpWins.length >= 1) await tryUnlock("first_blood");

  // Streak detection (simplified: check last N PvP games chronologically)
  const sortedPvp = pvpGames
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  let streak = 0;
  for (const g of sortedPvp) {
    const isWin = (g.whiteUserId === userId && g.result === "white_win") ||
                  (g.blackUserId === userId && g.result === "black_win");
    if (isWin) streak++;
    else break;
  }
  if (streak >= 3) await tryUnlock("streak_3");
  if (streak >= 5) await tryUnlock("streak_5");

  // Underdog: beat someone 200+ rating above you
  const underdogWin = pvpGames.find((g) => {
    if (g.whiteUserId === userId && g.result === "white_win") {
      return g.blackRatingBefore - g.whiteRatingBefore >= 200;
    }
    if (g.blackUserId === userId && g.result === "black_win") {
      return g.whiteRatingBefore - g.blackRatingBefore >= 200;
    }
    return false;
  });
  if (underdogWin) await tryUnlock("underdog");

  // Social Butterfly: 10 different opponents
  const opponents = new Set();
  for (const g of pvpGames) {
    if (g.whiteUserId === userId) opponents.add(g.blackUserId);
    else opponents.add(g.whiteUserId);
  }
  if (opponents.size >= 10) await tryUnlock("social_butterfly");

  // --- Award XP + Coins for new achievements ---
  let totalXpGained = 0;
  let totalCoinsGained = 0;
  for (const ach of newlyUnlocked) {
    totalXpGained += ach.xpReward;
    totalCoinsGained += ach.coinReward;
  }

  if (totalXpGained > 0 || totalCoinsGained > 0) {
    const newXp = user.xp + totalXpGained;
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: totalXpGained },
        xlCoins: { increment: totalCoinsGained },
        level: levelFromXp(newXp),
      },
    });
  }

  return newlyUnlocked;

  // --- Helper ---
  async function tryUnlock(key) {
    if (unlockedKeys.has(key)) return;
    const achievement = await prisma.achievement.findUnique({ where: { key } });
    if (!achievement) return;

    await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });

    unlockedKeys.add(key);
    newlyUnlocked.push(achievement);
  }
}
