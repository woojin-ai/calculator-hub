"use client";

import { useState, type FormEvent } from "react";
import { calculateManAge, type ManAgeResult } from "@/lib/age";

export default function AgeCalculator() {
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<ManAgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!birthDate) {
      setError("생년월일을 입력해주세요.");
      setResult(null);
      return;
    }

    const today = new Date();
    const calculated = calculateManAge(birthDate, today);

    if (!calculated) {
      setError("올바른 생년월일인지 확인해주세요. (미래 날짜는 입력할 수 없습니다)");
      setResult(null);
      return;
    }

    setError(null);
    setResult(calculated);
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="birthDate"
            className="text-sm font-medium text-brand-text-secondary"
          >
            생년월일
          </label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className={`h-12 rounded-lg border px-4 text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15 ${
              error ? "border-brand-warning" : "border-brand-border"
            }`}
          />
          {error && (
            <p className="text-xs text-brand-warning" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="h-12 rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          만 나이 계산하기
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-6">
          <p className="text-sm font-medium text-brand-text-secondary">
            오늘 기준 만 나이
          </p>
          <p className="mt-1 flex items-baseline gap-2 tabular-nums">
            <span className="text-4xl font-bold text-brand-accent sm:text-[2.5rem]">
              {result.manAge}
            </span>
            <span className="text-base font-medium text-brand-text-secondary">
              세
            </span>
          </p>
          <div className="mt-4 flex flex-col gap-1 text-sm text-brand-text-secondary">
            <p>
              연 나이(현재 연도 - 출생 연도) 기준으로는{" "}
              <strong className="text-brand-text">{result.yearAge}세</strong>
              입니다.
            </p>
            <p>
              {result.daysToNextBirthday === 0
                ? "오늘이 생일입니다. 생일을 축하합니다!"
                : `다음 생일까지 ${result.daysToNextBirthday}일 남았습니다.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
