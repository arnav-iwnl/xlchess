import prisma from "./prisma.js";
import { connectedUsers } from "./socket.js";

export async function checkReferralQualification(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, referredBy: true },
    });

    // If this user wasn't referred by anyone, do nothing
    if (!user || !user.referredBy) return;

    // Check if there is a referral record that is not yet qualified
    const referral = await prisma.referral.findUnique({
      where: { referredUserId: user.id },
    });

    if (!referral || referral.qualified) return;

    // Count total games played by this user
    const gameCount = await prisma.game.count({ where: { username: user.username } });
    const pvpCount = await prisma.pvPGame.count({
      where: { OR: [{ whiteUserId: user.id }, { blackUserId: user.id }] },
    });

    const totalGames = gameCount + pvpCount;
    const QUALIFICATION_THRESHOLD = 5;

    if (totalGames >= QUALIFICATION_THRESHOLD) {
      // Qualify the referral!
      await prisma.referral.update({
        where: { referredUserId: user.id },
        data: { qualified: true, qualifiedAt: new Date() },
      });

      // Award 100 coins to referrer
      const referrerUser = await prisma.user.update({
        where: { id: referral.referrerUserId },
        data: { xlCoins: { increment: 100 } },
        select: { id: true, username: true }
      });

      // Award 50 coins to referred
      await prisma.user.update({
        where: { id: user.id },
        data: { xlCoins: { increment: 50 } },
      });

      // Notify the Referrer if they are online
      const referrerSocket = connectedUsers.get(referrerUser.id);
      if (referrerSocket) {
        referrerSocket.emit("referralQualified", {
          message: `Your referral ${user.username} just played 5 games! You earned 100 XL Coins!`,
          coinsAwarded: 100
        });
      }

      // Notify the Referred if they are online
      const referredSocket = connectedUsers.get(user.id);
      if (referredSocket) {
        referredSocket.emit("referralQualified", {
          message: `You completed 5 games! You earned 50 XL Coins for using a referral code!`,
          coinsAwarded: 50
        });
      }
    }
  } catch (error) {
    console.error("Error in checkReferralQualification:", error);
  }
}
