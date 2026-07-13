// =============================================================================
// 연봉 실수령액 계산 모델 (2026년 기준)
//
// 계산 모델 원천: planning/salary-net-calculator-content.md §1-1~§1-3
// - 파이프라인 순서 필수: 4대보험(③)을 먼저 계산 → 그 연액을 근로소득세(④)의
//   소득공제(연금보험료공제·특별소득공제)로 투입한다. 순서 역전 시 세액 오류.
// - 라운딩 정책(마스터 확정): 절사(버림). 각 보험료·세액은 원 단위 절사.
//   국민연금 기준소득월액 = clamp(floor_to_1000(T), 하한, 상한).
// - 근로소득세 = 국세청 간이세액표 근사 공식(Option B). 실제 원천징수액과 다를 수 있음.
//
// ※ 요율·세율은 매년 갱신 대비를 위해 아래 상수 블록으로 분리했다.
//   갱신 주체·주기는 운영(연 1회 요율 점검) 사안(planning §7-4).
// =============================================================================

// -----------------------------------------------------------------------------
// 2026년 요율·세율 상수 (근로자 부담분) — 갱신 시 이 블록만 수정
// -----------------------------------------------------------------------------

/** 국민연금 근로자 요율 4.75% (2026: 연금보험료율 9.0%→9.5%, 근로자 절반). 출처: 국민연금공단 */
export const NATIONAL_PENSION_RATE = 0.0475;
/** 국민연금 기준소득월액 하한 (2026.7~2027.6 적용). 출처: 국민연금공단 */
export const NATIONAL_PENSION_BASE_MIN = 410_000;
/** 국민연금 기준소득월액 상한 (2026.7~2027.6 적용). 출처: 국민연금공단 */
export const NATIONAL_PENSION_BASE_MAX = 6_590_000;

/** 건강보험 근로자 요율 3.595% (2026: 직장 7.09%→7.19%, 근로자 절반). 출처: 국민건강보험공단 */
export const HEALTH_INSURANCE_RATE = 0.03595;

/**
 * 장기요양보험 = 건강보험료(근로자분) × 12.9457%
 * (2026 장기요양요율 0.9448% ÷ 건강보험료율 7.19% = 0.129457). 출처: 보건복지부
 */
export const LONG_TERM_CARE_MULTIPLIER = 0.129457;

/** 고용보험(실업급여) 근로자 요율 0.9% (실업급여분 총 1.8%, 근로자 절반). 출처: 고용노동부 */
export const EMPLOYMENT_INSURANCE_RATE = 0.009;

/** 지방소득세 = 근로소득세 × 10% */
export const LOCAL_INCOME_TAX_RATE = 0.1;

/** 인적공제(1명당, 연). 부양가족 수 × 이 값 */
const PERSONAL_DEDUCTION_PER_HEAD = 1_500_000;

/** 근로소득공제 한도(연) */
const EARNED_INCOME_DEDUCTION_CAP = 20_000_000;

/**
 * 근로소득공제 구간표 (STEP 2, 2026년 기준).
 * 각 구간: 총급여 G의 상한(upTo), 누적 기본공제(base), 초과분 요율(rate),
 * 그리고 구간 시작 기준점(from).
 */
const EARNED_INCOME_DEDUCTION_BRACKETS: {
  from: number;
  upTo: number;
  base: number;
  rate: number;
}[] = [
  { from: 0, upTo: 5_000_000, base: 0, rate: 0.7 },
  { from: 5_000_000, upTo: 15_000_000, base: 3_500_000, rate: 0.4 },
  { from: 15_000_000, upTo: 45_000_000, base: 7_500_000, rate: 0.15 },
  { from: 45_000_000, upTo: 100_000_000, base: 12_000_000, rate: 0.05 },
  { from: 100_000_000, upTo: Infinity, base: 14_750_000, rate: 0.02 },
];

/**
 * 종합소득세율 8구간 (STEP 6, 산출세액). 2023 개정, 2026 유지 가정.
 * 각 구간: 과세표준 상한(upTo), 누진공제 방식 base + (TB - from) × rate.
 */
const INCOME_TAX_BRACKETS: {
  from: number;
  upTo: number;
  base: number;
  rate: number;
}[] = [
  { from: 0, upTo: 14_000_000, base: 0, rate: 0.06 },
  { from: 14_000_000, upTo: 50_000_000, base: 840_000, rate: 0.15 },
  { from: 50_000_000, upTo: 88_000_000, base: 6_240_000, rate: 0.24 },
  { from: 88_000_000, upTo: 150_000_000, base: 15_360_000, rate: 0.35 },
  { from: 150_000_000, upTo: 300_000_000, base: 37_060_000, rate: 0.38 },
  { from: 300_000_000, upTo: 500_000_000, base: 94_060_000, rate: 0.4 },
  { from: 500_000_000, upTo: 1_000_000_000, base: 174_060_000, rate: 0.42 },
  { from: 1_000_000_000, upTo: Infinity, base: 384_060_000, rate: 0.45 },
];

// -----------------------------------------------------------------------------
// 타입
// -----------------------------------------------------------------------------

export interface SalaryInput {
  /** 세전 연봉 (원) */
  annualSalary: number;
  /** 월 비과세액 (원) */
  taxFreeMonthly: number;
  /** 부양가족 수(본인 포함), 최소 1 */
  dependents: number;
  /** 8~20세 자녀 수, 0 이상 */
  children: number;
}

export interface SalaryResult {
  /** ① 월 급여총액 (연봉 ÷ 12, 원 단위 절사) */
  monthlyGross: number;
  /** ② 월 과세대상급여 T (월 급여총액 − 월 비과세액) */
  monthlyTaxable: number;
  /** 적용된 월 비과세액 */
  taxFreeMonthly: number;
  /** 국민연금(근로자, 월) */
  nationalPension: number;
  /** 건강보험(근로자, 월) */
  healthInsurance: number;
  /** 장기요양보험(근로자, 월) */
  longTermCare: number;
  /** 고용보험(근로자, 월) */
  employmentInsurance: number;
  /** 4대보험 합계(월) */
  insuranceTotal: number;
  /** 근로소득세(월) */
  incomeTax: number;
  /** 지방소득세(월) */
  localIncomeTax: number;
  /** 세금 합계(월) = 근로소득세 + 지방소득세 */
  taxTotal: number;
  /** ⑥ 월 실수령액 */
  monthlyNet: number;
  /** ⑦ 연 환산 실수령액 (월 실수령 × 12) */
  annualNet: number;
}

// -----------------------------------------------------------------------------
// 유틸
// -----------------------------------------------------------------------------

/** 천원 단위 절사 (국민연금 기준소득월액 계산용) */
function floorTo1000(value: number): number {
  return Math.floor(value / 1000) * 1000;
}

/** 구간표에서 누진 방식으로 값 산출: base + (x − from) × rate */
function applyBrackets(
  x: number,
  brackets: { from: number; upTo: number; base: number; rate: number }[]
): number {
  for (const b of brackets) {
    if (x <= b.upTo) {
      return b.base + (x - b.from) * b.rate;
    }
  }
  // 도달 불가(마지막 구간 upTo = Infinity)
  const last = brackets[brackets.length - 1];
  return last.base + (x - last.from) * last.rate;
}

// -----------------------------------------------------------------------------
// 근로소득세(간이세액표 근사 공식, planning §1-3 STEP 1~11)
// -----------------------------------------------------------------------------

/**
 * 근로소득세(월)·지방소득세(월)를 근사 공식으로 산출한다.
 * @param annualTaxable 연 과세대상급여 G (= 연봉 − 월비과세×12, 0 이상)
 * @param dependents 부양가족 수 n (본인 포함)
 * @param children 8~20세 자녀 수 c
 * @param annualInsurance 4대보험 근로자부담 연액(연금·건강·장기요양·고용 합계)
 * @param annualPension 국민연금 근로자부담 연액(연금보험료공제용)
 */
function calculateIncomeTax(
  annualTaxable: number,
  dependents: number,
  children: number,
  annualInsurance: number,
  annualPension: number
): { incomeTax: number; localIncomeTax: number } {
  const G = annualTaxable;

  // STEP 2  근로소득공제 LD (한도 20,000,000)
  const LD = Math.min(
    applyBrackets(G, EARNED_INCOME_DEDUCTION_BRACKETS),
    EARNED_INCOME_DEDUCTION_CAP
  );

  // STEP 3  근로소득금액 EI
  const EI = G - LD;

  // STEP 4  종합소득공제 DED = 인적공제 + 연금보험료공제 + 특별소득공제
  const personalDeduction = PERSONAL_DEDUCTION_PER_HEAD * dependents;
  const pensionDeduction = annualPension; // 국민연금 근로자부담 연액
  const specialDeduction = annualInsurance - annualPension; // 건강·장기요양·고용 연액(전액공제)
  const DED = personalDeduction + pensionDeduction + specialDeduction;

  // STEP 5  과세표준 TB
  const TB = Math.max(0, EI - DED);

  // STEP 6  산출세액 CT
  const CT = applyBrackets(TB, INCOME_TAX_BRACKETS);

  // STEP 7  근로소득세액공제 WTC = min(공제액, 한도)
  const creditAmount =
    CT <= 1_300_000 ? CT * 0.55 : 715_000 + (CT - 1_300_000) * 0.3;
  let creditCap: number;
  if (G <= 33_000_000) {
    creditCap = 740_000;
  } else if (G <= 70_000_000) {
    creditCap = Math.max(660_000, 740_000 - (G - 33_000_000) * 0.008);
  } else {
    creditCap = Math.max(500_000, 660_000 - (G - 70_000_000) * 0.5);
  }
  const WTC = Math.min(creditAmount, creditCap);

  // STEP 8  자녀세액공제 CTC (연)
  let CTC: number;
  if (children <= 0) {
    CTC = 0;
  } else if (children === 1) {
    CTC = 250_000;
  } else if (children === 2) {
    CTC = 550_000;
  } else {
    CTC = 550_000 + (children - 2) * 400_000;
  }

  // STEP 9  결정세액(연) DT
  const DT = Math.max(0, CT - WTC - CTC);

  // STEP 10  근로소득세(월) — 절사
  const incomeTax = Math.floor(DT / 12);
  // STEP 11  지방소득세(월) — 절사
  const localIncomeTax = Math.floor(incomeTax * LOCAL_INCOME_TAX_RATE);

  return { incomeTax, localIncomeTax };
}

// -----------------------------------------------------------------------------
// 메인 계산 (파이프라인 planning §1-1)
// -----------------------------------------------------------------------------

/**
 * 연봉·비과세·부양가족·자녀를 받아 4대보험·세금·실수령액을 계산한다.
 * 입력이 유효하지 않으면(연봉 0 이하, 부양가족 1 미만 등) null 반환.
 */
export function calculateSalary(input: SalaryInput): SalaryResult | null {
  const { annualSalary, taxFreeMonthly, dependents, children } = input;

  if (
    !Number.isFinite(annualSalary) ||
    !Number.isFinite(taxFreeMonthly) ||
    !Number.isFinite(dependents) ||
    !Number.isFinite(children) ||
    annualSalary <= 0 ||
    taxFreeMonthly < 0 ||
    dependents < 1 ||
    children < 0
  ) {
    return null;
  }

  // ① 월 급여총액 (원 단위 절사) — 표시·검산·순증 일관성을 위해 정수 사용
  const monthlyGross = Math.floor(annualSalary / 12);

  // ② 월 과세대상급여 T (음수 방지)
  const monthlyTaxable = Math.max(0, monthlyGross - taxFreeMonthly);

  // ③ 4대보험(근로자 부담, 원 단위 절사)
  // 국민연금 기준소득월액 = clamp(floor_to_1000(T), 하한, 상한)
  const pensionBase = Math.min(
    Math.max(floorTo1000(monthlyTaxable), NATIONAL_PENSION_BASE_MIN),
    NATIONAL_PENSION_BASE_MAX
  );
  const nationalPension = Math.floor(pensionBase * NATIONAL_PENSION_RATE);
  const healthInsurance = Math.floor(monthlyTaxable * HEALTH_INSURANCE_RATE);
  const longTermCare = Math.floor(healthInsurance * LONG_TERM_CARE_MULTIPLIER);
  const employmentInsurance = Math.floor(
    monthlyTaxable * EMPLOYMENT_INSURANCE_RATE
  );
  const insuranceTotal =
    nationalPension + healthInsurance + longTermCare + employmentInsurance;

  // ④ 근로소득세(간이 근사) — ③의 4대보험 연액을 소득공제로 투입
  const annualTaxable = Math.max(0, annualSalary - taxFreeMonthly * 12);
  const annualInsurance = insuranceTotal * 12;
  const annualPension = nationalPension * 12;
  const { incomeTax, localIncomeTax } = calculateIncomeTax(
    annualTaxable,
    dependents,
    children,
    annualInsurance,
    annualPension
  );
  const taxTotal = incomeTax + localIncomeTax;

  // ⑥ 월 실수령액 (세전 − 4대보험 − 세금; 정수 검산 성립)
  const monthlyNet = monthlyGross - insuranceTotal - taxTotal;
  // ⑦ 연 환산 실수령액
  const annualNet = monthlyNet * 12;

  return {
    monthlyGross,
    monthlyTaxable,
    taxFreeMonthly,
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    insuranceTotal,
    incomeTax,
    localIncomeTax,
    taxTotal,
    monthlyNet,
    annualNet,
  };
}
