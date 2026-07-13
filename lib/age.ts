export interface ManAgeResult {
  /** 만 나이 (International age) */
  manAge: number;
  /** 연 나이 (기준 연도 - 출생 연도, 생일 무관) */
  yearAge: number;
  /** 다음 생일까지 남은 일수 (오늘이 생일이면 0) */
  daysToNextBirthday: number;
}

/**
 * 생년월일(YYYY-MM-DD)과 기준일을 받아 만 나이를 계산한다.
 * 입력값이 올바르지 않거나(파싱 실패) 출생일이 기준일보다 미래인 경우 null을 반환한다.
 */
export function calculateManAge(
  birthDateISO: string,
  referenceDate: Date = new Date()
): ManAgeResult | null {
  if (!birthDateISO) return null;

  const birth = parseISODate(birthDateISO);
  if (!birth) return null;

  const reference = stripTime(referenceDate);
  const birthAtMidnight = stripTime(birth);

  if (birthAtMidnight.getTime() > reference.getTime()) {
    // 출생일이 미래인 경우 계산 불가
    return null;
  }

  let manAge = reference.getFullYear() - birthAtMidnight.getFullYear();
  const hasHadBirthdayThisYear =
    reference.getMonth() > birthAtMidnight.getMonth() ||
    (reference.getMonth() === birthAtMidnight.getMonth() &&
      reference.getDate() >= birthAtMidnight.getDate());

  if (!hasHadBirthdayThisYear) {
    manAge -= 1;
  }

  const yearAge = reference.getFullYear() - birthAtMidnight.getFullYear();

  const nextBirthday = getNextBirthday(birthAtMidnight, reference);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysToNextBirthday = Math.round(
    (nextBirthday.getTime() - reference.getTime()) / msPerDay
  );

  return { manAge, yearAge, daysToNextBirthday };
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

function getNextBirthday(birth: Date, reference: Date): Date {
  // 윤년 2월 29일 출생자의 평년 기준 생일은 2월 28일로 처리한다.
  const candidateThisYear = safeDateForYear(
    reference.getFullYear(),
    birth.getMonth(),
    birth.getDate()
  );

  if (candidateThisYear.getTime() >= reference.getTime()) {
    return candidateThisYear;
  }
  return safeDateForYear(reference.getFullYear() + 1, birth.getMonth(), birth.getDate());
}

function safeDateForYear(year: number, month: number, day: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, daysInMonth);
  return new Date(year, month, safeDay);
}
