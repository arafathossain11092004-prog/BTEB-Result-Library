import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, getDocs, collection, query, where, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
if (!dbId || dbId === "123" || dbId === "(default)") {
  dbId = "(default)";
}

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0079376731",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:637362903014:web:dedd53fdbb46391cb2e827",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyABpPxXnd4bF5rPtiJ7Ul5GBfjUJR9xCO8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0079376731.firebaseapp.com",
  firestoreDatabaseId: dbId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0079376731.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "637362903014",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// --- DEBUG ENVIRONMENT VARIABLES ---
const maskSecret = (secret: string | undefined | null) => {
  if (!secret) return 'undefined or empty';
  if (secret.length <= 6) return '***';
  return `${secret.slice(0, 4)}...${secret.slice(-3)}`;
};

console.log("Firebase Env Variables Check (Masked):", {
  VITE_FIREBASE_PROJECT_ID: maskSecret(firebaseConfig.projectId),
  VITE_FIREBASE_API_KEY: maskSecret(firebaseConfig.apiKey),
  VITE_FIREBASE_APP_ID: maskSecret(firebaseConfig.appId),
  VITE_FIREBASE_AUTH_DOMAIN: maskSecret(firebaseConfig.authDomain),
  VITE_FIREBASE_DATABASE_ID: maskSecret(firebaseConfig.firestoreDatabaseId),
});
// ------------------------------------

if (!firebaseConfig.projectId) {
  console.warn("Firebase environment variables are missing. Please set VITE_FIREBASE_PROJECT_ID and others in your .env.local file.");
}

export const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const signOut = () => fbSignOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Function to test connection
export async function testConnection() {
  if (!firebaseConfig.projectId) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log(`✅ Successfully connected to Firestore using database: ${firebaseConfig.firestoreDatabaseId}`);
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("❌ Please check your Firebase configuration. The client is offline.");
      console.error("Make sure your VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_DATABASE_ID are correct.");
      console.error(`Current Database ID being used is: "${firebaseConfig.firestoreDatabaseId}". If your database in Firebase Console has a different name, you must update VITE_FIREBASE_DATABASE_ID in Vercel.`);
    } else {
      console.warn("⚠️ Firebase connection check failed, but app may still work:", error);
    }
  }
}

// Call on startup
testConnection();