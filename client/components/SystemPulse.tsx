"use client";

import { useRef, useEffect } from "react";

export interface PulseLog {
  id: string;
  tag: string;
  message: string;
  ts: number;
}

interface SystemPulseProps {
  logs: PulseLog[];
  onClear?: () => void;
}

const TAG_COLORS: Record<string, string> = {
  AUTH:   "var(--tag-auth)",
  SOCKET: "var(--tag-socket)",
  REDIS:  "var(--tag-redis)",
  GHOST:  "var(--tag-ghost)",
  TWILIO: "var(--tag-twilio)",
  ERROR:  "var(--tag-error)",
  SYSTEM: "var(--tag-system)",
};

function formatTs(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) +
    "." +
    String(d.getMilliseconds()).padStart(3, "0")
  );
}

export default function SystemPulse({ logs, onClear }: SystemPulseProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest log
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-panel)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* Header */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: logs.length > 0 ? "var(--accent)" : "var(--text-muted)",
              display: "inline-block",
              boxShadow: logs.length > 0 ? "0 0 6px var(--accent)" : "none",
            }}
          />
          <span style={{ color: "var(--tag-redis)", fontSize: "11px", fontWeight: 700 }}>
            ▸ SYSTEM PULSE MONITOR
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
            {logs.length} events
          </span>
          {onClear && (
            <button
              onClick={onClear}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                cursor: "pointer",
                padding: "2px 6px",
                letterSpacing: "0.04em",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tag-error)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
            >
              [CLEAR]
            </button>
          )}
        </div>
      </div>

      {/* Log stream */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 14px",
        }}
      >
        {logs.length === 0 && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              textAlign: "center",
              marginTop: "30px",
            }}
          >
            // Awaiting backend events...
          </div>
        )}

        {logs.map((log) => {
          const tagColor = TAG_COLORS[log.tag] || "var(--tag-system)";
          return (
            <div
              key={log.id}
              className="fade-in"
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "4px",
                fontSize: "11px",
                lineHeight: 1.6,
                alignItems: "flex-start",
              }}
            >
              {/* Millisecond timestamp */}
              <span
                style={{
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontSize: "10px",
                  paddingTop: "1px",
                }}
              >
                {formatTs(log.ts)}
              </span>

              {/* Tag badge */}
              <span
                style={{
                  color: tagColor,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                  paddingTop: "1px",
                }}
              >
                [{log.tag}]
              </span>

              {/* Message */}
              <span style={{ color: "var(--text-dim)", wordBreak: "break-all" }}>
                {log.message}
              </span>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Live indicator */}
      <div
        style={{
          padding: "6px 14px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "inline-block",
            boxShadow: "0 0 4px var(--accent)",
            animation: "blink 2s step-end infinite",
          }}
        />
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
          LIVE — events streaming from Express/Redis
        </span>
      </div>
    </div>
  );
}