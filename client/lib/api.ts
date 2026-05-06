const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * POST /auth/login — Register or authenticate user with Firebase ID token
 * Backend returns { requiresPhone, requiresMFA, user: {...}, mongoAvailable }
 */
export async function loginWithToken(
  idToken: string
): Promise<{
  requiresPhone: boolean;
  requiresMFA: boolean;
  uid: string;
  user: any;
  mongoAvailable?: boolean;
}> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Login failed: ${response.statusText} — ${error.error || ""}`
      );
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("[API]: Login error —", err);
    throw err;
  }
}

/**
 * POST /auth/save-phone — Save user's phone number
 * Input: { phoneNumber }
 * Returns: { success: true, user: {...} }
 */
export async function savePhone(
  phoneNumber: string,
  idToken: string
): Promise<{
  success: boolean;
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    phoneNumber: string;
  };
}> {
  try {
    const response = await fetch(`${API_URL}/auth/save-phone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ phoneNumber }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Save phone failed: ${response.statusText} — ${error.error || ""}`
      );
    }

    return response.json();
  } catch (err) {
    console.error("[API]: Save phone error —", err);
    throw err;
  }
}

/**
 * POST /auth/mfa/verify — Verify OTP code from Twilio
 * Returns { requiresMFA: false } on success
 */
export async function verifyMFA(
  code: string,
  idToken: string
): Promise<{ requiresMFA: boolean }> {
  try {
    const response = await fetch(`${API_URL}/auth/mfa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `MFA verification failed: ${response.statusText} — ${error.error || ""}`
      );
    }

    return response.json();
  } catch (err) {
    console.error("[API]: MFA verification error —", err);
    throw err;
  }
}
