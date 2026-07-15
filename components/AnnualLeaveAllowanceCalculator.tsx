"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  calculateAnnualLeaveAllowance,
  type AnnualLeaveAccrual,
  type AnnualLeaveAmounts,
  type AnnualLeaveInfo,
} from "@/lib/annual-leave-allowance";
import { formatWon } from "@/lib/loan";
import { INPUT_BASE as inputBase } from "@/lib/inputClass";

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입; 음수·문자 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

/** 소수 입력 서식 — 숫자와 소수점 1개만 허용(일수·연수 입력용, 음수·문자 차단). */
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

/** 일수·연수 표시 — 입력값 그대로(정수·소수 모두). */
function formatDays(days: number): string {
  return `${days}`;
}

interface FieldErrors {
  wage?: string;
  unusedDays?: string;
  serviceYears?: string;
}

type ResultState =
  | {
      kind: "paid";
      info: AnnualLeaveInfo;
      amounts: AnnualLeaveAmounts;
      accrual?: AnnualLeaveAccrual;
    }
  | {
      kind: "zero";
      info: AnnualLeaveInfo;
      amounts: AnnualLeaveAmounts;
      accrual?: AnnualLeaveAccrual;
    }
  | null;

/** 원 금액 라벨-값 행 (주휴수당 AmountRow 패턴). */
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

/** 문자열 값 라벨-값 행 (주휴수당 TextRow 패턴). */
function TextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-brand-text-secondary">{label}</span>
      <span className="tabular-nums font-semibold text-brand-text">{value}</span>
    </div>
  );
}

/** 동적 결과 요약 문구 (design §3-2, 정적 텍스트 금지 — 입력값 반영). */
function getResultSummary(
  info: AnnualLeaveInfo,
  amounts: AnnualLeaveAmounts
): string {
  const wageStr = formatWon(info.monthlyWage);
  const daysStr = formatDays(info.unusedDays);
  const hourlyStr = formatWon(amounts.hourlyOrdinaryWage);
  const dailyStr = formatWon(amounts.dailyOrdinaryWage);
  const allowanceStr = formatWon(amounts.allowance);
  return `월 통상임금 ${wageStr}원 기준 시간당 통상임금은 약 ${hourlyStr}원, 1일 통상임금은 약 ${dailyStr}원입니다. 미사용 연차 ${daysStr}일에 대한 연차수당은 약 ${allowanceStr}원입니다.`;
}

/** 발생 연차일수 안내 블록 설명 문구 (design §3-3). */
function getAccrualDescription(accrual: AnnualLeaveAccrual): string {
  if (accrual.underOneYear) {
    return "1년 미만 근로자는 1개월 개근 시 1일씩, 최대 11일의 연차가 발생합니다.";
  }
  const yearStr = formatDays(accrual.serviceYears);
  return `근속 ${yearStr}년은 근로기준법상 연 ${accrual.accruedDays}일의 연차가 발생합니다(1년 15일 + 2년마다 1일 가산, 최대 25일).`;
}

/** 발생 연차 안내 블록 (근속연수 입력 시에만 노출). */
function AccrualBlock({ accrual }: { accrual: AnnualLeaveAccrual }) {
  return (
    <div className="mt-4 border-t border-brand-border/60 pt-4">
      <p className="text-sm font-medium text-brand-text-secondary">
        근속 {formatDays(accrual.serviceYears)}년 기준 발생 연차
      </p>
      <TextRow label="발생 연차일수" value={`${accrual.accruedDays}일`} />
      <p className="mt-1 text-xs text-brand-text-secondary">
        {getAccrualDescription(accrual)}
      </p>
      <p className="mt-2 text-xs text-brand-text-secondary">
        발생 연차일수는 법정 최소 기준에 따른 참고용이며, 위 연차수당은 실제
        미사용 일수 기준으로 계산됩니다.
      </p>
    </div>
  );
}

export default function AnnualLeaveAllowanceCalculator() {
  const [ordinaryMonthlyWage, setOrdinaryMonthlyWage] = useState("");
  const [unusedDays, setUnusedDays] = useState("");
  const [serviceYears, setServiceYears] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ResultState>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const wageNum = Number(ordinaryMonthlyWage.replace(/,/g, ""));
    const daysNum = parseFloat(unusedDays);
    const hasServiceYears = serviceYears.trim() !== "";
    const yearsNum = hasServiceYears ? parseFloat(serviceYears) : undefined;

    const nextErrors: FieldErrors = {};

    // 월 통상임금: 필수 · > 0
    if (
      !ordinaryMonthlyWage.trim() ||
      !Number.isFinite(wageNum) ||
      wageNum <= 0
    ) {
      nextErrors.wage = "월 통상임금을 올바르게 입력해주세요.";
    }
    // 미사용 연차일수: 필수 · ≥ 0 (0 허용)
    if (!unusedDays.trim() || !Number.isFinite(daysNum) || daysNum < 0) {
      nextErrors.unusedDays = "미사용 연차일수를 0 이상으로 입력해주세요.";
    }
    // 근속연수: 선택 — 입력 시에만 ≥ 0 검사
    if (
      hasServiceYears &&
      (!Number.isFinite(yearsNum as number) || (yearsNum as number) < 0)
    ) {
      nextErrors.serviceYears = "근속연수는 0 이상으로 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const outcome = calculateAnnualLeaveAllowance({
      monthlyWage: wageNum,
      unusedDays: daysNum,
      serviceYears: yearsNum,
    });

    if (!outcome.ok) {
      // 방어(컴포넌트 1차 검증을 통과했으면 도달하지 않음)
      const errKey: keyof FieldErrors =
        outcome.error === "invalid-wage"
          ? "wage"
          : outcome.error === "invalid-unused-days"
            ? "unusedDays"
            : "serviceYears";
      setErrors({ [errKey]: "입력값을 다시 확인해주세요." });
      setResult(null);
      return;
    }

    setErrors({});
    setResult({
      kind: outcome.kind,
      info: outcome.info,
      amounts: outcome.amounts,
      accrual: outcome.accrual,
    });

    // 계산 후 결과 영역으로 스무스 스크롤
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

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
          연차수당은 통상임금을 기준으로 산정한 참고용 예상액입니다. 통상임금에
          포함되는 임금 항목·연차 발생일수는 회사 규정과 근로형태에 따라 달라질
          수 있으며, 정확한 금액은 급여명세서·회사 규정과 고용노동부(1350)
          상담으로 확인하세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── 그룹 라벨 ── */}
          <p className="text-xs font-semibold text-brand-text-secondary">
            통상임금 · 미사용 연차
          </p>

          {/* 1. 월 통상임금 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ordinaryMonthlyWage"
              className="text-sm font-medium text-brand-text-secondary"
            >
              월 통상임금 (원)
            </label>
            <input
              id="ordinaryMonthlyWage"
              type="text"
              inputMode="numeric"
              value={ordinaryMonthlyWage}
              onChange={(event) =>
                setOrdinaryMonthlyWage(formatAmountInput(event.target.value))
              }
              placeholder="2,500,000"
              aria-invalid={errors.wage ? true : undefined}
              className={`${inputBase} ${
                errors.wage ? "border-brand-warning" : "border-brand-border"
              }`}
            />
            <p className="text-xs text-brand-text-secondary">
              기본급 + 고정수당 등 매월 고정적으로 지급되는 통상임금을
              입력하세요. 식대·교통비 등 실비변상적 금품은 통상임금에서 제외될 수
              있습니다.
            </p>
            {errors.wage && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.wage}
              </p>
            )}
          </div>

          {/* 2·3. 미사용 연차일수 · 근속연수(선택) — 2열 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* 2. 미사용 연차일수 (2열 좌) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="unusedDays"
                className="flex min-h-10 items-end text-sm font-medium text-brand-text-secondary"
              >
                미사용 연차일수 (일)
              </label>
              <input
                id="unusedDays"
                type="text"
                inputMode="decimal"
                value={unusedDays}
                onChange={(event) =>
                  setUnusedDays(sanitizeDecimalInput(event.target.value))
                }
                placeholder="5"
                aria-invalid={errors.unusedDays ? true : undefined}
                className={`${inputBase} ${
                  errors.unusedDays
                    ? "border-brand-warning"
                    : "border-brand-border"
                }`}
              />
              <p className="text-xs text-brand-text-secondary">
                아직 사용하지 않은 연차 일수입니다. 반차는 0.5일 단위로 입력할
                수 있습니다.
              </p>
              {errors.unusedDays && (
                <p className="text-xs text-brand-warning" role="alert">
                  {errors.unusedDays}
                </p>
              )}
            </div>

            {/* 3. 근속연수 (선택, 2열 우) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="serviceYears"
                className="flex min-h-10 items-end text-sm font-medium text-brand-text-secondary"
              >
                근속연수 (년, 선택)
              </label>
              <input
                id="serviceYears"
                type="text"
                inputMode="decimal"
                value={serviceYears}
                onChange={(event) =>
                  setServiceYears(sanitizeDecimalInput(event.target.value))
                }
                placeholder="3"
                aria-invalid={errors.serviceYears ? true : undefined}
                className={`${inputBase} ${
                  errors.serviceYears
                    ? "border-brand-warning"
                    : "border-brand-border"
                }`}
              />
              <p className="text-xs text-brand-text-secondary">
                입력하면 발생 연차일수(법정 기준)를 함께 안내합니다. 연차수당
                금액 계산에는 사용되지 않습니다.
              </p>
              {errors.serviceYears && (
                <p className="text-xs text-brand-warning" role="alert">
                  {errors.serviceYears}
                </p>
              )}
            </div>
          </div>

          {/* 4. 계산 버튼 */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            연차수당 계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 통상임금·연차 정보는 브라우저 안에서만 계산되며 서버에
            저장·전송되지 않습니다.
          </p>
        </form>

        {/* 결과: 미사용일수 > 0 (정상 금액) */}
        {result && result.kind === "paid" && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 (미사용 연차수당) */}
            <p className="text-sm font-medium text-brand-text-secondary">
              미사용 연차수당
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
              {formatWon(result.amounts.allowance)}
              <span className="text-base font-medium text-brand-text-secondary">
                원
              </span>
            </p>
            <p className="mt-1 text-xs text-brand-text-secondary">
              세전 기준, 미사용 연차 {formatDays(result.info.unusedDays)}일에
              대한 수당입니다.
            </p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result.info, result.amounts)}
            </p>

            {/* Tier ② — 보조값 (계산 흐름 순) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <AmountRow
                label="시간당 통상임금"
                value={result.amounts.hourlyOrdinaryWage}
              />
              <AmountRow
                label="1일 통상임금"
                value={result.amounts.dailyOrdinaryWage}
              />
              <TextRow
                label="미사용 연차일수"
                value={`${formatDays(result.info.unusedDays)}일`}
              />
              <AmountRow
                label="연차수당 총액"
                value={result.amounts.allowance}
              />
            </div>

            {/* (선택) 발생 연차일수 안내 — 근속연수 입력 시에만 */}
            {result.accrual && <AccrualBlock accrual={result.accrual} />}

            <p className="mt-4 text-xs text-brand-text-secondary">
              시간당·1일 통상임금은 표시용으로 반올림한 값이라, 총액과 원 단위에서
              미세하게 다르게 보일 수 있습니다. 총액은 반올림 전 정밀값으로
              계산합니다.
            </p>
          </div>
        )}

        {/* 결과: 미사용일수 0 (중립 회색 안내, 게이트/에러 아님) */}
        {result && result.kind === "zero" && (
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
                  지급할 연차수당이 없습니다
                </p>
                <p className="mt-1 text-sm text-brand-text-secondary">
                  미사용 연차일수가 0일이라 연차수당이 발생하지 않습니다.
                </p>

                <div className="mt-3 border-t border-brand-border/60 pt-3">
                  <AmountRow
                    label="시간당 통상임금"
                    value={result.amounts.hourlyOrdinaryWage}
                  />
                  <AmountRow
                    label="1일 통상임금"
                    value={result.amounts.dailyOrdinaryWage}
                  />
                </div>

                {/* (선택) 발생 연차일수 안내 — 근속연수 입력 시 미사용 0과 무관하게 노출 */}
                {result.accrual && <AccrualBlock accrual={result.accrual} />}

                <p className="mt-3 text-xs text-brand-text-secondary">
                  미사용 연차가 있으면 위에 일수를 입력해 다시 계산해 보세요.
                  반차는 0.5일로 입력할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
