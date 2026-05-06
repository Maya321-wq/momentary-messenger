"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  JSX,
} from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { loginWithToken, savePhone } from "@/lib/api";

export type SessionState = "UNAUTHENTICATED" | "PENDING_PHONE" | "PENDING_MFA" | "SECURE";

interface AuthContextValue {
  user: User | null;
  idToken: string | null;
  sessionState: SessionState;
  setSessionState: (s: SessionState) => void;
  signInWithGoogle: () => Promise<void>;
  savePhoneNumber: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>(
    "UNAUTHENTICATED"
  );
  const [loading, setLoading] = useState(true);

  // Monitor Firebase authentication state
  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
        } else {
          setIdToken(null);
          setSessionState("UNAUTHENTICATED");
        }
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // Google sign-in with backend registration
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);

      // Call backend /auth/login — handles new/returning user registration
      const data = await loginWithToken(token);

      // Backend tells us what state we need
      if (data.requiresPhone) {
        setSessionState("PENDING_PHONE");
      } else if (data.requiresMFA) {
        setSessionState("PENDING_MFA");
      } else {
        setSessionState("SECURE");
      }
    } catch (err) {
      console.error("[AUTH]: Google sign-in error —", err);
      setSessionState("UNAUTHENTICATED");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save phone number and proceed with MFA
  const savePhoneNumber = useCallback(async (phone: string) => {
    if (!idToken) {
      throw new Error("No authentication token");
    }

    try {
      // Save phone to backend
      const data = await savePhone(phone, idToken);
      
      // After saving phone, we need to re-login to trigger MFA flow
      const loginData = await loginWithToken(idToken);
      
      if (loginData.requiresMFA) {
        setSessionState("PENDING_MFA");
      } else {
        setSessionState("SECURE");
      }
    } catch (err) {
      console.error("[AUTH]: Save phone error —", err);
      throw err;
    }
  }, [idToken]);

  // Logout and cleanup
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setSessionState("UNAUTHENTICATED");
      setIdToken(null);
      setUser(null);
    } catch (err) {
      console.error("[AUTH]: Logout error —", err);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    idToken,
    sessionState,
    setSessionState,
    signInWithGoogle,
    savePhoneNumber,
    logout,
    loading,
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}