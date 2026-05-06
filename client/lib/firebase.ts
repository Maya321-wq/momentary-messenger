import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Validate Firebase config at module load time
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Log Firebase config validation (hide sensitive values)
const missingVars = Object.entries(firebaseConfig)
  .filter(([key, val]) => !val)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(
    `[FIREBASE]: ❌ Missing environment variables: ${missingVars.join(", ")}`
  );
  console.error(
    "[FIREBASE]: Please ensure all NEXT_PUBLIC_FIREBASE_* variables are set in .env.local"
  );
}

let app;
let auth;
let googleProvider;

try {
  app = initializeApp(firebaseConfig as any);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  
  googleProvider.addScope("email");
  googleProvider.addScope("profile");
  
  console.log("[FIREBASE]: ✅ Initialized successfully");
} catch (err) {
  console.error("[FIREBASE]: ❌ Initialization failed —", err);
  throw new Error(
    `Firebase initialization failed: ${err instanceof Error ? err.message : String(err)}`
  );
}

export { auth, googleProvider };