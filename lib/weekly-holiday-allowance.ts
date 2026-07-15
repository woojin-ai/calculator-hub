// =============================================================================
// 주휴수당(법정) 계산 모델
//
// 계산 모델 원천: planning/calculator-lineup-expansion.md §3,
//   planning/weekly-holiday-allowance-design.md §2~3, 마스터 확정 결정(§9 해소).
// - 핵심 공식: 주휴수당 = (min(소정근로시간, 40) ÷ 40) × 8 × 시급.
//   주 40시간 만근 시 8시간분의 유급휴일 수당을, 소정근로시간에 비례해 지급.
// - 지급조건 게이트: 1주 소정근로시간 < 15시간이면 초단시간 근로자로 주휴수당
//   미발생(근로기준법 제18조 제3항). 금액 미산출(eligible:false).
// - 라운딩 정책(퇴직금 lib과 동일 원칙): 내부는 전 정밀도(weeklyRaw 유지),
//   최종 표시값만 Math.round(원단위 반올림). 요율·세율 상수 없는 순수 함수.
// - 방어는 판별 유니온으로 처리(SeveranceOutcome 스타일).
// =============================================================================

/** 주휴수당 발생 최소 1주 소정근로시간 (초단시간 근로자 경계) */
const MIN_WEEKLY_HOURS = 15;
/** 소정근로시간 상한 (주 법정 근로시간) — 초과분은 주휴수당 산정에서 40으로 상한 */
const FULL_WEEK_HOURS = 40;
/** 주 40시간 만근 시 유급휴일(주휴) 시간 */
const HOLIDAY_BASE_HOURS = 8;
/** 월 환산 계수 (한 달 ≈ 4.345주 = 365일 ÷ 12개월 ÷ 7일) */
const MONTH_WEEKS = 4.345;

export interface WeeklyHolidayInput {
  /** 시급 w (세전, 원) */
  hourlyWage: number;
  /** 1주 소정근로시간 h (시간, 소수 허용) */
  weeklyHours: number;
}

/** 입력 정보 (게이트·정상 공통) */
export interface WeeklyHolidayInfo {
  /** 시급 w (원) */
  hourlyWage: number;
  /** 1주 소정근로시간 h (clamp 전 실제 입력값) */
  weeklyHours: number;
}

/** 발생(주 15시간 이상)일 때의 금액 산정 결과 */
export interface WeeklyHolidayAmounts {
  /** 적용 소정근로시간 hc = min(h, 40) */
  appliedHours: number;
  /** 40시간 상한이 적용되었는지 여부 (h > 40) */
  capApplied: boolean;
  /** 주휴 환산 시간 = (hc ÷ 40) × 8 (전 정밀도, 표시는 소수 1자리) */
  holidayConvertedHours: number;
  /** 1주 주휴수당 = round((hc ÷ 40) × 8 × w) */
  weeklyAllowance: number;
  /** 월 예상 주휴수당 = round(weeklyRaw × 4.345) */
  monthlyAllowance: number;
  /** 주휴 포함 실질 시급 = round(w + weeklyRaw ÷ h) (분모는 clamp 안 한 실제 h) */
  effectiveHourlyWage: number;
  /** 주휴 포함 월 예상 급여 = round((h × w + weeklyRaw) × 4.345) */
  monthlyWageWithHoliday: number;
}

export type WeeklyHolidayError = "invalid-wage" | "invalid-hours";

export type WeeklyHolidayOutcome =
  // 주 15시간 이상: 금액 산정
  | { ok: true; eligible: true; info: WeeklyHolidayInfo; amounts: WeeklyHolidayAmounts }
  // 주 15시간 미만: 금액 미산출(게이트), 입력 정보만
  | { ok: true; eligible: false; info: WeeklyHolidayInfo }
  // 입력 오류(방어)
  | { ok: false; error: WeeklyHolidayError };

/**
 * 시급·1주 소정근로시간을 받아 예상 주휴수당(법정)을 계산한다.
 * - h < 15면 초단시간 근로자로 주휴수당 미발생(eligible:false).
 * - 소정근로시간 40시간 초과 시 40으로 상한(capApplied 플래그).
 * - 내부는 전 정밀도(weeklyRaw) 유지, 최종 표시값만 원단위 반올림.
 */
export function calculateWeeklyHolidayAllowance(
  input: WeeklyHolidayInput
): WeeklyHolidayOutcome {
  const { hourlyWage, weeklyHours } = input;

  // 방어: 시급·소정근로시간이 유한한 양수인지 (컴포넌트에서 1차 검증하지만 이중 방어)
  if (!Number.isFinite(hourlyWage) || hourlyWage <= 0) {
    return { ok: false, error: "invalid-wage" };
  }
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0) {
    return { ok: false, error: "invalid-hours" };
  }

  const info: WeeklyHolidayInfo = { hourlyWage, weeklyHours };

  // 게이트: 주 15시간 미만 초단시간 근로자 → 주휴수당 미발생
  if (weeklyHours < MIN_WEEKLY_HOURS) {
    return { ok: true, eligible: false, info };
  }

  // 소정근로시간 40시간 상한
  const appliedHours = Math.min(weeklyHours, FULL_WEEK_HOURS);
  const capApplied = weeklyHours > FULL_WEEK_HOURS;

  // 주휴 환산 시간 = (hc / 40) × 8 (전 정밀도)
  const holidayConvertedHours = (appliedHours / FULL_WEEK_HOURS) * HOLIDAY_BASE_HOURS;

  // 1주 주휴수당(raw) = 주휴 환산 시간 × 시급 (전 정밀도)
  const weeklyRaw = holidayConvertedHours * hourlyWage;

  const amounts: WeeklyHolidayAmounts = {
    appliedHours,
    capApplied,
    holidayConvertedHours,
    weeklyAllowance: Math.round(weeklyRaw),
    monthlyAllowance: Math.round(weeklyRaw * MONTH_WEEKS),
    // 분모는 clamp 안 한 실제 h (초과근로까지 반영한 실질 시급)
    effectiveHourlyWage: Math.round(hourlyWage + weeklyRaw / weeklyHours),
    monthlyWageWithHoliday: Math.round(
      (weeklyHours * hourlyWage + weeklyRaw) * MONTH_WEEKS
    ),
  };

  return { ok: true, eligible: true, info, amounts };
}
