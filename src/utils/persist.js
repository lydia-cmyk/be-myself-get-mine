// src/utils/persist.js
export function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStateNow(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// 과도한 저장 방지용 디바운스
const timers = new Map();
export function saveState(key, value, delay = 300) {
  clearTimeout(timers.get(key));
  const id = setTimeout(() => saveStateNow(key, value), delay);
  timers.set(key, id);
}

// React 전용: useState처럼 쓰는 지속 저장 훅
import { useEffect, useState } from "react";
export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => loadState(key, initialValue));
  useEffect(() => {
    saveState(key, state);
  }, [key, state]);
  return [state, setState];
}
