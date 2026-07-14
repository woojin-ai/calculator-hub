"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  calculateSeverance,
  type SeveranceAmounts,
  type SeveranceServiceInfo,
} from "@/lib/severance";
import { formatKoreanDatePlain } from "@/lib/service-period";
import { formatWon } from "@/lib/loan";

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입; 음수·문자 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

const inputBase =
  "h-12 rounded-lg border px-4 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

type FieldError =
  | { field: "start" | "end" | "recentPay"; message: string }
  | null;

type ResultState =
  | { eligible: true; service: SeveranceServiceInfo; amounts: SeveranceAmounts }
  | { eligible: false; service: SeveranceServiceInfo }
  | null;

/** 금액을 "약 ○○만원" / (1만원 미만) "약 ○,○00원" 형태로 반올림 표기. */
function formatApprox(amount: number): string {
  if (amount < 10_000) {
    const rounded = Math.round(amount / 100) * 100;
    return `약 ${rounded.toLocaleString("ko-KR")}원`;
  }
  return `약 ${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
}

/** 마지막 근무일 표현 (퇴사일 미입력 시 "오늘(YYYY년 M월 D일)"). */
function endLabel(service: SeveranceServiceInfo): string {
  const dateStr = formatKoreanDatePlain(service.endDate);
  return service.usedToday ? `오늘(${dateStr})` : `${dateStr}`;
}

/** 동적 결과 요약 문구 (design §3-5, 정적 텍스트 금지). */
function getResultSummary(
  service: SeveranceServiceInfo,
  amounts: SeveranceAmounts
): string {
  const startStr = formatKoreanDatePlain(service.startDate);
  const endStr = endLabel(service);
  const dailyStr = formatWon(amounts.dailyAverage);
  const daysStr = service.totalDays.toLocaleString("ko-KR");
  const payStr = formatApprox(amounts.severancePay);
  return `입사일 ${startStr}부터 ${endStr}까지 근무한 경우, 1일 평균임금은 약 ${dailyStr}원, 재직일수는 ${daysStr}일(약 ${service.years}년)이며 예상 퇴직금은 ${payStr}입니다.`;
}

/** 원 금액 라벨-값 행 (연봉 AmountRow 패턴). */
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

/** 문자열 값 라벨-값 행 (근속연수 패턴). */
function TextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-brand-text-secondary">{label}</span>
      <span className="tabular-nums font-semibold text-brand-text">{value}</span>
    </div>
  );
}

export default function SeverancePayCalculator() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recentPay, setRecentPay] = useState("");
  const [annualBonus, setAnnualBonus] = useState("");
  const [annualLeavePay, setAnnualLeavePay] = useState("");
  const [error, setError] = useState<FieldError>(null);
  const [result, setResult] = useState<ResultState>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // 필수: 입사일
    if (!startDate) {
      setError({ field: "start", message: "입사일을 선택해주세요." });
      setResult(null);
      return;
    }

    // 필수: 최근 3개월 급여 총액 (> 0)
    const payNum = Number(recentPay.replace(/,/g, ""));
    if (!recentPay.trim() || !Number.isFinite(payNum) || payNum <= 0) {
      setError({
        field: "recentPay",
        message: "최근 3개월 급여 총액을 입력해주세요.",
      });
      setResult(null);
      return;
    }

    const bonusNum = Number(annualBonus.replace(/,/g, "")) || 0;
    const leaveNum = Number(annualLeavePay.replace(/,/g, "")) || 0;

    const outcome = calculateSeverance(
      {
        startDateISO: startDate,
        endDateISO: endDate,
        recentPay: payNum,
        annualBonus: bonusNum,
        annualLeavePay: leaveNum,
      },
      new Date()
    );

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
    setResult(
      outcome.eligible
        ? {
            eligible: true,
            service: outcome.service,
            amounts: outcome.amounts,
          }
        : { eligible: false, service: outcome.service }
    );

    // 계산 후 결과 영역으로 스무스 스크롤 (5필드 폼이라 결과가 접힘선 아래로 밀림)
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  const startError = error?.field === "start" ? error.message : null;
  const endError = error?.field === "end" ? error.message : null;
  const recentPayError = error?.field === "recentPay" ? error.message : null;

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
          예상 퇴직금은 세전(퇴직소득세 공제 전) 금액이며, 법정 산식으로 계산한
          참고용 값입니다. 통상임금·부분월·무급휴직 등에 따라 실제 지급액과 다를
          수 있으니, 정확한 금액은 회사 규정과 고용노동부 퇴직금 계산기로 확인해
          주세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── 그룹 ① 재직 기간 ── */}
          <p className="text-xs font-semibold text-brand-text-secondary">
            재직 기간
          </p>

          {/* 1. 입사일 (전체 폭) */}
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

          {/* 2. 퇴사일 (전체 폭, 선택) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="endDate"
              className="text-sm font-medium text-brand-text-secondary"
            >
              퇴사일 (마지막 근무일, 미입력 시 오늘)
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
              마지막 근무일을 선택하세요. 비워 두면 오늘까지 계산합니다. 퇴사
              예정일 등 미래 날짜도 입력할 수 있습니다.
            </p>
            {endError && (
              <p className="text-xs text-brand-warning" role="alert">
                {endError}
              </p>
            )}
          </div>

          {/* ── 그룹 ② 임금 정보 (세전) ── */}
          <p className="mt-2 border-t border-brand-border/60 pt-3 text-xs font-semibold text-brand-text-secondary">
            임금 정보 (세전 기준)
          </p>

          {/* 3. 최근 3개월 급여 총액 (전체 폭, 필수) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="recentPay"
              className="text-sm font-medium text-brand-text-secondary"
            >
              최근 3개월 급여 총액 (세전, 원)
            </label>
            <input
              id="recentPay"
              type="text"
              inputMode="numeric"
              value={recentPay}
              onChange={(event) =>
                setRecentPay(formatAmountInput(event.target.value))
              }
              placeholder="9,000,000"
              aria-invalid={recentPayError ? true : undefined}
              className={`${inputBase} ${
                recentPayError ? "border-brand-warning" : "border-brand-border"
              }`}
            />
            <p className="text-xs text-brand-text-secondary">
              세전 기준, 퇴사일 직전 3개월간 받은 급여 3개월치의 합계입니다.
            </p>
            {recentPayError && (
              <p className="text-xs text-brand-warning" role="alert">
                {recentPayError}
              </p>
            )}
          </div>

          {/* 4·5. 연간 상여금 / 연차수당 (2열) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="annualBonus"
                className="min-h-10 text-sm font-medium text-brand-text-secondary"
              >
                연간 상여금 (원)
              </label>
              <input
                id="annualBonus"
                type="text"
                inputMode="numeric"
                value={annualBonus}
                onChange={(event) =>
                  setAnnualBonus(formatAmountInput(event.target.value))
                }
                placeholder="0"
                className={`${inputBase} border-brand-border`}
              />
              <p className="text-xs text-brand-text-secondary">
                최근 1년간 받은 상여금 (없으면 비워 두세요).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="annualLeavePay"
                className="min-h-10 text-sm font-medium text-brand-text-secondary"
              >
                연차수당 (원)
              </label>
              <input
                id="annualLeavePay"
                type="text"
                inputMode="numeric"
                value={annualLeavePay}
                onChange={(event) =>
                  setAnnualLeavePay(formatAmountInput(event.target.value))
                }
                placeholder="0"
                className={`${inputBase} border-brand-border`}
              />
              <p className="text-xs text-brand-text-secondary">
                전년도 발생 미사용 연차수당 (없으면 비워 두세요).
              </p>
            </div>
          </div>

          {/* 계산 버튼 (YMYL-중간: 계산 버튼 1개만) */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            퇴직금 계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 입사일·퇴사일과 급여·상여금·연차수당 정보는 브라우저 안에서만
            계산되며 서버에 저장·전송되지 않습니다.
          </p>
        </form>

        {/* 결과: 1년 이상(금액) */}
        {result && result.eligible && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 (예상 퇴직금) */}
            <p className="text-sm font-medium text-brand-text-secondary">
              {result.service.usedToday ? "오늘 기준 예상 퇴직금" : "예상 퇴직금"}
              <span className="ml-2 rounded bg-brand-border/40 px-1.5 py-0.5 text-xs font-medium text-brand-text-secondary">
                세전
              </span>
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
              {formatWon(result.amounts.severancePay)}
              <span className="text-base font-medium text-brand-text-secondary">
                원
              </span>
            </p>
            <p className="mt-1 text-xs text-brand-text-secondary">
              세전(퇴직소득세 공제 전) 금액입니다.
            </p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result.service, result.amounts)}
            </p>
            {result.service.usedToday && (
              <p className="text-xs text-brand-text-secondary">
                {formatKoreanDatePlain(result.service.endDate)}(오늘)을 마지막
                근무일로 가정해 계산한 예상 퇴직금입니다.
              </p>
            )}

            {/* Tier ② — 보조값 4행 (계산 흐름 순, 항상 노출) */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <AmountRow
                label="임금총액 (3개월)"
                value={result.amounts.wageTotal}
              />
              <TextRow
                label="평균임금 산정기간 총일수"
                value={`${result.amounts.avgPeriodDays}일`}
              />
              <AmountRow
                label="1일 평균임금"
                value={result.amounts.dailyAverage}
              />
              <TextRow
                label="재직일수"
                value={`${result.service.totalDays.toLocaleString("ko-KR")}일 (근속 ${result.service.years}년 ${result.service.months}개월)`}
              />
            </div>
          </div>
        )}

        {/* 결과: 1년 미만(금액 미산출, 중립 회색 안내) */}
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
                  법정 퇴직금 지급 대상이 아닙니다
                </p>
                <p className="mt-1 text-sm text-brand-text-secondary">
                  계속근로기간이 1년(365일) 미만입니다.
                </p>

                <div className="mt-3 border-t border-brand-border/60 pt-3">
                  <TextRow
                    label="재직일수"
                    value={`${result.service.totalDays.toLocaleString("ko-KR")}일 (근속 ${result.service.years}년 ${result.service.months}개월)`}
                  />
                </div>

                <p className="mt-3 text-xs text-brand-text-secondary">
                  법정 퇴직금은 계속근로 1년 이상일 때 지급 대상이 됩니다. 다만
                  회사 규정에 따라 1년 미만에도 퇴직금이 별도로 정해진 경우가
                  있으니 회사 규정을 확인해 주세요.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
