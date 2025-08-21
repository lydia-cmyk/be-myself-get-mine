// src/utils/persist.js
import { useEffect, useRef, useState } from "react";

// 저장된 값 읽기
export function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// 즉시 저장(내부용)
function saveStateNow(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota 초과 등은 조용히 무시
  }
}

// 디바운스 저장(짧은 시간 안의 여러 변경을 1번으로 합침)
const timers = new Map();
export function saveState(key, value, delay = 300) {
  const prev = timers.get(key);
  if (prev) clearTimeout(prev);
  const id = setTimeout(() => saveStateNow(key, value), delay);
  timers.set(key, id);
}

// React 전용: useState처럼 씀. state가 바뀔 때마다 자동 저장.
export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => loadState(key, initialValue));
  const keyRef = useRef(key); // key가 바뀌면 이전 키 정리용(보통 안 바꿈)

  useEffect(() => {
    // mount 시 한 번 sync (초기값이 로드된 상태라 사실상 생략 가능)
    saveState(keyRef.current, state, 0);
  }, []); // eslint-disable-line

  useEffect(() => {
    saveState(keyRef.current, state);
  }, [state]);

  return [state, setState];
}
