"use client";

interface PresenceUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  online: boolean;
}

interface PresenceListProps {
  users: PresenceUser[];
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  currentUid: string;
}

export default function PresenceList({
  users,
  selectedUid,
  onSelect,
  currentUid,
}: PresenceListProps) {
  const others = users.filter((u) => u.uid !== currentUid);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "var(--text-dim)",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Presence
        </span>
      </div>

      {/* User list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {others.length === 0 ? (
          <div
            style={{
              padding: "12px",
              color: "var(--text-muted)",
              fontSize: "10px",
            }}
          >
            // No other users online
          </div>
        ) : (
          others.map((user) => (
            <button
              key={user.uid}
              onClick={() => onSelect(user.uid)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "6px 12px",
                background:
                  selectedUid === user.uid
                    ? "var(--accent-dim)"
                    : "transparent",
                border: "none",
                borderLeft:
                  selectedUid === user.uid
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.1s",
                color:
                  selectedUid === user.uid
                    ? "var(--accent)"
                    : "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
              }}
              onMouseEnter={(e) => {
                if (selectedUid !== user.uid) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.02)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedUid !== user.uid) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }
              }}
            >
              {/* Online indicator */}
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: user.online
                    ? "var(--accent)"
                    : "var(--text-muted)",
                  flexShrink: 0,
                  boxShadow: user.online ? "0 0 4px var(--accent)" : "none",
                }}
              />

              {/* Name */}
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {user.displayName || user.uid.slice(0, 10)}
              </span>

              {/* Status label */}
              <span
                style={{
                  fontSize: "9px",
                  color: user.online ? "var(--accent)" : "var(--text-muted)",
                  letterSpacing: "0.06em",
                  flexShrink: 0,
                }}
              >
                {user.online ? "ON" : "OFF"}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Self indicator */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "8px 12px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "var(--text-dim)",
              fontSize: "10px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            you ({currentUid.slice(0, 8)}…)
          </span>
        </div>
      </div>
    </div>
  );
}