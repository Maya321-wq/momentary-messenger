"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { verifyMFA } from "@/lib/api";

export default function MFAPage() {
  const { sessionState, setSessionState, idToken, user, logout } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (sessionState === "UNAUTHENTICATED") router.replace("/login");
    if (sessionState === "PENDING_PHONE") router.replace("/phone");
    if (sessionState === "SECURE") router.replace("/chat");
  }, [sessionState, router]);

  useEffect(() => {
    // Focus first box on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Enter all 6 digits.");
      return;
    }
    if (!idToken) {
      setError("Session expired. Please log in again.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await verifyMFA(fullCode, idToken);
      setSessionState("SECURE");
      router.replace("/chat");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid code";
      setAttempts((a) => a + 1);
      setError(`[TWILIO]: ${msg}`);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

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
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
          <span style={{ marginLeft: 12, color: "var(--tag-twilio)", fontSize: 11 }}>
            ghost-protocol — mfa@terminal
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
          {/* Status log lines */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ color: "var(--tag-twilio)", marginBottom: "6px", fontSize: "12px" }}>
              [TWILIO]: MFA challenge dispatched to +20XXXXX
            </div>
            <div style={{ color: "var(--tag-auth)", marginBottom: "6px", fontSize: "12px" }}>
              [AUTH]: Awaiting SMS code verification.
            </div>
            {user && (
              <div style={{ color: "var(--text-dim)", marginBottom: "6px", fontSize: "12px" }}>
                [AUTH]: Session for {user.email} is PENDING_MFA.
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border-accent)",
              marginBottom: "24px",
            }}
          />

          <p
            style={{
              color: "var(--text-primary)",
              marginBottom: "24px",
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            Enter the 6-digit code sent to your registered number.
            <br />
            <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>
              Code expires in 5 minutes.
            </span>
          </p>

          {/* OTP Input boxes */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "28px",
            }}
            onPaste={handlePaste}
          >
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isVerifying}
                style={{
                  width: "48px",
                  height: "56px",
                  textAlign: "center",
                  fontSize: "22px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  background: "var(--bg-input)",
                  border: `1px solid ${digit ? "var(--accent)" : "var(--border-accent)"}`,
                  borderRadius: "4px",
                  color: "var(--accent)",
                  caretColor: "var(--accent)",
                  outline: "none",
                  transition: "border-color 0.15s",
                  cursor: isVerifying ? "not-allowed" : "text",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 1px var(--accent-dim), 0 0 12px var(--accent-dim)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onBlur={(e) => {
                  if (!digit) {
                    e.currentTarget.style.borderColor = "var(--border-accent)";
                  }
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={isVerifying || code.join("").length !== 6}
            style={{
              width: "100%",
              padding: "10px 0",
              background: code.join("").length === 6 && !isVerifying
                ? "var(--accent-dim)"
                : "transparent",
              border: "1px solid var(--accent)",
              borderRadius: "4px",
              color: "var(--accent)",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              cursor:
                isVerifying || code.join("").length !== 6
                  ? "not-allowed"
                  : "pointer",
              opacity: code.join("").length !== 6 ? 0.4 : 1,
              letterSpacing: "0.05em",
              transition: "all 0.15s",
              marginBottom: "12px",
            }}
          >
            {isVerifying ? (
              <span className="cursor-blink">VERIFYING</span>
            ) : (
              "$ verify --code ••••••"
            )}
          </button>

          {/* Back to login */}
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              cursor: "pointer",
              padding: "4px 0",
              letterSpacing: "0.03em",
            }}
          >
            $ auth --logout
          </button>

          {/* Error display */}
          {error && (
            <div
              className="fade-in"
              style={{
                marginTop: "16px",
                color: "var(--tag-error)",
                fontSize: "12px",
                padding: "8px 12px",
                border: "1px solid var(--tag-error)",
                borderRadius: "3px",
                background: "rgba(248,113,113,0.05)",
              }}
            >
              {error}
              {attempts >= 3 && (
                <div style={{ marginTop: "6px", color: "var(--text-dim)" }}>
                  // Multiple failed attempts detected.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}