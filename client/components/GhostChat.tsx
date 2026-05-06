"use client";

import { useRef, useEffect, useState } from "react";

export interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  content: string;
  ts: number;
}

interface GhostChatProps {
  messages: ChatMessage[];
  currentUid: string;
  isWiping: boolean;
  onSend: (text: string) => void;
  recipientUid: string;
  recipientName: string;
  ttlSeconds: number;
}

export default function GhostChat({
  messages,
  currentUid,
  isWiping,
  onSend,
  recipientName,
  ttlSeconds,
}: GhostChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-secondary)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* Pane header */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "var(--tag-ghost)", fontSize: "11px", fontWeight: 700 }}>
            ▸ GHOST CHAT
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>
            // {recipientName || "—"}
          </span>
        </div>
        <div style={{ color: "var(--tag-redis)", fontSize: "10px" }}>
          TTL: {ttlSeconds}s
        </div>
      </div>

      {/* Messages area */}
      <div
        className={isWiping ? "ghost-wipe" : ""}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              textAlign: "center",
              marginTop: "40px",
            }}
          >
            // No messages. Start transmitting.
            <br />
            // All messages expire after {ttlSeconds}s of inactivity.
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.from === currentUid;
          return (
            <div
              key={msg.id}
              className="fade-in"
              style={{
                marginBottom: "6px",
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
              }}
            >
              {/* Timestamp */}
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "10px",
                  whiteSpace: "nowrap",
                  paddingTop: "2px",
                  flexShrink: 0,
                }}
              >
                {formatTime(msg.ts)}
              </span>

              {/* Message line: [Name]: content */}
              <span style={{ color: isMine ? "var(--accent)" : "var(--tag-socket)", flexShrink: 0 }}>
                [{msg.fromName || msg.from.slice(0, 8)}]:
              </span>
              <span
                style={{
                  color: isMine ? "var(--text-primary)" : "#b0c8c0",
                  wordBreak: "break-word",
                  fontSize: "13px",
                }}
              >
                {msg.content}
              </span>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Wipe notice */}
      {isWiping && (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(167, 139, 250, 0.08)",
            borderTop: "1px solid var(--tag-ghost)",
            color: "var(--tag-ghost)",
            fontSize: "11px",
            textAlign: "center",
          }}
        >
          [GHOST]: Memory purged. Conversation deleted.
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "var(--accent)", fontSize: "13px", flexShrink: 0 }}>
          &gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message..."
          disabled={isWiping}
          className="terminal-input"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            outline: "none",
            caretColor: "var(--accent)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isWiping}
          style={{
            background: "transparent",
            border: "1px solid var(--border-accent)",
            borderRadius: "3px",
            color: input.trim() ? "var(--accent)" : "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            padding: "4px 10px",
            cursor: input.trim() && !isWiping ? "pointer" : "not-allowed",
            transition: "all 0.15s",
            letterSpacing: "0.05em",
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}