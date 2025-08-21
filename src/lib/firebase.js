import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, onAuthStateChanged, signOut
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Auth helpers
const provider = new GoogleAuthProvider();
export async function loginGoogle() {
  try { await signInWithPopup(auth, provider); }
  catch { await signInWithRedirect(auth, provider); }
}
export async function handleRedirectResult() {
  try { await getRedirectResult(auth); } catch {}
}
export function onAuth(cb) { return onAuthStateChanged(auth, cb); }
export function logout() { return signOut(auth); }

// Firestore helpers
function projectsDoc(uid) { return doc(db, "users", uid, "planner", "projects"); }
export async function loadCloud(uid) {
  const snap = await getDoc(projectsDoc(uid));
  return snap.exists() ? snap.data() : null;
}
export async function saveCloud(uid, data) {
  await setDoc(projectsDoc(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
