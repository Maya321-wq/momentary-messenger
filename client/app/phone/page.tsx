"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

export default function PhonePage() {
  const { sessionState, setSessionState, idToken, logout, savePhoneNumber } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionState === "UNAUTHENTICATED") router.replace("/login");
    if (sessionState === "PENDING_MFA") router.replace("/mfa");
    if (sessionState === "SECURE") router.replace("/chat");
  }, [sessionState, router]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const formatPhone = (value: string) => {
    // Allow only digits and +
    return value.replace(/[^\d+]/g, "");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid phone number (at least 10 digits)");
      return;
    }

    if (!idToken) {
      setError("Session expired. Please log in again.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await savePhoneNumber(phone);
      // After saving, the auth hook will redirect to MFA or secure
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save phone number";
      setError(`[AUTH]: ${msg}`);
    } finally {
      setIsSaving(false);
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
            phone-setup — auth@terminal
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
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "8px",
            }}
          >
            Phone Number Required
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-dim)",
              marginBottom: "24px",
              lineHeight: 1.5,
            }}
          >
            To enable two-factor authentication for your account, please enter your phone number.
            We'll send a verification code to verify your number.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--text-dim)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Phone Number
              </label>
              <input
                ref={inputRef}
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+1234567890"
                disabled={isSaving}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  marginTop: "6px",
                }}
              >
                Include country code (e.g., +1 for US)
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(255, 95, 87, 0.1)",
                  border: "1px solid rgba(255, 95, 87, 0.3)",
                  borderRadius: "4px",
                  color: "#ff5f57",
                  fontSize: "12px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: "100%",
                padding: "12px",
                background: isSaving ? "var(--accent-dim)" : "var(--accent)",
                border: "none",
                borderRadius: "4px",
                color: "#fff",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              {isSaving ? "SAVING..." : "CONTINUE"}
            </button>
          </form>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "10px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}