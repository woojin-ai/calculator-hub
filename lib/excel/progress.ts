// 엑셀 연습 진도(푼 문제 id 목록)를 이 브라우저에만 저장한다.
// 로그인이 없는 MVP라 서버로 보내지 않는다. 저장이 막힌 브라우저(사생활 보호 모드 등)에서도
// 화면은 정상 동작해야 하므로 모든 읽기·쓰기를 try/catch로 감싼다.

import { useMemo, useSyncExternalStore } from "react";

const KEY = "excel-practice:v1";
const EVENT = "excel-practice-progress";

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function parse(raw: string): Set<string> {
  if (!raw) return new Set();
  try {
    const data = JSON.parse(raw) as { solved?: unknown };
    return new Set(Array.isArray(data.solved) ? data.solved.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function markSolved(id: string) {
  const solved = parse(readRaw());
  if (solved.has(id)) return;
  solved.add(id);
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ solved: [...solved] }));
  } catch {
    // 저장 실패해도 이번 화면에서는 계속 진행한다.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function resetProgress() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
  window.dispatchEvent(new Event(EVENT));
}

/** 푼 문제 id 집합. 서버 렌더와 첫 하이드레이션에서는 빈 집합. */
export function useSolvedIds(): Set<string> {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parse(raw), [raw]);
}
