"use client";

import { useState, type FormEvent } from "react";
import { calculateDday, formatKoreanDate, type DdayResult } from "@/lib/dday";
import { INPUT_BASE } from "@/lib/inputClass";

export default function DdayCalculator() {
  const [targetDate, setTargetDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [showEventNameInput, setShowEventNameInput] = useState(false);
  const [result, setResult] = useState<DdayResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!targetDate) {
      setError("기준일을 입력해주세요.");
      setResult(null);
      return;
    }

    const today = new Date();
    const calculated = calculateDday(targetDate, today, true);

    if (!calculated) {
      setError("올바른 날짜인지 확인해주세요.");
      setResult(null);
      return;
    }

    setError(null);
    setResult(calculated);
  }

  const trimmedEventName = eventName.trim();

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="targetDate"
            className="text-sm font-medium text-brand-text-secondary"
          >
            기준일
          </label>
          <input
            id="targetDate"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className={`${INPUT_BASE} ${
              error ? "border-brand-warning" : "border-brand-border"
            }`}
          />
          {error && (
            <p className="text-xs text-brand-warning" role="alert">
              {error}
            </p>
          )}
        </div>

        {showEventNameInput ? (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="eventName"
              className="text-sm font-medium text-brand-text-secondary"
            >
              이벤트 이름 (선택)
            </label>
            <input
              id="eventName"
              type="text"
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              placeholder="예: 수능, 결혼기념일, 여행 출발일"
              className={`${INPUT_BASE} border-brand-border`}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowEventNameInput(true)}
            className="-my-2 flex min-h-[44px] items-center py-2.5 text-left text-sm text-brand-text-secondary transition-colors hover:text-brand-primary"
          >
            + 이벤트 이름 추가 (선택)
          </button>
        )}

        <button
          type="submit"
          className="h-12 rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          D-Day 계산하기
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-6">
          <p className="text-sm font-medium text-brand-text-secondary">
            {getResultLabel(result, trimmedEventName)}
          </p>
          <p className="mt-1 tabular-nums text-4xl font-bold text-brand-accent sm:text-[2.5rem]">
            {result.label}
          </p>
          {result.type === "today" && (
            <p className="mt-1 text-sm text-brand-text-secondary">
              바로 오늘입니다
            </p>
          )}
          <div className="mt-4 flex flex-col gap-1 text-sm text-brand-text-secondary">
            <p>{formatKoreanDate(result.targetDate)}</p>
            {result.type === "past" && <p>이미 지난 날짜입니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function getResultLabel(result: DdayResult, eventName: string): string {
  if (result.type === "today") {
    return eventName || "오늘은";
  }
  if (result.type === "future") {
    return eventName ? `${eventName}까지` : "선택하신 날짜까지";
  }
  return eventName ? `${eventName}으로부터` : "선택하신 날짜로부터";
}
