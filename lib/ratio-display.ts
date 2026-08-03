// =============================================================================
// 파생 비율(%) 표시 헬퍼 — 순수 모듈 (클라이언트 컴포넌트 아님)
//
// 표준: planning/ratio-percent-display-rules.md
//   §2-2 정수 처리(반올림 후 정수면 소수점 생략)
//   §2-3 표시용 반올림값을 등식에 쓰지 않는다 + **부가 규칙: 등호 방향**
//
// 왜 lib인가: 이 헬퍼들은 원래 `"use client"` 컴포넌트 안에 있었고, 회귀 스위트
//   (scripts/regression/engines.test.ts)가 테스트를 위해 클라이언트 컴포넌트를
//   직접 import해야 했다(QA 이월 권고). 표시 로직은 React에 의존하지 않는
//   순수 함수이므로 lib으로 내려서 컴포넌트 import 의존을 끊는다.
//   (티켓 #22 / 표준 Batch 3 #18 처리 시 정리)
// =============================================================================

import { formatWon } from "./loan";

/**
 * 표시용 백분율(소수 1자리 반올림)이 **정확값과 일치하는지** 판정한다.
 * 즉 `numerator / denominator * 100`이 소수 1자리로 딱 떨어지는가.
 *
 * ★ 정수 산술로만 판정한다(부동소수 비교 금지). `x * 100`·`x * 1000`은 이진부동소수라
 *   정확값인 조합도 마지막 자리가 흔들려서, 실수 비교(`Number.isInteger(pct * 10)`)로는
 *   **정확값을 근사(≈)로 오판**한다. 실측 반증 사례:
 *     - 중도상환(개월 인자, D_m ≤ 36 전 조합 실측): 11/20 · 7/25 · 14/25
 *       (11 ÷ 20 → ratio*100 = 55.00000000000001)
 *     - DSR(금액 인자) 대표 사례: `3,330,000 ÷ 10,000,000`은 정확히 33.3%인데
 *       dsr*10 = 333.00000000000006이라 근사로 뒤집힌다.
 *   ★ 오판 **건수**는 스윕 범위에 종속적이라(범위를 안 적은 절대 건수는 재현 불가)
 *     여기 적지 않는다. 범위와 무관하게 성립하는 건 **방향**이다:
 *     실수 비교의 오판은 언제나 `truth=true → false`, 즉 **정확값에 `≈`를 붙이는**
 *     쪽으로만 틀린다. 거짓 `=`를 만드는 방향의 오판은 관측된 적이 없다
 *     (08-04 QA 독립 재검산 3,042,499 조합 — BigInt 진리값 대조, 불일치 0·거짓 `=` 0).
 *   분자·분모가 둘 다 정수라면(엔진 계약) "N/D×100이 소수 1자리로 딱 떨어짐
 *   ⇔ N × 1000 % D === 0"으로 무오차 판정할 수 있다.
 *
 * ★ `Number.isSafeInteger` 가드: 개월 인자(≤ 수백)에는 무영향이지만, DSR은 **금액**이
 *   인자로 들어오고 입력에 상한(maxLength)이 없어 `numerator * 1000`이 2^53을 넘을 수
 *   있다. 그 구간에서는 `%` 결과를 믿을 수 없으므로 **판정 불가 → 보수적으로 false**
 *   (= `≈`로 떨어뜨린다). 거짓 `=`를 만들지 않는 방향이다.
 *
 * @param numerator 분자(정수 가정: 개월 수 또는 원 단위 정수 금액)
 * @param denominator 분모(정수 가정, 양수)
 */
export function isRatioExactAt1Decimal(
  numerator: number,
  denominator: number
): boolean {
  return (
    denominator > 0 &&
    Number.isSafeInteger(numerator * 1000) &&
    (numerator * 1000) % denominator === 0
  );
}

/**
 * DSR(%) 표기: 소수 1자리 반올림, 정수면 소수점 생략("30.4", "40").
 *
 * **표시 전용 — 이 값을 계산 등식의 항으로 쓰지 마라(표준 §2-3).**
 * (등식이 필요하면 분수형을 쓰고, 우변에 올 때는 `formatDsrFormulaLine`처럼
 *  `=`/`≈`를 분기한다. 이 방어선을 어긴 실사고가 티켓 #19다.)
 */
export function formatDsr(dsr: number): string {
  const rounded = Math.round(dsr * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * DSR Tier② '계산식' 근거행 문자열: `18,240,672 ÷ 60,000,000 ≈ 30.4 %`.
 *
 * ★ 티켓 #22 / 표준 Batch 3 표 #18행 (표준 §2-3 L139-142 '등호 방향'):
 *   우변의 백분율은 표시용 반올림값이라 `=`로 쓰면 엄밀히 거짓이다
 *   (18,240,672 ÷ 60,000,000 = 30.4011…%). 그래서 기본은 `≈`이고,
 *   **정확히 나누어떨어지는 경우(19,200,000 ÷ 50,000,000 = 38.4%)만 `=`** 를 쓴다.
 *   "무조건 ≈ 치환"이 아니라 조건부 분기다.
 *   모범형: lib/calculators.ts L448 `24÷36 ≈ 66.7%`.
 *
 * ※ 좌변 두 항은 근사가 아니다. `totalYear`(= 정수 monthlyPayment × 12 + 정수 입력)와
 *   `income`(콤마 제거 후 숫자만 남긴 입력)은 둘 다 정수이고 `formatWon`이
 *   Math.round 후 표기하므로 표시가 정확하다. 근사 대상은 우변뿐이다.
 */
export function formatDsrFormulaLine(
  totalYear: number,
  income: number,
  dsr: number
): string {
  const sign = isRatioExactAt1Decimal(totalYear, income) ? "=" : "≈";
  return `${formatWon(totalYear)} ÷ ${formatWon(income)} ${sign} ${formatDsr(dsr)} %`;
}
