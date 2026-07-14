// =============================================================================
// 퇴직금(법정) 계산 모델
//
// 계산 모델 원천: planning/severance-pay-calculator-content.md §1-1(STEP 1~7),
//   §1-4 검증 앵커 A~E.
// - 파이프라인: 재직일수(D_work)는 lib/service-period.ts(양 끝 포함 +1)를 재사용해
//   #7 근속연수·근무일수 계산기와 완전히 동일한 값을 쓴다.
// - 라운딩 정책(마스터 확정): 1일 평균임금 A는 내부에서 전 정밀도 유지, 최종
//   퇴직금만 원단위 반올림(Math.round). 표시용 A는 컴포넌트에서 formatWon(반올림).
// - 요율·세율 상수 없음(순수 계산 함수). 방어는 판별 유니온으로 처리.
//
// ※ referenceDate는 반드시 호출 시점(클라이언트)의 new Date()를 주입해야 하며,
//   빌드 시점 날짜를 고정하면 안 된다(service-period와 동일 규칙).
// =============================================================================

import { calculateServicePeriod } from "@/lib/service-period";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 3개월분 반영 비율 (상여·연차수당 ×3/12) */
const THREE_TWELFTHS = 3 / 12;

export interface SeveranceInput {
  /** 입사일 (YYYY-MM-DD) */
  startDateISO: string;
  /** 퇴사일(마지막 근무일, YYYY-MM-DD). 빈 문자열이면 referenceDate(오늘) 사용 */
  endDateISO: string;
  /** 최근 3개월 급여 총액 P (세전, 원) */
  recentPay: number;
  /** 연간 상여금 총액 (원). 내부에서 ×3/12 반영 */
  annualBonus: number;
  /** 연차수당 (원). 내부에서 ×3/12 반영 */
  annualLeavePay: number;
}

/** 재직 기간 정보 (지급대상·1년미만 공통) */
export interface SeveranceServiceInfo {
  /** 재직일수 D_work (양 끝 포함 +1, #7과 동일) */
  totalDays: number;
  /** 근속 N년 */
  years: number;
  /** 근속 M개월 */
  months: number;
  /** 근속 D일 */
  days: number;
  /** 입사일(자정 정규화) */
  startDate: Date;
  /** 마지막 근무일(자정 정규화, 미입력 시 오늘) */
  endDate: Date;
  /** 퇴사일 미입력으로 오늘을 대입했는지 여부 */
  usedToday: boolean;
}

/** 지급대상(1년 이상)일 때의 금액 산정 결과 */
export interface SeveranceAmounts {
  /** 평균임금 산정기간 총일수 N_avg (달력 89~92) */
  avgPeriodDays: number;
  /** 임금총액 W = P + 상여×3/12 + 연차×3/12 */
  wageTotal: number;
  /** 1일 평균임금 A = W ÷ N_avg (전 정밀도, 반올림 없음) */
  dailyAverage: number;
  /** 예상 퇴직금 = round(A × 30 × D_work ÷ 365) (최종만 원단위 반올림) */
  severancePay: number;
}

export type SeveranceError =
  | "invalid-start"
  | "invalid-end"
  | "end-before-start";

export type SeveranceOutcome =
  // 1년 이상: 금액 산정
  | { ok: true; eligible: true; service: SeveranceServiceInfo; amounts: SeveranceAmounts }
  // 1년 미만: 금액 미산출(게이트), 재직 정보만
  | { ok: true; eligible: false; service: SeveranceServiceInfo }
  // 입력 오류(날짜)
  | { ok: false; error: SeveranceError };

/**
 * D_ret에서 3개월 전 같은 날짜를 구한다. 3개월 전 달에 같은 날짜가 없으면(예:
 * D_ret=05-31 → 02-31 없음) 그 달의 말일로 clamp한다.
 *
 * 순진하게 `new Date(y, m-3, d)`를 쓰면 존재하지 않는 날짜가 다음 달로 롤오버되어
 * (예: new Date(2025, 1, 31) → 2025-03-03) N_avg가 틀리므로 반드시 clamp한다.
 */
function subtractThreeMonthsClamped(date: Date): Date {
  const day = date.getDate();
  let targetYear = date.getFullYear();
  let targetMonth = date.getMonth() - 3;
  while (targetMonth < 0) {
    targetMonth += 12;
    targetYear -= 1;
  }
  // 대상 월의 말일 (new Date(y, month+1, 0) = 해당 월의 마지막 날)
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(targetYear, targetMonth, clampedDay);
}

/** 두 자정 기준 날짜 사이의 순수 달력 일수차 */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * 입력을 받아 예상 퇴직금(법정)을 계산한다.
 * - 재직일수·근속(N년 M개월 D일)은 calculateServicePeriod(양 끝 포함 +1)를 재사용.
 * - D_work < 365면 금액 미산출(eligible:false).
 */
export function calculateSeverance(
  input: SeveranceInput,
  referenceDate: Date = new Date()
): SeveranceOutcome {
  const { startDateISO, endDateISO, recentPay, annualBonus, annualLeavePay } =
    input;

  // STEP 1  재직일수 D_work + 근속(N년 M개월 D일) — #7 로직 재사용
  const sp = calculateServicePeriod(startDateISO, endDateISO, referenceDate);
  if (!sp.ok) {
    return { ok: false, error: sp.error };
  }

  const s = sp.value;
  const service: SeveranceServiceInfo = {
    totalDays: s.totalDays,
    years: s.years,
    months: s.months,
    days: s.days,
    startDate: s.startDate,
    endDate: s.endDate,
    usedToday: s.usedToday,
  };

  // STEP 2  1년 미만 게이트
  if (s.totalDays < 365) {
    return { ok: true, eligible: false, service };
  }

  // STEP 3  퇴직일 D_ret = 마지막 근무일 + 1일
  const dRet = new Date(
    s.endDate.getFullYear(),
    s.endDate.getMonth(),
    s.endDate.getDate() + 1
  );

  // STEP 4  평균임금 산정기간 총일수 N_avg = daysBetween(D_ret − 3개월(clamp), D_ret)
  const periodStart = subtractThreeMonthsClamped(dRet);
  const avgPeriodDays = daysBetween(periodStart, dRet);

  // STEP 5  임금총액 W = P + 상여×3/12 + 연차×3/12
  const bonus = Number.isFinite(annualBonus) ? Math.max(0, annualBonus) : 0;
  const leave = Number.isFinite(annualLeavePay)
    ? Math.max(0, annualLeavePay)
    : 0;
  const pay = Number.isFinite(recentPay) ? Math.max(0, recentPay) : 0;
  const wageTotal = pay + bonus * THREE_TWELFTHS + leave * THREE_TWELFTHS;

  // STEP 6  1일 평균임금 A = W ÷ N_avg (전 정밀도 유지)
  const dailyAverage = wageTotal / avgPeriodDays;

  // STEP 7  예상 퇴직금 = round(A × 30 × D_work ÷ 365) (최종만 원단위 반올림)
  const severancePay = Math.round(
    (dailyAverage * 30 * s.totalDays) / 365
  );

  return {
    ok: true,
    eligible: true,
    service,
    amounts: { avgPeriodDays, wageTotal, dailyAverage, severancePay },
  };
}
