"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket, ChatMessage, PulseLog } from "@/hooks/useSocket";
import GhostChat from "@/components/GhostChat";
import SystemPulse from "@/components/SystemPulse";
import PresenceList from "@/components/PresenceList";

interface PresenceUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  online: boolean;
}

// Configurable TTL — mirrors backend REDIS_TTL env variable
const DEFAULT_TTL = Number(process.env.NEXT_PUBLIC_CHAT_TTL_SECONDS) || 120;

export default function ChatPage() {
  const { user, idToken, sessionState, loading, logout } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pulseLogs, setPulseLogs] = useState<PulseLog[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isWiping, setIsWiping] = useState(false);
  const [ttlSeconds] = useState(DEFAULT_TTL);
  const wipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (sessionState === "UNAUTHENTICATED") router.replace("/login");
    if (sessionState === "PENDING_PHONE") router.replace("/phone");
    if (sessionState === "PENDING_MFA") router.replace("/mfa");
  }, [sessionState, loading, router]);

  // ── Socket callbacks ────────────────────────────────────────────
  const handleMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handlePulse = useCallback((log: PulseLog) => {
    setPulseLogs((prev) => [...prev.slice(-199), log]); // keep last 200
  }, []);

  const handleWipe = useCallback(() => {
    // Start wipe animation
    setIsWiping(true);

    if (wipeTimerRef.current) clearTimeout(wipeTimerRef.current);

    // After glitch animation (~700ms) clear messages and end wipe state
    wipeTimerRef.current = setTimeout(() => {
      setMessages([]);
      setIsWiping(false);
    }, 700);

    // Push GHOST event to Pulse Monitor
    setPulseLogs((prev) => [
      ...prev,
      {
        id: `wipe-${Date.now()}`,
        tag: "GHOST",
        message: "TTL reached 0. Redis memory purged.",
        ts: Date.now(),
      },
    ]);
  }, []);

  const handlePresenceUpdate = useCallback(
    (raw: Record<string, boolean>) => {
      setPresenceUsers((prev) => {
        const existing = new Map(prev.map((u) => [u.uid, u]));
        return Object.entries(raw).map(([uid, online]) => ({
          uid,
          displayName: existing.get(uid)?.displayName || uid.slice(0, 10),
          photoURL: existing.get(uid)?.photoURL,
          online,
        }));
      });
    },
    []
  );

  const { sendMessage, joinRoom, status: socketStatus } = useSocket({
    token: idToken,
    onMessage: handleMessage,
    onPulse: handlePulse,
    onWipe: handleWipe,
    onPresenceUpdate: handlePresenceUpdate,
  });

  // Join private room when recipient is chosen
  useEffect(() => {
    if (!selectedUid || !user?.uid) return;
    const roomId = [user.uid, selectedUid].sort().join("_");
    joinRoom(roomId);
  }, [selectedUid, user?.uid, joinRoom]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (wipeTimerRef.current) clearTimeout(wipeTimerRef.current);
    };
  }, []);

  const handleSend = useCallback(
    (content: string) => {
      if (!selectedUid) return;
      sendMessage(selectedUid, content);
      // Optimistic local echo
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          from: user?.uid || "",
          fromName: user?.displayName || "you",
          content,
          ts: Date.now(),
        },
      ]);
    },
    [selectedUid, sendMessage, user]
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleClearLogs = useCallback(() => setPulseLogs([]), []);

  // Resolve selected user's display name for GhostChat header
  const selectedUser = presenceUsers.find((u) => u.uid === selectedUid);

  // ── Loading / guard screen ──────────────────────────────────────
  if (loading || sessionState !== "SECURE") {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-dim)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span className="cursor-blink">LOADING</span>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* ── Title bar ─────────────────────────────────────── */}
      <header
        style={{
          height: 38,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "12px",
          flexShrink: 0,
          background: "var(--bg-panel)",
        }}
      >
        {/* macOS-style traffic lights */}
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />

        <span
          style={{
            color: "var(--tag-ghost)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginLeft: "8px",
          }}
        >
          GHOST PROTOCOL
        </span>

        <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>
          // ephemeral messenger v2.1.0
        </span>

        <div style={{ flex: 1 }} />

        {/* Socket connection status indicator */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "10px",
            color:
              socketStatus === "connected" ? "var(--tag-auth)" :
              socketStatus === "reconnecting" ? "var(--tag-redis)" :
              socketStatus === "error" ? "var(--tag-error)" :
              "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              display: "inline-block",
              background:
                socketStatus === "connected" ? "var(--tag-auth)" :
                socketStatus === "reconnecting" ? "var(--tag-redis)" :
                socketStatus === "error" ? "var(--tag-error)" :
                "var(--text-muted)",
              boxShadow:
                socketStatus === "connected"
                  ? "0 0 5px var(--tag-auth)"
                  : "none",
            }}
          />
          {socketStatus}
        </span>

        <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>
          {user?.displayName || user?.email}
        </span>

        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid var(--border-accent)",
            borderRadius: "3px",
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            padding: "2px 8px",
            cursor: "pointer",
            letterSpacing: "0.06em",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--tag-error)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--tag-error)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-accent)";
          }}
        >
          logout
        </button>
      </header>

      {/* ── Three-column pane layout ─────────────────────────────── */}
      {/* [Presence 200px] | [GhostChat 1fr] | [SystemPulse 1fr]    */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "200px 1fr 1fr",
          overflow: "hidden",
        }}
      >
        {/* Pane 1 — Presence Sidebar */}
        <PresenceList
          users={presenceUsers}
          selectedUid={selectedUid}
          onSelect={setSelectedUid}
          currentUid={user?.uid || ""}
        />

        {/* Pane 2 — Ghost Chat */}
        <div
          style={{
            borderRight: "1px solid var(--border)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <GhostChat
            messages={messages}
            currentUid={user?.uid || ""}
            isWiping={isWiping}
            onSend={handleSend}
            recipientUid={selectedUid || ""}
            recipientName={
              selectedUser?.displayName ||
              (selectedUid ? selectedUid.slice(0, 12) : "—")
            }
            ttlSeconds={ttlSeconds}
          />
        </div>

        {/* Pane 3 — System Pulse Monitor */}
        <div
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SystemPulse logs={pulseLogs} onClear={handleClearLogs} />
        </div>
      </div>
    </div>
  );
}