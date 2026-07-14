"use client";

import { useRef, useState, type FormEvent } from "react";
import { calculateLoan, formatWon } from "@/lib/loan";

type PeriodUnit = "year" | "month";
type Zone = "safe" | "caution" | "over";

interface FieldErrors {
  annualIncome?: string;
  interestRate?: string;
  loanPeriod?: string;
}

interface DsrResult {
  /** DSR(%) */
  dsr: number;
  zone: Zone;
  /** 신규 대출 연간 원리금상환액 */
  newYear: number;
  /** 기존 대출 연간 원리금상환액 */
  existingYear: number;
  /** 총 연간 원리금상환액 */
  totalYear: number;
  /** 연소득 */
  income: number;
  /** 신규 대출 월 상환액 (간편경로=신규 없음 시 null) */
  monthlyPayment: number | null;
  chip: string;
}

// 규제 기준선(참고·해석/배지 전용 — 계산·판정 로직 아님, 기획 §1-2)
const DSR_BANK_LIMIT = 40; // 은행권 차주단위 DSR 기준선(일반적으로 40%)
const DSR_2ND_LIMIT = 50; // 제2금융권 DSR 기준선(일반적으로 50%)

const inputBase =
  "h-12 rounded-lg border px-4 text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입; 음수·문자·소수점 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

/** DSR(%) 표기: 소수 1자리 반올림, 정수면 소수점 생략("30.4", "40"). */
function formatDsr(dsr: number): string {
  const rounded = Math.round(dsr * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** 금액을 "약 ○○만원" / (1만원 미만) "약 ○,○00원" 형태로 반올림 표기(요약용). */
function formatApprox(amount: number): string {
  if (amount < 10_000) {
    const rounded = Math.round(amount / 100) * 100;
    return `약 ${rounded.toLocaleString("ko-KR")}원`;
  }
  return `약 ${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
}

/** 금액을 억/만 단위 한글 표기로 변환("1억원", "5,000만원", "1억 3,000만원"). */
function formatAmountKo(amount: number): string {
  const A = Math.floor(amount);
  if (A < 10_000) return `${A.toLocaleString("ko-KR")}원`;
  const eok = Math.floor(A / 100_000_000);
  const man = Math.floor((A % 100_000_000) / 10_000);
  const won = A % 10_000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (won > 0) parts.push(`${won.toLocaleString("ko-KR")}`);
  return `${parts.join(" ")}원`;
}

function getZone(dsr: number): Zone {
  if (dsr <= 30) return "safe";
  if (dsr <= DSR_BANK_LIMIT) return "caution";
  return "over";
}

const ZONE_BADGE: Record<
  Zone,
  { text: string; icon: string; cls: string }
> = {
  safe: {
    text: "안전 구간",
    icon: "✓",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  caution: {
    text: "주의 구간",
    icon: "ⓘ",
    cls: "border-amber-200 bg-amber-50 text-amber-800",
  },
  over: {
    text: "기준선 초과",
    icon: "!",
    cls: "border-red-200 bg-red-50 text-red-700",
  },
};

/** 규제선 배지와 항상 한 세트로 노출되는 필수 면책 캡션. */
const BADGE_DISCLAIMER =
  "이 구간 표시는 참고용이며, 실제 대출 승인·한도 심사 결과를 보장하지 않습니다.";

/** 동적 결과 요약 (구간 분기, 단정·위협 금지 · 기획 §2·디자인 §3-6). */
function getResultSummary(result: DsrResult): string {
  if (result.totalYear <= 0) {
    return "상환 중인 대출이 없어 예상 DSR은 0.0%입니다. 신규 또는 기존 대출 정보를 입력하면 DSR이 계산됩니다.";
  }
  const base = `연간 총 원리금상환액 ${formatApprox(
    result.totalYear
  )}이 연소득 ${formatApprox(result.income)}의 약 ${formatDsr(
    result.dsr
  )}%로, `;
  if (result.dsr > 100) {
    return `${base}연소득 대비 상환 부담이 매우 큽니다. 다만 이는 참고용이며 실제 대출 승인 여부를 뜻하지 않습니다.`;
  }
  if (result.zone === "over") {
    return `${base}은행권 기준선 ${DSR_BANK_LIMIT}%를 넘습니다. 다만 이는 참고용이며 실제 대출 승인 여부를 뜻하지 않습니다.`;
  }
  if (result.zone === "caution") {
    return `${base}은행권 기준선 ${DSR_BANK_LIMIT}%에 가깝습니다. 다만 실제 대출 심사 결과는 이와 다를 수 있습니다.`;
  }
  return `${base}은행권 기준선 ${DSR_BANK_LIMIT}%보다 낮은 편입니다. 다만 실제 대출 심사 결과는 이와 다를 수 있습니다.`;
}

/** 위치 게이지 접근성 텍스트 대체 문장 (면책 포함, 구간 분기 · 디자인 §3-4). */
function getGaugeSentence(result: DsrResult): string {
  const dsr = formatDsr(result.dsr);
  let position: string;
  if (result.zone === "over") {
    position = `은행권 기준선 ${DSR_BANK_LIMIT}%를 넘습니다`;
  } else if (result.zone === "caution") {
    position = `은행권 기준선 ${DSR_BANK_LIMIT}%에 가깝습니다`;
  } else {
    position = `은행권 기준선 ${DSR_BANK_LIMIT}% 이내입니다`;
  }
  return `예상 DSR ${dsr}%로 ${position}. 이 표시는 실제 대출 승인·한도 심사 결과를 보장하지 않습니다.`;
}

/** 범용 라벨-값 행 (값이 문자열; <table> 미사용, flex justify-between). */
function ClauseRow({
  label,
  value,
  bold,
  divider,
}: {
  label: string;
  value: string;
  bold?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 py-1.5 text-sm ${
        divider ? "mt-1 border-t border-brand-border/60 pt-2.5" : ""
      }`}
    >
      <span className="text-brand-text-secondary">{label}</span>
      <span
        className={`tabular-nums text-brand-text sm:text-right ${
          bold ? "font-bold" : "font-semibold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * DSR 위치 게이지 (중도상환 SlidingGaugeView 응용, 디자인 §3-4).
 * role="img" + aria-label 문장 대체(면책 포함), 0~max 트랙, 40% tick + 현재 DSR 마커,
 * 채움 구간색(색 단독 금지 — 마커/tick 텍스트 병기), DSR>max 시 clamp + 텍스트로 실제값.
 */
function PositionGaugeView({ result }: { result: DsrResult }) {
  const dsr = result.dsr;
  // 40% 기준선이 트랙 약 2/3 지점에 오도록 max=60%, DSR이 60을 넘으면 DSR까지 동적 확장
  const max = dsr > 60 ? dsr : 60;
  const markerPercent = Math.min(100, (dsr / max) * 100);
  const tickPercent = (DSR_BANK_LIMIT / max) * 100;
  const sentence = getGaugeSentence(result);

  const fillColor =
    result.zone === "safe"
      ? "bg-emerald-200/60"
      : result.zone === "caution"
        ? "bg-amber-200/60"
        : "bg-red-200/60";

  // 마커 라벨이 막대 양 끝에서 잘리지 않도록 정렬 보정
  const markerAlign =
    markerPercent <= 8
      ? "left-0 text-left"
      : markerPercent >= 92
        ? "right-0 text-right"
        : "-translate-x-1/2 text-center";

  return (
    <div className="mt-4">
      <div role="img" aria-label={sentence}>
        <div aria-hidden="true" className="relative pt-6 pb-6">
          {/* 트랙 + 채움(0→현재 DSR) */}
          <div className="h-3 w-full overflow-hidden rounded bg-brand-border/40">
            <div
              className={`h-full ${fillColor}`}
              style={{ width: `${markerPercent}%` }}
            />
          </div>

          {/* 40% 기준선 tick */}
          <div
            className="pointer-events-none absolute top-6 z-0"
            style={{ left: `${tickPercent}%` }}
          >
            <span className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-brand-text" />
            <span className="absolute top-4 -translate-x-1/2 whitespace-nowrap text-[10px] text-brand-text-secondary">
              40% 은행권 기준선
            </span>
          </div>

          {/* 현재 DSR 마커 */}
          <div
            className="pointer-events-none absolute top-0 z-10"
            style={{ left: `${markerPercent}%` }}
          >
            <span
              className={`absolute top-0 whitespace-nowrap rounded bg-brand-text px-1.5 py-0.5 text-[10px] font-medium leading-none text-white ${markerAlign}`}
            >
              DSR {formatDsr(dsr)}%
            </span>
            <span className="absolute top-6 h-3 w-0.5 -translate-x-1/2 bg-brand-primary" />
          </div>
        </div>
      </div>

      {/* 시각 설명 문장 (aria-label과 중복 낭독 방지 위해 aria-hidden) */}
      <p aria-hidden="true" className="mt-1 text-xs text-brand-text-secondary">
        {sentence}
      </p>
    </div>
  );
}

export default function DsrCalculator() {
  const [annualIncome, setAnnualIncome] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [loanPeriod, setLoanPeriod] = useState("");
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>("year");
  const [existingAnnualPmt, setExistingAnnualPmt] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<DsrResult | null>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const incomeNum = Number(annualIncome.replace(/,/g, ""));
    const loanNum = loanAmount.trim() === "" ? 0 : Number(loanAmount.replace(/,/g, ""));
    const existingNum =
      existingAnnualPmt.trim() === "" ? 0 : Number(existingAnnualPmt.replace(/,/g, ""));

    const nextErrors: FieldErrors = {};

    // STEP 0 — 연소득 유효성 (분모)
    if (!annualIncome.trim() || !Number.isFinite(incomeNum) || incomeNum <= 0) {
      nextErrors.annualIncome = "연소득을 올바르게 입력해주세요.";
    }

    // 신규 대출금액 > 0 이면 금리·기간 필수
    const rateNum = Number(interestRate);
    const periodNum = Number(loanPeriod);
    if (loanNum > 0) {
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
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    // STEP 1~3 — 신규 대출 연 원리금 (calculateLoan 재사용, 원리금균등 고정)
    let newYear = 0;
    let monthlyPayment: number | null = null;
    if (loanNum > 0) {
      const months = periodUnit === "year" ? periodNum * 12 : periodNum;
      const calc = calculateLoan(loanNum, rateNum, months, "equalPayment");
      if (!calc || calc.type !== "equalPayment") {
        setErrors({ interestRate: "신규 대출의 금리·기간을 다시 확인해주세요." });
        setResult(null);
        return;
      }
      monthlyPayment = calc.monthlyPayment;
      newYear = calc.monthlyPayment * 12;
    }

    // STEP 4~5 — 총 연 원리금 / DSR
    const totalYear = newYear + existingNum;
    const dsr = (totalYear / incomeNum) * 100;
    const zone = getZone(dsr);

    // chip 조립
    const incomeMan = Math.floor(incomeNum / 10_000).toLocaleString("ko-KR");
    const chipParts = [`연소득 ${incomeMan}만원`];
    if (loanNum > 0) {
      const periodLabel = `${periodNum}${periodUnit === "year" ? "년" : "개월"}`;
      chipParts.push(`신규대출 ${formatAmountKo(loanNum)}`);
      chipParts.push(`원리금균등 ${periodLabel}`);
    } else {
      chipParts.push("신규대출 없음");
    }

    setErrors({});
    setResult({
      dsr,
      zone,
      newYear,
      existingYear: existingNum,
      totalYear,
      income: incomeNum,
      monthlyPayment,
      chip: chipParts.join(" · "),
    });

    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  return (
    <div>
      {/* 상단 근사/심사아님 고지 배너 — 항상 노출(계산 여부 무관). 광고 아님. 디자인 §6-1 1안. */}
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
          이 계산기는 대출 심사·승인 결과가 아닌 참고용 도구입니다. 실제 DSR은 금융회사가
          적용하는 스트레스(가산) 금리, 대출 종류, 마이너스통장·카드론 등 포함 범위, 기관별
          정책에 따라 이 결과와 다를 수 있습니다. 정확한 한도·가능 여부는 해당 금융기관에
          문의해 주세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* A. 연소득 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="annualIncome"
              className="text-sm font-medium text-brand-text-secondary"
            >
              연소득 (원)
            </label>
            <div className="relative">
              <input
                id="annualIncome"
                type="text"
                inputMode="numeric"
                value={annualIncome}
                onChange={(event) =>
                  setAnnualIncome(formatAmountInput(event.target.value))
                }
                placeholder="50,000,000"
                aria-invalid={errors.annualIncome ? true : undefined}
                className={`${inputBase} w-full pr-9 ${
                  errors.annualIncome ? "border-brand-warning" : "border-brand-border"
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
              세전 연소득. 상여·수당 포함, 회사 신고 소득 기준
            </p>
            {errors.annualIncome && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.annualIncome}
              </p>
            )}
          </div>

          {/* B. 신규(대상) 대출 섹션 */}
          <p className="mt-2 border-t border-brand-border/50 pt-4 text-sm font-semibold text-brand-text">
            신규(대상) 대출
          </p>

          {/* 신규 대출금액 (전체 폭, 선택) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="loanAmount"
              className="text-sm font-medium text-brand-text-secondary"
            >
              대출 금액 (원)
            </label>
            <div className="relative">
              <input
                id="loanAmount"
                type="text"
                inputMode="numeric"
                value={loanAmount}
                onChange={(event) =>
                  setLoanAmount(formatAmountInput(event.target.value))
                }
                placeholder="300,000,000"
                className={`${inputBase} w-full border-brand-border pr-9`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
              >
                원
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">
              이번에 새로 받을 대출(없으면 비워두세요)
            </p>
          </div>

          {/* 연 이자율 / 대출 기간(+년·개월 토글) — 2열(모바일 1열) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="interestRate"
                className="text-sm font-medium text-brand-text-secondary"
              >
                연 이자율 (%)
              </label>
              <div className="relative">
                <input
                  id="interestRate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={interestRate}
                  onChange={(event) => setInterestRate(event.target.value)}
                  placeholder="4.5"
                  aria-invalid={errors.interestRate ? true : undefined}
                  className={`${inputBase} w-full pr-9 ${
                    errors.interestRate
                      ? "border-brand-warning"
                      : "border-brand-border"
                  }`}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
                >
                  %
                </span>
              </div>
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
                  errors.loanPeriod ? "border-brand-warning" : "border-brand-border"
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

          {/* C. 기존 대출(선택) 섹션 */}
          <p className="mt-2 border-t border-brand-border/50 pt-4 text-sm font-semibold text-brand-text">
            기존 대출 (선택)
          </p>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="existingAnnualPmt"
              className="text-sm font-medium text-brand-text-secondary"
            >
              기존 대출 연간 원리금상환액 (원)
            </label>
            <div className="relative">
              <input
                id="existingAnnualPmt"
                type="text"
                inputMode="numeric"
                value={existingAnnualPmt}
                onChange={(event) =>
                  setExistingAnnualPmt(formatAmountInput(event.target.value))
                }
                placeholder="5,000,000"
                className={`${inputBase} w-full border-brand-border pr-9`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
              >
                원
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">
              이미 갚고 있는 다른 대출의 1년치 원금+이자 합계(여러 건이면 합산)
            </p>
          </div>

          {/* 계산 버튼 (YMYL: 중립 문구 "계산하기" 1개만) */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 소득·대출 정보는 브라우저 안에서만 계산되며 서버에 저장·전송되지
            않습니다.
          </p>
        </form>

        {result && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 (예상 DSR %, 히어로는 중립색) */}
            <p className="text-sm font-medium text-brand-text-secondary">
              예상 DSR
              <span className="ml-2 rounded bg-brand-border/40 px-1.5 py-0.5 text-xs font-medium text-brand-text-secondary">
                참고용
              </span>
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-text sm:text-[2.5rem]">
              {formatDsr(result.dsr)}
              <span className="text-base font-medium text-brand-text-secondary">
                %
              </span>
            </p>

            {/* 규제선 구간 배지 + 필수 면책 캡션 (한 세트, 배지 단독 노출 금지) */}
            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  ZONE_BADGE[result.zone].cls
                }`}
              >
                <span aria-hidden="true">{ZONE_BADGE[result.zone].icon}</span>
                {ZONE_BADGE[result.zone].text}
              </span>
              <span className="text-xs text-brand-text-secondary">
                {BADGE_DISCLAIMER}
              </span>
            </div>

            {/* chip */}
            <p className="mt-2">
              <span className="inline-block rounded-full bg-brand-border/30 px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
                {result.chip}
              </span>
            </p>

            {/* 위치 게이지 */}
            <PositionGaugeView result={result} />

            {/* 동적 요약 */}
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result)}
            </p>

            {/* Tier ② — 내역 5행 (전부 flex justify-between, <table> 미사용) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <ClauseRow
                label="신규 대출 연간 원리금상환액"
                value={
                  result.monthlyPayment !== null
                    ? `${formatWon(result.newYear)} 원 (월 ${formatWon(
                        result.monthlyPayment
                      )}원)`
                    : `${formatWon(result.newYear)} 원`
                }
              />
              <ClauseRow
                label="기존 대출 연간 원리금상환액"
                value={`${formatWon(result.existingYear)} 원`}
              />
              <ClauseRow
                label="연간 총 원리금상환액 (합계)"
                value={`${formatWon(result.totalYear)} 원`}
                bold
                divider
              />
              <ClauseRow
                label="연소득"
                value={`${formatWon(result.income)} 원`}
              />
              <ClauseRow
                label="DSR 계산식"
                value={`${formatWon(result.totalYear)} ÷ ${formatWon(
                  result.income
                )} = ${formatDsr(result.dsr)} %`}
                bold
              />

              {/* 각주 (면책, 40%·50% 참고·스트레스금리) */}
              <p className="mt-2 text-xs text-brand-text-secondary">
                은행권 {DSR_BANK_LIMIT}%·제2금융권 {DSR_2ND_LIMIT}%는 참고 수치이며,
                실제 심사는 스트레스(가산) 금리·대출 종류·기관 정책에 따라 달라질 수
                있습니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
