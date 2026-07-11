import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_REALTIME_URL || "http://localhost:4001";

export function createSocketConnection(token: string): Socket {
  return io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
  });
}
