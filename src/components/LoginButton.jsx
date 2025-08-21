import { useEffect, useState } from "react";
import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, onAuthStateChanged, signOut,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export default function LoginButton() {
  const [user, setUser] = useState(null);

  useEffect(() => { getRedirectResult(auth).catch(() => {}); }, []);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); }
    catch { await signInWithRedirect(auth, provider); }
  };

  return user ? (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 truncate max-w-[140px]">
        {user.displayName || user.email}
      </span>
      <button onClick={() => signOut(auth)} className="text-xs border rounded px-2 py-1">로그아웃</button>
    </div>
  ) : (
    <button onClick={login} className="text-xs border rounded px-2 py-1">Google 로그인</button>
  );
}
