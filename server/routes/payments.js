import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { getAuth } from "@clerk/express";

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "secret_placeholder",
});

// Create an order
router.post("/create-order", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { amount } = req.body; // Amount in INR
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const options = {
      amount: amount * 100, // Razorpay works in paise (1 INR = 100 paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Verify payment and award coins
router.post("/verify", async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      coinsToAward,
    } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || "secret_placeholder";

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Award coins to user
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const updatedUser = await prisma.user.update({
        where: { clerkId },
        data: { xlCoins: { increment: coinsToAward } },
      });

      res.json({ success: true, xlCoins: updatedUser.xlCoins });
    } else {
      res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ success: false, error: "Payment verification failed" });
  }
});

export default router;
