import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { createServer } from "http";
import gamesRouter from "./routes/games.js";
import usersRouter from "./routes/users.js";
import statsRouter from "./routes/stats.js";
import themesRouter from "./routes/themes.js";
import referralsRouter from "./routes/referrals.js";
import leaderboardRouter from "./routes/leaderboard.js";
import achievementsRouter from "./routes/achievements.js";
import paymentRouter from "./routes/payments.js";
import { startInactivityMonitor } from "./lib/inactivityMonitor.js";
import { setupSocket } from "./lib/socket.js";
import { seedAchievements } from "./lib/achievements.js";
import { getDynamicCorsOrigin } from "./lib/cors.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// CORS — allow the Vite dev server and production origins dynamically
app.use(
  cors({
    origin: getDynamicCorsOrigin,
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// Clerk authentication middleware — attaches auth state to every request
app.use(clerkMiddleware());

// Routes
app.use("/api/users", usersRouter);
app.use("/api/games", gamesRouter);
app.use("/api/stats", statsRouter);
app.use("/api/themes", themesRouter);
app.use("/api/referrals", referralsRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/payments", paymentRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize Socket.io
setupSocket(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`🚀 XLChess server running on http://localhost:${PORT}`);
  startInactivityMonitor();
  try {
    await seedAchievements();
    console.log(`✅ Achievements seeded successfully`);
  } catch (err) {
    console.error(`❌ Failed to seed achievements:`, err);
  }
});
