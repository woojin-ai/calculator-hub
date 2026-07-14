"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  calculateElectricity,
  seasonForMonth,
  seasonLabel,
  ENERGY_RATE,
  VAT_RATE,
  POWER_FUND_RATE,
  type Season,
  type ElectricityResult,
} from "@/lib/electricity";
import { formatWon } from "@/lib/loan";

/** 입력 중 천단위 콤마 서식을 적용한다 (숫자만 남기고 콤마 삽입; 음수·문자·소수점 원천 차단). */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

const inputBase =
  "h-12 rounded-lg border px-4 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

const selectBase =
  "h-12 w-full appearance-none rounded-lg border border-brand-border bg-white pl-4 pr-9 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

/** 금액을 "약 ○○만원" / (1만원 미만) "약 ○,○00원" 형태로 반올림 표기. */
function formatApprox(amount: number): string {
  if (amount < 10_000) {
    const rounded = Math.round(amount / 100) * 100;
    return `약 ${rounded.toLocaleString("ko-KR")}원`;
  }
  return `약 ${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
}

/** 동적 결과 요약 문구 (디자인 §3-7, 정적 텍스트 금지). */
function getResultSummary(result: ElectricityResult): string {
  const label = seasonLabel(result.season);
  const usageStr = result.usage.toLocaleString("ko-KR");
  return `월 ${usageStr}kWh 사용 시(${label}) 기본요금과 전력량요금 등을 더한 예상 청구요금은 ${formatApprox(
    result.total
  )}입니다. 누진 ${result.tier}단계가 적용되었습니다.`;
}

/** 게이지 접근성 텍스트 대체 + 시각 설명 문장 (디자인 §3-3-1·§3-3-2). */
function getGaugeSentence(result: ElectricityResult): string {
  const label = seasonLabel(result.season);
  const g = result.gauge;
  const head = `현재 ${result.usage.toLocaleString("ko-KR")}kWh는 ${label} 누진 ${g.tier}단계 구간입니다.`;
  if (g.tier === 3 || g.nextBoundary === null || g.remainingToNext === null) {
    return `${head} (최고 단계)`;
  }
  return `${head} ${g.tier + 1}단계(${g.nextBoundary}kWh)까지 ${g.remainingToNext}kWh 남았습니다.`;
}

/** 원 금액 라벨-값 행 (연봉·퇴직 AmountRow 패턴). `plus`면 값 앞에 '+' 표기. */
function AmountRow({
  label,
  value,
  plus = false,
  dense = false,
  emphasis = false,
}: {
  label: string;
  value: number;
  plus?: boolean;
  dense?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${dense ? "py-1" : "py-1.5"} text-sm`}
    >
      <span className="text-brand-text-secondary">{label}</span>
      <span
        className={`tabular-nums text-brand-text ${emphasis ? "font-semibold" : ""}`}
      >
        {plus ? "+ " : ""}
        {formatWon(value)} 원
      </span>
    </div>
  );
}

/** 누진단계 게이지 (디자인 §3-3). 색+테두리+굵은 라벨 3중 구분, role="img" 텍스트 대체. */
function ProgressiveGaugeView({ result }: { result: ElectricityResult }) {
  const g = result.gauge;
  const sentence = getGaugeSentence(result);

  const segments = [
    {
      tier: 1 as const,
      percent: g.seg1Percent,
      range: `0–${g.b1}`,
      rate: ENERGY_RATE.tier1,
    },
    {
      tier: 2 as const,
      percent: g.seg2Percent,
      range: `${g.b1}–${g.b2}`,
      rate: ENERGY_RATE.tier2,
    },
    {
      tier: 3 as const,
      percent: g.seg3Percent,
      range: `${g.b2}+`,
      rate: ENERGY_RATE.tier3,
    },
  ];

  // 마커 라벨이 막대 양 끝에서 잘리지 않도록 정렬 보정
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
          {/* 현재 위치 마커 */}
          <div
            className="pointer-events-none absolute top-0 bottom-2 z-10"
            style={{ left: `${g.markerPercent}%` }}
          >
            <span
              className={`absolute -top-0 whitespace-nowrap rounded bg-brand-text px-1.5 py-0.5 text-[10px] font-medium leading-none text-white ${markerAlign}`}
            >
              {result.usage.toLocaleString("ko-KR")}kWh
              {g.isOverVisualMax ? " →" : ""}
            </span>
            <span className="absolute top-6 h-6 w-0.5 -translate-x-1/2 bg-brand-text" />
          </div>

          {/* 세그먼트 막대 */}
          <div className="flex h-6 w-full overflow-hidden rounded">
            {segments.map((seg) => {
              const active = seg.tier === g.tier;
              return (
                <div
                  key={seg.tier}
                  style={{ width: `${seg.percent}%` }}
                  className={`flex items-center justify-center border text-[11px] ${
                    active
                      ? "border-brand-primary bg-brand-primary/15 font-semibold text-brand-primary"
                      : "border-transparent bg-brand-border/40 text-brand-text-secondary"
                  }`}
                >
                  {seg.tier}단계
                </div>
              );
            })}
          </div>
        </div>

        {/* 경계 tick 숫자 (막대 아래) */}
        <div aria-hidden="true" className="relative mt-1 h-4 text-[10px] text-brand-text-secondary">
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${(g.b1 / g.visualMax) * 100}%` }}
          >
            {g.b1}
          </span>
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${(g.b2 / g.visualMax) * 100}%` }}
          >
            {g.b2}
          </span>
        </div>

        {/* 구간 단가 라벨 (교육용, 데스크톱만 — 모바일 생략 §3-3-3·§3-3-4) */}
        <div
          aria-hidden="true"
          className="mt-1 hidden text-[10px] text-brand-text-secondary sm:flex"
        >
          {segments.map((seg) => (
            <div
              key={seg.tier}
              style={{ width: `${seg.percent}%` }}
              className="text-center"
            >
              {seg.rate}원
            </div>
          ))}
        </div>
      </div>

      {/* 시각 설명 문장 (항상 노출; aria-label과 중복 낭독 방지 위해 aria-hidden) */}
      <p aria-hidden="true" className="mt-2 text-xs text-brand-text-secondary">
        {sentence}
      </p>
    </div>
  );
}

export default function ElectricityBillCalculator() {
  const [usage, setUsage] = useState("");
  // 계절 기본값 = 클라이언트 현재월(빌드타임 고정 금지, 기획 §8-7). lazy init로 렌더 시 클라이언트 날짜를 읽는다.
  const [currentMonth] = useState<number>(() => new Date().getMonth() + 1);
  // 사용자가 계절을 직접 바꾸면 그 값을, 아니면 현재월 자동값을 쓴다.
  const [userSeason, setUserSeason] = useState<Season | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ElectricityResult | null>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  const autoSeason = seasonForMonth(currentMonth);
  const season: Season = userSeason ?? autoSeason;

  function handleSeasonChange(value: string) {
    setUserSeason(value === "summer" ? "summer" : "other");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const usageNum = Number(usage.replace(/,/g, ""));
    if (!usage.trim() || !Number.isFinite(usageNum) || usageNum <= 0) {
      setError("월 사용량을 입력해주세요.");
      setResult(null);
      return;
    }

    const outcome = calculateElectricity({ usage: usageNum, season });
    if (!outcome.ok) {
      setError("월 사용량을 입력해주세요.");
      setResult(null);
      return;
    }

    setError(null);
    setResult(outcome.result);

    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // 계절 상태문구 (디자인 §2-5). 자동 선택 상태 vs 사용자 변경 상태를 구분.
  let seasonStatus: string;
  if (userSeason === null) {
    seasonStatus =
      season === "summer"
        ? `현재 ${currentMonth}월 기준 하계(7·8월) 요금으로 자동 선택되었습니다.`
        : `현재 ${currentMonth}월 기준 기타계절 요금으로 자동 선택되었습니다.`;
  } else {
    seasonStatus =
      season === "summer"
        ? "하계(7·8월) 요금으로 계산합니다. (여름철 예상 요금 미리보기)"
        : "기타계절 요금으로 계산합니다.";
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
          한전 주택용 저압 요금표를 기준으로 한 참고용 예상 청구액입니다.
          복지할인·아파트 일괄계약(고압)·검침 주기 등에 따라 실제 청구액과 다를 수
          있으며, 요금표·부담금 요율은 매년/분기 개정될 수 있습니다. 정확한 금액은
          한국전력공사 사이버지점에서 확인해 주세요.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 1. 월 사용량 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="usage"
              className="text-sm font-medium text-brand-text-secondary"
            >
              월 사용량 (kWh)
            </label>
            <div className="relative">
              <input
                id="usage"
                type="text"
                inputMode="numeric"
                value={usage}
                onChange={(event) => setUsage(formatAmountInput(event.target.value))}
                placeholder="350"
                aria-invalid={error ? true : undefined}
                className={`${inputBase} w-full pr-12 ${
                  error ? "border-brand-warning" : "border-brand-border"
                }`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-sm text-brand-text-secondary"
              >
                kWh
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">
              한 달 동안 사용한 전력량(kWh). 검침 사용량 또는 고지서의 사용량을
              입력하세요.
            </p>
            {error && (
              <p className="text-xs text-brand-warning" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* 2. 계절 (전체 폭) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="season"
              className="text-sm font-medium text-brand-text-secondary"
            >
              계절
            </label>
            <div className="relative">
              <select
                id="season"
                value={season}
                onChange={(event) => handleSeasonChange(event.target.value)}
                className={selectBase}
              >
                <option value="summer">하계(7·8월)</option>
                <option value="other">기타계절(그 외)</option>
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-xs text-brand-text-secondary"
              >
                ▾
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary">
              여름(7·8월)은 누진구간이 완화됩니다.
            </p>
            {/* 현재월 의존 문구 — SSG 정적 HTML과 클라이언트 현재월이 다를 수 있어 하이드레이션 경고 억제 */}
            <p className="mt-1 flex items-start gap-1 text-xs text-brand-text-secondary">
              <span aria-hidden="true" className="select-none">
                ⓘ
              </span>
              <span suppressHydrationWarning>{seasonStatus}</span>
            </p>
          </div>

          {/* 3. 계산 버튼 (YMYL: 계산 버튼 1개만) */}
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            전기요금 계산하기
          </button>

          <p className="mt-2 text-xs text-brand-text-secondary">
            입력하신 사용량은 브라우저 안에서만 계산되며 서버에 저장·전송되지
            않습니다.
          </p>
        </form>

        {result && (
          <div
            ref={resultRef}
            className="mt-6 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6"
          >
            {/* Tier ① — 대표값 (최종 청구요금) */}
            <p className="text-sm font-medium text-brand-text-secondary">
              예상 청구요금
              <span className="ml-2 rounded bg-brand-border/40 px-1.5 py-0.5 text-xs font-medium text-brand-text-secondary">
                참고용 예상 청구액
              </span>
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2 text-4xl font-bold tabular-nums text-brand-accent sm:text-[2.5rem]">
              {formatWon(result.total)}
              <span className="text-base font-medium text-brand-text-secondary">
                원
              </span>
            </p>
            <p className="mt-1">
              <span className="inline-block rounded-full bg-brand-border/30 px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
                {seasonLabel(result.season)} {result.tier}단계 적용 · 월{" "}
                {result.usage.toLocaleString("ko-KR")}kWh
              </span>
            </p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              {getResultSummary(result)}
            </p>

            {/* 누진단계 게이지 (항상 노출) */}
            <ProgressiveGaugeView result={result} />

            {/* Tier ② — 요약 3행 (항상): 전기요금계 → +부가세 +기금 = 최종 */}
            <div className="mt-4 border-t border-brand-border/60 pt-4">
              <AmountRow label="전기요금계" value={result.subtotal} emphasis />
              <AmountRow
                label={`부가가치세 (${VAT_RATE * 100}%)`}
                value={result.vat}
                plus
              />
              <AmountRow
                label={`전력산업기반기금 (${POWER_FUND_RATE * 100}%)`}
                value={result.powerFund}
                plus
              />
              {result.isSuperUser && (
                <p className="mt-1 text-xs text-brand-text-secondary">
                  월 1,000kWh를 초과하는 경우 실제로는 별도 단가(슈퍼유저 요금)가
                  적용될 수 있어 계산 결과와 다를 수 있습니다.
                </p>
              )}
            </div>

            {/* Tier ③ — 세부 4행 (접이식, 기본 접힘): 전기요금계 구성 항목 */}
            <details className="group mt-4 border-t border-brand-border/60 pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand-primary [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="inline-block select-none transition-transform group-open:rotate-90"
                >
                  ▸
                </span>
                요금 항목 자세히 보기
              </summary>

              <div className="mt-2">
                <AmountRow label="기본요금" value={result.baseFee} dense />
                <AmountRow label="전력량요금" value={result.energyFee} dense />
                <AmountRow label="기후환경요금" value={result.climateFee} dense />
                <AmountRow
                  label="연료비조정요금"
                  value={result.fuelFee}
                  dense
                />
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
