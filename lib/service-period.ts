export interface ServicePeriodResult {
  /** 총 재직일수 (양 끝 포함, +1) */
  totalDays: number;
  /** 근속기간 N년 */
  years: number;
  /** 근속기간 M개월 */
  months: number;
  /** 근속기간 D일 */
  days: number;
  /** 소수 근속연수 (재직일수 ÷ 365, 소수 첫째 자리 반올림) */
  decimalYears: number;
  /** 자정(00:00) 기준으로 정규화된 입사일 */
  startDate: Date;
  /** 자정(00:00) 기준으로 정규화된 종료일 (미입력 시 오늘) */
  endDate: Date;
  /** 종료일 미입력으로 오늘을 대입했는지 여부 */
  usedToday: boolean;
}

export type ServicePeriodError =
  | "invalid-start"
  | "invalid-end"
  | "end-before-start";

export type ServicePeriodOutcome =
  | { ok: true; value: ServicePeriodResult }
  | { ok: false; error: ServicePeriodError };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 입사일·종료일(YYYY-MM-DD)을 받아 재직일수·근속기간을 계산한다.
 *
 * - 재직일수는 입사일과 종료일을 모두 포함(양 끝 포함, +1)해 센다. 내부적으로
 *   종료일⁺ = 종료일 + 1일로 변환한 뒤 date-diff를 적용해, 재직일수와
 *   근속기간(N년 M개월 D일)이 하나의 기준에서 파생되도록 한다.
 * - 종료일(endDateISO)이 빈 문자열이면 referenceDate(오늘)를 종료일로 사용한다.
 * - 검증: 입사일 파싱 실패(invalid-start), 종료일 파싱 실패(invalid-end),
 *   종료일 < 입사일(end-before-start)인 경우 ok:false를 반환한다.
 *   미래 종료일(퇴사 예정일)은 허용한다.
 *
 * 반드시 호출 시점(클라이언트)의 `new Date()`를 referenceDate로 넘겨야 하며,
 * 빌드 시점 날짜를 고정해서 사용하면 안 된다.
 */
export function calculateServicePeriod(
  startDateISO: string,
  endDateISO: string,
  referenceDate: Date = new Date()
): ServicePeriodOutcome {
  const start = parseISODate(startDateISO);
  if (!start) return { ok: false, error: "invalid-start" };

  let end: Date;
  let usedToday: boolean;
  if (!endDateISO) {
    end = stripTime(referenceDate);
    usedToday = true;
  } else {
    const parsedEnd = parseISODate(endDateISO);
    if (!parsedEnd) return { ok: false, error: "invalid-end" };
    end = stripTime(parsedEnd);
    usedToday = false;
  }

  const startAtMidnight = stripTime(start);

  if (end.getTime() < startAtMidnight.getTime()) {
    return { ok: false, error: "end-before-start" };
  }

  // 종료일⁺ = 종료일 + 1일 (양 끝 포함을 위한 내부 기준)
  const endPlus = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() + 1
  );

  // (a) 재직일수 = daysBetween(입사일, 종료일⁺) = (종료일 − 입사일).days + 1
  const totalDays = Math.round(
    (endPlus.getTime() - startAtMidnight.getTime()) / MS_PER_DAY
  );

  // (b) 근속기간 N년 M개월 D일 (입사일 → 종료일⁺ 캘린더 분해)
  let years = endPlus.getFullYear() - startAtMidnight.getFullYear();
  let months = endPlus.getMonth() - startAtMidnight.getMonth();
  let days = endPlus.getDate() - startAtMidnight.getDate();

  if (days < 0) {
    // 종료일⁺ 직전 달의 실제 일수를 빌린다 (윤년 자동 반영, 하드코딩 없음).
    const daysInPrevMonth = new Date(
      endPlus.getFullYear(),
      endPlus.getMonth(),
      0
    ).getDate();
    days += daysInPrevMonth;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  // (c) 소수 근속연수 = 재직일수 ÷ 365, 소수 첫째 자리 반올림
  const decimalYears = Math.round((totalDays / 365) * 10) / 10;

  return {
    ok: true,
    value: {
      totalDays,
      years,
      months,
      days,
      decimalYears,
      startDate: startAtMidnight,
      endDate: end,
      usedToday,
    },
  };
}

/** "2025년 8월 15일" 형태로 날짜를 포맷한다 (요일 없음, 요약·caption용). */
export function formatKoreanDatePlain(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null; // 존재하지 않는 날짜 (예: 2월 30일)
  }
  return date;
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
