"use client";

import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Module-level singleton — one socket for the entire app lifetime
let socket: Socket | null = null;

/**
 * Returns (or lazily creates) the Socket.io singleton.
 * Does NOT connect automatically — call connectSocket() to authenticate
 * and open the transport.
 */
export function getSocket(): Socket {
  if (!socket) {
    console.log(`[SOCKET]: Creating singleton instance connecting to ${SOCKET_URL}`);
    socket = io(SOCKET_URL, {
      // Never auto-connect: we must attach the JWT token first
      autoConnect: false,
      // WebSocket ONLY — no polling fallback (prevents transport conflicts)
      transports: ["websocket"],
      // Reconnection strategy
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    // ── Global socket event listeners ──────────────────────

    socket.on("connect", () => {
      console.log(`[SOCKET]: Connected — ID: ${socket?.id}`);
    });

    socket.on("connect_error", (error) => {
      console.error(`[SOCKET]: Connection error —`, error);
    });

    socket.on("disconnect", (reason: string) => {
      console.warn(`[SOCKET]: Disconnected — Reason: ${reason}`);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`[SOCKET]: Reconnected after attempt ${attemptNumber}`);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`[SOCKET]: Reconnection attempt #${attemptNumber}`);
    });

    socket.on("reconnect_failed", () => {
      console.error(`[SOCKET]: Failed to reconnect after max attempts`);
    });
  }
  return socket;
}

/**
 * Attach the Firebase JWT and open the WebSocket connection.
 * Safe to call multiple times — skips if already connected.
 */
export function connectSocket(token: string): Socket {
  const s = getSocket();

  // Always refresh the auth token (it may have been renewed by Firebase)
  s.auth = { token };

  if (!s.connected) {
    console.log(`[SOCKET]: Initiating connection with token...`);
    s.connect();
  } else {
    console.log(`[SOCKET]: Already connected, skipping connect()`);
  }

  return s;
}

/**
 * Gracefully close the connection and destroy the singleton so the next
 * call to getSocket() starts fresh (important after logout).
 */
export function disconnectSocket(): void {
  if (socket) {
    console.log(`[SOCKET]: Disconnecting socket ${socket.id}`);
    socket.disconnect();
    socket = null;
  }
}

/**
 * Returns true when the socket exists and is currently connected.
 */
export function isSocketConnected(): boolean {
  return !!socket && socket.connected;
}