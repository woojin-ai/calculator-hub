export type DdayType = "today" | "future" | "past";

export interface DdayResult {
  /** "today"(기준일 == 오늘) | "future"(기준일이 미래) | "past"(기준일이 과거) */
  type: DdayType;
  /** 화면 표시용 일수 (항상 0 이상) */
  days: number;
  /** 화면에 표시할 라벨 문자열 (예: "D-Day", "D-132", "D+45") */
  label: string;
  /** 자정(00:00) 기준으로 정규화된 대상 날짜 */
  targetDate: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 기준일(targetDateISO, "YYYY-MM-DD")과 오늘 날짜를 비교해 D-Day를 계산한다.
 *
 * - includeToday(기본값 true, "오늘 포함 여부" ON): 관례적인 D-day 표기 방식으로,
 *   두 날짜의 달력 일수 차이를 그대로 사용한다. 수능처럼 시험 당일을 포함해
 *   D-1로 세는 방식과 일치한다.
 * - includeToday=false("오늘 포함 여부" OFF): 기준일 당일을 카운트에서 제외한다.
 *   방향(미래/과거)에 관계없이 절대 일수에서 1을 뺀 값을 사용한다.
 *
 * 기준일이 오늘과 같으면 옵션과 무관하게 항상 "today" 타입("D-Day")을 반환한다.
 * 입력값이 비어 있거나 올바른 날짜 형식이 아니면 null을 반환한다.
 *
 * 반드시 호출 시점(클라이언트)의 `new Date()`를 referenceDate로 넘겨야 하며,
 * 빌드 시점 날짜를 고정해서 사용하면 안 된다.
 */
export function calculateDday(
  targetDateISO: string,
  referenceDate: Date = new Date(),
  includeToday: boolean = true
): DdayResult | null {
  if (!targetDateISO) return null;

  const target = parseISODate(targetDateISO);
  if (!target) return null;

  const today = stripTime(referenceDate);
  const targetAtMidnight = stripTime(target);

  const diffDays = Math.round(
    (targetAtMidnight.getTime() - today.getTime()) / MS_PER_DAY
  );

  if (diffDays === 0) {
    return {
      type: "today",
      days: 0,
      label: "D-Day",
      targetDate: targetAtMidnight,
    };
  }

  if (diffDays > 0) {
    const days = includeToday ? diffDays : Math.max(diffDays - 1, 0);
    if (days === 0) {
      // "오늘 포함" 옵션을 끈 상태에서 기준일이 내일인 경우: 카운트 대상 일수가
      // 0이 되므로 D-Day로 취급한다.
      return {
        type: "today",
        days: 0,
        label: "D-Day",
        targetDate: targetAtMidnight,
      };
    }
    return {
      type: "future",
      days,
      label: `D-${days}`,
      targetDate: targetAtMidnight,
    };
  }

  const absDiff = Math.abs(diffDays);
  const days = includeToday ? absDiff : Math.max(absDiff - 1, 0);
  return {
    type: "past",
    days,
    label: `D+${days}`,
    targetDate: targetAtMidnight,
  };
}

/** "2026년 11월 12일 (목)" 형태로 날짜를 포맷한다. */
export function formatKoreanDate(date: Date): string {
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
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
