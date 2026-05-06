"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, sessionState, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (sessionState === "PENDING_PHONE") router.replace("/phone");
    if (sessionState === "PENDING_MFA") router.replace("/mfa");
    if (sessionState === "SECURE") router.replace("/chat");
  }, [sessionState, loading, router]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Redirect handled by useAuth context
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      setIsSigningIn(false);
    }
  }, [signInWithGoogle]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        fontFamily: "var(--font-mono)",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Terminal header */}
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: "6px 6px 0 0",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ff5f57",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#febc2e",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#28c840",
              display: "inline-block",
            }}
          />
          <span style={{ marginLeft: 12, color: "var(--tag-ghost)", fontSize: 11 }}>
            ghost-protocol — auth@terminal
          </span>
        </div>

        {/* Terminal body */}
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 6px 6px",
            padding: "28px 24px",
          }}
        >
          {/* Welcome message */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ color: "var(--tag-ghost)", marginBottom: "12px", fontSize: "12px" }}>
              [GHOST]: Welcome to Momentary Messenger
            </div>
            <div style={{ color: "var(--text-dim)", marginBottom: "6px", fontSize: "12px" }}>
              Ephemeral peer-to-peer messaging with Redis TTL expiration.
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              All conversations auto-delete after 120 seconds of inactivity.
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border-accent)",
              marginBottom: "24px",
            }}
          />

          {/* Status log */}
          <div style={{ marginBottom: "24px" }}>
            {user ? (
              <div style={{ color: "var(--tag-auth)", marginBottom: "6px", fontSize: "12px" }}>
                [AUTH]: Already signed in as {user.email}
              </div>
            ) : (
              <div style={{ color: "var(--tag-auth)", marginBottom: "6px", fontSize: "12px" }}>
                [AUTH]: Ready for authentication.
              </div>
            )}
            {error && (
              <div style={{ color: "var(--tag-error)", marginBottom: "6px", fontSize: "12px" }}>
                [ERROR]: {error}
              </div>
            )}
          </div>

          {/* Main CTA */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn || loading}
            style={{
              width: "100%",
              padding: "12px 0",
              background:
                isSigningIn || loading ? "transparent" : "var(--accent-dim)",
              border: "1px solid var(--accent)",
              borderRadius: "4px",
              color: "var(--accent)",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              cursor:
                isSigningIn || loading ? "not-allowed" : "pointer",
              opacity: isSigningIn || loading ? 0.4 : 1,
              letterSpacing: "0.05em",
              transition: "all 0.15s",
              marginBottom: "12px",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              if (!isSigningIn && !loading) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--bg-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSigningIn && !loading) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--accent-dim)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--accent)";
              }
            }}
          >
            {isSigningIn ? (
              <span className="cursor-blink">SIGNING IN</span>
            ) : (
              "$ gcloud auth google-login"
            )}
          </button>

          {/* Footer info */}
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "10px",
              lineHeight: 1.6,
              paddingTop: "12px",
              borderTop: "1px solid var(--border-accent)",
            }}
          >
            <div>By signing in with Google, you consent to:</div>
            <div>• Storage of your profile in MongoDB</div>
            <div>• Ephemeral messaging with automatic deletion</div>
            <div>• Optional MFA via Twilio SMS</div>
          </div>
        </div>
      </div>
    </div>
  );
}