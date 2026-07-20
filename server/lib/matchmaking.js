import { randomUUID } from "crypto";

// In-memory matchmaking state (in production, use Redis for multi-node support)
// For early game startup, in-memory is fine for a single node

// queue: Array of { socketId, userId, username, rating, timeControl, enterTime }
export const matchmakingQueue = [];
// challenges: Map of challengeId -> { challengerId, challengerUsername, status, ... }
export const activeChallenges = new Map();

/**
 * Tries to find a match for a queued player based on rating.
 * Expanded rating bracket over time.
 */
export function tryMatchmaking() {
  if (matchmakingQueue.length < 2) return null;
  
  const now = Date.now();
  // Sort queue by time waited (oldest first)
  matchmakingQueue.sort((a, b) => a.enterTime - b.enterTime);
  
  for (let i = 0; i < matchmakingQueue.length; i++) {
    const p1 = matchmakingQueue[i];
    const waited1 = (now - p1.enterTime) / 1000;
    const bracket1 = 50 + (waited1 * 10); // Expands 10 Elo per second waited
    
    for (let j = i + 1; j < matchmakingQueue.length; j++) {
      const p2 = matchmakingQueue[j];
      const waited2 = (now - p2.enterTime) / 1000;
      const bracket2 = 50 + (waited2 * 10);
      
      const ratingDiff = Math.abs(p1.rating - p2.rating);
      
      if (p1.timeControl === p2.timeControl && (ratingDiff <= bracket1 || ratingDiff <= bracket2)) {
        // Match found! Remove both from queue
        matchmakingQueue.splice(j, 1);
        matchmakingQueue.splice(i, 1);
        
        // Randomly assign colors
        const isP1White = Math.random() > 0.5;
        return {
          white: isP1White ? p1 : p2,
          black: isP1White ? p2 : p1,
          timeControl: p1.timeControl,
          gameId: randomUUID(),
        };
      }
    }
  }
  return null;
}

export function generateChallenge(userId, username, socketId, timeControl) {
  const challengeId = randomUUID().substring(0, 8); // Short ID for shareable link
  activeChallenges.set(challengeId, {
    id: challengeId,
    challengerId: userId,
    challengerUsername: username,
    challengerSocketId: socketId,
    timeControl: timeControl || 'unlimited',
    status: 'waiting',
    createdAt: Date.now()
  });
  return challengeId;
}

export function getChallenge(challengeId) {
  return activeChallenges.get(challengeId);
}

export function acceptChallenge(challengeId, opponentId, opponentUsername, opponentSocketId) {
  const challenge = activeChallenges.get(challengeId);
  if (!challenge || challenge.status !== 'waiting') return null;
  if (challenge.challengerId === opponentId) return null; // Can't challenge self
  
  challenge.status = 'accepted';
  const isChallengerWhite = Math.random() > 0.5;
  
  const match = {
    white: isChallengerWhite 
      ? { userId: challenge.challengerId, username: challenge.challengerUsername, socketId: challenge.challengerSocketId } 
      : { userId: opponentId, username: opponentUsername, socketId: opponentSocketId },
    black: isChallengerWhite 
      ? { userId: opponentId, username: opponentUsername, socketId: opponentSocketId } 
      : { userId: challenge.challengerId, username: challenge.challengerUsername, socketId: challenge.challengerSocketId },
    timeControl: challenge.timeControl,
    gameId: challengeId,
  };
  
  activeChallenges.delete(challengeId);
  return match;
}

// Cleanup stale challenges periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of activeChallenges.entries()) {
    if (now - challenge.createdAt > 30 * 60 * 1000) { // 30 minutes
      activeChallenges.delete(id);
    }
  }
}, 60 * 1000);
