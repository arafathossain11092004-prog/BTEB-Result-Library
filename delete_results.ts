import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAll() {
  const snapshot = await getDocs(collection(db, 'results'));
  let count = 0;
  for (const dbDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'results', dbDoc.id));
    count++;
  }
  console.log(`Deleted ${count} results.`);
}
deleteAll().catch(console.error);
