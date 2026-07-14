"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_UNITS,
  DEFAULT_INPUT_VALUE,
  DEFAULT_UNIT_PAIR,
  convert,
  formatResultValue,
  getUnitSymbol,
  isBelowAbsoluteZero,
  type UnitCategory,
} from "@/lib/units";

const inputBase =
  "h-12 min-w-0 rounded-lg border border-brand-border px-4 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

const selectBase =
  "h-12 min-w-0 appearance-none rounded-lg border border-brand-border bg-white pl-4 pr-9 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

/** 참조표 한 행(예: "10평" → "33.06㎡")의 입력 정의. 값은 항상 엔진(convert)으로 계산해
 * 해설/참조표 수치가 하드코딩 오탈자로 엔진값과 어긋나는 일(연봉 계산기 CS 전례)을 막는다. */
interface ReferenceRow {
  fromValue: number;
  fromId: string;
  toId: string;
  note?: string;
}

const REFERENCE_ROWS: Record<UnitCategory, ReferenceRow[]> = {
  length: [
    { fromValue: 1, fromId: "inch", toId: "cm" },
    { fromValue: 1, fromId: "ft", toId: "cm" },
    { fromValue: 1, fromId: "yard", toId: "m" },
    { fromValue: 1, fromId: "mile", toId: "km" },
  ],
  weight: [
    { fromValue: 1, fromId: "geun", toId: "g" },
    { fromValue: 1, fromId: "oz", toId: "g" },
    { fromValue: 1, fromId: "lb", toId: "g" },
    { fromValue: 1, fromId: "kg", toId: "lb" },
  ],
  area: [
    { fromValue: 10, fromId: "pyeong", toId: "sqm" },
    { fromValue: 20, fromId: "pyeong", toId: "sqm" },
    { fromValue: 30, fromId: "pyeong", toId: "sqm" },
    { fromValue: 33, fromId: "pyeong", toId: "sqm" },
  ],
  volume: [
    { fromValue: 1, fromId: "cup", toId: "mL" },
    { fromValue: 1, fromId: "L", toId: "cup" },
    { fromValue: 1, fromId: "gallon", toId: "L" },
    { fromValue: 1, fromId: "cbm", toId: "L" },
  ],
  temperature: [
    { fromValue: 0, fromId: "celsius", toId: "fahrenheit" },
    { fromValue: 36.5, fromId: "celsius", toId: "fahrenheit", note: "(체온)" },
    { fromValue: 37, fromId: "celsius", toId: "fahrenheit" },
    { fromValue: 100, fromId: "celsius", toId: "fahrenheit" },
    { fromValue: -40, fromId: "celsius", toId: "fahrenheit" },
  ],
};

/** 사용자가 입력 중인 원시 텍스트를 숫자로 해석한다. 빈 값/비숫자는 null(조용히 "—" 처리). */
function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** 동적 요약 문구 (design §3-4 확정 템플릿, §13-8). displayResult가 "—"면 호출하지 않는다. */
function getResultSummary(
  inputValue: string,
  fromSymbol: string,
  displayResult: string,
  toSymbol: string
): string {
  return `${inputValue.trim()}${fromSymbol}은 약 ${displayResult}${toSymbol}입니다.`;
}

/** 히어로 결과 숫자 길이에 따른 폰트 단계 축소 (design §7-3: 줄바꿈 대신 폰트 축소). */
function getHeroTextSizeClass(displayValue: string): string {
  const length = displayValue.replace(/[,\s]/g, "").length;
  if (length > 14) return "text-xl sm:text-2xl";
  if (length > 10) return "text-2xl sm:text-3xl";
  return "text-4xl sm:text-[2.5rem]";
}

function SelectChevron() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-xs text-brand-text-secondary"
    >
      ▾
    </span>
  );
}

export default function UnitConverter() {
  const [category, setCategory] = useState<UnitCategory>("area");
  const [fromUnit, setFromUnit] = useState(DEFAULT_UNIT_PAIR.area.from);
  const [toUnit, setToUnit] = useState(DEFAULT_UNIT_PAIR.area.to);
  const [inputValue, setInputValue] = useState(DEFAULT_INPUT_VALUE.area);

  const units = CATEGORY_UNITS[category];
  const fromSymbol = getUnitSymbol(category, fromUnit);
  const toSymbol = getUnitSymbol(category, toUnit);

  const parsedValue = parseNumericInput(inputValue);
  const rawResult =
    parsedValue === null ? null : convert(parsedValue, fromUnit, toUnit, category);
  const displayResult = formatResultValue(rawResult);

  const belowAbsoluteZero =
    category === "temperature" &&
    parsedValue !== null &&
    isBelowAbsoluteZero(parsedValue, fromUnit);

  const summary =
    displayResult === "—"
      ? null
      : getResultSummary(inputValue, fromSymbol, displayResult, toSymbol);

  function handleCategoryChange(next: UnitCategory) {
    if (next === category) return;
    setCategory(next);
    setFromUnit(DEFAULT_UNIT_PAIR[next].from);
    setToUnit(DEFAULT_UNIT_PAIR[next].to);
    setInputValue(DEFAULT_INPUT_VALUE[next]);
  }

  function handleSwap() {
    const nextFrom = toUnit;
    const nextTo = fromUnit;
    setFromUnit(nextFrom);
    setToUnit(nextTo);
    // 드리프트 방지: 반올림 표시값이 아니라 full-precision 결과값을 그대로 되먹인다
    // (design §3-3). JS 숫자→문자열 변환은 원본 double과 round-trip 안전하다.
    if (rawResult !== null && Number.isFinite(rawResult)) {
      setInputValue(String(rawResult));
    }
  }

  return (
    <div>
      {/* 카테고리 탭 (design §2) */}
      <div
        role="tablist"
        aria-label="단위 카테고리 선택"
        className="flex w-full rounded-lg border border-brand-border bg-brand-bg p-1"
      >
        {CATEGORY_ORDER.map((cat) => {
          const selected = category === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => handleCategoryChange(cat)}
              className={`min-h-11 min-w-0 flex-1 rounded-md text-sm font-medium transition-colors ${
                selected
                  ? "bg-brand-surface font-semibold text-brand-primary shadow-sm"
                  : "bg-transparent text-brand-text-secondary"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* 변환기 카드 (design §3) */}
      <div className="mt-4 rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        {/* 입력부 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="unit-input-value"
            className="text-sm font-medium text-brand-text-secondary"
          >
            변환할 값
          </label>
          <div className="grid grid-cols-[1fr_1.2fr] gap-3">
            <input
              id="unit-input-value"
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className={inputBase}
            />
            <div className="relative min-w-0">
              <select
                aria-label="변환할 단위"
                value={fromUnit}
                onChange={(event) => setFromUnit(event.target.value)}
                className={`${selectBase} w-full`}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
          {belowAbsoluteZero && (
            <p className="text-xs text-brand-text-secondary">
              물리적으로 불가능한 온도입니다 (절대영도 −273.15℃ 미만).
            </p>
          )}
        </div>

        {/* 스왑 버튼 (design §3-3) */}
        <div className="relative z-10 -my-2 flex justify-center">
          <button
            type="button"
            aria-label="입력 단위와 결과 단위 바꾸기"
            onClick={handleSwap}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-lg text-brand-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            <span aria-hidden="true">⇅</span>
          </button>
        </div>

        {/* 결과부 (design §3-4) — 실시간, 항상 렌더 */}
        <div className="mt-4 rounded-xl border-l-4 border-brand-accent bg-gradient-to-br from-emerald-50 to-white p-4 transition-colors duration-200 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-brand-text-secondary">
              결과
            </span>
            <div className="relative min-w-0 max-w-[65%]">
              <select
                aria-label="결과 단위"
                value={toUnit}
                onChange={(event) => setToUnit(event.target.value)}
                className={`${selectBase} w-auto`}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>

          <p
            aria-live="polite"
            aria-atomic="true"
            className="mt-1 flex flex-wrap items-baseline gap-2"
          >
            <span
              className={`whitespace-nowrap font-bold tabular-nums text-brand-accent ${getHeroTextSizeClass(
                displayResult
              )}`}
            >
              {displayResult}
            </span>
            <span className="text-base font-medium text-brand-text-secondary">
              {toSymbol}
            </span>
          </p>

          {summary && (
            <p className="mt-2 text-sm text-brand-text-secondary">{summary}</p>
          )}
        </div>
      </div>

      {/* 자주 쓰는 환산 참조표 (design §6) */}
      <div className="mt-6 rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
        <p className="text-sm font-semibold text-brand-text-secondary">
          자주 쓰는 {CATEGORY_LABELS[category]} 환산
        </p>
        <div className="mt-1 sm:grid sm:grid-cols-2 sm:gap-x-8">
          {REFERENCE_ROWS[category].map((row) => {
            const result = convert(row.fromValue, row.fromId, row.toId, category);
            const rowFromSymbol = getUnitSymbol(category, row.fromId);
            const rowToSymbol = getUnitSymbol(category, row.toId);
            return (
              <div
                key={`${row.fromId}-${row.toId}-${row.fromValue}`}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="text-brand-text-secondary">
                  {formatResultValue(row.fromValue)}
                  {rowFromSymbol}
                  {row.note ? ` ${row.note}` : ""}
                </span>
                <span className="tabular-nums text-brand-text">
                  {formatResultValue(result)}
                  {rowToSymbol}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
