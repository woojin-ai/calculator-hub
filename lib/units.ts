// =============================================================================
// 단위 변환 계산기 — 변환 계수·공식 모듈
//
// 계수 출처: planning/unit-converter-content.md §1(변환 계수 검증 앵커) · §1-6(검증표)
// 최종 단위 목록(28개): design/unit-converter-ui-spec.md §13-4(마스터 확정) —
//   디자인팀 본문(§3-5)이 제안한 관·아르·에이커·홉·되·말은 이번 v1 범위에서 제외.
//
// canonical-base 방식:
// - 길이·무게·면적·부피(곱셈형): 카테고리별 기준 단위로의 배율(factor) 테이블을 두고,
//   base = 입력값 × from.factor, 결과 = base ÷ to.factor 로 변환한다.
// - 온도(오프셋형): 배율만으로 표현 불가(0점이 단위마다 다름). 반드시 기준 단위(℃)를
//   경유해 "입력 → ℃ → 목표 단위" 2단계로 변환한다. 역방향을 "1/factor"로 처리하면
//   오프셋이 무시되어 전면 오류가 나므로 금지(planning §1-5, design §4).
// =============================================================================

export type UnitCategory = "length" | "weight" | "area" | "volume" | "temperature";

export interface UnitOption {
  /** 카테고리 내에서 고유한 식별자 (select value로 사용) */
  id: string;
  /** 셀렉트 옵션에 노출되는 라벨. "한글명 (기호)" 형태 (design §3-5) */
  label: string;
  /** 결과·참조표·요약 문구에 값 뒤에 병기하는 짧은 기호 */
  symbol: string;
}

interface FactorUnit extends UnitOption {
  /** 카테고리 기준 단위로의 환산 배율 */
  factor: number;
}

// -----------------------------------------------------------------------------
// 길이(length) — 기준 단위 m (planning §1-1, design §13-4: 총 8개)
// -----------------------------------------------------------------------------
const LENGTH_UNITS: FactorUnit[] = [
  { id: "mm", label: "밀리미터 (mm)", symbol: "mm", factor: 0.001 },
  { id: "cm", label: "센티미터 (cm)", symbol: "cm", factor: 0.01 },
  { id: "m", label: "미터 (m)", symbol: "m", factor: 1 },
  { id: "km", label: "킬로미터 (km)", symbol: "km", factor: 1000 },
  { id: "inch", label: "인치 (in)", symbol: "in", factor: 0.0254 },
  { id: "ft", label: "피트 (ft)", symbol: "ft", factor: 0.3048 },
  { id: "yard", label: "야드 (yd)", symbol: "yd", factor: 0.9144 },
  { id: "mile", label: "마일 (mi)", symbol: "mi", factor: 1609.344 },
];

// -----------------------------------------------------------------------------
// 무게(weight) — 기준 단위 g (design §13-4: 총 7개)
// -----------------------------------------------------------------------------
const WEIGHT_UNITS: FactorUnit[] = [
  { id: "mg", label: "밀리그램 (mg)", symbol: "mg", factor: 0.001 },
  { id: "g", label: "그램 (g)", symbol: "g", factor: 1 },
  { id: "kg", label: "킬로그램 (kg)", symbol: "kg", factor: 1000 },
  { id: "t", label: "톤 (t)", symbol: "t", factor: 1_000_000 },
  { id: "oz", label: "온스 (oz)", symbol: "oz", factor: 28.349523125 },
  { id: "lb", label: "파운드 (lb)", symbol: "lb", factor: 453.59237 },
  { id: "geun", label: "근 (600g)", symbol: "근", factor: 600 },
];

// -----------------------------------------------------------------------------
// 면적(area) — 기준 단위 ㎡ ★대표 유스케이스(평↔㎡) (design §13-4: 총 5개)
//
// 평 factor는 반드시 400/121을 부동소수 나눗셈으로 계산해 쓴다(반올림 상수 금지).
// 3.3058 등으로 반올림해 하드코딩하면 33평·84㎡ 등 검증값(planning §1-6)과 어긋난다.
// -----------------------------------------------------------------------------
const AREA_UNITS: FactorUnit[] = [
  { id: "sqm", label: "제곱미터 (㎡)", symbol: "㎡", factor: 1 },
  { id: "pyeong", label: "평", symbol: "평", factor: 400 / 121 },
  { id: "sqkm", label: "제곱킬로미터 (㎢)", symbol: "㎢", factor: 1_000_000 },
  { id: "ha", label: "헥타르 (ha)", symbol: "ha", factor: 10000 },
  { id: "sqft", label: "제곱피트 (ft²)", symbol: "ft²", factor: 0.09290304 },
];

// -----------------------------------------------------------------------------
// 부피(volume) — 기준 단위 L (design §13-4: 총 5개)
//
// 컵 = 200mL(한국 요리 기준), 갤런 = 미국 갤런(3.785411784L) 고정. 국가별로 값이
// 다른 단위이므로(영국 갤런 등) 이 계산기의 기준을 라벨에 병기한다(planning §1-4).
// -----------------------------------------------------------------------------
const VOLUME_UNITS: FactorUnit[] = [
  { id: "mL", label: "밀리리터 (mL)", symbol: "mL", factor: 0.001 },
  { id: "L", label: "리터 (L)", symbol: "L", factor: 1 },
  { id: "cbm", label: "세제곱미터 (㎥)", symbol: "㎥", factor: 1000 },
  { id: "cup", label: "컵 (200mL)", symbol: "컵", factor: 0.2 },
  { id: "gallon", label: "갤런 (미국, gal)", symbol: "gal", factor: 3.785411784 },
];

// -----------------------------------------------------------------------------
// 온도(temperature) — 기준 단위 ℃, 오프셋 공식(곱셈형 아님) (design §13-4: 총 3개)
// -----------------------------------------------------------------------------
const TEMPERATURE_UNITS: UnitOption[] = [
  { id: "celsius", label: "섭씨 (℃)", symbol: "℃" },
  { id: "fahrenheit", label: "화씨 (℉)", symbol: "℉" },
  { id: "kelvin", label: "켈빈 (K)", symbol: "K" },
];

// -----------------------------------------------------------------------------
// 카테고리 메타 (탭 순서·라벨·단위 목록·기본값)
// -----------------------------------------------------------------------------

/** 카테고리 탭 노출 순서 (design §1 와이어프레임: 길이·무게·면적·부피·온도) */
export const CATEGORY_ORDER: UnitCategory[] = [
  "length",
  "weight",
  "area",
  "volume",
  "temperature",
];

export const CATEGORY_LABELS: Record<UnitCategory, string> = {
  length: "길이",
  weight: "무게",
  area: "면적",
  volume: "부피",
  temperature: "온도",
};

export const CATEGORY_UNITS: Record<UnitCategory, UnitOption[]> = {
  length: LENGTH_UNITS,
  weight: WEIGHT_UNITS,
  area: AREA_UNITS,
  volume: VOLUME_UNITS,
  temperature: TEMPERATURE_UNITS,
};

/** 곱셈형(factor) 카테고리만 모은 내부 참조용 맵 (convert 내부에서 사용) */
const FACTOR_UNITS: Record<Exclude<UnitCategory, "temperature">, FactorUnit[]> = {
  length: LENGTH_UNITS,
  weight: WEIGHT_UNITS,
  area: AREA_UNITS,
  volume: VOLUME_UNITS,
};

/**
 * 카테고리별 기본 from→to 단위쌍 (마스터 확정, design §13-5·§3-5):
 * 길이 cm→in / 무게 kg→lb / 면적 평→㎡ / 부피 L→gal / 온도 ℃→℉
 */
export const DEFAULT_UNIT_PAIR: Record<UnitCategory, { from: string; to: string }> = {
  length: { from: "cm", to: "inch" },
  weight: { from: "kg", to: "lb" },
  area: { from: "pyeong", to: "sqm" },
  volume: { from: "L", to: "gallon" },
  temperature: { from: "celsius", to: "fahrenheit" },
};

/**
 * 카테고리별 기본 프리필 입력값. 면적은 마스터 확정값(20평 → 66.12㎡, design §13-5)을
 * 그대로 쓰고, 그 외 카테고리는 명시적으로 확정된 예시값이 없어 "1"(가장 단순하고
 * 오해 소지가 없는 기본값)로 둔다.
 */
export const DEFAULT_INPUT_VALUE: Record<UnitCategory, string> = {
  length: "1",
  weight: "1",
  area: "20",
  volume: "1",
  temperature: "1",
};

function getUnit(category: UnitCategory, id: string): UnitOption | undefined {
  return CATEGORY_UNITS[category].find((u) => u.id === id);
}

export function getUnitSymbol(category: UnitCategory, id: string): string {
  return getUnit(category, id)?.symbol ?? "";
}

export function getUnitLabel(category: UnitCategory, id: string): string {
  return getUnit(category, id)?.label ?? "";
}

// -----------------------------------------------------------------------------
// 온도 변환 (오프셋 공식, 기준 단위 ℃ 경유) — planning §1-5, design §4
// -----------------------------------------------------------------------------

/** 절대영도 (섭씨 기준) */
const ABSOLUTE_ZERO_CELSIUS = -273.15;

function toCelsius(value: number, unitId: string): number {
  switch (unitId) {
    case "celsius":
      return value;
    case "fahrenheit":
      return ((value - 32) * 5) / 9;
    case "kelvin":
      return value - 273.15;
    default:
      return NaN;
  }
}

function fromCelsius(celsius: number, unitId: string): number {
  switch (unitId) {
    case "celsius":
      return celsius;
    case "fahrenheit":
      return (celsius * 9) / 5 + 32;
    case "kelvin":
      return celsius + 273.15;
    default:
      return NaN;
  }
}

function convertTemperature(value: number, fromId: string, toId: string): number | null {
  const celsius = toCelsius(value, fromId);
  if (!Number.isFinite(celsius)) return null;
  const result = fromCelsius(celsius, toId);
  return Number.isFinite(result) ? result : null;
}

/**
 * 절대영도(약 −273.15℃) 미만인 물리적으로 불가능한 온도인지 확인한다.
 * 하드 에러가 아닌 안내 용도이며(planning §1-5), 부동소수 오차를 감안해 아주 작은
 * 허용 오차(1e-9)를 둔다.
 */
export function isBelowAbsoluteZero(value: number, unitId: string): boolean {
  const celsius = toCelsius(value, unitId);
  if (!Number.isFinite(celsius)) return false;
  return celsius < ABSOLUTE_ZERO_CELSIUS - 1e-9;
}

// -----------------------------------------------------------------------------
// 곱셈형 변환(길이·무게·면적·부피) — canonical-base
// -----------------------------------------------------------------------------

function convertFactor(
  value: number,
  fromId: string,
  toId: string,
  units: FactorUnit[]
): number | null {
  const from = units.find((u) => u.id === fromId);
  const to = units.find((u) => u.id === toId);
  if (!from || !to) return null;
  const base = value * from.factor;
  return base / to.factor;
}

/**
 * 카테고리에 맞춰 from 단위 값을 to 단위로 변환한다.
 * 곱셈형(길이·무게·면적·부피)은 factor 테이블로, 온도는 오프셋 공식으로 처리한다.
 * value가 유한하지 않거나 단위 id를 찾을 수 없으면 null.
 */
export function convert(
  value: number,
  fromId: string,
  toId: string,
  category: UnitCategory
): number | null {
  if (!Number.isFinite(value)) return null;

  if (category === "temperature") {
    return convertTemperature(value, fromId, toId);
  }

  return convertFactor(value, fromId, toId, FACTOR_UNITS[category]);
}

// -----------------------------------------------------------------------------
// 표시 반올림 유틸 (design §5-2 3단 규칙, 마스터 확정 §13-6)
// -----------------------------------------------------------------------------

const GENERAL_UPPER_BOUND = 1e12;
const GENERAL_LOWER_BOUND = 0.01;

const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  "+": "",
};

function toSuperscript(exponent: number): string {
  return String(exponent)
    .split("")
    .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
    .join("");
}

/** 소수점 문자열의 후행 0(및 필요 시 마침표)을 잘라낸다. 정수 문자열은 그대로 둔다. */
function stripTrailingZeros(numStr: string): string {
  if (!numStr.includes(".")) return numStr;
  return numStr.replace(/0+$/, "").replace(/\.$/, "");
}

/** 초소형/초대형 값의 압축(과학) 표기 폴백. 예: "1.2346 × 10¹²" */
function formatScientific(value: number, sigFigs = 5): string {
  const [mantissaRaw, expRaw] = value.toExponential(sigFigs - 1).split("e");
  const mantissa = stripTrailingZeros(mantissaRaw);
  const exponent = Number(expRaw);
  return `${mantissa} × 10${toSuperscript(exponent)}`;
}

/**
 * 변환 결과를 design §5-2 3단 규칙으로 표시용 문자열로 포맷한다.
 * - 일반 (0.01 ≤ |값| < 1e12): 소수 둘째 자리 반올림 + 후행 0 절삭 + 천단위 콤마
 * - 초소형 (0 < |값| < 0.01): 유효숫자 4자리 기준 + 후행 0 절삭
 * - 초대형 (|값| ≥ 1e12): 압축(과학) 표기 폴백
 * value가 없거나(null) 유한하지 않으면 "—"를 반환한다(빈 입력/비숫자 입력 조용히 처리).
 */
export function formatResultValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value === 0) return "0";

  const abs = Math.abs(value);

  if (abs >= GENERAL_UPPER_BOUND) {
    return formatScientific(value);
  }

  if (abs < GENERAL_LOWER_BOUND) {
    const precision = value.toPrecision(4);
    if (/e/i.test(precision)) {
      return formatScientific(value);
    }
    return stripTrailingZeros(precision);
  }

  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}
