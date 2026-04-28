import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, getDocs, collection, query, where, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
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
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
    } else {
      console.warn("⚠️ Firebase connection check failed, but app may still work:", error);
    }
  }
}

// Call on startup
testConnection();