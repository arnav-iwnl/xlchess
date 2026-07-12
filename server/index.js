import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import gamesRouter from "./routes/games.js";
import usersRouter from "./routes/users.js";
import { startInactivityMonitor } from "./lib/inactivityMonitor.js";

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow the Vite dev server and production origins
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 XLChess server running on http://localhost:${PORT}`);
  startInactivityMonitor();
});
