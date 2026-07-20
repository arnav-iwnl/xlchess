import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useUser } from "@clerk/clerk-react";
import { Chess } from "chess.js";
import { useGlobalSocket } from "./useGlobalSocket";
import toast from "react-hot-toast";

export function usePvP() {
  const { user } = useUser();
  const socketRef = useRef(null);
  
  const [gameState, setGameState] = useState({
    status: "idle", // idle, queue, matched, playing, game_over
    isConnected: false,
    gameId: null,
    color: null,
    opponent: null,
    result: null,
    reason: null,
    drawOffer: null, // null | 'sent' | 'received'
    playAgainOffer: null, // null | 'sent' | 'received'
    rematchChallengeId: null,
    timeControl: "unlimited",
    whiteTimeLeft: null,
    blackTimeLeft: null,
  });

  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());

  const globalSocket = useGlobalSocket();

  useEffect(() => {
    if (!user || !globalSocket) return;

    socketRef.current = globalSocket;
    
    if (globalSocket.connected) {
      setGameState(s => ({ ...s, isConnected: true }));
    }

    const listeners = {
      authenticated: () => setGameState(s => ({ ...s, isConnected: true })),
      queueJoined: () => setGameState(s => ({ ...s, status: "queue" })),
      matchFound: ({ gameId, color, opponent, timeControl, whiteTimeLeft, blackTimeLeft, fen: serverFen }) => {
        if (serverFen) {
          chessRef.current = new Chess(serverFen);
        } else {
          chessRef.current = new Chess();
        }
        setFen(chessRef.current.fen());
        setGameState({
          status: "matched",
          gameId,
          color,
          opponent,
          result: null,
          reason: null,
          drawOffer: null,
          playAgainOffer: null,
          rematchChallengeId: null,
          timeControl,
          whiteTimeLeft,
          blackTimeLeft
        });
        setTimeout(() => setGameState(s => ({ ...s, status: "playing" })), 2000);
      },
      opponentMove: ({ move, fen: serverFen, whiteTimeLeft, blackTimeLeft }) => {
        chessRef.current.move(move);
        if (serverFen && chessRef.current.fen() !== serverFen) {
          chessRef.current.load(serverFen);
        }
        setFen(chessRef.current.fen());
        if (whiteTimeLeft !== undefined && blackTimeLeft !== undefined) {
          setGameState(s => ({ ...s, whiteTimeLeft, blackTimeLeft }));
        }
      },
      gameOver: ({ result, reason }) => {
        setGameState(s => ({ ...s, status: "game_over", result, reason, drawOffer: null }));
        window.dispatchEvent(new Event("gameSaved"));
      },
      drawOffered: () => setGameState(s => ({ ...s, drawOffer: 'received' })),
      drawDeclined: () => setGameState(s => ({ ...s, drawOffer: null })),
      rematchOffered: ({ challengeId }) => setGameState(s => ({ ...s, playAgainOffer: 'received', rematchChallengeId: challengeId })),
      rematchDeclined: () => setGameState(s => ({ ...s, playAgainOffer: 'declined' })),
      challengeCreated: ({ challengeId }) => setGameState(s => ({ ...s, status: "challenge_waiting", challengeId })),
      challengeError: ({ message }) => {
        setGameState(s => ({ ...s, status: "idle" }));
        toast.error(message);
      }
    };

    Object.entries(listeners).forEach(([event, handler]) => {
      globalSocket.on(event, handler);
    });

    return () => {
      Object.entries(listeners).forEach(([event, handler]) => {
        globalSocket.off(event, handler);
      });
      // We don't disconnect the global socket!
      socketRef.current = null;
    };
  }, [user, globalSocket]);

  const joinQueue = useCallback((timeControl = "unlimited") => {
    socketRef.current?.emit("joinQueue", { timeControl });
    setGameState(s => ({ ...s, status: "queue" }));
  }, []);

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit("leaveQueue");
    setGameState(s => ({ ...s, status: "idle" }));
  }, []);

  const makeMove = useCallback((moveObj) => {
    if (gameState.status !== "playing") return false;
    // Don't allow move if game is essentially over (e.g., local timeout but waiting for server confirmation)
    if (gameState.timeControl !== "unlimited") {
      const isWhite = gameState.color === "white";
      if (isWhite && gameState.whiteTimeLeft === 0) return false;
      if (!isWhite && gameState.blackTimeLeft === 0) return false;
    }

    try {
      const move = chessRef.current.move(moveObj);
      setFen(chessRef.current.fen());
      socketRef.current?.emit("move", { 
        gameId: gameState.gameId, 
        move: move.san, 
        fen: chessRef.current.fen() 
      });

      if (chessRef.current.isGameOver()) {
        let result = "draw";
        if (chessRef.current.isCheckmate()) {
          result = chessRef.current.turn() === "w" ? "black_win" : "white_win";
        }
        socketRef.current?.emit("gameOver", { gameId: gameState.gameId, result });
      }
      return true;
    } catch (e) {
      return false;
    }
  }, [gameState]);

  const resign = useCallback(() => {
    socketRef.current?.emit("resign", { gameId: gameState.gameId });
  }, [gameState.gameId]);

  const createChallenge = useCallback((timeControl = "unlimited") => {
    socketRef.current?.emit("createChallenge", { timeControl });
  }, []);

  const acceptChallenge = useCallback((challengeId) => {
    socketRef.current?.emit("acceptChallenge", { challengeId });
  }, []);

  const offerDraw = useCallback(() => {
    socketRef.current?.emit("offerDraw", { gameId: gameState.gameId });
    setGameState(s => ({ ...s, drawOffer: 'sent' }));
  }, [gameState.gameId]);

  const acceptDraw = useCallback(() => {
    socketRef.current?.emit("acceptDraw", { gameId: gameState.gameId });
  }, [gameState.gameId]);

  const declineDraw = useCallback(() => {
    socketRef.current?.emit("declineDraw", { gameId: gameState.gameId });
    setGameState(s => ({ ...s, drawOffer: null }));
  }, [gameState.gameId]);

  const offerRematch = useCallback((timeControl = null) => {
    // If not provided, it falls back to the previous game's time control in socket.js
    socketRef.current?.emit("offerRematch", { gameId: gameState.gameId, timeControl });
    setGameState(s => ({ ...s, playAgainOffer: 'sent' }));
  }, [gameState.gameId]);

  const declineRematch = useCallback(() => {
    socketRef.current?.emit("declineRematch", { gameId: gameState.gameId, challengeId: gameState.rematchChallengeId });
    setGameState(s => ({ ...s, playAgainOffer: null, rematchChallengeId: null }));
  }, [gameState.gameId, gameState.rematchChallengeId]);

  return {
    gameState,
    chess: chessRef.current,
    fen,
    joinQueue,
    leaveQueue,
    makeMove,
    resign,
    createChallenge,
    acceptChallenge,
    offerDraw,
    acceptDraw,
    declineDraw,
    offerRematch,
    declineRematch
  };
}
