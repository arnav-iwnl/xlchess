import { Router } from "express";
import { getAuth } from "@clerk/express";
import prisma from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/themes/mine
 * Returns the user's owned themes, active theme, and XL Coins balance.
 */
router.get("/mine", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        boardTheme: true,
        pieceSet: true,
        ownedThemes: true,
        ownedPieces: true,
        xlCoins: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Error fetching themes:", error);
    res.status(500).json({ error: "Failed to fetch themes" });
  }
});

/**
 * POST /api/themes/buy
 * Buy a board theme or piece set with XL Coins.
 * Body: { type: "board" | "piece", themeId: string, price: number }
 */
router.post("/buy", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { type, themeId, price } = req.body;
    if (!type || !themeId || !price) {
      return res.status(400).json({ error: "Missing type, themeId, or price" });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, xlCoins: true, ownedThemes: true, ownedPieces: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Check balance
    if (user.xlCoins < price) {
      return res.status(400).json({ error: "Insufficient XL Coins" });
    }

    // Check if already owned
    const owned = type === "board" ? user.ownedThemes : user.ownedPieces;
    if (owned.includes(themeId)) {
      return res.status(400).json({ error: "Already owned" });
    }

    // Purchase
    const updateField =
      type === "board"
        ? { ownedThemes: { push: themeId } }
        : { ownedPieces: { push: themeId } };

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        xlCoins: { decrement: price },
        ...updateField,
      },
      select: {
        xlCoins: true,
        ownedThemes: true,
        ownedPieces: true,
      },
    });

    res.json({ success: true, ...updated });
  } catch (error) {
    console.error("Error buying theme:", error);
    res.status(500).json({ error: "Failed to buy theme" });
  }
});

/**
 * POST /api/themes/equip
 * Set active board theme or piece set.
 * Body: { type: "board" | "piece", themeId: string }
 */
router.post("/equip", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { type, themeId } = req.body;
    if (!type || !themeId) {
      return res.status(400).json({ error: "Missing type or themeId" });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, ownedThemes: true, ownedPieces: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify ownership
    const FREE_BOARD_THEMES = ["classic", "midnight", "ocean"];
    const FREE_PIECE_SETS = ["standard", "minimal", "classic"];

    const isFree = type === "board" ? FREE_BOARD_THEMES.includes(themeId) : FREE_PIECE_SETS.includes(themeId);
    const owned = type === "board" ? user.ownedThemes : user.ownedPieces;

    if (!isFree && !owned.includes(themeId)) {
      return res.status(400).json({ error: "Theme not owned" });
    }

    const updateField =
      type === "board"
        ? { boardTheme: themeId }
        : { pieceSet: themeId };

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateField,
      select: { boardTheme: true, pieceSet: true },
    });

    res.json({ success: true, ...updated });
  } catch (error) {
    console.error("Error equipping theme:", error);
    res.status(500).json({ error: "Failed to equip theme" });
  }
});

export default router;
