"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
} from "@/lib/socket";

// ─── Shared types (also imported by chat/page.tsx) ────────────────────────────

export interface PulseLog {
  id: string;
  /** AUTH | SOCKET | REDIS | GHOST | TWILIO | ERROR | SYSTEM */
  tag: string;
  message: string;
  /** Unix ms timestamp */
  ts: number;
}

export interface ChatMessage {
  id: string;
  /** Firebase UID of the sender */
  from: string;
  fromName: string;
  content: string;
  ts: number;
}

// ─── Hook options ─────────────────────────────────────────────────────────────

interface UseSocketOptions {
  /** Firebase ID Token — hook connects only when this is non-null */
  token: string | null;
  /** Called when a new chat message is received from the server */
  onMessage?: (msg: ChatMessage) => void;
  /** Called when the server emits a system-pulse log entry */
  onPulse?: (log: PulseLog) => void;
  /** Called when Redis TTL expires and the server broadcasts ghost:wipe */
  onWipe?: () => void;
  /** Called when the server pushes an updated presence map */
  onPresenceUpdate?: (users: Record<string, boolean>) => void;
}

// ─── Connection status type ───────────────────────────────────────────────────

export type SocketStatus =
  | "idle"          // no token yet / not started
  | "connecting"    // socket.connect() called, waiting for "connect" event
  | "connected"     // socket confirmed open
  | "reconnecting"  // lost and trying to recover
  | "error"         // max reconnect attempts reached or auth failure
  | "disconnected"; // cleanly disconnected (logout)

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSocket({
  token,
  onMessage,
  onPulse,
  onWipe,
  onPresenceUpdate,
}: UseSocketOptions) {
  const [status, setStatus] = useState<SocketStatus>("idle");

  // Keep latest callbacks in refs so event listeners never go stale
  const onMessageRef = useRef(onMessage);
  const onPulseRef = useRef(onPulse);
  const onWipeRef = useRef(onWipe);
  const onPresenceRef = useRef(onPresenceUpdate);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onPulseRef.current = onPulse; }, [onPulse]);
  useEffect(() => { onWipeRef.current = onWipe; }, [onWipe]);
  useEffect(() => { onPresenceRef.current = onPresenceUpdate; }, [onPresenceUpdate]);

  // ── Main connection effect ────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const socket = connectSocket(token);

    // ── Transport / lifecycle events ──────────────────────────

    const onConnect = () => {
      // Immediately emit auth token
      socket.emit('auth', { token });
    };

    const onAuthSuccess = (userData: any) => {
      setStatus("connected");
      onPulseRef.current?.({
        id: `socket-auth-${Date.now()}`,
        tag: "AUTH",
        message: `Authenticated as ${userData.displayName}. Socket.io ready.`,
        ts: Date.now(),
      });
    };

    const onAuthError = (err: any) => {
      setStatus("error");
      onPulseRef.current?.({
        id: `socket-auth-error-${Date.now()}`,
        tag: "ERROR",
        message: `Socket auth failed: ${err.message}`,
        ts: Date.now(),
      });
    };

    const onDisconnect = (reason: string) => {
      // "io client disconnect" = intentional (logout), anything else = unexpected
      if (reason === "io client disconnect") {
        setStatus("disconnected");
      } else {
        setStatus("reconnecting");
        onPulseRef.current?.({
          id: `socket-disconnect-${Date.now()}`,
          tag: "SOCKET",
          message: `Disconnected — reason: ${reason}. Attempting reconnect…`,
          ts: Date.now(),
        });
      }
    };

    const onConnectError = (err: Error) => {
      setStatus("error");
      onPulseRef.current?.({
        id: `socket-error-${Date.now()}`,
        tag: "ERROR",
        message: `Socket connection error: ${err.message}`,
        ts: Date.now(),
      });
    };

    const onReconnectAttempt = (attempt: number) => {
      setStatus("reconnecting");
      onPulseRef.current?.({
        id: `socket-reconnect-${Date.now()}`,
        tag: "SOCKET",
        message: `Reconnect attempt #${attempt}…`,
        ts: Date.now(),
      });
    };

    const onReconnectFailed = () => {
      setStatus("error");
      onPulseRef.current?.({
        id: `socket-reconnect-failed-${Date.now()}`,
        tag: "ERROR",
        message: "Max reconnect attempts reached. Connection failed.",
        ts: Date.now(),
      });
    };

    // ── Application events ────────────────────────────────────

    /** Incoming chat message from another user */
    const onMessageReceive = (msg: ChatMessage) => {
      onMessageRef.current?.(msg);
    };

    /** Backend system-pulse log entry */
    const onPulseEvent = (log: PulseLog) => {
      onPulseRef.current?.(log);
    };

    /** Redis TTL hit zero — conversation has been purged */
    const onGhostWipe = () => {
      onWipeRef.current?.();
      onPulseRef.current?.({
        id: `ghost-wipe-${Date.now()}`,
        tag: "GHOST",
        message: "TTL reached 0. Redis memory purged.",
        ts: Date.now(),
      });
    };

    /** Presence map pushed by the server: { [uid]: isOnline } */
    const onPresenceUpdate = (users: Record<string, boolean>) => {
      onPresenceRef.current?.(users);
    };

    // Register all listeners
    socket.on("connect", onConnect);
    socket.on("auth:success", onAuthSuccess);
    socket.on("auth:error", onAuthError);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("reconnect_failed", onReconnectFailed);

    socket.on("message:receive", onMessageReceive);
    socket.on("pulse", onPulseEvent);
    socket.on("ghost:wipe", onGhostWipe);
    socket.on("presence:update", onPresenceUpdate);

    // If already connected from a previous render, fire onConnect manually
    if (isSocketConnected()) {
      onConnect();
    }

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      socket.off("connect", onConnect);
      socket.off("auth:success", onAuthSuccess);
      socket.off("auth:error", onAuthError);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("reconnect_failed", onReconnectFailed);

      socket.off("message:receive", onMessageReceive);
      socket.off("pulse", onPulseEvent);
      socket.off("ghost:wipe", onGhostWipe);
      socket.off("presence:update", onPresenceUpdate);

      // Full disconnect + singleton reset on token change or unmount
      disconnectSocket();
      setStatus("disconnected");
    };
    // Re-run only when the token changes (login / token refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Emitters (stable references via useCallback) ──────────────

  /**
   * Send a chat message to another user by UID.
   * The server will write to Redis, set the TTL, and emit to the recipient.
   */
  const sendMessage = useCallback(
    (toUid: string, content: string) => {
      if (!token || !isSocketConnected()) return;
      getSocket().emit("message:send", { toUid, content });
    },
    [token]
  );

  /**
   * Join a private 1-on-1 room identified by a deterministic room ID.
   * Convention: [uidA, uidB].sort().join("_")
   */
  const joinRoom = useCallback(
    (roomId: string) => {
      if (!token || !isSocketConnected()) return;
      getSocket().emit("room:join", { roomId });
    },
    [token]
  );

  /**
   * Leave a room explicitly (e.g. when switching conversations).
   */
  const leaveRoom = useCallback(
    (roomId: string) => {
      if (!token || !isSocketConnected()) return;
      getSocket().emit("room:leave", { roomId });
    },
    [token]
  );

  return {
    /** Current transport status — use to show connection indicator in UI */
    status,
    sendMessage,
    joinRoom,
    leaveRoom,
  };
}