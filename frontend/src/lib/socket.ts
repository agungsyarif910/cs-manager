import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      this.socket = io(SOCKET_URL, {
        auth: {
          token
        },
        transports: ['websocket']
      });

      this.socket.on("connect", () => {
        console.log("WebSocket connected");
      });

      this.socket.on("disconnect", () => {
        console.log("WebSocket disconnected");
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
