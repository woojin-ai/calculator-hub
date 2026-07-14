// =============================================================================
// 전기요금(주택용 저압 누진제) 계산 모델
//
// 계산 모델 원천: planning/electricity-bill-calculator-content.md
//   §1-1(STEP 0~8 파이프라인), §1-2(요금 상수), §1-4(검증 앵커 A~D).
//
// 라운딩 정책(마스터 확정, 기획 §1-1 그대로):
//   - 전력량요금(Energy)·전기요금계(Subtotal) = floor(원 미만 절사)
//   - 부가가치세(VAT)                        = round(원 미만 4사5입)
//   - 전력산업기반기금(Fund)·최종청구(Total) = floor10(10원 미만 절사)
//
// 범위(마스터 확정): 주택용 저압 고정 / 슈퍼유저(>1,000kWh) 별도단가 미구현
//   (3단계 누진까지, >1,000kWh는 컴포넌트에서 인라인 note) / 복지할인 미반영.
// =============================================================================

// -----------------------------------------------------------------------------
// 요금표 상수 (기준: 2026-07 한전 주택용 저압, 교차확인값)
//   ※ 갱신 대상:
//     - FUEL_ADJUSTMENT_RATE(연료비조정요금): 분기마다 재고시(±5원/kWh 상한). 분기 경계마다 점검.
//     - POWER_FUND_RATE(전력산업기반기금 요율): 2025.7~ 2.7%(3.7%→3.2%→2.7% 단계 인하). 재인하 가능.
//     - BASE_FEE / ENERGY_RATE / CLIMATE_RATE / PROGRESSIVE_BOUNDARY: 연 단위 요금표 개정 시 점검.
//   갱신 시 이 블록만 수정하면 엔진 전체에 반영된다(기획 §8-5 상수 모듈 분리).
// -----------------------------------------------------------------------------

export type Season = "summer" | "other";

/** 기본요금(도달 최종 누진단계 금액이 1회 부과), 원 */
export const BASE_FEE = { tier1: 910, tier2: 1_600, tier3: 7_300 } as const;

/** 전력량요금 구간별 단가(원/kWh) — 표시용 실수값 */
export const ENERGY_RATE = { tier1: 120.0, tier2: 214.6, tier3: 307.3 } as const;

/**
 * 전력량요금 구간별 단가(0.1원 단위 정수) — 내부 계산 전용.
 * 부동소수 오차로 floor 결과가 어긋나는 것을 막기 위해 정수(데시-원) 연산을 쓴다.
 * (예: 150 × 214.6 이 32,189.9999…로 계산되어 floor가 32,189이 되는 사고 방지)
 */
const ENERGY_RATE_DECI = { tier1: 1_200, tier2: 2_146, tier3: 3_073 } as const;

/** 누진구간 경계(kWh). 계절에 따라 다름(하계 완화). */
export const PROGRESSIVE_BOUNDARY = {
  summer: { b1: 300, b2: 450 },
  other: { b1: 200, b2: 400 },
} as const;

/** 기후환경요금(원/kWh) */
export const CLIMATE_RATE = 9;

/** 연료비조정요금(원/kWh) — 분기 변동(±5원 상한), 현재 +5원. 갱신 대상 */
export const FUEL_ADJUSTMENT_RATE = 5;

/** 부가가치세율(전기요금계 기준) */
export const VAT_RATE = 0.1;

/** 전력산업기반기금 요율(전기요금계 기준) — 2025.7~ 2.7%. 갱신 대상(3.7% 아님) */
export const POWER_FUND_RATE = 0.027;

/** 슈퍼유저(별도 단가) 안내 기준 사용량(kWh). 초과 시 컴포넌트에서 인라인 note */
export const SUPER_USER_THRESHOLD = 1_000;

// -----------------------------------------------------------------------------
// 타입
// -----------------------------------------------------------------------------

export interface ElectricityInput {
  /** 월 사용량 U(kWh). 음수·비정수는 방어적으로 정규화(≥0 정수) */
  usage: number;
  /** 계절 (하계 7·8월 / 기타계절) */
  season: Season;
}

/** 누진 게이지 렌더용 파생값 (기획 §7-2 (h) 시각화·§8-8, 디자인 §3-3) */
export interface ProgressiveGauge {
  /** 현재 계절 1단계 경계(kWh) */
  b1: number;
  /** 현재 계절 2단계 경계(kWh) */
  b2: number;
  /** 도달 누진단계 */
  tier: 1 | 2 | 3;
  /**
   * 게이지 시각 상한(visual max, kWh) = b2 + (b2 − b1).
   * 3단계 세그먼트가 2단계 세그먼트와 같은 시각 폭이 되도록 한 값(디자인 §3-3-1 rationale).
   * ※ 디자인 §3-3-1의 문구 수치 "기타 500 / 하계 600"은 이 공식(b2+(b2−b1)=기타 600 / 하계 600)과
   *    불일치한다(하계만 일치). 공식·rationale이 자기일관적이므로 공식을 채택했다(개발 보고 → 디자인 확인 요청).
   */
  visualMax: number;
  /** 다음 누진단계 진입 경계(kWh). 이미 3단계면 null */
  nextBoundary: number | null;
  /** 다음 경계까지 남은 사용량(kWh). 이미 3단계면 null */
  remainingToNext: number | null;
  /** 마커 위치(0~100%). U > visualMax면 100으로 clamp */
  markerPercent: number;
  /** U가 visual max를 초과했는지(마커 우측 끝 고정 + → 표시) */
  isOverVisualMax: boolean;
  /** 세그먼트 시각 폭(%) — 1/2/3단계 */
  seg1Percent: number;
  seg2Percent: number;
  seg3Percent: number;
}

export interface ElectricityResult {
  /** 정규화된 사용량 U(kWh, ≥0 정수) */
  usage: number;
  season: Season;
  /** 도달 누진단계 */
  tier: 1 | 2 | 3;
  /** 구간별 사용량 (게이지·검산용) */
  q1: number;
  q2: number;
  q3: number;
  /** 기본요금 Base */
  baseFee: number;
  /** 전력량요금 Energy = floor(구간별 합) */
  energyFee: number;
  /** 기후환경요금 Climate = U × 9 */
  climateFee: number;
  /** 연료비조정요금 Fuel = U × 5 */
  fuelFee: number;
  /** 전기요금계 Subtotal = floor(Base + Energy + Climate + Fuel) */
  subtotal: number;
  /** 부가가치세 VAT = round(Subtotal × 10%) */
  vat: number;
  /** 전력산업기반기금 Fund = floor10(Subtotal × 2.7%) */
  powerFund: number;
  /** 최종 청구요금 Total = floor10(Subtotal + VAT + Fund) */
  total: number;
  /** 슈퍼유저(>1,000kWh) 여부 — 별도 단가 안내용 */
  isSuperUser: boolean;
  /** 누진 게이지 파생값 */
  gauge: ProgressiveGauge;
}

export type ElectricityOutcome =
  | { ok: true; result: ElectricityResult }
  | { ok: false; error: "invalid-usage" };

// -----------------------------------------------------------------------------
// 라운딩 헬퍼
// -----------------------------------------------------------------------------

/** 10원 미만 절사 */
function floor10(x: number): number {
  return Math.floor(x / 10) * 10;
}

// -----------------------------------------------------------------------------
// 엔진
// -----------------------------------------------------------------------------

/**
 * 월 사용량과 계절을 받아 주택용 저압 전기요금(누진제)을 계산한다.
 * 파이프라인 STEP 0~8은 기획 §1-1 그대로.
 */
export function calculateElectricity(input: ElectricityInput): ElectricityOutcome {
  const { usage, season } = input;

  // 방어: 비유한/음수 → 오류. 소수는 정수 kWh로 절사(입력단에서 이미 정수지만 방어).
  if (!Number.isFinite(usage) || usage < 0) {
    return { ok: false, error: "invalid-usage" };
  }
  const U = Math.floor(usage);

  // STEP 0  누진구간 경계 결정 (계절별)
  const { b1, b2 } = PROGRESSIVE_BOUNDARY[season];

  // STEP 1  도달 누진단계 판정 → 기본요금 Base
  let tier: 1 | 2 | 3;
  let baseFee: number;
  if (U <= b1) {
    tier = 1;
    baseFee = BASE_FEE.tier1;
  } else if (U <= b2) {
    tier = 2;
    baseFee = BASE_FEE.tier2;
  } else {
    tier = 3;
    baseFee = BASE_FEE.tier3;
  }

  // STEP 2  전력량요금 Energy = 구간별 사용량 × 구간단가 합산 (정수 데시-원 연산 후 floor)
  const q1 = Math.min(U, b1);
  const q2 = Math.max(0, Math.min(U - b1, b2 - b1));
  const q3 = Math.max(0, U - b2);
  const energyDeci =
    q1 * ENERGY_RATE_DECI.tier1 +
    q2 * ENERGY_RATE_DECI.tier2 +
    q3 * ENERGY_RATE_DECI.tier3;
  const energyFee = Math.floor(energyDeci / 10);

  // STEP 3  기후환경요금 Climate = U × 9
  const climateFee = U * CLIMATE_RATE;

  // STEP 4  연료비조정요금 Fuel = U × 5
  const fuelFee = U * FUEL_ADJUSTMENT_RATE;

  // STEP 5  전기요금계 Subtotal = floor(Base + Energy + Climate + Fuel)
  const subtotal = Math.floor(baseFee + energyFee + climateFee + fuelFee);

  // STEP 6  부가가치세 VAT = round(Subtotal × 10%)
  const vat = Math.round(subtotal * VAT_RATE);

  // STEP 7  전력산업기반기금 Fund = floor10(Subtotal × 2.7%)
  const powerFund = floor10(subtotal * POWER_FUND_RATE);

  // STEP 8  최종 청구요금 Total = floor10(Subtotal + VAT + Fund)
  const total = floor10(subtotal + vat + powerFund);

  // ── 게이지 파생값 ──
  const visualMax = b2 + (b2 - b1);
  const nextBoundary = tier === 1 ? b1 : tier === 2 ? b2 : null;
  const remainingToNext = nextBoundary === null ? null : Math.max(0, nextBoundary - U);
  const isOverVisualMax = U > visualMax;
  const markerPercent = Math.min(100, (Math.min(U, visualMax) / visualMax) * 100);
  const seg1Percent = (b1 / visualMax) * 100;
  const seg2Percent = ((b2 - b1) / visualMax) * 100;
  const seg3Percent = ((visualMax - b2) / visualMax) * 100;

  const gauge: ProgressiveGauge = {
    b1,
    b2,
    tier,
    visualMax,
    nextBoundary,
    remainingToNext,
    markerPercent,
    isOverVisualMax,
    seg1Percent,
    seg2Percent,
    seg3Percent,
  };

  return {
    ok: true,
    result: {
      usage: U,
      season,
      tier,
      q1,
      q2,
      q3,
      baseFee,
      energyFee,
      climateFee,
      fuelFee,
      subtotal,
      vat,
      powerFund,
      total,
      isSuperUser: U > SUPER_USER_THRESHOLD,
      gauge,
    },
  };
}

/** 현재 월(1~12)로부터 계절 기본값 결정 (7·8월 → 하계, 그 외 → 기타계절). */
export function seasonForMonth(month: number): Season {
  return month === 7 || month === 8 ? "summer" : "other";
}

/** 계절 한글 라벨. */
export function seasonLabel(season: Season): string {
  return season === "summer" ? "하계" : "기타계절";
}
