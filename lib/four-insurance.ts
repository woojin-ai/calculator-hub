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
//   (+ 그 맵에서 파생한 계산 전용 정수 bp 맵. 요율 리터럴을 새로 쓰지 않는다 — 아래 주석 참조)
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
  EMPLOYMENT_INSURANCE_BP,
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

/**
 * 위 실수 요율에서 **파생**한 정수 베이시스포인트(1/10,000) 맵 — 계산 전용.
 * 부동소수 오차로 원 단위 절사가 1원 어긋나는 것을 막기 위해 정수 연산을 쓴다.
 * (예: 3,000,000 × 0.009 는 26,999.999999999996으로 계산되어 floor가 26,999가 된다.
 *  사업주분은 요율을 더해서 쓰기 때문에 더 심하다: 0.009 + 0.0045 = 0.013499999999999998
 *  → floor 40,499. 정답 40,500. 2026-07-29 티켓 #10에서 이 경로로 전환.)
 * ※ `Math.round`는 방어적 장치다. 현행 4개 요율(0.25/0.45/0.65/0.85%)은 × 10,000 이
 *   전부 오차 없이 정확한 정수라(측정 확인) 반올림이 실제로 하는 일은 없다.
 *   요율이 바뀌어 곱셈에 오차가 생기는 경우를 대비해 남겨 둔다.
 * ⚠️ 0.5bp 단위 요율은 이 방식으로 표현할 수 없고 `Math.round`가 조용히 반올림한다.
 *   이를 잡는 가드 단언이 `scripts/regression/engines.test.ts`에 있다.
 * 요율 갱신 시 위 `EMPLOYMENT_STABILITY_RATE` 한 곳만 고치면 이 맵도 함께 갱신된다
 * (요율 리터럴 이중 관리 금지).
 */
const EMPLOYMENT_STABILITY_BP: Record<BusinessSize, number> = {
  under150: Math.round(EMPLOYMENT_STABILITY_RATE.under150 * 10_000),
  over150Priority: Math.round(EMPLOYMENT_STABILITY_RATE.over150Priority * 10_000),
  from150to1000: Math.round(EMPLOYMENT_STABILITY_RATE.from150to1000 * 10_000),
  over1000: Math.round(EMPLOYMENT_STABILITY_RATE.over1000 * 10_000),
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
  //   ※ 정수 bp 연산(위 상수 주석 참조): 실수 요율로 곱하면 절사가 1원 어긋난다.
  const employmentEmployee = Math.floor((T * EMPLOYMENT_INSURANCE_BP) / 10_000);
  const employmentEmployer = Math.floor(
    (T * (EMPLOYMENT_INSURANCE_BP + EMPLOYMENT_STABILITY_BP[businessSize])) /
      10_000
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
