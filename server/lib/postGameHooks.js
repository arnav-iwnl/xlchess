import prisma from "./prisma.js";
import { evaluateAchievements } from "./achievements.js";
import { XP_RULES, levelFromXp } from "./xp.js";
import { checkReferralQualification } from "./referralsHook.js";
import { connectedUsers } from "./socket.js";

/**
 * Hook to run after an AI game is saved.
 */
export async function onAiGameSaved(gameId, userId) {
  try {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return;

    const isWin = (game.playerColor === "white" && game.result === "white_win") ||
                  (game.playerColor === "black" && game.result === "black_win");

    let xpAward = 0;
    if (isWin) {
      xpAward = game.difficulty === "Expert" ? XP_RULES.ai_expert_win : XP_RULES.ai_win;
    }

    await applyXpAndCheck(userId, xpAward);
    await checkReferralQualification(userId);
  } catch (error) {
    console.error("Error in onAiGameSaved hook:", error);
  }
}

/**
 * Hook to run after a PvP game is saved.
 */
export async function onPvpGameSaved(gameId) {
  try {
    const game = await prisma.pvPGame.findUnique({ where: { id: gameId } });
    if (!game) return;

    // Evaluate for White
    let whiteXp = XP_RULES.pvp_loss;
    let whiteCoins = 0;
    if (game.result === "white_win") { whiteXp = XP_RULES.pvp_win; whiteCoins = 10; }
    else if (game.result === "draw") whiteXp = XP_RULES.pvp_draw;

    // Evaluate for Black
    let blackXp = XP_RULES.pvp_loss;
    let blackCoins = 0;
    if (game.result === "black_win") { blackXp = XP_RULES.pvp_win; blackCoins = 10; }
    else if (game.result === "draw") blackXp = XP_RULES.pvp_draw;

    await applyXpAndCheck(game.whiteUserId, whiteXp, whiteCoins);
    await applyXpAndCheck(game.blackUserId, blackXp, blackCoins);

    await checkReferralQualification(game.whiteUserId);
    await checkReferralQualification(game.blackUserId);
  } catch (error) {
    console.error("Error in onPvpGameSaved hook:", error);
  }
}

async function applyXpAndCheck(userId, xpGained, coinsGained = 0) {
  let didLevelUp = false;
  let newLevel = 1;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  if (xpGained > 0 || coinsGained > 0) {
    const newXp = user.xp + xpGained;
    newLevel = levelFromXp(newXp);
    didLevelUp = newLevel > user.level;
    
    await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel, xlCoins: { increment: coinsGained } },
    });
  }

  // Check achievements (which will award additional XP/coins if unlocked)
  const newlyUnlocked = await evaluateAchievements(userId);

  // Notify client if they are currently connected
  const socket = connectedUsers.get(userId);
  if (socket) {
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      socket.emit("achievementUnlocked", newlyUnlocked);
      
      // evaluateAchievements might also level the user up. Let's check their level again just to be safe.
      const freshUser = await prisma.user.findUnique({ where: { id: userId } });
      if (freshUser && freshUser.level > newLevel) {
        didLevelUp = true;
        newLevel = freshUser.level;
      }
    }
    
    if (didLevelUp) {
      socket.emit("levelUp", { level: newLevel });
    }
    
    if (coinsGained > 0) {
      socket.emit("coinsUpdated", { coinsAwarded: coinsGained, newBalance: user.xlCoins + coinsGained });
    }
  }

  // Check referral qualification
  await checkReferralQualification(userId);

  // Invalidate Stats Cache
  try {
    const redis = (await import('./redis.js')).default;
    await redis.del(`stats:${user.username}`);
  } catch (err) {
    console.error("Failed to clear stats cache", err);
  }
}

