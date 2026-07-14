"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  calculateLoanPrepayment,
  DEFAULT_FEE_RATE,
  PREPAYMENT_CAP_MONTHS,
  type LoanPrepaymentResult,
} from "@/lib/loan-prepayment";
import { formatWon } from "@/lib/loan";

interface FieldErrors {
  amount?: string;
  feeRate?: string;
  elapsedMonths?: string;
  totalMonths?: string;
}

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입; 음수·문자·소수점 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

const inputBase =
  "h-12 rounded-lg border px-4 text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

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

/** 잔존비율(%)을 표기: 정수면 정수, 아니면 소수 1자리("66.7", "75"). */
function formatRatio(ratio: number): string {
  const pct = ratio * 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

/** 수수료율(%)을 표기(불필요한 소수점 제거). */
function formatFeeRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : String(rate);
}

/** 3년 캡 여부에 따른 면제기준기간 표현. */
function capExpr(result: LoanPrepaymentResult): string {
  return result.isCapped
    ? `3년(${PREPAYMENT_CAP_MONTHS}개월) 캡`
    : `${result.baseMonths}개월`;
}

/** 동적 결과 요약 문구 (디자인 §3-7, 정상/면제 분기 · 기획 §8-6). */
function getResultSummary(result: LoanPrepaymentResult): string {
  const amountKo = formatAmountKo(result.amount);
  if (result.isExempt) {
    const cap = result.isCapped
      ? `3년(${PREPAYMENT_CAP_MONTHS}개월)`
      : `${result.baseMonths}개월`;
    return `대출 실행 후 ${result.elapsedMonths}개월이 지나 면제기준기간 ${cap}을 넘었으므로 중도상환수수료가 면제됩니다.`;
  }
  const cap = result.isCapped
    ? `3년(${PREPAYMENT_CAP_MONTHS}개월) 캡`
    : `총 ${result.baseMonths}개월`;
  return `중도상환금액 ${amountKo}을 대출 실행 ${result.elapsedMonths}개월 후 갚을 때, ${cap} 중 잔존 ${result.remainingMonths}개월(잔존비율 ${formatRatio(
    result.ratio
  )}%)이 적용되어 예상 중도상환수수료는 ${formatApprox(result.fee)}입니다.`;
}

/** 게이지 접근성 텍스트 대체 + 시각 설명 문장 (디자인 §3-3-1·§3-3-2, 정상/면제 분기). */
function getGaugeSentence(result: LoanPrepaymentResult): string {
  if (result.isExempt) {
    const cap = result.isCapped
      ? `3년(${PREPAYMENT_CAP_MONTHS}개월)`
      : `${result.baseMonths}개월`;
    return `대출 실행 후 ${result.elapsedMonths}개월이 지나 면제기준기간 ${cap}을 넘었습니다. 중도상환수수료 면제 대상입니다.`;
  }
  return `대출 실행 후 ${result.elapsedMonths}개월 경과, ${capExpr(
    result
  )} 중 ${result.remainingMonths}개월 잔존(잔존비율 ${formatRatio(
    result.ratio
  )}%)이 수수료에 적용됩니다.`;
}

/** 범용 라벨-값 행 (전기요금 AmountRow의 범용판 — 값이 %·개월·식 등 문자열). */
function ClauseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 py-1.5 text-sm">
      <span className="text-brand-text-secondary">{label}</span>
      <span className="tabular-nums font-semibold text-brand-text sm:text-right">
        {value}
      </span>
    </div>
  );
}

/**
 * 슬라이딩(체감) 게이지 (디자인 §3-3). 경과(muted)|잔존(활성 강조) 2세그먼트.
 * 색 단독 구분 금지(색+테두리+굵은 라벨 3중) · role="img" 텍스트 대체 · 빨강 금지.
 */
function SlidingGaugeView({ result }: { result: LoanPrepaymentResult }) {
  const g = result.gauge;
  const sentence = getGaugeSentence(result);
  const tickRight = result.isCapped
    ? `${result.baseMonths}개월 (3년) 면제`
    : `${result.baseMonths}개월 면제`;

  // 마커(경과/잔존 경계) 라벨이 막대 양 끝에서 잘리지 않도록 정렬 보정
  const markerAlign =
    g.markerPercent <= 8
      ? "left-0 text-left"
      : g.markerPercent >= 92
        ? "right-0 text-right"
        : "-translate-x-1/2 text-center";

  return (
    <div className="mt-4">
      {/* 그래픽 (스크린리더는 aria-label로 텍스트 대체) */}
      <div role="img" aria-label={sentence}>
        {/* 마커 라벨 + 막대 영역 */}
        <div aria-hidden="true" className="relative pt-6">
          {/* 경과/잔존 경계 마커 (= 현재 상환 시점) */}
          <div
            className="pointer-events-none absolute top-0 bottom-2 z-10"
            style={{ left: `${g.markerPercent}%` }}
          >
            <span
              className={`absolute -top-0 whitespace-nowrap rounded bg-brand-text px-1.5 py-0.5 text-[10px] font-medium leading-none text-white ${markerAlign}`}
            >
              경과 {result.elapsedMonths}개월
            </span>
            <span className="absolute top-6 h-7 w-0.5 -translate-x-1/2 bg-brand-text" />
          </div>

          {/* 세그먼트 막대 (경과 | 잔존) */}
          <div className="flex h-7 w-full overflow-hidden rounded">
            {/* 경과 세그먼트 (muted) */}
            <div
              style={{ width: `${g.elapsedPercent}%` }}
              className="flex items-center justify-center overflow-hidden whitespace-nowrap border border-transparent bg-brand-border/40 text-[11px] text-brand-text-secondary"
            >
              {g.elapsedClamped > 0 ? `경과 ${g.elapsedClamped}개월` : ""}
            </div>
            {/* 잔존 세그먼트 (활성 강조 — 빨강 아님) */}
            {result.isExempt ? (
              <div className="flex items-center justify-end pr-1.5">
                <span className="inline-flex items-center gap-1 rounded bg-brand-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-primary">
                  <span aria-hidden="true">✓</span>면제
                </span>
              </div>
            ) : (
              <div
                style={{ width: `${g.remainingPercent}%` }}
                className="flex items-center justify-center overflow-hidden whitespace-nowrap border border-brand-primary bg-brand-primary/15 text-[11px] font-semibold text-brand-primary"
              >
                잔존 {result.remainingMonths}개월
              </div>
            )}
          </div>
        </div>

        {/* 경계 tick (막대 아래) */}
        <div
          aria-hidden="true"
          className="relative mt-1 h-4 text-[10px] text-brand-text-secondary"
        >
          <span className="absolute left-0">0</span>
          <span className="absolute right-0 text-right">{tickRight}</span>
        </div>
      </div>

      {/* 시각 설명 문장 (항상 노출; aria-label과 중복 낭독 방지 위해 aria-hidden) */}
      <p aria-hidden="true" className="mt-2 text-xs text-brand-text-secondary">
        {sentence}
      </p>
    </div>
  );
}

export default function LoanPrepaymentFeeCalculator() {
  const [amount, setAmount] = useState("");
  const [feeRate, setFeeRate] = useState(String(DEFAULT_FEE_RATE));
  const [elapsedMonths, setElapsedMonths] = useState("");
  const [totalMonths, setTotalMonths] = useState(String(PREPAYMENT_CAP_MONTHS));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<LoanPrepaymentResult | null>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountNum = Number(amount.replace(/,/g, ""));
    const feeRateNum = Number(feeRate);
    const elapsedNum = Number(elapsedMonths);
    const totalTrimmed = totalMonths.trim();
    // 총기간 미입력 → 3년(36개월) 가정 (기획 §1-0)
    const totalNum = totalTrimmed === "" ? PREPAYMENT_CAP_MONTHS : Number(totalMonths);

    const nextErrors: FieldErrors = {};

    if (!amount.trim() || !Number.isFinite(amountNum) || amountNum <= 0) {
      nextErrors.amount = "중도상환금액을 입력해주세요.";
    }
    if (!feeRate.trim()) {
      nextErrors.feeRate = "수수료율을 입력해주세요.";
    } else if (!Number.isFinite(feeRateNum) || feeRateNum < 0) {
      nextErrors.feeRate = "수수료율은 0 이상으로 입력해주세요.";
    }
    if (!elapsedMonths.trim()) {
      nextErrors.elapsedMonths = "대출 실행 후 경과기간을 입력해주세요.";
    } else if (!Number.isFinite(elapsedNum) || elapsedNum < 0) {
      nextErrors.elapsedMonths = "경과기간은 0 이상으로 입력해주세요.";
    }
    // 총기간: 입력했으나 1개월 미만이면 오류 (미입력은 오류 아님 → 36 가정)
    if (totalTrimmed !== "" && (!Number.isFinite(totalNum) || totalNum < 1)) {
      nextErrors.totalMonths = "총 약정기간은 1개월 이상으로 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const outcome = calculateLoanPrepayment({
      amount: amountNum,
      feeRate: feeRateNum,
      elapsedMonths: elapsedNum,
      totalMonths: totalNum,
    });

    if (!outcome.ok) {
      setErrors({ amount: "입력값을 다시 확인해주세요." });
      setResult(null);
      return;
    }

    setErrors({});
    setResult(outcome.result);

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
          은행 표준 방식(3년 캡·슬라이딩)으로 계산한 참고용 예상 중도상환수수료입니다.
          실제 수수료율은 대출 종류·약정 시점(2025년 인하 여부)에 따라 다르고, 은행별
          계산 방식(일할 계산·최소 수수료)도 달라 실제 청구액과 차이가 있을 수 있습니다.
          정확한 요율·금액은 대출 약정서나 해당 금융기관에서 확인해 주세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 1. 중도상환금액 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="amount"
              className="text-sm font-medium text-brand-text-secondary"
            >
              중도상환(조기상환) 금액 (원)
            </label>
            <div className="relative">
              <input
                id="amount"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(formatAmountInput(event.target.value))}
                placeholder="100,000,000"
                aria-invalid={errors.amount ? true : undefined}
                className={`${inputBase} w-full pr-9 ${
                  errors.amount ? "border-brand-warning" : "border-brand-border"
                }`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
              >
                원
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">이번에 미리 갚을 원금</p>
            {errors.amount && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.amount}
              </p>
            )}
          </div>

          {/* 2. 중도상환수수료율 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="feeRate"
              className="text-sm font-medium text-brand-text-secondary"
            >
              중도상환수수료율 (%)
            </label>
            <div className="relative">
              <input
                id="feeRate"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={feeRate}
                onChange={(event) => setFeeRate(event.target.value)}
                placeholder="0.65"
                aria-invalid={errors.feeRate ? true : undefined}
                className={`${inputBase} w-full pr-9 ${
                  errors.feeRate ? "border-brand-warning" : "border-brand-border"
                }`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
              >
                %
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">
              본인 대출 약정서·은행 공시 요율을 입력하세요
            </p>
            {errors.feeRate && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.feeRate}
              </p>
            )}
          </div>

          {/* 3. 대출 실행 후 경과기간 (전체 폭) — "잔존" 표현 금지 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="elapsedMonths"
              className="text-sm font-medium text-brand-text-secondary"
            >
              대출 실행 후 경과기간 (개월)
            </label>
            <div className="relative">
              <input
                id="elapsedMonths"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={elapsedMonths}
                onChange={(event) => setElapsedMonths(event.target.value)}
                placeholder="12"
                aria-invalid={errors.elapsedMonths ? true : undefined}
                className={`${inputBase} w-full pr-12 ${
                  errors.elapsedMonths ? "border-brand-warning" : "border-brand-border"
                }`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
              >
                개월
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">
              대출받은 뒤 지금까지 지난 개월 수
            </p>
            {errors.elapsedMonths && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.elapsedMonths}
              </p>
            )}
          </div>

          {/* 4. 대출 총 약정기간 (선택, 전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="totalMonths"
              className="text-sm font-medium text-brand-text-secondary"
            >
              대출 총 약정기간 (개월, 선택)
            </label>
            <div className="relative">
              <input
                id="totalMonths"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={totalMonths}
                onChange={(event) => setTotalMonths(event.target.value)}
                placeholder="36"
                aria-invalid={errors.totalMonths ? true : undefined}
                className={`${inputBase} w-full pr-12 ${
                  errors.totalMonths ? "border-brand-warning" : "border-brand-border"
                }`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
              >
                개월
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">
              3년(36개월)을 넘으면 자동으로 3년으로 계산됩니다
            </p>
            {errors.totalMonths && (
              <p className="text-xs text-brand-warning" role="alert">
                {errors.totalMonths}
              </p>
            )}
          </div>

          {/* 5. 계산 버튼 (YMYL: 중립 문구 "계산하기" 1개만) */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 값은 브라우저 안에서만 계산되며 서버에 저장·전송되지 않습니다.
          </p>
        </form>

        {result && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 (정상: 금액 히어로 / 면제: 상태 히어로) */}
            {result.isExempt ? (
              <>
                <p className="text-sm font-medium text-brand-text-secondary">
                  중도상환수수료
                  <span className="ml-2 rounded bg-brand-border/40 px-1.5 py-0.5 text-xs font-medium text-brand-text-secondary">
                    참고용
                  </span>
                </p>
                <p className="mt-1 text-3xl font-bold text-brand-accent sm:text-4xl">
                  면제 대상
                </p>
                <p className="mt-1 text-sm text-brand-text-secondary">
                  예상 중도상환수수료 0원
                </p>
                <p className="mt-1">
                  <span className="inline-block rounded-full bg-brand-border/30 px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
                    경과 {result.elapsedMonths}개월 · 면제기준 {result.baseMonths}개월 경과
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-brand-text-secondary">
                  예상 중도상환수수료
                  <span className="ml-2 rounded bg-brand-border/40 px-1.5 py-0.5 text-xs font-medium text-brand-text-secondary">
                    참고용 예상 금액
                  </span>
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
                  {formatWon(result.fee)}
                  <span className="text-base font-medium text-brand-text-secondary">
                    원
                  </span>
                </p>
                <p className="mt-1">
                  <span className="inline-block rounded-full bg-brand-border/30 px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
                    잔존비율 {formatRatio(result.ratio)}% 적용 · 경과{" "}
                    {result.elapsedMonths}개월 / 면제기준 {result.baseMonths}개월
                  </span>
                </p>
              </>
            )}

            {/* 동적 요약 (정상/면제 분기) */}
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result)}
            </p>

            {/* 슬라이딩(체감) 게이지 (항상 노출) */}
            <SlidingGaugeView result={result} />

            {/* Tier ② — 계산 근거 4행 (항상 노출) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <ClauseRow
                label="적용 수수료율"
                value={`${formatFeeRate(result.feeRate)} %`}
              />
              <ClauseRow
                label="면제기준기간"
                value={
                  result.isCapped
                    ? `${result.baseMonths}개월 (3년 캡 적용)`
                    : `${result.baseMonths}개월 (만기 기준)`
                }
              />
              {result.isExempt ? (
                <>
                  <ClauseRow
                    label="경과기간"
                    value={`${result.elapsedMonths}개월 ≥ 면제기준 ${result.baseMonths}개월 → 잔존 0`}
                  />
                  <ClauseRow label="중도상환수수료" value="0원 (면제)" />
                </>
              ) : (
                <>
                  <ClauseRow
                    label="잔존기간"
                    value={`${result.remainingMonths}개월 ÷ ${result.baseMonths}개월 = ${formatRatio(
                      result.ratio
                    )}%`}
                  />
                  <ClauseRow
                    label="계산식"
                    value={`${formatAmountKo(result.amount)} × ${formatFeeRate(
                      result.feeRate
                    )}% × ${formatRatio(result.ratio)}% = ${formatWon(result.fee)}원`}
                  />
                </>
              )}

              {/* 수수료율 큰 값(>5%) 인라인 note (에러 아님, 중립 회색) */}
              {result.feeRate > 5 && (
                <p className="mt-2 text-xs text-brand-text-secondary">
                  입력하신 수수료율이 일반적 범위(약 0.5~1.5%)보다 높습니다. 대출
                  약정서의 요율을 다시 확인해 주세요.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
