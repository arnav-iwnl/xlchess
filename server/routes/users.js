import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";

const router = Router();

/**
 * POST /api/users/sync
 * Called from the frontend when a user signs in.
 * Creates or updates the user record in our DB with their Clerk username.
 */
router.post("/sync", async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch the full user object from Clerk to get their username
    const clerkUser = await clerkClient.users.getUser(userId);
    const username = clerkUser.username;

    if (!username) {
      return res.status(400).json({
        error: "Username not set. Please set a username in your Clerk profile.",
      });
    }

    // Upsert: create if not exists, update if exists
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { username },
      create: {
        clerkId: userId,
        username,
      },
    });

    // Pre-warm the Redis cache for this user
    await redis.set(`clerk_username:${userId}`, user.username);

    res.json({ user });
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

export default router;
