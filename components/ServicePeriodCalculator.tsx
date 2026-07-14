"use client";

import { useState, type FormEvent } from "react";
import {
  calculateServicePeriod,
  formatKoreanDatePlain,
  type ServicePeriodResult,
} from "@/lib/service-period";

const inputBase =
  "h-12 rounded-lg border px-4 text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

type FieldError = { field: "start" | "end"; message: string } | null;

/** 동적 결과 요약 문구 (design §3-5 템플릿, 정적 텍스트 금지). */
function getResultSummary(result: ServicePeriodResult): string {
  const startStr = formatKoreanDatePlain(result.startDate);
  const endStr = result.usedToday
    ? "오늘"
    : formatKoreanDatePlain(result.endDate);
  const daysStr = result.totalDays.toLocaleString("ko-KR");
  return `입사일 ${startStr}부터 ${endStr}까지 총 ${daysStr}일 근무해, 근속기간은 ${result.years}년 ${result.months}개월 ${result.days}일입니다.`;
}

export default function ServicePeriodCalculator() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState<ServicePeriodResult | null>(null);
  const [error, setError] = useState<FieldError>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!startDate) {
      setError({ field: "start", message: "입사일을 선택해주세요." });
      setResult(null);
      return;
    }

    const outcome = calculateServicePeriod(startDate, endDate, new Date());

    if (!outcome.ok) {
      if (outcome.error === "invalid-start") {
        setError({ field: "start", message: "올바른 입사일인지 확인해주세요." });
      } else if (outcome.error === "invalid-end") {
        setError({ field: "end", message: "올바른 퇴사일인지 확인해주세요." });
      } else {
        setError({
          field: "end",
          message: "퇴사일이 입사일보다 빠릅니다. 날짜를 다시 확인해주세요.",
        });
      }
      setResult(null);
      return;
    }

    setError(null);
    setResult(outcome.value);
  }

  const startError = error?.field === "start" ? error.message : null;
  const endError = error?.field === "end" ? error.message : null;

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 입사일 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="startDate"
            className="text-sm font-medium text-brand-text-secondary"
          >
            입사일
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-invalid={startError ? true : undefined}
            className={`${inputBase} ${
              startError ? "border-brand-warning" : "border-brand-border"
            }`}
          />
          <p className="text-xs text-brand-text-secondary">
            재직을 시작한 첫날(첫 근무일)을 선택하세요.
          </p>
          {startError && (
            <p className="text-xs text-brand-warning" role="alert">
              {startError}
            </p>
          )}
        </div>

        {/* 종료일 (선택, 미입력 시 오늘) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="endDate"
            className="text-sm font-medium text-brand-text-secondary"
          >
            퇴사일 (미입력 시 오늘)
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            aria-invalid={endError ? true : undefined}
            className={`${inputBase} ${
              endError ? "border-brand-warning" : "border-brand-border"
            }`}
          />
          <p className="text-xs text-brand-text-secondary">
            비워 두면 오늘 날짜까지 계산합니다. 퇴사 예정일 등 미래 날짜도 입력할
            수 있습니다.
          </p>
          {endError && (
            <p className="text-xs text-brand-warning" role="alert">
              {endError}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          근속연수 계산하기
        </button>

        <p className="mt-2 text-xs text-brand-text-secondary">
          입력하신 입사일·퇴사일은 브라우저 안에서만 계산되며 서버에
          저장·전송되지 않습니다.
        </p>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-6">
          {/* Tier ① — 대표값 (근속기간) */}
          <p className="text-sm font-medium text-brand-text-secondary">
            근속기간
          </p>
          <p
            className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums"
            aria-label={`근속기간 ${result.years}년 ${result.months}개월 ${result.days}일`}
          >
            <span className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-bold text-brand-accent sm:text-[2.5rem]">
                {result.years}
              </span>
              <span className="text-base font-medium text-brand-text-secondary">
                년
              </span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-bold text-brand-accent sm:text-[2.5rem]">
                {result.months}
              </span>
              <span className="text-base font-medium text-brand-text-secondary">
                개월
              </span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-bold text-brand-accent sm:text-[2.5rem]">
                {result.days}
              </span>
              <span className="text-base font-medium text-brand-text-secondary">
                일
              </span>
            </span>
          </p>

          {/* Tier ① 동적 요약 문구 */}
          <p className="mt-2 text-sm text-brand-text-secondary">
            {getResultSummary(result)}
          </p>

          {/* "오늘 기준" 표기 (종료일 미입력 시에만) */}
          {result.usedToday && (
            <p className="text-xs text-brand-text-secondary">
              {formatKoreanDatePlain(result.endDate)} 오늘을 기준으로
              계산했습니다.
            </p>
          )}

          {/* Tier ② — 보조값 2행 */}
          <div className="mt-4 border-t border-brand-border/60 pt-4">
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-brand-text-secondary">총 재직일수</span>
              <span className="tabular-nums font-semibold text-brand-text">
                {result.totalDays.toLocaleString("ko-KR")}일
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-brand-text-secondary">근속연수(소수)</span>
              <span className="tabular-nums font-semibold text-brand-text">
                약 {result.decimalYears.toFixed(1)}년
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
