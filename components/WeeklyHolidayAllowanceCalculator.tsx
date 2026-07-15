"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  calculateWeeklyHolidayAllowance,
  type WeeklyHolidayAmounts,
  type WeeklyHolidayInfo,
} from "@/lib/weekly-holiday-allowance";
import { formatWon } from "@/lib/loan";
import { MINIMUM_WAGE, MINIMUM_WAGE_YEAR } from "@/lib/minimum-wage";
import { INPUT_BASE as inputBase } from "@/lib/inputClass";

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입; 음수·문자 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

/** 소수 입력 서식 — 숫자와 소수점 1개만 허용(시간 입력용). */
function sanitizeDecimalInput(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  return cleaned;
}

/** 소정근로시간 표시 — 사용자가 입력한 값을 그대로(정수·소수 모두). */
function formatHours(hours: number): string {
  return `${hours}`;
}

type DisplayScope = "weekOnly" | "withMonthly";

interface FieldErrors {
  wage?: string;
  hours?: string;
}

type ResultState =
  | { eligible: true; info: WeeklyHolidayInfo; amounts: WeeklyHolidayAmounts }
  | { eligible: false; info: WeeklyHolidayInfo }
  | null;

/** 원 금액 라벨-값 행 (퇴직금 AmountRow 패턴). */
function AmountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-brand-text-secondary">{label}</span>
      <span className="tabular-nums font-semibold text-brand-text">
        {formatWon(value)} 원
      </span>
    </div>
  );
}

/** 문자열 값 라벨-값 행 (퇴직금 TextRow 패턴). */
function TextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-brand-text-secondary">{label}</span>
      <span className="tabular-nums font-semibold text-brand-text">{value}</span>
    </div>
  );
}

/** 동적 결과 요약 문구 (design §3-3, 정적 텍스트 금지 — 입력값 반영). */
function getResultSummary(
  info: WeeklyHolidayInfo,
  amounts: WeeklyHolidayAmounts,
  showMonthly: boolean
): string {
  const wageStr = formatWon(info.hourlyWage);
  const hoursStr = formatHours(info.weeklyHours);
  const weeklyStr = formatWon(amounts.weeklyAllowance);
  const monthlyStr = formatWon(amounts.monthlyAllowance);
  const effectiveStr = formatWon(amounts.effectiveHourlyWage);

  const head = `시급 ${wageStr}원, 1주 소정근로시간 ${hoursStr}시간으로 개근할 경우, 1주 주휴수당은 약 ${weeklyStr}원이며`;
  const monthClause = showMonthly
    ? `, 한 달(4.345주)로 환산하면 약 ${monthlyStr}원입니다`
    : "입니다";
  return `${head}${monthClause}. 주휴수당을 포함한 실질 시급은 약 ${effectiveStr}원입니다.`;
}

export default function WeeklyHolidayAllowanceCalculator() {
  const [hourlyWage, setHourlyWage] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [displayScope, setDisplayScope] = useState<DisplayScope>("withMonthly");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ResultState>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const wageNum = Number(hourlyWage.replace(/,/g, ""));
    const hoursNum = parseFloat(weeklyHours);

    const nextErrors: FieldErrors = {};

    // 시급: 필수 · > 0
    if (!hourlyWage.trim() || !Number.isFinite(wageNum) || wageNum <= 0) {
      nextErrors.wage = "시급을 올바르게 입력해주세요.";
    }
    // 1주 소정근로시간: 필수 · 0 초과 · 168 이하
    if (!weeklyHours.trim() || !Number.isFinite(hoursNum) || hoursNum <= 0) {
      nextErrors.hours = "1주 소정근로시간을 올바르게 입력해주세요.";
    } else if (hoursNum > 168) {
      nextErrors.hours = "1주는 최대 168시간까지 입력할 수 있습니다.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const outcome = calculateWeeklyHolidayAllowance({
      hourlyWage: wageNum,
      weeklyHours: hoursNum,
    });

    if (!outcome.ok) {
      // 방어(컴포넌트 1차 검증을 통과했으면 도달하지 않음)
      setErrors(
        outcome.error === "invalid-wage"
          ? { wage: "시급을 올바르게 입력해주세요." }
          : { hours: "1주 소정근로시간을 올바르게 입력해주세요." }
      );
      setResult(null);
      return;
    }

    setErrors({});
    setResult(
      outcome.eligible
        ? { eligible: true, info: outcome.info, amounts: outcome.amounts }
        : { eligible: false, info: outcome.info }
    );

    // 계산 후 결과 영역으로 스무스 스크롤
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  const showMonthly = displayScope === "withMonthly";

  return (
    <div>
      {/* 상단 근사 고지 배너 — 항상 노출 (계산 여부 무관). 광고 아님. */}
      <div
        className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
        role="note"
      >
        <span
          aria-hidden="true"
          className="mt-0.5 select-none text-base leading-none text-brand-warning"
        >
          ⓘ
        </span>
        <p className="text-sm text-amber-900">
          주휴수당은 근로기준법상 법정 산식으로 계산한 참고용 예상액입니다. 실제
          지급액은 근로계약·소정근로시간 산정 방식·개근 여부에 따라 달라질 수
          있습니다. 미지급 등 분쟁은 고용노동부(1350)·관할 노동청 상담을
          권장합니다.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── 그룹 라벨 ── */}
          <p className="text-xs font-semibold text-brand-text-secondary">
            시급 · 근로시간
          </p>

          {/* 1. 시급 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="hourlyWage"
              className="text-sm font-medium text-brand-text-secondary"
            >
              시급 (원)
            </label>
            <input
              id="hourlyWage"
              type="text"
              inputMode="numeric"
              value={hourlyWage}
              onChange={(event) =>
                setHourlyWage(formatAmountInput(event.target.value))
              }
              placeholder={formatWon(MINIMUM_WAGE)}
              aria-invalid={errors.wage ? true : undefined}
              className={`${inputBase} ${
                errors.wage ? "border-brand-warning" : "border-brand-border"
              }`}
            />
            <p className="text-xs text-brand-text-secondary">
              1시간당 세전 시급을 입력하세요. {MINIMUM_WAGE_YEAR}년 최저시급은{" "}
              {formatWon(MINIMUM_WAGE)}원입니다.
            </p>
            {errors.wage && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.wage}
              </p>
            )}
          </div>

          {/* 2. 1주 소정근로시간 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="weeklyHours"
              className="text-sm font-medium text-brand-text-secondary"
            >
              1주 소정근로시간 (시간)
            </label>
            <input
              id="weeklyHours"
              type="text"
              inputMode="decimal"
              value={weeklyHours}
              onChange={(event) =>
                setWeeklyHours(sanitizeDecimalInput(event.target.value))
              }
              placeholder="20"
              aria-invalid={errors.hours ? true : undefined}
              className={`${inputBase} ${
                errors.hours ? "border-brand-warning" : "border-brand-border"
              }`}
            />
            <p className="text-xs text-brand-text-secondary">
              근로계약서상 1주 동안 일하기로 정한 시간입니다. 휴게시간·연장근로는
              제외합니다.
            </p>
            {errors.hours && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.hours}
              </p>
            )}
          </div>

          {/* 3. 결과 표시 범위 세그먼트 토글 (년/개월 토글 패턴 계승) */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-brand-text-secondary">
              결과 표시 범위
            </p>
            <div
              className="flex items-stretch gap-0.5 rounded-md border border-brand-border bg-white p-0.5"
              role="radiogroup"
              aria-label="결과 표시 범위"
            >
              {(
                [
                  ["weekOnly", "주 단위만"],
                  ["withMonthly", "월 환산 포함"],
                ] as const
              ).map(([scope, label]) => {
                const selected = displayScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDisplayScope(scope)}
                    className={`h-9 flex-1 rounded text-sm font-semibold transition-colors ${
                      selected
                        ? "bg-brand-primary text-white"
                        : "bg-transparent text-brand-text-secondary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 계산 버튼 */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            주휴수당 계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 시급·근로시간 정보는 브라우저 안에서만 계산되며 서버에
            저장·전송되지 않습니다.
          </p>
        </form>

        {/* 결과: 주 15시간 이상(금액) */}
        {result && result.eligible && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 (1주 주휴수당) */}
            <p className="text-sm font-medium text-brand-text-secondary">
              1주 주휴수당
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
              {formatWon(result.amounts.weeklyAllowance)}
              <span className="text-base font-medium text-brand-text-secondary">
                원
              </span>
            </p>
            <p className="mt-1 text-xs text-brand-text-secondary">
              세전 기준, 1주 개근 시 지급되는 유급휴일 수당입니다.
            </p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result.info, result.amounts, showMonthly)}
            </p>

            {/* Tier ② — 보조값 (계산 흐름 순) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <TextRow
                label="적용 소정근로시간"
                value={`${formatHours(result.amounts.appliedHours)}시간${
                  result.amounts.capApplied ? " (주 40시간 상한)" : ""
                }`}
              />
              <TextRow
                label="주휴 환산 시간"
                value={`${result.amounts.holidayConvertedHours.toFixed(1)}시간`}
              />
              <AmountRow
                label="1주 주휴수당"
                value={result.amounts.weeklyAllowance}
              />
              {showMonthly && (
                <AmountRow
                  label="월 예상 주휴수당"
                  value={result.amounts.monthlyAllowance}
                />
              )}
              <AmountRow
                label="주휴 포함 실질 시급"
                value={result.amounts.effectiveHourlyWage}
              />
              {showMonthly && (
                <AmountRow
                  label="주휴 포함 월 예상 급여"
                  value={result.amounts.monthlyWageWithHoliday}
                />
              )}
            </div>
          </div>
        )}

        {/* 결과: 주 15시간 미만(금액 미산출, 중립 회색 안내) */}
        {result && !result.eligible && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6"
          >
            <div className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-0.5 select-none text-base leading-none text-brand-text-secondary"
              >
                ⓘ
              </span>
              <div className="flex-1">
                <p className="text-base font-semibold text-brand-text">
                  주휴수당이 발생하지 않습니다
                </p>
                <p className="mt-1 text-sm text-brand-text-secondary">
                  1주 소정근로시간이 15시간 미만입니다.
                </p>

                <div className="mt-3 border-t border-brand-border/60 pt-3">
                  <TextRow
                    label="입력한 소정근로시간"
                    value={`${formatHours(result.info.weeklyHours)}시간`}
                  />
                </div>

                <p className="mt-3 text-xs text-brand-text-secondary">
                  주휴수당은 1주 소정근로시간이 15시간 이상이고 그 주를 개근한
                  경우에 발생합니다. 15시간 미만인 초단시간 근로자에게는
                  근로기준법 제18조 제3항에 따라 주휴수당·유급휴일이 적용되지
                  않습니다. 여러 사업장에서 일하는 경우 사업장별로 15시간 여부를
                  판단합니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
