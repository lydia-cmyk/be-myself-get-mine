import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginButton() {
  const [user, setUser] = useState(null);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      console.log("로그인 성공:", result.user);
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      console.log("로그아웃 완료");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <div>
      {user ? (
        <div>
          <p>안녕하세요, {user.displayName}님!</p>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
      ) : (
        <button onClick={handleLogin}>구글 로그인</button>
      )}
    </div>
  );
}
