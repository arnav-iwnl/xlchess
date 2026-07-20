import { useContext } from "react";
import { SocketContext } from "../contexts/SocketContext";

export function useGlobalSocket() {
  return useContext(SocketContext);
}
