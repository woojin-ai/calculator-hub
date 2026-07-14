"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  REPAYMENT_TYPE_LABEL,
  calculateLoan,
  formatWon,
  type LoanResult,
  type RepaymentType,
} from "@/lib/loan";
import { INPUT_BASE as inputBase } from "@/lib/inputClass";

type PeriodUnit = "year" | "month";

interface FieldErrors {
  principal?: string;
  interestRate?: string;
  loanPeriod?: string;
}

const REPAYMENT_OPTIONS: RepaymentType[] = ["equalPayment", "equalPrincipal"];

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입). */
function formatPrincipalInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

export default function LoanInterestCalculator() {
  const [repaymentType, setRepaymentType] =
    useState<RepaymentType>("equalPayment");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [loanPeriod, setLoanPeriod] = useState("");
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>("year");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<LoanResult | null>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const principalNum = Number(principal.replace(/,/g, ""));
    const rateNum = Number(interestRate);
    const periodNum = Number(loanPeriod);

    const nextErrors: FieldErrors = {};

    if (!principal.trim() || !Number.isFinite(principalNum) || principalNum <= 0) {
      nextErrors.principal = "대출 원금을 올바르게 입력해주세요.";
    }
    if (!interestRate.trim() || !Number.isFinite(rateNum) || rateNum < 0) {
      nextErrors.interestRate = "연 이자율은 0 이상으로 입력해주세요.";
    }
    if (
      !loanPeriod.trim() ||
      !Number.isFinite(periodNum) ||
      periodNum <= 0 ||
      !Number.isInteger(periodNum)
    ) {
      nextErrors.loanPeriod = "대출 기간을 정수로 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const months = periodUnit === "year" ? periodNum * 12 : periodNum;
    const calculated = calculateLoan(
      principalNum,
      rateNum,
      months,
      repaymentType
    );

    if (!calculated) {
      setErrors({ principal: "입력값을 다시 확인해주세요." });
      setResult(null);
      return;
    }

    setErrors({});
    setResult(calculated);

    // 계산 후 결과 영역으로 스무스 스크롤 (모바일에서 결과를 놓치지 않도록)
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  return (
    <div>
      {/* 상단 면책 배너 — 대출 계산기 전용, 계산 여부와 무관하게 항상 노출 */}
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
          이 계산기는 대출 상담·신청이 아닌 참고용 도구이며, 실제 금리·한도·상환조건은
          금융기관마다 다릅니다.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 1. 상환 방식 세그먼트 토글 (라디오 그룹 기반) */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-brand-text-secondary">
              상환 방식
            </legend>
            <div className="flex items-stretch gap-1 rounded-lg border border-brand-border bg-white p-1">
              {REPAYMENT_OPTIONS.map((option) => {
                const selected = repaymentType === option;
                return (
                  <label
                    key={option}
                    className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-semibold transition-colors ${
                      selected
                        ? "bg-brand-primary text-white"
                        : "bg-transparent text-brand-text-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="repaymentType"
                      value={option}
                      checked={selected}
                      onChange={() => setRepaymentType(option)}
                      className="sr-only"
                    />
                    {REPAYMENT_TYPE_LABEL[option]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 2. 대출 원금 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="principal"
              className="text-sm font-medium text-brand-text-secondary"
            >
              대출 원금 (원)
            </label>
            <input
              id="principal"
              type="text"
              inputMode="numeric"
              value={principal}
              onChange={(event) =>
                setPrincipal(formatPrincipalInput(event.target.value))
              }
              placeholder="50,000,000"
              aria-invalid={errors.principal ? true : undefined}
              className={`${inputBase} ${
                errors.principal ? "border-brand-warning" : "border-brand-border"
              }`}
            />
            {errors.principal && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.principal}
              </p>
            )}
          </div>

          {/* 3. 연 이자율 / 대출 기간(+단위 토글) — 2열 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="interestRate"
                className="text-sm font-medium text-brand-text-secondary"
              >
                연 이자율 (%)
              </label>
              <input
                id="interestRate"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={interestRate}
                onChange={(event) => setInterestRate(event.target.value)}
                placeholder="4.5"
                aria-invalid={errors.interestRate ? true : undefined}
                className={`${inputBase} ${
                  errors.interestRate
                    ? "border-brand-warning"
                    : "border-brand-border"
                }`}
              />
              {errors.interestRate && (
                <p className="text-xs text-brand-warning" role="alert">
                  {errors.interestRate}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="loanPeriod"
                className="text-sm font-medium text-brand-text-secondary"
              >
                대출 기간
              </label>
              <input
                id="loanPeriod"
                type="number"
                inputMode="numeric"
                step="1"
                value={loanPeriod}
                onChange={(event) => setLoanPeriod(event.target.value)}
                placeholder="30"
                aria-invalid={errors.loanPeriod ? true : undefined}
                className={`${inputBase} ${
                  errors.loanPeriod
                    ? "border-brand-warning"
                    : "border-brand-border"
                }`}
              />
              {/* 기간 단위 컴팩트 토글 (년/개월) */}
              <div
                className="mt-1.5 flex items-stretch gap-0.5 rounded-md border border-brand-border bg-white p-0.5"
                role="radiogroup"
                aria-label="대출 기간 단위"
              >
                {([
                  ["year", "년"],
                  ["month", "개월"],
                ] as const).map(([unit, label]) => {
                  const selected = periodUnit === unit;
                  return (
                    <button
                      key={unit}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPeriodUnit(unit)}
                      className={`h-9 flex-1 rounded text-xs font-semibold transition-colors ${
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
              {errors.loanPeriod && (
                <p className="text-xs text-brand-warning" role="alert">
                  {errors.loanPeriod}
                </p>
              )}
            </div>
          </div>

          {/* 4. 계산 버튼 */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            대출 이자 계산하기
          </button>
        </form>

        {result && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {result.type === "equalPayment" ? (
              <>
                <p className="text-sm font-medium text-brand-text-secondary">
                  매월 상환액 ({REPAYMENT_TYPE_LABEL.equalPayment})
                </p>
                <p className="mt-1 flex items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
                  {formatWon(result.monthlyPayment)}
                  <span className="text-base font-medium text-brand-text-secondary">
                    원
                  </span>
                </p>
                <p className="mt-2 text-sm text-brand-text-secondary">
                  매월 동일한 금액을 상환합니다.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-brand-text-secondary">
                  매월 상환액 ({REPAYMENT_TYPE_LABEL.equalPrincipal}, 회차마다
                  감소)
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-brand-text-secondary">1회차</p>
                    <p className="text-3xl font-bold tabular-nums text-brand-accent sm:text-4xl">
                      {formatWon(result.firstPayment)}
                      <span className="ml-1 text-base font-medium text-brand-text-secondary">
                        원
                      </span>
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="select-none text-center text-xl text-brand-text-secondary sm:px-2"
                  >
                    <span className="sm:hidden">↓</span>
                    <span className="hidden sm:inline">→</span>
                  </span>
                  <div>
                    <p className="text-sm text-brand-text-secondary">
                      마지막 회차
                    </p>
                    <p className="text-3xl font-bold tabular-nums text-brand-accent sm:text-4xl">
                      {formatWon(result.lastPayment)}
                      <span className="ml-1 text-base font-medium text-brand-text-secondary">
                        원
                      </span>
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-brand-text-secondary">
                  회차가 지날수록 남은 원금에 붙는 이자가 줄어 매월 상환액도 함께 감소합니다.
                </p>
              </>
            )}

            {/* 보조 항목 (공통) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-brand-text-secondary">총 이자</span>
                <span className="font-semibold tabular-nums text-brand-text">
                  {formatWon(result.totalInterest)} 원
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-brand-text-secondary">총 상환액</span>
                <span className="font-semibold tabular-nums text-brand-text">
                  {formatWon(result.totalPayment)} 원
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
