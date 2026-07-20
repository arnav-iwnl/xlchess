import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useUser, useAuth } from "@clerk/clerk-react";
import { apiFetch, API_BASE_URL } from "../lib/api";
import toast from "react-hot-toast";

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isSignedIn, user } = useUser();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (isSignedIn && user) {
      const newSocket = io(import.meta.env.VITE_API_URL || "http://localhost:3001");
      
      newSocket.on("connect", () => {
        // Authenticate the socket directly using Clerk's ID
        newSocket.emit("authenticate", { clerkId: user.id });
      });

      const handleQueueJoined = () => {
        // can show UI
      };

      const handleReferralQualified = (data) => {
        toast.success(data.message, { duration: 6000, icon: '🎉' });
        // The coin balance will naturally sync on next api load or refresh
      };

      newSocket.on("queueJoined", handleQueueJoined);
      newSocket.on("referralQualified", handleReferralQualified);

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [isSignedIn, user?.id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

