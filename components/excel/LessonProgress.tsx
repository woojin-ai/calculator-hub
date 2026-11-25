"use client";

import { useSolvedIds } from "@/lib/excel/progress";

/** 레슨 카드에 "2/4 풀었음"을 보여 준다. 기록이 없으면 아무것도 그리지 않는다. */
export default function LessonProgress({ ids }: { ids: string[] }) {
  const solved = useSolvedIds();
  const n = ids.filter((id) => solved.has(id)).length;
  if (n === 0) return null;
  const done = n === ids.length;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        done ? "bg-emerald-100 text-emerald-800" : "bg-blue-50 text-brand-primary"
      }`}
    >
      {done ? "완료 ✓" : `${n}/${ids.length} 풀었음`}
    </span>
  );
}
