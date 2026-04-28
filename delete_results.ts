import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
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
