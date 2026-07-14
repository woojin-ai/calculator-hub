// =============================================================================
// 4대보험료 계산 모델 (2026년 기준) — 근로자 / 사업주 / 합계 3열
//
// 계산 모델 원천: planning/four-insurance-calculator-content.md §1-1(파이프라인)
//   §1-2(요율표) · §1-4(검증 앵커 A~D).
//
// 정합 원칙(기획 §8-6, 필수): 근로자분 요율·국민연금 하한상한·천원절사(floorTo1000)·
//   원단위 floor는 lib/salary.ts에 이미 확정·검증된 상수/유틸을 그대로 import 재사용한다.
//   (신규 정의 금지 — 요율 갱신 시 한 곳만 고치면 연봉·4대보험 두 계산기가 동시 갱신되어
//   근로자 4대 보험료가 원 단위까지 일치.)
//
// 신규 상수는 "고용보험 사업주의 고용안정·직업능력개발사업 요율 맵" 1건뿐이다.
//
// 라운딩: 각 보험료 원 단위 절사(Math.floor). 국민연금 기준소득월액은 천원 절사 후 clamp.
//   사업주 부담분도 각각 개별 floor(근로자분 복사 아님 — 국민연금·건강은 base가 같아
//   결과가 같지만 산식상 각각 floor).
// =============================================================================

import {
  NATIONAL_PENSION_RATE,
  NATIONAL_PENSION_BASE_MIN,
  NATIONAL_PENSION_BASE_MAX,
  HEALTH_INSURANCE_RATE,
  LONG_TERM_CARE_MULTIPLIER,
  EMPLOYMENT_INSURANCE_RATE,
  floorTo1000,
} from "@/lib/salary";

// -----------------------------------------------------------------------------
// 사업장 규모 (고용보험 사업주 부담용) — 근로자·다른 3개 보험에는 무관
// -----------------------------------------------------------------------------

export type BusinessSize =
  | "under150"
  | "over150Priority"
  | "from150to1000"
  | "over1000";

/**
 * 신규 상수(기획 §1-2): 고용보험 사업주의 고용안정·직업능력개발사업 요율(규모별).
 * 근로자·다른 3개 보험에는 영향 없음. 2026년 기준(근로복지공단 고시).
 * 갱신 시 이 맵만 수정.
 * - 150인 미만: 0.25%
 * - 150인 이상(우선지원 대상기업): 0.45%
 * - 150인 이상~1,000인 미만: 0.65%
 * - 1,000인 이상·국가/지자체: 0.85%
 */
export const EMPLOYMENT_STABILITY_RATE: Record<BusinessSize, number> = {
  under150: 0.0025,
  over150Priority: 0.0045,
  from150to1000: 0.0065,
  over1000: 0.0085,
};

// -----------------------------------------------------------------------------
// 타입
// -----------------------------------------------------------------------------

export interface FourInsuranceInput {
  /** 월 과세대상 급여 T (보수월액, 원) — 비과세 제외 */
  monthlyTaxable: number;
  /** 사업장 규모 (고용보험 사업주 부담 계산용) */
  businessSize: BusinessSize;
}

/** 보험 항목별 근로자/사업주/합계(소계) */
export interface InsuranceRow {
  /** 근로자 부담(월, 원) */
  employee: number;
  /** 사업주 부담(월, 원) */
  employer: number;
  /** 소계 = 근로자 + 사업주 */
  total: number;
}

export interface FourInsuranceResult {
  /** 입력 월 과세대상 급여 T */
  monthlyTaxable: number;
  /** 사업장 규모 */
  businessSize: BusinessSize;
  /** 국민연금 기준소득월액 P = clamp(floor1000(T), 하한, 상한) */
  pensionBase: number;
  /** 국민연금 상한 clamp가 실제로 base를 줄였는지(급여 > 659만) */
  isPensionCapped: boolean;
  nationalPension: InsuranceRow;
  healthInsurance: InsuranceRow;
  longTermCare: InsuranceRow;
  employmentInsurance: InsuranceRow;
  /** 근로자 부담 합계(월) */
  employeeTotal: number;
  /** 사업주 부담 합계(월, 산재 제외) */
  employerTotal: number;
  /** 총 합계 = 근로자 합계 + 사업주 합계 */
  grandTotal: number;
}

// -----------------------------------------------------------------------------
// 메인 계산 (파이프라인 planning §1-1 STEP 0~6)
// -----------------------------------------------------------------------------

/**
 * 월 과세대상 급여·사업장 규모를 받아 4대 보험료(근로자/사업주/합계)를 계산한다.
 * 입력이 유효하지 않으면(급여 유한하지 않거나 0 이하) null 반환.
 */
export function calculateFourInsurance(
  input: FourInsuranceInput
): FourInsuranceResult | null {
  const { monthlyTaxable: T, businessSize } = input;

  if (!Number.isFinite(T) || T <= 0) {
    return null;
  }

  // STEP 0  국민연금 기준소득월액 P = clamp(floor1000(T), 41만, 659만)
  const flooredBase = floorTo1000(T);
  const pensionBase = Math.min(
    Math.max(flooredBase, NATIONAL_PENSION_BASE_MIN),
    NATIONAL_PENSION_BASE_MAX
  );
  const isPensionCapped = flooredBase > NATIONAL_PENSION_BASE_MAX;

  // STEP 1  국민연금 (근로자 = 사업주, base = P)
  const pensionEmployee = Math.floor(pensionBase * NATIONAL_PENSION_RATE);
  const pensionEmployer = Math.floor(pensionBase * NATIONAL_PENSION_RATE);

  // STEP 2  건강보험 (근로자 = 사업주, base = T)
  const healthEmployee = Math.floor(T * HEALTH_INSURANCE_RATE);
  const healthEmployer = Math.floor(T * HEALTH_INSURANCE_RATE);

  // STEP 3  장기요양 (각자의 건강보험료 × 12.9457%)
  const careEmployee = Math.floor(healthEmployee * LONG_TERM_CARE_MULTIPLIER);
  const careEmployer = Math.floor(healthEmployer * LONG_TERM_CARE_MULTIPLIER);

  // STEP 4  고용보험
  //   근로자 = 실업급여분 0.9%
  //   사업주 = 실업급여 0.9% + 고용안정·직업능력개발(규모별)
  const employmentEmployee = Math.floor(T * EMPLOYMENT_INSURANCE_RATE);
  const employmentEmployer = Math.floor(
    T * (EMPLOYMENT_INSURANCE_RATE + EMPLOYMENT_STABILITY_RATE[businessSize])
  );

  // STEP 5  산재보험 = 계산 제외(전액 사업주·업종별) — 면책·안내만

  const nationalPension: InsuranceRow = {
    employee: pensionEmployee,
    employer: pensionEmployer,
    total: pensionEmployee + pensionEmployer,
  };
  const healthInsurance: InsuranceRow = {
    employee: healthEmployee,
    employer: healthEmployer,
    total: healthEmployee + healthEmployer,
  };
  const longTermCare: InsuranceRow = {
    employee: careEmployee,
    employer: careEmployer,
    total: careEmployee + careEmployer,
  };
  const employmentInsurance: InsuranceRow = {
    employee: employmentEmployee,
    employer: employmentEmployer,
    total: employmentEmployee + employmentEmployer,
  };

  // STEP 6  합계
  const employeeTotal =
    pensionEmployee + healthEmployee + careEmployee + employmentEmployee;
  const employerTotal =
    pensionEmployer + healthEmployer + careEmployer + employmentEmployer;
  const grandTotal = employeeTotal + employerTotal;

  return {
    monthlyTaxable: T,
    businessSize,
    pensionBase,
    isPensionCapped,
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    employeeTotal,
    employerTotal,
    grandTotal,
  };
}
