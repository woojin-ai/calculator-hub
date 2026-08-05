// =============================================================================
// 최저임금(최저시급) 단일 소스
//
// 매년 1월 갱신되는 법정 수치. 화면(주휴수당 계산기 등)의 힌트·placeholder·출처
// 병기가 모두 이 상수 1곳만 참조하도록 하고, 하드코딩을 금지한다.
// 연 단위 갱신 키워드라 숫자만 노출하면 오정보 리스크가 있으므로, 값을 쓰는 곳은
// 반드시 MINIMUM_WAGE_YEAR를 함께 병기한다(MINIMUM_WAGE_LABEL이 그 규약의 실행체).
//
// 출처: 고용노동부 2026년 적용 최저임금 고시 (마스터 확인 완료, 2026-07-16).
//
// ── 갱신 범위 (티켓 #40에서 복구) ────────────────────────────────────────────
// 아래 두 상수를 바꾸면 **최저시급 금액과 그 파생금액**은 전부 자동으로 갱신된다:
//   - 최저시급 표기 문자열(금액 단독 / "<연도>년 최저시급 <금액>원")은
//     MINIMUM_WAGE_TEXT / MINIMUM_WAGE_LABEL로만 만든다.
//     (여기에 예시 금액을 리터럴로 적어 두면 교체 회차에 이 주석부터 썩는다.)
//   - 최저시급 기준 주휴수당 파생금액(한 주·월 주휴수당, 실질시급, 주휴 포함 월급여,
//     주휴 환산시간)은 minimumWageHolidayExample()로만 만든다. 이 헬퍼는 라이브 엔진
//     calculateWeeklyHolidayAllowance를 그대로 호출하므로 공식이 두 벌 생기지 않는다.
// 따라서 본문·설명문·조견표에 최저시급 파생 숫자를 리터럴로 다시 적지 말 것.
// (자릿수 치환 함정: 10,320 → 10,700 교체 시 12,384 → 12,840처럼 grep으로도
//  찾아바꾸기로도 안 잡히는 파생값이 생긴다. 그래서 리터럴을 남기면 안 된다.)
//
// 🔴 **"두 상수만 바꾸면 끝"이 아니다.** 아래는 자동으로 안 바뀌므로 교체 회차에
// 반드시 손으로 판단해야 한다 (QA 티켓 #40 지적. 이 목록을 지우지 말 것 —
// 발원지 문서가 갱신 범위를 낙관적으로 적어서 오염이 재생산된 것이 #30·#32였다):
//   (a) **주휴수당 2편**(guide·eligibility)의 title 속 "(2026년)"과 slug 속 "-2026"
//       → 연도 브랜딩·URL이라 **동결이 정답일 수 있다**. 다만 본문 수치가 2027인데
//         제목만 2026이면 SERP 신뢰도가 깎이므로 기획 판단 대상이지 자동화 대상이 아니다.
//       ※ 연도가 박힌 slug·title 자체는 36편 거의 전부에 있다(slug 36 / title 34).
//         여기서 (a)가 가리키는 건 그중 최저시급을 쓰는 2편이다.
//   (b) 블로그 본문의 "2026년 기준" 관용구 **약 40건** → 최저시급 전용 표현이 아니라
//       사이트 공통 연도 표기다(4대보험 요율·이자소득세율·자동차세 차령·전기요금표 등
//       최저시급과 무관한 글이 다수). 그러므로 이 상수에 **전역으로 묶으면 안 된다** —
//       묶으면 #30·#32와 같은 종류의 "가짜 단일 소스"를 새로 만드는 셈이다.
//       예외: **주휴수당 guide편의 2곳**(도입부·면책)은 그 글의 "예시 수치"가 100%
//       최저시급 파생이고 형제편은 이미 라벨을 쓰므로, 그 2곳만 연도를 묶어 두었다.
//       (안 묶으면 교체 후 같은 페이지에서 본문은 2027, 면책은 2026이 된다 — QA 실증)
//   (c) 리터럴 재발 방지를 강제하는 장치(회귀 assertion·lint 규칙)는 **아직 없다.**
//       현재 하드코딩을 막는 건 이 주석뿐이다.
// =============================================================================

import { calculateWeeklyHolidayAllowance } from "./weekly-holiday-allowance";

/** 최저시급 (원). 시간당 최저임금. */
export const MINIMUM_WAGE = 10_320;

/** 위 최저시급의 기준 연도 (표기 시 항상 병기). */
export const MINIMUM_WAGE_YEAR = 2026;

/**
 * 천단위 구분 쉼표 포맷 (순수 함수).
 * toLocaleString은 Node ICU 빌드 설정에 따라 결과가 달라질 수 있어 쓰지 않는다.
 */
export function formatThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 최저시급 숫자 표기(천단위 쉼표). 단위·연도는 붙이지 않은 순수 금액. */
export const MINIMUM_WAGE_TEXT = formatThousands(MINIMUM_WAGE);

/**
 * 최저시급 표준 표기 ("<연도>년 최저시급 <금액>원").
 * 연도 병기 규약의 실행체 — 최저시급을 노출하는 문구는 이 라벨을 쓴다.
 */
export const MINIMUM_WAGE_LABEL = `${MINIMUM_WAGE_YEAR}년 최저시급 ${MINIMUM_WAGE_TEXT}원`;

/** 최저시급 기준 주휴수당 예시값 (전부 포맷된 표기 문자열) */
export interface MinimumWageHolidayExample {
  /** 1주 소정근로시간 (입력값 그대로) */
  weeklyHours: number;
  /** 주휴 환산 시간, 소수 1자리 표기 (예: "4.0") */
  holidayConvertedHours: string;
  /** 한 주 주휴수당, 천단위 쉼표 */
  weeklyAllowance: string;
  /** 월 환산 주휴수당(4.345주), 천단위 쉼표 */
  monthlyAllowance: string;
  /** 주휴 포함 실질시급, 천단위 쉼표 */
  effectiveHourlyWage: string;
  /** 주휴 포함 월 예상급여, 천단위 쉼표 */
  monthlyWageWithHoliday: string;
}

/**
 * 최저시급(MINIMUM_WAGE) 기준 주휴수당 예시값을 만든다.
 *
 * 금액은 손으로 다시 계산하지 않고 라이브 엔진 calculateWeeklyHolidayAllowance를
 * 호출해서 얻는다(두 번째 진실 원천 금지). 설명문·조견표용 표기 문자열 전용이므로
 * 주휴수당이 발생하지 않는 입력(주 15시간 미만 등)은 호출 자체가 잘못된 것이라
 * 예외로 즉시 드러낸다(빌드 시점에 실패).
 */
export function minimumWageHolidayExample(
  weeklyHours: number
): MinimumWageHolidayExample {
  const outcome = calculateWeeklyHolidayAllowance({
    hourlyWage: MINIMUM_WAGE,
    weeklyHours,
  });

  if (!outcome.ok || !outcome.eligible) {
    throw new Error(
      `minimumWageHolidayExample: 주휴수당이 산출되지 않는 입력 (weeklyHours=${weeklyHours})`
    );
  }

  const { amounts } = outcome;

  return {
    weeklyHours,
    holidayConvertedHours: amounts.holidayConvertedHours.toFixed(1),
    weeklyAllowance: formatThousands(amounts.weeklyAllowance),
    monthlyAllowance: formatThousands(amounts.monthlyAllowance),
    effectiveHourlyWage: formatThousands(amounts.effectiveHourlyWage),
    monthlyWageWithHoliday: formatThousands(amounts.monthlyWageWithHoliday),
  };
}
