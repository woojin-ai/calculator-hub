"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  calculateSavingsInterest,
  type SavingsAmounts,
  type SavingsInput,
  type SavingsMethod,
  type SavingsMode,
} from "@/lib/savings-interest";
import { formatWon } from "@/lib/loan";
import {
  INTEREST_TAX_LABEL,
  formatTaxRatePercent,
  type InterestTaxType,
} from "@/lib/interest-tax";
import { INPUT_BASE as inputBase } from "@/lib/inputClass";

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입; 음수·문자 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

const MODE_OPTIONS: SavingsMode[] = ["deposit", "installment"];
const METHOD_OPTIONS: SavingsMethod[] = ["simple", "monthlyCompound"];
const TAX_OPTIONS: InterestTaxType[] = ["general", "preferential", "taxFree"];

const MODE_LABEL: Record<SavingsMode, string> = {
  deposit: "예금",
  installment: "적금",
};

const METHOD_LABEL: Record<SavingsMethod, string> = {
  simple: "단리",
  monthlyCompound: "월복리",
};

/** 모드별 금액 필드 라벨/placeholder/힌트 (§2 스위치). */
const AMOUNT_FIELD: Record<
  SavingsMode,
  { label: string; placeholder: string; hint: string }
> = {
  deposit: {
    label: "예치금 (원)",
    placeholder: "10,000,000",
    hint: "한 번에 예치하는 목돈을 입력하세요.",
  },
  installment: {
    label: "월 납입액 (원)",
    placeholder: "500,000",
    hint: "매월 납입하는 금액을 입력하세요. 총 납입원금은 월납입액 × 개월 수입니다.",
  },
};

/** 과세 유형별 적용세율 안내 헬퍼 문구 (§3-3, 세율은 상수에서 조합). */
function getTaxHelper(taxType: InterestTaxType): string {
  const rate = formatTaxRatePercent(taxType);
  switch (taxType) {
    case "general":
      return `일반과세: 이자소득의 ${rate}가 세금으로 공제됩니다 (소득세 14% + 지방소득세 1.4%).`;
    case "preferential":
      return `세금우대: 이자소득의 ${rate}가 세금으로 공제됩니다.`;
    case "taxFree":
      return "비과세: 이자에 세금이 공제되지 않습니다.";
  }
}

interface FieldErrors {
  amount?: string;
  months?: string;
  rate?: string;
}

type ResultState = { input: SavingsInput; amounts: SavingsAmounts } | null;

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

/** 만원 단위 축약 표기(요약 문구용). 1,000만원/500만원처럼 자연스럽게. */
function formatManwon(value: number): string {
  if (value >= 10000 && value % 10000 === 0) {
    return `${formatWon(value / 10000)}만`;
  }
  return formatWon(value);
}

/** 동적 결과 요약 문구 (§3-5, 정적 텍스트 금지 — 입력값 반영). */
function getResultSummary(input: SavingsInput, amounts: SavingsAmounts): string {
  const methodLabel = METHOD_LABEL[input.method];
  const taxRateStr = formatTaxRatePercent(input.taxType);
  const receivedStr = formatWon(amounts.afterTaxReceived);
  const effStr = amounts.effectiveRatePercent.toFixed(2);

  // 연이율 0% → 이자 미발생(§4 엣지, 게이트 아님)
  if (amounts.pretaxInterest === 0) {
    return `연이율이 0%이므로 이자가 발생하지 않아, 세후 수령액은 원금과 동일한 약 ${receivedStr}원입니다.`;
  }

  const pretaxStr = formatWon(amounts.pretaxInterest);
  const taxStr = formatWon(amounts.taxAmount);
  const taxClause =
    input.taxType === "taxFree"
      ? "비과세로 이자에 세금이 공제되지 않아"
      : `이자과세(${taxRateStr}) ${taxStr}원을 제외한`;

  if (input.mode === "deposit") {
    const amountStr = formatManwon(input.principalOrMonthly);
    return `${amountStr}원을 연 ${input.annualRate}% ${methodLabel}로 ${input.months}개월 예치하면, 세전 이자는 약 ${pretaxStr}원, ${taxClause} 세후 수령액은 약 ${receivedStr}원입니다. 세후 실효수익률은 약 ${effStr}%입니다.`;
  }

  const monthlyStr = formatManwon(input.principalOrMonthly);
  const totalStr = formatManwon(amounts.principalTotal);
  return `매월 ${monthlyStr}원씩 ${input.months}개월(총 ${totalStr}원)을 연 ${input.annualRate}% ${methodLabel} 적금에 납입하면, 세전 이자는 약 ${pretaxStr}원, ${taxClause} 세후 수령액은 약 ${receivedStr}원입니다. 세후 실효수익률은 약 ${effStr}%입니다.`;
}

export default function SavingsInterestCalculator() {
  // 기본값(§2): 모드=적금 / 계산방식=단리 / 과세=일반과세 → 금액·기간·이율만 입력해도 완결
  const [mode, setMode] = useState<SavingsMode>("installment");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [method, setMethod] = useState<SavingsMethod>("simple");
  const [taxType, setTaxType] = useState<InterestTaxType>("general");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ResultState>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  // 모드 전환: 금액 라벨/placeholder/힌트 스위치 + 이전 결과 초기화(§3-1).
  // 입력값(금액/기간/이율/토글)은 유지해 재입력 부담을 줄인다.
  function handleModeChange(next: SavingsMode) {
    if (next === mode) return;
    setMode(next);
    setResult(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountNum = Number(amount.replace(/,/g, ""));
    const monthsNum = Number(months);
    const rateNum = Number(annualRate);

    const nextErrors: FieldErrors = {};

    if (!amount.trim() || !Number.isFinite(amountNum) || amountNum <= 0) {
      nextErrors.amount =
        mode === "deposit"
          ? "예치금을 올바르게 입력해주세요."
          : "월 납입액을 올바르게 입력해주세요.";
    }
    if (
      !months.trim() ||
      !Number.isFinite(monthsNum) ||
      monthsNum <= 0 ||
      !Number.isInteger(monthsNum)
    ) {
      nextErrors.months = "기간을 개월 수 정수로 입력해주세요.";
    } else if (monthsNum > 600) {
      nextErrors.months = "기간은 최대 600개월(50년)까지 입력할 수 있습니다.";
    }
    if (!annualRate.trim() || !Number.isFinite(rateNum) || rateNum < 0) {
      nextErrors.rate = "연이율은 0 이상으로 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const outcome = calculateSavingsInterest({
      principalOrMonthly: amountNum,
      months: monthsNum,
      annualRate: rateNum,
      mode,
      method,
      taxType,
    });

    if (!outcome.ok) {
      // 방어(컴포넌트 1차 검증을 통과했으면 도달하지 않음)
      setErrors(
        outcome.error === "invalid-amount"
          ? { amount: "금액을 올바르게 입력해주세요." }
          : outcome.error === "invalid-months"
            ? { months: "기간을 개월 수 정수로 입력해주세요." }
            : { rate: "연이율은 0 이상으로 입력해주세요." }
      );
      setResult(null);
      return;
    }

    setErrors({});
    setResult({ input: outcome.input, amounts: outcome.amounts });

    // 계산 후 결과 영역으로 스무스 스크롤 (모바일에서 결과를 놓치지 않도록)
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  const amountField = AMOUNT_FIELD[mode];

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
          이 계산기는 예·적금 만기 수령액을 약정금리로 추정하는 참고용
          도구입니다. 실제 적용 금리·우대조건·과세 방식은 금융기관·상품별로 다르며,
          예금자보호 한도 등은 금융감독원을 확인하세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 0. 모드 탭 (예금 / 적금) — 폼 최상단, 탭 성격의 큰 세그먼트 */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-semibold text-brand-text-secondary">
              계산 유형
            </legend>
            <div className="flex items-stretch gap-1 rounded-lg border border-brand-border bg-white p-1">
              {MODE_OPTIONS.map((option) => {
                const selected = mode === option;
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
                      name="savingsMode"
                      value={option}
                      checked={selected}
                      onChange={() => handleModeChange(option)}
                      className="sr-only"
                    />
                    {MODE_LABEL[option]}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-brand-text-secondary">
              예금은 목돈을 한 번에 예치, 적금은 매월 일정액을 납입합니다.
            </p>
          </fieldset>

          {/* ── 그룹: 저축 정보 ── */}
          <fieldset className="flex flex-col gap-4">
            <legend className="text-xs font-semibold text-brand-text-secondary">
              저축 정보
            </legend>

            {/* 1. 금액 (전체 폭, 모드에 따라 라벨/placeholder/힌트 스위치) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="amount"
                className="text-sm font-medium text-brand-text-secondary"
              >
                {amountField.label}
              </label>
              <input
                id="amount"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(event) =>
                  setAmount(formatAmountInput(event.target.value))
                }
                placeholder={amountField.placeholder}
                aria-invalid={errors.amount ? true : undefined}
                className={`${inputBase} ${
                  errors.amount ? "border-brand-warning" : "border-brand-border"
                }`}
              />
              <p className="text-xs text-brand-text-secondary">
                {amountField.hint}
              </p>
              {errors.amount && (
                <p className="text-xs text-brand-warning" role="alert">
                  {errors.amount}
                </p>
              )}
            </div>

            {/* 2. 기간(개월) / 연이율(%) — 2열 */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="months"
                  className="text-sm font-medium text-brand-text-secondary"
                >
                  기간 (개월)
                </label>
                <input
                  id="months"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  value={months}
                  onChange={(event) => setMonths(event.target.value)}
                  placeholder="12"
                  aria-invalid={errors.months ? true : undefined}
                  className={`${inputBase} ${
                    errors.months ? "border-brand-warning" : "border-brand-border"
                  }`}
                />
                {errors.months && (
                  <p className="text-xs text-brand-warning" role="alert">
                    {errors.months}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="annualRate"
                  className="text-sm font-medium text-brand-text-secondary"
                >
                  연이율 (%)
                </label>
                <input
                  id="annualRate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={annualRate}
                  onChange={(event) => setAnnualRate(event.target.value)}
                  placeholder="3.5"
                  aria-invalid={errors.rate ? true : undefined}
                  className={`${inputBase} ${
                    errors.rate ? "border-brand-warning" : "border-brand-border"
                  }`}
                />
                {errors.rate && (
                  <p className="text-xs text-brand-warning" role="alert">
                    {errors.rate}
                  </p>
                )}
              </div>
            </div>

            {/* 3. 이자 계산방식 토글 (단리 / 월복리) — 컴팩트 서브 토글 */}
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-brand-text-secondary">
                이자 계산방식
              </p>
              <div
                className="flex items-stretch gap-0.5 rounded-md border border-brand-border bg-white p-0.5"
                role="radiogroup"
                aria-label="이자 계산방식"
              >
                {METHOD_OPTIONS.map((option) => {
                  const selected = method === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setMethod(option)}
                      className={`h-9 flex-1 rounded text-xs font-semibold transition-colors ${
                        selected
                          ? "bg-brand-primary text-white"
                          : "bg-transparent text-brand-text-secondary"
                      }`}
                    >
                      {METHOD_LABEL[option]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-brand-text-secondary">
                단리는 원금에만, 복리는 이자에 다시 이자가 붙습니다.
              </p>
            </div>
          </fieldset>

          {/* ── 그룹: 이자 과세 ── */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-semibold text-brand-text-secondary">
              이자 과세
            </legend>
            <div className="flex items-stretch gap-1 rounded-lg border border-brand-border bg-white p-1">
              {TAX_OPTIONS.map((option) => {
                const selected = taxType === option;
                return (
                  <label
                    key={option}
                    className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-1 text-center text-xs font-semibold transition-colors ${
                      selected
                        ? "bg-brand-primary text-white"
                        : "bg-transparent text-brand-text-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="taxType"
                      value={option}
                      checked={selected}
                      onChange={() => setTaxType(option)}
                      className="sr-only"
                    />
                    {INTEREST_TAX_LABEL[option]}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-brand-text-secondary">
              {getTaxHelper(taxType)}
            </p>
          </fieldset>

          {/* 4. 계산 버튼 */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            이자 계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 금액·이율 정보는 브라우저 안에서만 계산되며 서버에
            저장·전송되지 않습니다.
          </p>
        </form>

        {result && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 (만기 세후 수령액) */}
            <p className="text-sm font-medium text-brand-text-secondary">
              만기 세후 수령액
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
              {formatWon(result.amounts.afterTaxReceived)}
              <span className="text-base font-medium text-brand-text-secondary">
                원
              </span>
            </p>
            <p className="mt-1 text-xs text-brand-text-secondary">
              {result.input.mode === "deposit"
                ? "예치 원금 + 세후 이자입니다."
                : "총 납입원금 + 세후 이자입니다."}
            </p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result.input, result.amounts)}
            </p>

            {/* Tier ② — 보조값 (계산 흐름 순) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              {result.input.mode === "installment" && (
                <AmountRow
                  label="총 납입원금"
                  value={result.amounts.principalTotal}
                />
              )}
              <AmountRow label="세전 이자" value={result.amounts.pretaxInterest} />
              <AmountRow
                label={`이자과세 (${formatTaxRatePercent(result.input.taxType)})`}
                value={result.amounts.taxAmount}
              />
              <AmountRow label="세후 이자" value={result.amounts.afterTaxInterest} />
              <AmountRow
                label="세후 수령액"
                value={result.amounts.afterTaxReceived}
              />
              <TextRow
                label="세후 실효수익률"
                value={`${result.amounts.effectiveRatePercent.toFixed(2)}%`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
