import { Server } from "socket.io";
import prisma from "./prisma.js";
import { onPvpGameSaved } from "./postGameHooks.js";
import { matchmakingQueue, tryMatchmaking, activeChallenges, generateChallenge, acceptChallenge, getChallenge } from "./matchmaking.js";
import { getDynamicCorsOrigin } from "./cors.js";

export const activeGames = new Map(); // gameId -> { white, black, moves: [], fen: string, timeControl: string, whiteTimeLeft: number, blackTimeLeft: number, lastMoveTimestamp: number, increment: number }
export const finishedGames = new Map(); // gameId -> { white, black, ... }
export const connectedUsers = new Map(); // userId -> socket

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: getDynamicCorsOrigin,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    console.log(`Socket connected: ${socket.id} (IP: ${ip})`);
    let currentUser = null;

    socket.on("authenticate", async ({ clerkId }) => {
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (user) {
        // Enforce single connection per user session
        if (connectedUsers.has(user.id)) {
          const oldSocket = connectedUsers.get(user.id);
          if (oldSocket.id !== socket.id) {
            oldSocket.disconnect(true);
          }
        }
        connectedUsers.set(user.id, socket);

        currentUser = { id: user.id, username: user.username, rating: user.rating, socketId: socket.id };
        socket.emit("authenticated");
      }
    });

    // --- Matchmaking ---
    socket.on("joinQueue", ({ timeControl }) => {
      if (!currentUser) return;
      
      if (!matchmakingQueue.some(p => p.userId === currentUser.id)) {
        matchmakingQueue.push({
          socketId: socket.id,
          userId: currentUser.id,
          username: currentUser.username,
          rating: currentUser.rating,
          timeControl: timeControl || "unlimited",
          enterTime: Date.now()
        });
      }
      
      socket.emit("queueJoined");
      checkMatch();
    });

    socket.on("leaveQueue", () => {
      if (!currentUser) return;
      const idx = matchmakingQueue.findIndex(p => p.userId === currentUser.id);
      if (idx !== -1) matchmakingQueue.splice(idx, 1);
    });

    // --- Challenge Links ---
    socket.on("createChallenge", ({ timeControl }) => {
      if (!currentUser) return;
      const challengeId = generateChallenge(currentUser.id, currentUser.username, socket.id, timeControl);
      socket.emit("challengeCreated", { challengeId });
      socket.join(`challenge_${challengeId}`);
    });

    socket.on("acceptChallenge", ({ challengeId }) => {
      if (!currentUser) return;

      const existingGame = activeGames.get(challengeId);
      if (existingGame) {
        if (existingGame.white.userId === currentUser.id) {
          existingGame.white.socketId = socket.id;
          existingGame.white.disconnected = false;
          socket.join(`game_${challengeId}`);
          socket.emit("matchFound", { 
            gameId: challengeId, color: "white", opponent: existingGame.black.username, fen: existingGame.fen,
            timeControl: existingGame.timeControl, whiteTimeLeft: existingGame.whiteTimeLeft, blackTimeLeft: existingGame.blackTimeLeft 
          });
          return;
        } else if (existingGame.black.userId === currentUser.id) {
          existingGame.black.socketId = socket.id;
          existingGame.black.disconnected = false;
          socket.join(`game_${challengeId}`);
          socket.emit("matchFound", { 
            gameId: challengeId, color: "black", opponent: existingGame.white.username, fen: existingGame.fen,
            timeControl: existingGame.timeControl, whiteTimeLeft: existingGame.whiteTimeLeft, blackTimeLeft: existingGame.blackTimeLeft 
          });
          return;
        }
      }

      const challenge = getChallenge(challengeId);
      if (challenge && challenge.challengerId === currentUser.id) {
        // Creator rejoining their own challenge page
        challenge.challengerSocketId = socket.id; 
        socket.emit("challengeCreated", { challengeId });
        socket.join(`challenge_${challengeId}`);
        return;
      }
      const match = acceptChallenge(challengeId, currentUser.id, currentUser.username, socket.id);
      if (match) {
        // Find challenger's socket
        io.to(`challenge_${challengeId}`).emit("challengeAccepted");
        setupGame(match);
      } else {
        socket.emit("challengeError", { message: "Challenge invalid or already accepted." });
      }
    });

    // --- Gameplay ---
    socket.on("move", ({ gameId, move, fen }) => {
      const game = activeGames.get(gameId);
      if (!game) return;
      
      // Ensure the sender is actually in the game
      if (game.white.userId !== currentUser?.id && game.black.userId !== currentUser?.id) return;
      // Time tracking
      if (game.timeControl !== "unlimited") {
        const now = Date.now();
        const elapsed = now - game.lastMoveTimestamp;
        const isWhite = game.moves.length % 2 === 0; // The player who just moved
        
        if (game.moves.length > 0) {
          if (isWhite) {
            game.whiteTimeLeft = Math.max(0, game.whiteTimeLeft - elapsed + game.increment);
          } else {
            game.blackTimeLeft = Math.max(0, game.blackTimeLeft - elapsed + game.increment);
          }
        }
        
        game.lastMoveTimestamp = now;

        if (game.whiteTimeLeft === 0) {
          return handleGameOver(gameId, "black_win", "timeout");
        } else if (game.blackTimeLeft === 0) {
          return handleGameOver(gameId, "white_win", "timeout");
        }
      }
      
      game.moves.push(move);
      game.fen = fen;
      
      socket.to(`game_${gameId}`).emit("opponentMove", { 
        move, 
        fen,
        whiteTimeLeft: game.whiteTimeLeft,
        blackTimeLeft: game.blackTimeLeft
      });
    });

    async function handleGameOver(gameId, result, reason) {
      const game = activeGames.get(gameId);
      if (!game) return;

      finishedGames.set(gameId, game);
      setTimeout(() => finishedGames.delete(gameId), 5 * 60 * 1000); // 5 mins
      
      activeGames.delete(gameId);
      
      // Broadcast game over
      io.to(`game_${gameId}`).emit("gameOver", { result, reason });

      // Calculate ratings and save to Neon DB
      try {
        const whiteUser = await prisma.user.findUnique({ where: { id: game.white.userId } });
        const blackUser = await prisma.user.findUnique({ where: { id: game.black.userId } });

        let whiteRatingAfter = whiteUser?.rating || 1200;
        let blackRatingAfter = blackUser?.rating || 1200;

        if (whiteUser && blackUser) {
          const { calculateNewRatings } = await import('./elo.js');
          const newRatings = calculateNewRatings(
            whiteUser.rating,
            blackUser.rating,
            result,
            whiteUser.ratingGames || 10,
            blackUser.ratingGames || 10
          );
          whiteRatingAfter = newRatings.newWhite;
          blackRatingAfter = newRatings.newBlack;

          await prisma.user.update({
            where: { id: whiteUser.id },
            data: {
              rating: whiteRatingAfter,
              ratingGames: { increment: 1 },
              ratingPeak: Math.max(whiteUser.ratingPeak || 1200, whiteRatingAfter)
            }
          });

          await prisma.user.update({
            where: { id: blackUser.id },
            data: {
              rating: blackRatingAfter,
              ratingGames: { increment: 1 },
              ratingPeak: Math.max(blackUser.ratingPeak || 1200, blackRatingAfter)
            }
          });
        }

        const savedGame = await prisma.pvPGame.create({
          data: {
            whiteUserId: game.white.userId,
            blackUserId: game.black.userId,
            moves: game.moves,
            result,
            timeControl: game.timeControl || "unlimited",
            totalMoves: game.moves.length,
            whiteRatingBefore: whiteUser?.rating || 1200,
            blackRatingBefore: blackUser?.rating || 1200,
            whiteRatingAfter,
            blackRatingAfter,
            challengeCode: gameId,
          }
        });

        // Trigger post-game hooks
        await onPvpGameSaved(savedGame.id);
      } catch (err) {
        console.error("Failed to save PvP game:", err);
      }
    }

    socket.on("gameOver", async ({ gameId, result }) => {
      const game = activeGames.get(gameId);
      if (!game) return;
      if (game.white.userId !== currentUser?.id && game.black.userId !== currentUser?.id) return;
      await handleGameOver(gameId, result);
    });

    socket.on("resign", async ({ gameId }) => {
      const game = activeGames.get(gameId);
      if (!game) return;
      
      const isWhite = game.white.userId === currentUser?.id;
      const result = isWhite ? "black_win" : "white_win";
      
      await handleGameOver(gameId, result, "resignation");
    });

    socket.on("offerDraw", ({ gameId }) => {
      const game = activeGames.get(gameId);
      if (!game) return;
      
      const isWhite = game.white.userId === currentUser?.id;
      const opponentSocketId = isWhite ? game.black.socketId : game.white.socketId;
      
      if (opponentSocketId) {
        socket.to(opponentSocketId).emit("drawOffered");
      }
    });

    socket.on("acceptDraw", async ({ gameId }) => {
      const game = activeGames.get(gameId);
      if (!game) return;
      
      await handleGameOver(gameId, "draw", "mutual agreement");
    });

    socket.on("declineDraw", ({ gameId }) => {
      const game = activeGames.get(gameId);
      if (!game) return;
      
      const isWhite = game.white.userId === currentUser?.id;
      const opponentSocketId = isWhite ? game.black.socketId : game.white.socketId;
      
      if (opponentSocketId) {
        socket.to(opponentSocketId).emit("drawDeclined");
      }
    });

    socket.on("offerRematch", ({ gameId, timeControl }) => {
      const game = finishedGames.get(gameId);
      if (!game || !currentUser) return;

      const isWhite = game.white.userId === currentUser.id;
      const opponentSocketId = isWhite ? game.black.socketId : game.white.socketId;

      if (opponentSocketId) {
        const challengeId = generateChallenge(currentUser.id, currentUser.username, socket.id, timeControl || game.timeControl);
        socket.join(`challenge_${challengeId}`);
        socket.to(opponentSocketId).emit("rematchOffered", { challengeId });
      }
    });

    socket.on("declineRematch", ({ challengeId, gameId }) => {
      const game = finishedGames.get(gameId);
      if (!game || !currentUser) return;
      
      const isWhite = game.white.userId === currentUser.id;
      const opponentSocketId = isWhite ? game.black.socketId : game.white.socketId;
      
      if (opponentSocketId) {
        socket.to(opponentSocketId).emit("rematchDeclined");
      }
    });

    socket.on("disconnect", () => {
      if (currentUser) {
        if (connectedUsers.get(currentUser.id)?.id === socket.id) {
          connectedUsers.delete(currentUser.id);
        }
        const idx = matchmakingQueue.findIndex(p => p.userId === currentUser.id);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);

        for (const [gameId, game] of activeGames.entries()) {
          if (game.white.socketId === socket.id) {
            game.white.disconnected = true;
          } else if (game.black.socketId === socket.id) {
            game.black.disconnected = true;
          }
          
          if (game.white.disconnected && game.black.disconnected) {
            handleGameOverServer(io, gameId, "draw", "abandonment");
          }
        }
      }
    });

    function checkMatch() {
      const match = tryMatchmaking();
      if (match) setupGame(match);
    }

    async function setupGame(match) {
      if (!match) return;
      
      let baseTime = null;
      let increment = 0;
      
      if (match.timeControl && match.timeControl !== "unlimited") {
        const parts = match.timeControl.split("+");
        if (parts.length === 2) {
          baseTime = parseInt(parts[0], 10) * 60 * 1000;
          increment = parseInt(parts[1], 10) * 1000;
        } else {
          // fallback to 10 mins if format is wrong
          baseTime = 10 * 60 * 1000;
        }
      }

      activeGames.set(match.gameId, {
        white: match.white,
        black: match.black,
        moves: [],
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        timeControl: match.timeControl || "unlimited",
        whiteTimeLeft: baseTime,
        blackTimeLeft: baseTime,
        increment: increment,
        lastMoveTimestamp: Date.now(),
      });
      
      const pvpGame = activeGames.get(match.gameId);
      
      // Notify both players
      io.to(match.white.socketId).socketsJoin(`game_${match.gameId}`);
      io.to(match.black.socketId).socketsJoin(`game_${match.gameId}`);
      
      io.to(match.white.socketId).emit("matchFound", { 
        gameId: match.gameId, 
        color: "white", 
        opponent: match.black.username,
        timeControl: pvpGame.timeControl,
        whiteTimeLeft: pvpGame.whiteTimeLeft,
        blackTimeLeft: pvpGame.blackTimeLeft
      });
        io.to(match.black.socketId).emit("matchFound", { 
        gameId: match.gameId, 
        color: "black", 
        opponent: match.white.username,
        timeControl: pvpGame.timeControl,
        whiteTimeLeft: pvpGame.whiteTimeLeft,
        blackTimeLeft: pvpGame.blackTimeLeft
      });
    }
  });

  // Background timeout checker
  setInterval(() => {
    const now = Date.now();
    for (const [gameId, game] of activeGames.entries()) {
      if (game.timeControl !== "unlimited" && game.moves.length > 0) {
        const elapsed = now - game.lastMoveTimestamp;
        const isWhite = game.moves.length % 2 === 0;
        
        let whiteTimeLeft = game.whiteTimeLeft;
        let blackTimeLeft = game.blackTimeLeft;

        if (isWhite) {
          whiteTimeLeft = Math.max(0, game.whiteTimeLeft - elapsed);
          if (whiteTimeLeft === 0) {
            handleGameOverServer(io, gameId, "black_win", "timeout");
          }
        } else {
          blackTimeLeft = Math.max(0, game.blackTimeLeft - elapsed);
          if (blackTimeLeft === 0) {
            handleGameOverServer(io, gameId, "white_win", "timeout");
          }
        }
      }
    }
  }, 1000);
}

async function handleGameOverServer(io, gameId, result, reason) {
  const game = activeGames.get(gameId);
  if (!game) return;

  finishedGames.set(gameId, game);
  setTimeout(() => finishedGames.delete(gameId), 5 * 60 * 1000);
  
  activeGames.delete(gameId);
  
  io.to(`game_${gameId}`).emit("gameOver", { result, reason });

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const whiteUser = await prisma.user.findUnique({ where: { id: game.white.userId } });
    const blackUser = await prisma.user.findUnique({ where: { id: game.black.userId } });

    let whiteRatingAfter = whiteUser?.rating || 1200;
    let blackRatingAfter = blackUser?.rating || 1200;

    if (whiteUser && blackUser) {
      const { calculateNewRatings } = await import('./elo.js');
      const newRatings = calculateNewRatings(
        whiteUser.rating,
        blackUser.rating,
        result,
        whiteUser.ratingGames || 10,
        blackUser.ratingGames || 10
      );
      whiteRatingAfter = newRatings.newWhite;
      blackRatingAfter = newRatings.newBlack;

      await prisma.user.update({
        where: { id: whiteUser.id },
        data: {
          rating: whiteRatingAfter,
          ratingGames: { increment: 1 },
          ratingPeak: Math.max(whiteUser.ratingPeak || 1200, whiteRatingAfter)
        }
      });

      await prisma.user.update({
        where: { id: blackUser.id },
        data: {
          rating: blackRatingAfter,
          ratingGames: { increment: 1 },
          ratingPeak: Math.max(blackUser.ratingPeak || 1200, blackRatingAfter)
        }
      });
    }

    const savedGame = await prisma.pvPGame.create({
      data: {
        whiteUserId: game.white.userId,
        blackUserId: game.black.userId,
        moves: game.moves,
        result,
        timeControl: game.timeControl || "unlimited",
        totalMoves: game.moves.length,
        whiteRatingBefore: whiteUser?.rating || 1200,
        blackRatingBefore: blackUser?.rating || 1200,
        whiteRatingAfter,
        blackRatingAfter,
        challengeCode: gameId,
      }
    });
    const { onPvpGameSaved } = await import('./postGameHooks.js');
    await onPvpGameSaved(savedGame.id);
    await prisma.$disconnect();
  } catch (err) {
    console.error("Failed to save PvP game on timeout:", err);
  }
}
