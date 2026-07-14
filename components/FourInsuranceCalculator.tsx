"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  calculateFourInsurance,
  type BusinessSize,
  type FourInsuranceResult,
  type InsuranceRow,
} from "@/lib/four-insurance";
import { formatWon } from "@/lib/loan";

interface FieldErrors {
  monthlyTaxable?: string;
}

/** 입력 중 천단위 콤마 서식 (숫자만 남기고 콤마 삽입; 음수·문자·소수점 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

const inputBase =
  "h-12 rounded-lg border px-4 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

const selectBase =
  "h-12 w-full appearance-none rounded-lg border border-brand-border bg-white pl-4 pr-9 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

/** 사업장 규모 옵션(값·표시 = 기획 §1-2 / 디자인 §2-2, 순서 고정). */
const BUSINESS_SIZE_OPTIONS: { value: BusinessSize; label: string }[] = [
  { value: "under150", label: "150인 미만" },
  { value: "over150Priority", label: "150인 이상(우선지원 대상기업)" },
  { value: "from150to1000", label: "150인 이상~1,000인 미만" },
  { value: "over1000", label: "1,000인 이상·국가/지자체" },
];

function sizeLabel(size: BusinessSize): string {
  return (
    BUSINESS_SIZE_OPTIONS.find((o) => o.value === size)?.label ?? "150인 미만"
  );
}

/** 금액을 "약 ○○만원" / (1만원 미만) "약 ○,○00원" 형태로 반올림 표기(요약용). */
function formatApprox(amount: number): string {
  if (amount < 10_000) {
    const rounded = Math.round(amount / 100) * 100;
    return `약 ${rounded.toLocaleString("ko-KR")}원`;
  }
  return `약 ${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
}

/** 급여를 "N만원" 표기(chip·요약용). */
function salaryMan(amount: number): string {
  return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
}

/** 동적 결과 요약 문구 (디자인 §3-7, 정적 텍스트 금지 · 근로자/사업주/총 반영). */
function getResultSummary(result: FourInsuranceResult): string {
  return `월 과세대상 급여 ${salaryMan(
    result.monthlyTaxable
  )} 기준, 급여에서 매달 공제되는 근로자 부담 4대 보험료는 ${formatApprox(
    result.employeeTotal
  )}, 회사(사업주)도 ${formatApprox(
    result.employerTotal
  )}을 함께 부담해 합계 ${formatApprox(
    result.grandTotal
  )}입니다(산재보험 제외).`;
}

/** 보험 항목별 표시 메타(뱃지 = 디자인 §3-4·§3-5). */
const INSURANCE_ROWS: {
  key: keyof Pick<
    FourInsuranceResult,
    | "nationalPension"
    | "healthInsurance"
    | "longTermCare"
    | "employmentInsurance"
  >;
  label: string;
  mobileLabel: string;
  badge: "노사 절반" | "회사 추가";
}[] = [
  {
    key: "nationalPension",
    label: "국민연금",
    mobileLabel: "국민연금",
    badge: "노사 절반",
  },
  {
    key: "healthInsurance",
    label: "건강보험",
    mobileLabel: "건강보험",
    badge: "노사 절반",
  },
  {
    key: "longTermCare",
    label: "장기요양",
    mobileLabel: "장기요양보험",
    badge: "노사 절반",
  },
  {
    key: "employmentInsurance",
    label: "고용보험",
    mobileLabel: "고용보험",
    badge: "회사 추가",
  },
];

const badgeClass =
  "shrink-0 rounded bg-brand-border/30 px-1 py-0.5 text-[10px] font-medium text-brand-text-secondary";

/** 데스크톱 4열 grid의 숫자 셀(우측 정렬 + 스크린리더 aria-label 대체). */
function GridNum({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <span
      className={`py-1.5 text-right text-sm tabular-nums text-brand-text ${
        bold ? "font-semibold" : ""
      }`}
      aria-label={`${label} ${formatWon(value)}원`}
    >
      {formatWon(value)} 원
    </span>
  );
}

/** 모바일 보험별 블록의 라벨-값 단행(flex justify-between, 가로 오버플로 0). */
function BlockRow({
  label,
  value,
  bold = false,
  divider = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1 text-sm ${
        divider ? "mt-1 border-t border-brand-border/40 pt-1" : ""
      }`}
    >
      <span className="text-brand-text-secondary">{label}</span>
      <span
        className={`tabular-nums text-brand-text ${bold ? "font-semibold" : ""}`}
      >
        {formatWon(value)} 원
      </span>
    </div>
  );
}

export default function FourInsuranceCalculator() {
  const [monthlyTaxable, setMonthlyTaxable] = useState("");
  const [businessSize, setBusinessSize] = useState<BusinessSize>("under150");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<FourInsuranceResult | null>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const taxableNum = Number(monthlyTaxable.replace(/,/g, ""));

    const nextErrors: FieldErrors = {};
    if (
      !monthlyTaxable.trim() ||
      !Number.isFinite(taxableNum) ||
      taxableNum <= 0
    ) {
      nextErrors.monthlyTaxable = "월 과세대상 급여를 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const calculated = calculateFourInsurance({
      monthlyTaxable: taxableNum,
      businessSize,
    });

    if (!calculated) {
      setErrors({ monthlyTaxable: "입력값을 다시 확인해주세요." });
      setResult(null);
      return;
    }

    setErrors({});
    setResult(calculated);

    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  return (
    <div>
      {/* 상단 근사 고지 배너 — 항상 노출 (계산 여부 무관). 광고 아님. 디자인 §6-1 1안. */}
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
          2026년 요율을 기준으로 계산한 근로자·회사(사업주) 부담 참고용 예상 4대
          보험료입니다. 산재보험(전액 사업주 부담·업종별)은 제외되며, 회사가
          신고한 기준소득월액·보수월액과 사업장 규모에 따라 실제 공제·납부액과 다를
          수 있습니다. 요율은 매년 갱신되며, 정확한 금액은 4대 사회보험
          정보연계센터에서 확인해 주세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 1. 월 과세대상 급여 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="monthlyTaxable"
              className="text-sm font-medium text-brand-text-secondary"
            >
              월 과세대상 급여 (원)
            </label>
            <div className="relative">
              <input
                id="monthlyTaxable"
                type="text"
                inputMode="numeric"
                value={monthlyTaxable}
                onChange={(event) =>
                  setMonthlyTaxable(formatAmountInput(event.target.value))
                }
                placeholder="3,000,000"
                aria-invalid={errors.monthlyTaxable ? true : undefined}
                className={`${inputBase} w-full pr-9 ${
                  errors.monthlyTaxable
                    ? "border-brand-warning"
                    : "border-brand-border"
                }`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
              >
                원
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">
              비과세(식대 등)를 뺀 월급입니다. 연봉만 안다면 연봉 ÷ 12에서
              비과세를 뺀 금액을 넣어 주세요.
            </p>
            {errors.monthlyTaxable && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.monthlyTaxable}
              </p>
            )}
          </div>

          {/* 2. 사업장 규모 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="businessSize"
              className="text-sm font-medium text-brand-text-secondary"
            >
              사업장 규모
            </label>
            <div className="relative">
              <select
                id="businessSize"
                value={businessSize}
                onChange={(event) =>
                  setBusinessSize(event.target.value as BusinessSize)
                }
                className={selectBase}
              >
                {BUSINESS_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
              회사(사업주)의 고용보험 부담 계산에만 쓰입니다. 근로자 부담과
              국민연금·건강보험·장기요양보험에는 영향을 주지 않습니다.
            </p>
          </div>

          {/* 3. 계산 버튼 (YMYL: 중립 문구 "계산하기" 1개만) */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 급여는 브라우저 안에서만 계산되며 서버에 저장·전송되지
            않습니다.
          </p>
        </form>

        {result && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값(근로자 부담 합계) */}
            <p className="text-sm font-medium text-brand-text-secondary">
              근로자 부담 합계
              <span className="ml-2 rounded bg-brand-border/40 px-1.5 py-0.5 text-xs font-medium text-brand-text-secondary">
                참고용 예상 보험료
              </span>
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
              {formatWon(result.employeeTotal)}
              <span className="text-base font-medium text-brand-text-secondary">
                원
              </span>
            </p>
            <p className="mt-1">
              <span className="inline-block rounded-full bg-brand-border/30 px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
                월 과세급여 {salaryMan(result.monthlyTaxable)} ·{" "}
                {sizeLabel(result.businessSize)}
              </span>
            </p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result)}
            </p>

            {/* Tier ② — 근로자/사업주/총 3-way 요약 (핵심 3열) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              {/* 데스크톱: 3셀 가로 병렬 */}
              <div className="hidden grid-cols-3 gap-3 sm:grid">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-brand-text-secondary">
                    근로자 부담
                  </span>
                  <span
                    className="text-lg font-semibold tabular-nums text-brand-accent"
                    aria-label={`근로자 부담 합계 ${formatWon(
                      result.employeeTotal
                    )}원`}
                  >
                    {formatWon(result.employeeTotal)} 원
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-brand-text-secondary">
                    사업주 부담 †
                  </span>
                  <span
                    className="text-lg font-semibold tabular-nums text-brand-text"
                    aria-label={`사업주 부담 합계 ${formatWon(
                      result.employerTotal
                    )}원, 산재보험 제외`}
                  >
                    {formatWon(result.employerTotal)} 원
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-brand-text-secondary">
                    총 합계
                  </span>
                  <span
                    className="text-lg font-semibold tabular-nums text-brand-text"
                    aria-label={`총 합계 ${formatWon(result.grandTotal)}원`}
                  >
                    {formatWon(result.grandTotal)} 원
                  </span>
                </div>
              </div>

              {/* 모바일: 3행 라벨-값 스택 */}
              <div className="sm:hidden">
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-brand-text-secondary">근로자 부담</span>
                  <span className="tabular-nums text-brand-accent">
                    {formatWon(result.employeeTotal)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-brand-text-secondary">
                    사업주 부담 †
                  </span>
                  <span className="tabular-nums text-brand-text">
                    {formatWon(result.employerTotal)} 원
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="font-semibold text-brand-text-secondary">
                    총 합계
                  </span>
                  <span className="font-semibold tabular-nums text-brand-text">
                    {formatWon(result.grandTotal)} 원
                  </span>
                </div>
              </div>

              {/* 산재 제외 각주 (사업주 값 근처) */}
              <p className="mt-2 text-xs text-brand-text-secondary">
                † 산재보험(전액 사업주 부담·업종별)은 제외된 금액입니다.
              </p>
            </div>

            {/* Tier ③ — 4보험 항목별 내역 (항상 노출) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              {/* 노사 절반 안내 1줄 */}
              <p className="flex items-start gap-1 text-xs text-brand-text-secondary">
                <span aria-hidden="true">ⓘ</span>
                <span>
                  국민연금·건강보험·장기요양보험은 회사(사업주)가 근로자와 같은
                  금액을 함께 부담합니다(노사 절반). 고용보험만 회사가 더
                  부담합니다.
                </span>
              </p>

              {/* 데스크톱: 4열 grid 표 (table 미사용) */}
              <div className="mt-3 hidden grid-cols-[1.4fr_1fr_1fr_1fr] sm:grid">
                {/* 헤더 */}
                <span className="border-b border-brand-border/60 py-1.5 text-xs font-medium text-brand-text-secondary">
                  항목
                </span>
                <span className="border-b border-brand-border/60 py-1.5 text-right text-xs font-medium text-brand-text-secondary">
                  근로자
                </span>
                <span className="border-b border-brand-border/60 py-1.5 text-right text-xs font-medium text-brand-text-secondary">
                  사업주
                </span>
                <span className="border-b border-brand-border/60 py-1.5 text-right text-xs font-medium text-brand-text-secondary">
                  합계
                </span>

                {/* 4보험 행 */}
                {INSURANCE_ROWS.map((row) => {
                  const data = result[row.key] as InsuranceRow;
                  return (
                    <FragmentRowDesktop
                      key={row.key}
                      label={row.label}
                      badge={row.badge}
                      data={data}
                    />
                  );
                })}

                {/* 합계 행 */}
                <span className="border-t border-brand-border/60 py-1.5 text-sm font-semibold text-brand-text">
                  합계
                </span>
                <GridNum
                  label="근로자 부담 합계"
                  value={result.employeeTotal}
                  bold
                />
                <span className="border-t border-brand-border/60">
                  <GridNum
                    label="사업주 부담 합계"
                    value={result.employerTotal}
                    bold
                  />
                </span>
                <span className="border-t border-brand-border/60">
                  <GridNum label="총 합계" value={result.grandTotal} bold />
                </span>
              </div>

              {/* 모바일: 보험별 블록 스택 (4열 표 → 세로 재배치, 가로 오버플로 0) */}
              <div className="mt-3 grid gap-2 sm:hidden">
                {INSURANCE_ROWS.map((row) => {
                  const data = result[row.key] as InsuranceRow;
                  return (
                    <div
                      key={row.key}
                      className="rounded-lg border border-brand-border/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-brand-text">
                          {row.mobileLabel}
                        </span>
                        <span className={badgeClass}>{row.badge}</span>
                      </div>
                      <BlockRow label="근로자" value={data.employee} />
                      <BlockRow label="사업주" value={data.employer} />
                      <BlockRow label="합계" value={data.total} bold divider />
                    </div>
                  );
                })}
              </div>

              {/* 국민연금 상한 note (급여 > 659만, 선택 · 중립 회색) */}
              {result.isPensionCapped && (
                <p className="mt-2 text-xs text-brand-text-secondary">
                  국민연금은 기준소득월액 상한(월 659만원)이 적용되어, 급여가 더
                  올라도 국민연금료는 더 늘지 않습니다.
                </p>
              )}

              {/* 각주 (규모 상태 + 산재 제외) */}
              <p className="mt-2 text-xs text-brand-text-secondary">
                사업주 열은 사업장 규모({sizeLabel(result.businessSize)})
                기준입니다. 산재보험은 전액 사업주 부담·업종별이라 이 계산에
                포함되지 않습니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 데스크톱 4열 grid의 한 보험 행(라벨+뱃지 셀 + 근로자/사업주/합계 숫자 3셀). */
function FragmentRowDesktop({
  label,
  badge,
  data,
}: {
  label: string;
  badge: string;
  data: InsuranceRow;
}) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-1 py-1.5 text-sm text-brand-text">
        {label}
        <span className={badgeClass}>{badge}</span>
      </span>
      <GridNum label={`${label} 근로자 부담`} value={data.employee} />
      <GridNum label={`${label} 사업주 부담`} value={data.employer} />
      <GridNum label={`${label} 합계`} value={data.total} />
    </>
  );
}
