"use client";

import { useRef, useState, type FormEvent } from "react";
import { calculateSalary, type SalaryResult } from "@/lib/salary";
import { formatWon } from "@/lib/loan";
import {
  INPUT_BASE as inputBase,
  SELECT_BASE as selectBase,
} from "@/lib/inputClass";

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

const DEPENDENTS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1); // 1~10

/** 금액을 "약 ○○만원" / (1만원 미만) "약 ○,○00원" 형태로 반올림 표기 (planning §9-4). */
function formatApprox(amount: number): string {
  if (amount < 10_000) {
    const rounded = Math.round(amount / 100) * 100;
    return `약 ${rounded.toLocaleString("ko-KR")}원`;
  }
  return `약 ${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
}

/** 동적 요약 문구 (planning §9-4 확정 템플릿). */
function getResultSummary(annualSalary: number, result: SalaryResult): string {
  const salaryStr = `${Math.round(annualSalary / 10_000).toLocaleString("ko-KR")}만원`;
  const insStr = formatApprox(result.insuranceTotal);

  // 변형 A — 세금 월 합계가 만원 미만(저소득·공제 과다 구간)
  if (result.taxTotal < 10_000) {
    return `세전 연봉 ${salaryStr}을 기준으로, 매월 4대 보험 ${insStr}을 공제한 실수령액입니다. 근로소득세는 공제 반영 후 거의 발생하지 않습니다.`;
  }

  const taxStr = formatApprox(result.taxTotal);
  return `세전 연봉 ${salaryStr}을 기준으로, 매월 4대 보험 ${insStr}과 세금 ${taxStr}을 공제한 실수령액입니다.`;
}

/** Tier ②·③ 공용 라벨-값 1행 (가로 오버플로 0: flex justify-between) */
function AmountRow({
  label,
  value,
  minus = false,
  dense = false,
  emphasis = false,
  divider = false,
}: {
  label: string;
  value: number;
  minus?: boolean;
  dense?: boolean;
  emphasis?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${dense ? "py-1" : "py-1.5"} text-sm ${
        divider ? "mt-1 border-t border-brand-border/40 pt-1" : ""
      }`}
    >
      <span className="text-brand-text-secondary">{label}</span>
      <span
        className={`tabular-nums text-brand-text ${emphasis ? "font-semibold" : ""}`}
      >
        {minus ? "− " : ""}
        {formatWon(value)} 원
      </span>
    </div>
  );
}

export default function SalaryNetCalculator() {
  const [annualSalary, setAnnualSalary] = useState("");
  const [taxFreeMonthly, setTaxFreeMonthly] = useState("200,000");
  const [dependents, setDependents] = useState(1);
  const [children, setChildren] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SalaryResult | null>(null);
  const [inputSalary, setInputSalary] = useState(0);

  const resultRef = useRef<HTMLDivElement | null>(null);

  // 자녀 옵션 캡 = 부양가족 − 1 (자녀 ≤ 부양가족 − 1)
  const childrenCap = Math.max(0, dependents - 1);
  const childrenDisabled = childrenCap === 0;
  const childrenOptions = Array.from({ length: childrenCap + 1 }, (_, i) => i);

  function handleDependentsChange(value: string) {
    const next = Number(value);
    setDependents(next);
    const cap = Math.max(0, next - 1);
    if (children > cap) setChildren(cap);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const annualNum = Number(annualSalary.replace(/,/g, ""));
    const taxFreeNum = Number(taxFreeMonthly.replace(/,/g, "")) || 0;

    if (!annualSalary.trim() || !Number.isFinite(annualNum) || annualNum <= 0) {
      setError("연봉을 올바르게 입력해주세요.");
      setResult(null);
      return;
    }

    const calculated = calculateSalary({
      annualSalary: annualNum,
      taxFreeMonthly: taxFreeNum,
      dependents,
      children,
    });

    if (!calculated) {
      setError("입력값을 다시 확인해주세요.");
      setResult(null);
      return;
    }

    setError(null);
    setInputSalary(annualNum);
    setResult(calculated);

    // 계산 후 결과 영역으로 스무스 스크롤 (모바일에서 결과를 놓치지 않도록)
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
          근로소득세는 국세청 간이세액표(회사가 매달 월급에서 세금을 뗄 때 쓰는
          기준표)를 근사한 값으로 계산해, 실제 급여명세서·원천징수액과 다를 수
          있습니다. 결과는 참고용으로만 활용해 주세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 1. 연봉 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="annualSalary"
              className="text-sm font-medium text-brand-text-secondary"
            >
              연봉 (세전, 원)
            </label>
            <input
              id="annualSalary"
              type="text"
              inputMode="numeric"
              value={annualSalary}
              onChange={(event) =>
                setAnnualSalary(formatAmountInput(event.target.value))
              }
              placeholder="40,000,000"
              aria-invalid={error ? true : undefined}
              className={`${inputBase} ${
                error ? "border-brand-warning" : "border-brand-border"
              }`}
            />
            <p className="text-xs text-brand-text-secondary">
              성과급·상여가 연봉에 포함된 계약이면 연 총액을 입력하세요.
            </p>
            {error && (
              <p className="text-xs text-brand-warning" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* 2. 월 비과세액 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="taxFreeMonthly"
              className="text-sm font-medium text-brand-text-secondary"
            >
              식대 등 비과세 (월, 원)
            </label>
            <input
              id="taxFreeMonthly"
              type="text"
              inputMode="numeric"
              value={taxFreeMonthly}
              onChange={(event) =>
                setTaxFreeMonthly(formatAmountInput(event.target.value))
              }
              placeholder="200,000"
              className={`${inputBase} border-brand-border`}
            />
            <p className="text-xs text-brand-text-secondary">
              비과세는 세금·4대 보험이 붙지 않는 급여입니다. 식대는 월 20만원까지
              비과세(기본값)이며, 자가운전보조금 등이 있으면 증액하세요.
            </p>
          </div>

          {/* 3. 부양가족 수 / 8~20세 자녀 수 (2열) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="dependents"
                className="min-h-10 text-sm font-medium text-brand-text-secondary"
              >
                부양가족 수 (본인 포함)
              </label>
              <div className="relative">
                <select
                  id="dependents"
                  value={dependents}
                  onChange={(event) => handleDependentsChange(event.target.value)}
                  className={selectBase}
                >
                  {DEPENDENTS_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}명
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-xs text-brand-text-secondary"
                >
                  ▾
                </span>
              </div>
              <p className="text-xs text-brand-text-secondary">
                본인과 배우자·자녀·부모 등 부양하는 가족의 수입니다(본인 포함 최소 1명).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="children"
                className="min-h-10 text-sm font-medium text-brand-text-secondary"
              >
                8~20세 자녀 수
              </label>
              <div className="relative">
                <select
                  id="children"
                  value={children}
                  onChange={(event) => setChildren(Number(event.target.value))}
                  disabled={childrenDisabled}
                  className={`${selectBase} disabled:cursor-not-allowed disabled:bg-brand-border/20 disabled:text-brand-text-secondary`}
                >
                  {childrenOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}명
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-xs text-brand-text-secondary"
                >
                  ▾
                </span>
              </div>
              <p className="text-xs text-brand-text-secondary">
                {childrenDisabled
                  ? "부양가족을 2명 이상으로 설정하면 자녀 수를 입력할 수 있습니다."
                  : "자녀세액공제 대상. 부양가족 수보다 적어야 합니다."}
              </p>
            </div>
          </div>

          {/* 4. 계산 버튼 (YMYL-중간: 계산 버튼 1개만) */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            연봉 실수령액 계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 연봉·비과세액 등은 브라우저 안에서만 계산되며 서버에
            저장·전송되지 않습니다.
          </p>
        </form>

        {result && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 */}
            <p className="text-sm font-medium text-brand-text-secondary">
              예상 월 실수령액
            </p>
            <p className="mt-1 flex items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
              {formatWon(result.monthlyNet)}
              <span className="text-base font-medium text-brand-text-secondary">
                원
              </span>
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-brand-text">
              연 환산 약 {formatWon(result.annualNet)} 원
            </p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(inputSalary, result)}
            </p>

            {/* Tier ② — 공제 요약 3행 (항상) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <AmountRow label="월 급여총액 (세전)" value={result.monthlyGross} />
              <AmountRow
                label="4대 보험 (근로자 부담)"
                value={result.insuranceTotal}
                minus
                emphasis
              />
              <AmountRow
                label="소득세 · 지방소득세"
                value={result.taxTotal}
                minus
                emphasis
              />
            </div>

            {/* Tier ③ — 공제 상세 (접이식, 기본 접힘) */}
            <details className="group mt-4 border-t border-brand-border/60 pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand-primary [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="inline-block select-none transition-transform group-open:rotate-90"
                >
                  ▸
                </span>
                공제 내역 자세히 보기 (4대 보험·세금 항목별)
              </summary>

              <div className="mt-2">
                {/* 4대 보험 */}
                <p className="mt-2 text-xs font-semibold text-brand-text-secondary">
                  4대 보험
                </p>
                <AmountRow label="국민연금" value={result.nationalPension} minus dense />
                <AmountRow label="건강보험" value={result.healthInsurance} minus dense />
                <AmountRow label="장기요양보험" value={result.longTermCare} minus dense />
                <AmountRow
                  label="고용보험"
                  value={result.employmentInsurance}
                  minus
                  dense
                />
                <AmountRow
                  label="소계"
                  value={result.insuranceTotal}
                  minus
                  dense
                  emphasis
                  divider
                />

                {/* 세금 */}
                <p className="mt-3 text-xs font-semibold text-brand-text-secondary">
                  세금
                </p>
                <AmountRow label="근로소득세" value={result.incomeTax} minus dense />
                <AmountRow label="지방소득세" value={result.localIncomeTax} minus dense />
                <AmountRow
                  label="소계"
                  value={result.taxTotal}
                  minus
                  dense
                  emphasis
                  divider
                />
                {/* 근사 고지 인라인 노트 */}
                <p className="mt-1 text-xs text-brand-text-secondary">
                  근로소득세는 간이세액표를 근사한 값이라 실제 원천징수액과 다를 수
                  있습니다.
                </p>

                {/* 과세 정보 (중간값) */}
                <p className="mt-3 text-xs font-semibold text-brand-text-secondary">
                  과세 정보
                </p>
                <AmountRow
                  label="월 과세대상 급여"
                  value={result.monthlyTaxable}
                  dense
                />
                <AmountRow label="적용 비과세액" value={result.taxFreeMonthly} dense />
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
