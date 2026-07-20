import { Router } from "express";
import { getAuth } from "@clerk/express";
import prisma from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/referrals/code
 * Returns the user's unique referral code and link.
 */
router.get("/code", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { referralCode: true, username: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const baseDomain = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/^https?:\/\//, '') : "localhost:5173";
    const protocol = process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith('https') ? 'https' : 'http';

    res.json({
      code: user.username,
      link: `${protocol}://${baseDomain}/?ref=${user.username}`,
      username: user.username,
    });
  } catch (error) {
    console.error("Error fetching referral code:", error);
    res.status(500).json({ error: "Failed to fetch referral code" });
  }
});

/**
 * GET /api/referrals/stats
 * Returns referral stats: total invited, qualified, coins earned.
 */
router.get("/stats", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const referrals = await prisma.referral.findMany({
      where: { referrerUserId: user.id },
      include: { referred: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
    });

    const total = referrals.length;
    const qualified = referrals.filter((r) => r.qualified).length;
    const coinsEarned = qualified * 100; // 100 coins per qualified referral

    res.json({
      total,
      qualified,
      coinsEarned,
      referrals: referrals.map((r) => ({
        username: r.referred.username,
        qualified: r.qualified,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(500).json({ error: "Failed to fetch referral stats" });
  }
});

/**
 * POST /api/referrals/apply
 * Called after signup if the user was referred.
 * Body: { referralCode: string }
 */
router.post("/apply", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { referralCode: referrerUsername } = req.body;
    if (!referrerUsername) {
      return res.status(400).json({ error: "Missing referral code" });
    }

    // Find the referred user (current user)
    const referred = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, referredBy: true },
    });

    if (!referred) return res.status(404).json({ error: "User not found" });

    // Don't allow re-applying
    if (referred.referredBy) {
      return res.status(400).json({ error: "Already referred" });
    }

    // Find the referrer by their username (subdomain referral)
    const referrer = await prisma.user.findUnique({
      where: { username: referrerUsername },
      select: { id: true },
    });

    if (!referrer) {
      return res.status(404).json({ error: "Invalid referral code" });
    }

    // Can't refer yourself
    if (referrer.id === referred.id) {
      return res.status(400).json({ error: "Cannot refer yourself" });
    }

    // Create the referral record
    await prisma.referral.create({
      data: {
        referrerUserId: referrer.id,
        referredUserId: referred.id,
      },
    });

    // Mark the referred user
    await prisma.user.update({
      where: { id: referred.id },
      data: { referredBy: referrerUsername },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error applying referral:", error);
    res.status(500).json({ error: "Failed to apply referral" });
  }
});



export default router;
