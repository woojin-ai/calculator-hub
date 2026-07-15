// =============================================================================
// 연차수당(미사용 연차수당) 계산 모델
//
// 계산 모델 원천: planning/annual-leave-allowance-content.md,
//   planning/annual-leave-allowance-design.md §0, 마스터 확정 결정.
// - 핵심 공식: 연차수당 총액 = 월 통상임금 ÷ 209 × 8 × 미사용 연차일수.
//   먼저 월 통상임금을 209(월 소정근로시간)로 나눠 시간당 통상임금을 구하고,
//   1일 소정근로 8시간을 곱해 1일 통상임금을 낸 뒤 미사용일수를 곱한다.
// - 라운딩 정책(주휴수당·퇴직금 lib과 동일 원칙): 내부는 전 정밀도 유지
//   (hourlyRaw = monthlyWage / 209, dailyRaw = hourlyRaw × 8), 표시용
//   시간당·1일 통상임금만 Math.round(원 단위 반올림)한다. 총액도 표시용
//   반올림 값을 곱하지 않고 dailyRaw × 미사용일수를 한 번에 반올림한다.
//   → 표시용 1일 통상임금을 곱하면 예시(1,148,325원)와 원 단위가 어긋난다.
// - 근속연수(선택)는 발생 연차일수 안내에만 쓰이며 금액 계산과 독립이다.
// - 방어는 판별 유니온으로 처리(주휴수당 Outcome 스타일).
// =============================================================================

/** 월 소정근로시간 나눗수 (주 40시간제: (40+8)×4.345 ≈ 209) */
const HOURS_DIVISOR = 209;
/** 1일 소정근로시간 (주 40시간제 표준) */
const DAILY_WORK_HOURS = 8;

/** 근속 1년 미만 발생 연차 상한 (1개월 개근당 1일) */
const UNDER_ONE_YEAR_MAX_DAYS = 11;
/** 근속 1년 이상 기본 발생 연차일수 */
const BASE_ANNUAL_DAYS = 15;
/** 발생 연차 상한 */
const MAX_ANNUAL_DAYS = 25;
/** 가산 주기 (n년차부터 매 2년마다 1일 가산) */
const ACCRUAL_ADD_PERIOD = 2;

export interface AnnualLeaveInput {
  /** 월 통상임금 (세전, 원) */
  monthlyWage: number;
  /** 미사용 연차일수 (일, 소수 허용 = 반차 0.5) */
  unusedDays: number;
  /** 근속연수 (년, 소수 허용) — 선택. undefined면 발생 연차 안내 생략 */
  serviceYears?: number;
}

/** 입력 정보 (정상·0원 공통) */
export interface AnnualLeaveInfo {
  /** 월 통상임금 (원) */
  monthlyWage: number;
  /** 미사용 연차일수 (일) */
  unusedDays: number;
}

/** 금액 산정 결과 (전부 표시용 원 단위 반올림값) */
export interface AnnualLeaveAmounts {
  /** 시간당 통상임금 = round(월통상임금 ÷ 209) */
  hourlyOrdinaryWage: number;
  /** 1일 통상임금 = round(월통상임금 ÷ 209 × 8) */
  dailyOrdinaryWage: number;
  /** 연차수당 총액 = round(월통상임금 ÷ 209 × 8 × 미사용일수) — 전 정밀도에서 1회 반올림 */
  allowance: number;
}

/** 근속연수 기반 발생 연차일수 안내 (선택 입력 시에만) */
export interface AnnualLeaveAccrual {
  /** 입력한 근속연수 (년) */
  serviceYears: number;
  /** 그 해 발생하는 연차일수 (법정 최소 기준) */
  accruedDays: number;
  /** 근속 1년 미만 여부 (설명 문구 분기용) */
  underOneYear: boolean;
}

export type AnnualLeaveError =
  | "invalid-wage"
  | "invalid-unused-days"
  | "invalid-service-years";

export type AnnualLeaveOutcome =
  // 미사용일수 > 0: 정상 금액 산정
  | {
      ok: true;
      kind: "paid";
      info: AnnualLeaveInfo;
      amounts: AnnualLeaveAmounts;
      accrual?: AnnualLeaveAccrual;
    }
  // 미사용일수 = 0: 총액 0원(에러/게이트 아님, 중립 안내)
  | {
      ok: true;
      kind: "zero";
      info: AnnualLeaveInfo;
      amounts: AnnualLeaveAmounts;
      accrual?: AnnualLeaveAccrual;
    }
  // 입력 오류(방어)
  | { ok: false; error: AnnualLeaveError };

/**
 * 근속연수(년)에 따른 그 해 발생 연차일수(법정 최소 기준).
 * - 1년 미만: 1개월 개근당 1일, 최대 11일 → min(floor(년 × 12), 11)
 * - 1년 이상: 15 + floor((floor(년) − 1) ÷ 2), 최대 25일
 *   (검산: 3년→16, 5년→17, 21년→25)
 */
export function computeAccruedLeaveDays(serviceYears: number): {
  accruedDays: number;
  underOneYear: boolean;
} {
  if (serviceYears < 1) {
    const months = Math.floor(serviceYears * 12);
    return {
      accruedDays: Math.min(months, UNDER_ONE_YEAR_MAX_DAYS),
      underOneYear: true,
    };
  }
  const wholeYears = Math.floor(serviceYears);
  const accruedDays = Math.min(
    BASE_ANNUAL_DAYS + Math.floor((wholeYears - 1) / ACCRUAL_ADD_PERIOD),
    MAX_ANNUAL_DAYS
  );
  return { accruedDays, underOneYear: false };
}

/**
 * 월 통상임금·미사용 연차일수(·선택 근속연수)로 미사용 연차수당을 계산한다.
 * - 내부는 전 정밀도(hourlyRaw, dailyRaw) 유지, 표시값만 원 단위 반올림.
 * - 총액은 dailyRaw × 미사용일수를 한 번에 반올림(표시용 값 곱하지 않음).
 * - 근속연수는 발생 연차 안내에만 쓰이고 금액 계산과 독립.
 */
export function calculateAnnualLeaveAllowance(
  input: AnnualLeaveInput
): AnnualLeaveOutcome {
  const { monthlyWage, unusedDays, serviceYears } = input;

  // 방어(컴포넌트에서 1차 검증하지만 이중 방어)
  if (!Number.isFinite(monthlyWage) || monthlyWage <= 0) {
    return { ok: false, error: "invalid-wage" };
  }
  if (!Number.isFinite(unusedDays) || unusedDays < 0) {
    return { ok: false, error: "invalid-unused-days" };
  }
  if (
    serviceYears !== undefined &&
    (!Number.isFinite(serviceYears) || serviceYears < 0)
  ) {
    return { ok: false, error: "invalid-service-years" };
  }

  const info: AnnualLeaveInfo = { monthlyWage, unusedDays };

  // 전 정밀도 통상임금 (표시값만 반올림)
  const hourlyRaw = monthlyWage / HOURS_DIVISOR;
  const dailyRaw = hourlyRaw * DAILY_WORK_HOURS;

  const amounts: AnnualLeaveAmounts = {
    hourlyOrdinaryWage: Math.round(hourlyRaw),
    dailyOrdinaryWage: Math.round(dailyRaw),
    // 표시용 1일 통상임금이 아니라 전 정밀도 dailyRaw × 미사용일수를 1회 반올림
    allowance: Math.round(dailyRaw * unusedDays),
  };

  const accrual: AnnualLeaveAccrual | undefined =
    serviceYears === undefined
      ? undefined
      : {
          serviceYears,
          ...computeAccruedLeaveDays(serviceYears),
        };

  return {
    ok: true,
    kind: unusedDays > 0 ? "paid" : "zero",
    info,
    amounts,
    accrual,
  };
}
