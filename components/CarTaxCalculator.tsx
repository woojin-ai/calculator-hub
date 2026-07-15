"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  calculateCarTax,
  formatCcBracketLabel,
  CC_TAX_BRACKETS,
  EDUCATION_TAX_RATE,
  PREPAY_DISCOUNT_RATE,
  AGE_RELIEF_START_YEAR,
  AGE_RELIEF_PER_YEAR,
  AGE_RELIEF_MAX,
  type CarKind,
  type CarTaxAmounts,
  type CarTaxInput,
} from "@/lib/car-tax";
import { formatWon } from "@/lib/loan";
import { INPUT_BASE as inputBase } from "@/lib/inputClass";

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입; 음수·문자 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

const KIND_OPTIONS: CarKind[] = ["combustion", "eco"];

const KIND_LABEL: Record<CarKind, string> = {
  combustion: "일반 승용",
  eco: "전기·수소차",
};

// 세율/할인율 문자열은 상수에서 조합(하드코딩 금지, §0).
const EDUCATION_TAX_PERCENT = `${Math.round(EDUCATION_TAX_RATE * 100)}%`;
const PREPAY_DISCOUNT_PERCENT = `${Math.round(PREPAY_DISCOUNT_RATE * 100)}%`;
// 배기량 힌트 구간표 안내 (상수에서 조합)
const CC_BRACKET_HINT = `${CC_TAX_BRACKETS[0].maxCc.toLocaleString("ko-KR")}cc 이하 ${CC_TAX_BRACKETS[0].wonPerCc}원, ${CC_TAX_BRACKETS[1].maxCc.toLocaleString("ko-KR")}cc 이하 ${CC_TAX_BRACKETS[1].wonPerCc}원, ${CC_TAX_BRACKETS[1].maxCc.toLocaleString("ko-KR")}cc 초과 ${CC_TAX_BRACKETS[2].wonPerCc}원/cc`;
// 차령 경감 안내 (상수에서 조합)
const AGE_RELIEF_HINT = `등록 ${AGE_RELIEF_START_YEAR}년차부터 매년 ${Math.round(
  AGE_RELIEF_PER_YEAR * 100
)}%씩(최대 ${Math.round(AGE_RELIEF_MAX * 100)}%) 세액이 경감됩니다.`;

/** 등록연도 힌트 (차종 스위치, §2-2). */
const REGISTER_YEAR_HINT: Record<CarKind, string> = {
  combustion: `자동차등록증상 최초 등록 연도입니다. ${AGE_RELIEF_HINT}`,
  eco: "참고용입니다. 전기·수소차는 정액 과세로 차령 경감이 적용되지 않습니다.",
};

interface FieldErrors {
  cc?: string;
  year?: string;
}

type ResultState = { input: CarTaxInput; amounts: CarTaxAmounts } | null;

/** 원 금액 라벨-값 행 (SavingsInterestCalculator AmountRow 패턴). accent=값 강조. */
function AmountRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-brand-text-secondary">{label}</span>
      <span
        className={`tabular-nums font-semibold ${
          accent ? "text-brand-accent" : "text-brand-text"
        }`}
      >
        {formatWon(value)} 원
      </span>
    </div>
  );
}

/** 문자열 값 라벨-값 행 (SavingsInterestCalculator TextRow 패턴). */
function TextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-brand-text-secondary">{label}</span>
      <span className="tabular-nums font-semibold text-brand-text">{value}</span>
    </div>
  );
}

/** 경감률 표시 문자열 (Tier② 차령 경감률 행, §4). */
function getReliefText(input: CarTaxInput, amounts: CarTaxAmounts): string {
  if (input.kind === "eco") {
    return "해당 없음 (정액 과세)";
  }
  const pct = Math.round(amounts.reliefRate * 100);
  if (pct > 0) {
    return `${pct}% (차령 ${amounts.carAge}년)`;
  }
  return `해당 없음 (차령 ${amounts.carAge}년)`;
}

/** 동적 결과 요약 문구 (§4 Tier①, 정적 텍스트 금지 — 입력값 반영, 상수에서 조합). */
function getResultSummary(input: CarTaxInput, amounts: CarTaxAmounts): string {
  const annualStr = formatWon(amounts.annualTotal);

  if (input.kind === "eco") {
    return `전기·수소차(비영업 승용)는 배기량과 무관하게 자동차세 본세가 ${formatWon(
      amounts.baseTax
    )}원으로 정액 과세되어, 지방교육세 포함 연 ${annualStr}원입니다.`;
  }

  const ccStr = input.cc.toLocaleString("ko-KR");
  const bracketStr = formatCcBracketLabel(input.cc);
  const pct = Math.round(amounts.reliefRate * 100);
  const ageClause =
    pct > 0
      ? `최초등록 ${input.registerYear}년(차령 ${amounts.carAge}년, ${pct}% 경감)`
      : `최초등록 ${input.registerYear}년(차령 ${amounts.carAge}년, 경감 없음)`;

  return `배기량 ${ccStr}cc(${bracketStr}), ${ageClause} 기준 연 자동차세는 지방교육세 포함 약 ${annualStr}원입니다. 1월 연납 시 ${formatWon(
    amounts.prepayDiscount
  )}원 할인되어 ${formatWon(amounts.prepayTotal)}원입니다.`;
}

export default function CarTaxCalculator() {
  // 기본값(§2): 차종=일반 승용(내연). 배기량·등록연도만 입력하면 완결.
  const [kind, setKind] = useState<CarKind>("combustion");
  const [cc, setCc] = useState("");
  const [registerYear, setRegisterYear] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ResultState>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  // 차종 전환: 배기량 필드 노출/숨김 스위치 + 이전 결과 초기화(§2-1).
  // 등록연도 입력값은 유지해 재입력 부담을 줄인다.
  function handleKindChange(next: CarKind) {
    if (next === kind) return;
    setKind(next);
    setResult(null);
    setErrors({});
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ccNum = Number(cc.replace(/,/g, ""));
    const yearNum = Number(registerYear);

    const nextErrors: FieldErrors = {};

    // 배기량은 내연일 때만 검증(전기차는 필드 숨김)
    if (kind === "combustion") {
      if (
        !cc.trim() ||
        !Number.isFinite(ccNum) ||
        !Number.isInteger(ccNum) ||
        ccNum <= 0 ||
        ccNum > 9999
      ) {
        nextErrors.cc = "배기량을 cc 단위 정수로 입력해주세요.";
      }
    }
    if (
      !registerYear.trim() ||
      !Number.isFinite(yearNum) ||
      !Number.isInteger(yearNum) ||
      yearNum < 1900 ||
      yearNum > 2026
    ) {
      nextErrors.year = "최초등록연도를 1900~2026 사이로 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const outcome = calculateCarTax({
      kind,
      cc: ccNum,
      registerYear: yearNum,
    });

    if (!outcome.ok) {
      // 방어(컴포넌트 1차 검증을 통과했으면 도달하지 않음)
      setErrors(
        outcome.error === "invalid-cc"
          ? { cc: "배기량을 cc 단위 정수로 입력해주세요." }
          : { year: "최초등록연도를 1900~2026 사이로 입력해주세요." }
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

  return (
    <div>
      {/* 상단 근사 고지 배너 — 항상 노출. 광고 아님. */}
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
          이 계산기는 비영업용 승용차의 2026년 자동차세를 배기량·차령 기준으로
          추정하는 참고용 도구입니다. 영업용·승합·화물 등 다른 차종은 세율 체계가
          달라 지원하지 않습니다. 실제 부과액은 위택스·지자체 고지서를 확인하세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 0. 차종 탭 (일반 승용 / 전기·수소차) — 폼 최상단, 탭 성격의 큰 세그먼트 */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-semibold text-brand-text-secondary">
              차종
            </legend>
            <div className="flex items-stretch gap-1 rounded-lg border border-brand-border bg-white p-1">
              {KIND_OPTIONS.map((option) => {
                const selected = kind === option;
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
                      name="carKind"
                      value={option}
                      checked={selected}
                      onChange={() => handleKindChange(option)}
                      className="sr-only"
                    />
                    {KIND_LABEL[option]}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-brand-text-secondary">
              일반 승용(내연기관)은 배기량 기준, 전기·수소차는 정액으로
              과세됩니다.
            </p>
          </fieldset>

          {/* ── 그룹: 차량 정보 ── */}
          <fieldset className="flex flex-col gap-4">
            <legend className="text-xs font-semibold text-brand-text-secondary">
              차량 정보
            </legend>

            {/* 1. 배기량 (전체 폭, 내연일 때만 노출) */}
            {kind === "combustion" && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="cc"
                  className="text-sm font-medium text-brand-text-secondary"
                >
                  배기량 (cc)
                </label>
                <input
                  id="cc"
                  type="text"
                  inputMode="numeric"
                  value={cc}
                  onChange={(event) => setCc(formatAmountInput(event.target.value))}
                  placeholder="1,999"
                  aria-invalid={errors.cc ? true : undefined}
                  className={`${inputBase} w-full ${
                    errors.cc ? "border-brand-warning" : "border-brand-border"
                  }`}
                />
                <p className="text-xs text-brand-text-secondary">
                  자동차등록증의 총배기량입니다. {CC_BRACKET_HINT}가 적용됩니다.
                </p>
                {errors.cc && (
                  <p className="text-xs text-brand-warning" role="alert">
                    {errors.cc}
                  </p>
                )}
              </div>
            )}

            {/* 2. 최초등록연도 (전체 폭, 항상 노출) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="registerYear"
                className="text-sm font-medium text-brand-text-secondary"
              >
                최초등록연도
              </label>
              <input
                id="registerYear"
                type="number"
                inputMode="numeric"
                step="1"
                value={registerYear}
                onChange={(event) => setRegisterYear(event.target.value)}
                placeholder="2020"
                aria-invalid={errors.year ? true : undefined}
                className={`${inputBase} w-full ${
                  errors.year ? "border-brand-warning" : "border-brand-border"
                }`}
              />
              <p className="text-xs text-brand-text-secondary">
                {REGISTER_YEAR_HINT[kind]}
              </p>
              {errors.year && (
                <p className="text-xs text-brand-warning" role="alert">
                  {errors.year}
                </p>
              )}
            </div>
          </fieldset>

          {/* 3. 계산 버튼 */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            자동차세 계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 배기량·등록연도 정보는 브라우저 안에서만 계산되며 서버에
            저장·전송되지 않습니다.
          </p>
        </form>

        {result && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 (연 자동차세 총액) */}
            <p className="text-sm font-medium text-brand-text-secondary">
              연 자동차세 (지방교육세 포함)
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
              {formatWon(result.amounts.annualTotal)}
              <span className="text-base font-medium text-brand-text-secondary">
                원
              </span>
            </p>
            <p className="mt-1 text-xs text-brand-text-secondary">
              자동차세 본세 + 지방교육세({EDUCATION_TAX_PERCENT})를 합한 1년
              세액입니다.
            </p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result.input, result.amounts)}
            </p>

            {/* Tier ② — 세부 내역 (계산 흐름 순) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <AmountRow label="자동차세 본세" value={result.amounts.baseTax} />
              <TextRow
                label="차령 경감률"
                value={getReliefText(result.input, result.amounts)}
              />
              <AmountRow
                label={`지방교육세 (${EDUCATION_TAX_PERCENT})`}
                value={result.amounts.educationTax}
              />
              <AmountRow
                label="연 자동차세 합계"
                value={result.amounts.annualTotal}
              />
            </div>

            {/* Tier ③ — 납부 시나리오 */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <p className="text-xs font-semibold text-brand-text-secondary">
                납부 방법별 금액
              </p>
              <div className="mt-1.5">
                <AmountRow label="정기분 6월" value={result.amounts.semiAnnual} />
                <AmountRow label="정기분 12월" value={result.amounts.semiAnnual} />
                <AmountRow
                  label={`1월 연납 시 할인액 (${PREPAY_DISCOUNT_PERCENT})`}
                  value={result.amounts.prepayDiscount}
                />
                <AmountRow
                  label="1월 연납 납부액"
                  value={result.amounts.prepayTotal}
                  accent
                />
              </div>
              <p className="mt-2 text-xs text-brand-text-secondary">
                연납 할인은 1월 신청 기준 최대({PREPAY_DISCOUNT_PERCENT})이며,
                신청 시기·미경과 기간에 따라 실제 할인액은 줄어듭니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
