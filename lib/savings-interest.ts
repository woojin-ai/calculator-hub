// =============================================================================
// 적금·예금 이자 계산 모델
//
// 계산 모델 원천: planning/calculator-lineup-expansion.md §14,
//   planning/savings-interest-design.md §0~§5, 마스터 확정 결정(2026-07-16).
//
// - 4개 조합 지원(예금/적금 × 단리/월복리):
//   · 예금 단리 이자      = 원금 × r × (개월/12)
//   · 예금 월복리 이자    = 원금 × (1 + r/12)^개월 − 원금
//   · 적금 단리 이자      = 월납입 × r × (개월×(개월+1)/2) / 12
//     (매월 납입분이 남은 개월 수만큼 이자 → n(n+1)/2 가중)
//   · 적금 월복리 이자    = 월납입 × (1+i) × ((1+i)^개월 − 1) / i − 총납입원금
//     (i = r/12, 매월 초 납입분을 남은 개월 수만큼 월복리. i=0이면 0나눗셈이라
//      단리와 동일하게 이자 0으로 폴백)
// - 과세: 이자과세액 = 세전이자 × 세율, 세후이자 = 세전이자 − 이자과세액.
//   세율은 lib/interest-tax.ts 단일 소스(하드코딩 금지).
// - 라운딩 정책(loan.ts·weekly-holiday-allowance.ts와 동일 원칙): 내부는 전
//   정밀도 유지, 최종 표시값만 Math.round(원단위). 단, Tier② 행이 서로
//   맞아떨어지도록(QA 정합) 세후이자·세후수령액은 반올림한 표시값에서 파생한다
//   (세후이자 = 세전이자표시 − 과세표시, 세후수령액 = 원금 + 세후이자표시).
// - 실효수익률 = 세후이자 ÷ 원금(예금: 예치금 / 적금: 총납입원금), 해당 기간
//   전체 기준(연환산 아님), 소수 2자리.
// - 방어는 판별 유니온으로 처리(ok:false, error). 게이트 카드는 없다(§4):
//   연이율 0%면 이자 0·세후수령액=원금인 정상 결과를 반환한다.
// =============================================================================

import { INTEREST_TAX_RATE, type InterestTaxType } from "@/lib/interest-tax";

export type SavingsMode = "deposit" | "installment";
export type SavingsMethod = "simple" | "monthlyCompound";

/** 기간 상한 (개월) — 1~600개월(=50년) 정수만 허용 */
const MAX_MONTHS = 600;

export interface SavingsInput {
  /** 예금=예치금 / 적금=월 납입액 (원) */
  principalOrMonthly: number;
  /** 저축(예치) 기간 (개월, 1~600 정수) */
  months: number;
  /** 세전 연이율 (%, 예: 3.5) */
  annualRate: number;
  /** 예금(일시예치) / 적금(매월납입) */
  mode: SavingsMode;
  /** 단리 / 월복리 */
  method: SavingsMethod;
  /** 이자 과세 유형 */
  taxType: InterestTaxType;
}

/** 계산 결과 금액 (전부 원단위 반올림, 실효수익률만 소수 2자리) */
export interface SavingsAmounts {
  /** 원금 — 예금: 예치금 / 적금: 총납입원금(월납입 × 개월) */
  principalTotal: number;
  /** 세전 이자 */
  pretaxInterest: number;
  /** 적용 세율 (소수, 예: 0.154) */
  taxRate: number;
  /** 이자과세액 = 세전이자 × 세율 */
  taxAmount: number;
  /** 세후 이자 = 세전이자 − 이자과세액 (표시값 기준으로 파생) */
  afterTaxInterest: number;
  /** 세후 수령액 = 원금 + 세후이자 */
  afterTaxReceived: number;
  /** 세후 실효수익률 (%, 기간 전체 세후 총수익률, 소수 2자리) */
  effectiveRatePercent: number;
}

export type SavingsError = "invalid-amount" | "invalid-months" | "invalid-rate";

export type SavingsOutcome =
  | { ok: true; input: SavingsInput; amounts: SavingsAmounts }
  | { ok: false; error: SavingsError };

/** 세전 이자(전 정밀도)를 4개 조합별 공식으로 계산한다. */
function computePretaxInterest(input: SavingsInput): number {
  const { principalOrMonthly: P, months: n, annualRate, mode, method } = input;
  const r = annualRate / 100;

  if (mode === "deposit") {
    // 예금(일시예치)
    if (method === "simple") {
      return P * r * (n / 12);
    }
    // 월복리: 원금 × (1 + r/12)^n − 원금
    return P * Math.pow(1 + r / 12, n) - P;
  }

  // 적금(매월납입)
  if (method === "simple") {
    // 월납입 × r × (n(n+1)/2) / 12
    return (P * r * ((n * (n + 1)) / 2)) / 12;
  }
  // 월복리: i = r/12, 만기원리금 = 월납입 × (1+i) × ((1+i)^n − 1) / i, 이자 = 만기 − 총납입
  const i = r / 12;
  if (i === 0) {
    // 0나눗셈 방어: 이율 0이면 이자 0(단리와 동일 결과로 폴백)
    return 0;
  }
  const maturity = (P * (1 + i) * (Math.pow(1 + i, n) - 1)) / i;
  return maturity - P * n;
}

/**
 * 예·적금 입력을 받아 세전이자·과세·세후수령액·실효수익률을 계산한다.
 * - 게이트 없음: 연이율 0%면 이자 0·세후수령액=원금인 정상 결과.
 * - 금액≤0·기간 비정수/범위밖·연이율 음수는 판별 유니온(ok:false)으로 방어.
 * - 내부는 전 정밀도, 표시값만 원단위 반올림. 세후이자/세후수령액은 표시값에서
 *   파생해 Tier② 행이 서로 정확히 맞아떨어지게 한다.
 */
export function calculateSavingsInterest(input: SavingsInput): SavingsOutcome {
  const { principalOrMonthly, months, annualRate, mode, taxType } = input;

  // 방어 (컴포넌트에서 1차 검증하지만 이중 방어)
  if (!Number.isFinite(principalOrMonthly) || principalOrMonthly <= 0) {
    return { ok: false, error: "invalid-amount" };
  }
  if (
    !Number.isFinite(months) ||
    !Number.isInteger(months) ||
    months <= 0 ||
    months > MAX_MONTHS
  ) {
    return { ok: false, error: "invalid-months" };
  }
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    return { ok: false, error: "invalid-rate" };
  }

  // 원금(전 정밀도) — 예금: 예치금 / 적금: 월납입 × 개월
  const principalTotalRaw =
    mode === "deposit" ? principalOrMonthly : principalOrMonthly * months;

  // 세전이자(전 정밀도)
  const pretaxInterestRaw = computePretaxInterest(input);

  const taxRate = INTEREST_TAX_RATE[taxType];
  const taxAmountRaw = pretaxInterestRaw * taxRate;

  // 표시값 반올림 후 파생 → Tier② 행 정합 보장
  const principalTotal = Math.round(principalTotalRaw);
  const pretaxInterest = Math.round(pretaxInterestRaw);
  const taxAmount = Math.round(taxAmountRaw);
  const afterTaxInterest = pretaxInterest - taxAmount;
  const afterTaxReceived = principalTotal + afterTaxInterest;

  // 세후 실효수익률 = 세후이자 ÷ 원금 (기간 전체 세후 총수익률, 소수 2자리)
  const effectiveRatePercent =
    principalTotal > 0
      ? Math.round((afterTaxInterest / principalTotal) * 10000) / 100
      : 0;

  const amounts: SavingsAmounts = {
    principalTotal,
    pretaxInterest,
    taxRate,
    taxAmount,
    afterTaxInterest,
    afterTaxReceived,
    effectiveRatePercent,
  };

  return { ok: true, input, amounts };
}
