// =============================================================================
// 계산기 엔진 회귀 테스트 스위트 (제로 의존성 · npx tsx 실행)
//
// 목적: lib/*.ts 순수 계산 엔진들의 숫자 정확성을 QA가 이미 검증한 앵커값으로
//       잠근다. 리팩터(예: floorTo1000 export 전환, inputClass 통합)로 엔진 출력이
//       바뀌면 이 테스트가 즉시 잡는다.
//
// 실행:  npx tsx scripts/regression/engines.test.ts   (Node 24, 프레임워크 없음)
// 단언:  node:assert/strict. 실패 시 명확한 메시지 + process.exit(1).
//
// 앵커 출처(지어내지 않음):
//   - planning/<계산기>-content.md 각 §1-3/§1-4 검증 앵커(QA·마스터 손계산).
//   - lib/calculators.ts interpretation(QA가 "콘텐츠 수치 = 엔진 출력"으로 검증한 값).
//   문서 예시와 엔진 실측이 어긋나는 경우 "엔진 출력을 정답"으로 잠그고, 각 케이스
//   주석에 불일치를 명시했다(마스터 문서 정정 핑퐁용). import는 모두 상대 경로.
// =============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  calculateSalary,
  EMPLOYMENT_INSURANCE_RATE,
  LONG_TERM_CARE_RATE_PPM,
  HEALTH_INSURANCE_TOTAL_RATE_PPM,
  LONG_TERM_CARE_MULTIPLIER,
} from "../../lib/salary";
import {
  calculateFourInsurance,
  EMPLOYMENT_STABILITY_RATE,
  type BusinessSize,
} from "../../lib/four-insurance";
import { calculateLoan } from "../../lib/loan";
import { calculateLoanPrepayment } from "../../lib/loan-prepayment";
import { calculateBmi } from "../../lib/bmi";
import { calculateManAge } from "../../lib/age";
import { calculateDday } from "../../lib/dday";
import { calculateServicePeriod } from "../../lib/service-period";
import { calculateSeverance } from "../../lib/severance";
import { calculateElectricity } from "../../lib/electricity";
import { convert } from "../../lib/units";
import { calculateSavingsInterest } from "../../lib/savings-interest";
import { calculateCarTax } from "../../lib/car-tax";
import {
  calculateAnnualLeaveAllowance,
  computeAccruedLeaveDays,
} from "../../lib/annual-leave-allowance";
import { calculateWeeklyHolidayAllowance } from "../../lib/weekly-holiday-allowance";
// 표시 문자열 회귀(티켓 #19·#22) — 엔진이 아니라 '렌더되는 문자열'을 잠근다.
import {
  formatPrepaymentFormulaLine,
  formatRatio,
  formatRemainingRatioLine,
} from "../../components/LoanPrepaymentFeeCalculator";
// 표시 헬퍼(순수 모듈) — 클라이언트 컴포넌트를 import하지 않는 쪽이 정본이다.
//   (QA 이월 권고 → 티켓 #22 Batch3 #18에서 lib/ratio-display.ts 신설)
import {
  formatDsr,
  formatDsrFormulaLine,
  isRatioExactAt1Decimal,
} from "../../lib/ratio-display";
// 최저시급 단일 소스(티켓 #40) — 금지 토큰을 하드코딩하지 않고 여기서 파생시킨다.
import {
  MINIMUM_WAGE,
  MINIMUM_WAGE_TEXT,
  formatThousands,
  minimumWageHolidayExample,
} from "../../lib/minimum-wage";

// -----------------------------------------------------------------------------
// 미니 테스트 하네스 (프레임워크 없이 per-engine PASS 라인 + 총계)
// -----------------------------------------------------------------------------

let totalCases = 0;
let failedSuites = 0;

interface T {
  eq(actual: unknown, expected: unknown, msg: string): void;
  ok(cond: unknown, msg: string): void;
  approx(actual: number, expected: number, eps: number, msg: string): void;
}

function suite(name: string, fn: (t: T) => void): void {
  let cases = 0;
  const t: T = {
    eq(actual, expected, msg) {
      cases++;
      totalCases++;
      assert.deepStrictEqual(actual, expected, msg);
    },
    ok(cond, msg) {
      cases++;
      totalCases++;
      assert.ok(cond, msg);
    },
    approx(actual, expected, eps, msg) {
      cases++;
      totalCases++;
      assert.ok(
        Number.isFinite(actual) && Math.abs(actual - expected) <= eps,
        `${msg} (got ${actual}, expected ~${expected} ±${eps})`
      );
    },
  };
  try {
    fn(t);
    console.log(`PASS  ${name.padEnd(26)} (${cases} assertions)`);
  } catch (err) {
    failedSuites++;
    const message = err instanceof Error ? err.message : String(err);
    console.log(`FAIL  ${name.padEnd(26)} — ${message}`);
  }
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

// =============================================================================
// 1) salary — 연봉 실수령액
//    출처: lib/calculators.ts §interpretation(QA검증 = 엔진 실측)
//          + planning/salary-net-calculator-content.md §1-4(연봉 4천만·부양1·비과세20만·자녀0)
//
//    ※ 해소 기록(2026-07-30, 티켓 #12): 이 자리에 있던 "planning 문서만 구식 →
//      문서 정정 필요" 주석은 **주장 자체가 낡아 있었다.** 2026-07-30에 엔진을
//      직접 실행해 planning §1-4 표(문서 128~132행)와 전 항목 대조한 결과:
//        국민연금 148,817 / 건강 112,643 / 장기요양 14,582 / 고용 28,199 /
//        4대보험 합계 304,241  → 문서·엔진 전 항목 일치(MATCH).
//      즉 문서는 이미 정정돼 있었고 주석만 옛 상태에 멈춰 있었다. 고칠 문서는 없다.
//      아래 앵커는 그대로 엔진 실측을 정답으로 잠근다(결론은 유효).
//
//    🔴 2026-08-04 티켓 #30(장기요양 승수 정정)으로 이 대조는 다시 깨졌다.
//      장기요양 14,582 → **14,801**(승수 0.129457 → 9,448/71,900). 연쇄로 4대보험 합계·
//      근로소득세(공제액 변동)·실수령액도 이동한다. planning §1-4 표(문서 128행)는
//      아직 14,582/304,241/구식 실수령을 싣고 있어 **문서 정정 필요 = 마스터 보고 대상**
//      (이번 회차 범위는 lib/ + 테스트 앵커까지로 못박혀 있어 문서는 손대지 않았다).
//      ※ 같은 문서 표가 "112,643 × 12.9457% (= 보수월액 × 0.47240%)"라고 적어
//        괄호 안에 정본 요율(0.4724% = 0.9448%÷2)을 이미 담고 있었다.
//        3,133,333 × 0.4724% = 14,801원 → 문서 스스로 모순이었다.
//
//    교훈: 주석에 적은 "사실 주장"은 유통기한이 있다. 문서 불일치를 발견하면
//      주석에 적어 두지 말고 티켓으로 escalate해서 그 자리에서 종결할 것
//      (티켓 #9와 동일 패턴이 세 번째 반복이었다). 주석에 남기는 수치는 반드시
//      그때 직접 실행해 얻은 값만 적는다.
// =============================================================================

suite("salary", (t) => {
  const r = calculateSalary({
    annualSalary: 40_000_000,
    taxFreeMonthly: 200_000,
    dependents: 1,
    children: 0,
  });
  assert.ok(r !== null, "salary: 유효 입력이 null 반환");
  t.eq(r!.monthlyGross, 3_333_333, "월 급여총액");
  t.eq(r!.monthlyTaxable, 3_133_333, "월 과세대상급여 T");
  t.eq(r!.nationalPension, 148_817, "국민연금(엔진 실측; 문서 §1-4=148,810 구식)");
  t.eq(r!.healthInsurance, 112_643, "건강보험(엔진 실측; 문서 §1-4=112,640 구식)");
  // 장기요양: 112,643 × 9,448/71,900 = 14,801.82… → 14,801 (티켓 #30 이전 14,582)
  t.eq(r!.longTermCare, 14_801, "장기요양(#30 정정; 구 승수 0.129457이면 14,582)");
  t.eq(r!.employmentInsurance, 28_199, "고용보험(엔진 실측; 문서 §1-4=28,200 구식)");
  t.eq(r!.insuranceTotal, 304_460, "4대보험 합계(#30: 304,241 → 304,460)");
  // 세액도 이동한다 — 4대보험 연액이 특별소득공제로 들어가므로(파이프라인 ③→④)
  t.eq(r!.incomeTax, 105_856, "근로소득세(월) (#30: 105,888 → 105,856)");
  t.eq(r!.localIncomeTax, 10_585, "지방소득세(월) (#30: 10,588 → 10,585)");
  t.eq(r!.monthlyNet, 2_912_432, "월 실수령액(#30: 2,912,616 → 2,912,432)");
  t.eq(r!.annualNet, 34_949_184, "연 환산 실수령액(#30: 34,951,392 → 34,949,184)");

  // ---------------------------------------------------------------------------
  // 앵커 S2 — 고용보험 정수 bp 연산 잠금 (2026-07-29 티켓 #10)
  //
  // 위 앵커(연봉 4,000만)는 T=3,133,333이라 3,133,333 × 9 = 28,199,997 로
  // float식/정수bp식이 우연히 28,199로 같아져 결함을 통과시킨다.
  // 실제로 QA 변이 테스트에서 lib/salary.ts만 float으로 되돌려도 전 스위트가
  // 통과했다. 그래서 두 식이 갈리는 T=3,000,000을 만드는 앵커를 따로 둔다.
  //   float식 : Math.floor(3_000_000 * 0.009) = 26,999  ← 결함
  //   정수bp식: Math.floor(3_000_000 * 90 / 10_000) = 27,000  ← 정답
  // 이 앵커가 깨지면 고용보험 계산이 실수 요율 곱셈으로 되돌아간 것이다.
  // ---------------------------------------------------------------------------
  const s2 = calculateSalary({
    annualSalary: 36_000_000,
    taxFreeMonthly: 0,
    dependents: 1,
    children: 0,
  });
  assert.ok(s2 !== null, "salary S2: 유효 입력이 null 반환");
  t.eq(s2!.monthlyTaxable, 3_000_000, "S2 월 과세대상급여 T");
  t.eq(s2!.employmentInsurance, 27_000, "S2 고용보험(정수 bp; float식이면 26,999)");
  t.eq(s2!.longTermCare, 14_172, "S2 장기요양(107,850 × 9,448/71,900 = 14,172 정확값)");
  t.eq(s2!.insuranceTotal, 291_522, "S2 4대보험 합계(#30: 291,311 → 291,522)");
  t.eq(s2!.monthlyNet, 2_609_775, "S2 월 실수령액(#30: 2,609,952 → 2,609,775)");

  // ---------------------------------------------------------------------------
  // 앵커 S3 — 근로소득세액공제 한도 제4호 경계 잠금 (2026-08-05 티켓 #35)
  //
  // 결함: `lib/salary.ts`의 creditCap 분기가 3단뿐이라 마지막 `else`가 7천만원 초과를
  //   전부 삼켰고, **소득세법 제59조제2항제4호(1억2천만원 초과)가 미구현**이었다.
  //   제3호의 하한 50만원이 초과 구간까지 연장되어 총급여 1억2,060만원 초과에서
  //   한도가 연 30만원 과대 → 월 실수령액 27,500원 과대 표시.
  //
  // 아래 4점은 전부 **엔진을 실제로 실행해 얻은 값**이다(손계산 아님).
  //   비과세 0 · 부양가족 1 · 자녀 0으로 두어 G(annualTaxable) = 연봉이 되게 했다.
  // 수정 전/후 실측 대조(2026-08-05):
  //   G=120,000,000  7,647,350 → 7,647,350 (불변, 무회귀 증명)
  //   G=120,300,000  7,662,154 → 7,648,404 (−13,750)
  //   G=120,600,000  7,676,958 → 7,649,458 (−27,500)
  //   G=150,000,000  9,127,726 → 9,100,226 (−27,500)
  //   (참고: G=130,000,000  8,140,810 → 8,113,310 = 마스터 예측 −27,500과 정확히 일치)
  // ---------------------------------------------------------------------------
  const salaryAt = (annualSalary: number) => {
    const s = calculateSalary({
      annualSalary,
      taxFreeMonthly: 0,
      dependents: 1,
      children: 0,
    });
    assert.ok(s !== null, `salary S3: 유효 입력이 null 반환 (${annualSalary})`);
    return s!;
  };

  // (a) G = 120,000,000 — 제3호의 마지막 점. 한도 500,000원이 무는 지점 / 근거 제3호.
  //     660,000 − (120,000,000 − 70,000,000) × 0.5 는 이미 하한 아래이므로 500,000.
  //     제4호 신설 **전후 값이 같아야 한다** = 이하 구간 무회귀 증명 앵커.
  const s3a = salaryAt(120_000_000);
  t.eq(s3a.incomeTax, 1_402_623, "S3a G=1억2천만 근로소득세(제3호 마지막 점, #35 전후 불변)");
  t.eq(s3a.localIncomeTax, 140_262, "S3a G=1억2천만 지방소득세(#35 전후 불변)");
  t.eq(s3a.monthlyNet, 7_647_350, "S3a G=1억2천만 월 실수령액(#35 전후 불변 = 무회귀)");

  // (b) G = 120,300,000 — 제4호 선형 구간 한가운데. 한도 350,000원이 무는 지점 / 근거 제4호.
  //     500,000 − (120,300,000 − 120,000,000) × 0.5 = 350,000 (하한 200,000 미도달).
  //     결함판은 여기서 한도 500,000을 써서 연 150,000원 과대 → 월 13,750원 과대였다.
  const s3b = salaryAt(120_300_000);
  t.eq(s3b.incomeTax, 1_423_264, "S3b G=1억2,030만 근로소득세(한도 350,000 / 제4호)");
  t.eq(s3b.localIncomeTax, 142_326, "S3b G=1억2,030만 지방소득세(한도 350,000 / 제4호)");
  t.eq(s3b.monthlyNet, 7_648_404, "S3b G=1억2,030만 월 실수령액(결함판 7,662,154)");

  // (c) G = 120,600,000 — 제4호 하한 200,000원이 무는 **정확한** 지점 / 근거 제4호.
  //     500,000 − (120,600,000 − 120,000,000) × 0.5 = 200,000 = 하한. 여기서부터 고정.
  const s3c = salaryAt(120_600_000);
  t.eq(s3c.incomeTax, 1_443_904, "S3c G=1억2,060만 근로소득세(하한 200,000 개시점 / 제4호)");
  t.eq(s3c.localIncomeTax, 144_390, "S3c G=1억2,060만 지방소득세(하한 200,000 / 제4호)");
  t.eq(s3c.monthlyNet, 7_649_458, "S3c G=1억2,060만 월 실수령액(결함판 7,676,958)");

  // (d) G = 150,000,000 — 하한 고정 구간. 한도 200,000원이 무는 지점 / 근거 제4호 단서.
  //     선형식이면 500,000 − 15,000,000 = 음수이므로 max()가 200,000으로 붙든다.
  const s3d = salaryAt(150_000_000);
  t.eq(s3d.incomeTax, 2_241_659, "S3d G=1억5천만 근로소득세(하한 200,000 고정 / 제4호)");
  t.eq(s3d.localIncomeTax, 224_165, "S3d G=1억5천만 지방소득세(하한 200,000 / 제4호)");
  t.eq(s3d.monthlyNet, 9_100_226, "S3d G=1억5천만 월 실수령액(결함판 9,127,726)");

  // 계약: 무효 입력은 null
  t.eq(calculateSalary({ annualSalary: 0, taxFreeMonthly: 0, dependents: 1, children: 0 }), null, "연봉 0 → null");
  t.eq(calculateSalary({ annualSalary: 40_000_000, taxFreeMonthly: 0, dependents: 0, children: 0 }), null, "부양가족<1 → null");
  t.eq(calculateSalary({ annualSalary: NaN, taxFreeMonthly: 0, dependents: 1, children: 0 }), null, "NaN → null");
});

// =============================================================================
// 2) four-insurance — 4대보험료(근로자/사업주/합계)
//    출처: planning/four-insurance-calculator-content.md §1-4 앵커 A~D (QA 검증, 150인 미만)
//    ※ 2026-07-29(티켓 #10) 고용보험 정수 bp 산술 전환으로 갱신된 앵커:
//      B 근로자 고용보험 26,999→27,000 · 근로자 소계 291,310→291,311 · 총합 590,121→590,122
//      D 근로자 소계 660,251→660,252 · 총합 1,338,003→1,338,004 (고용보험 62,999→63,000)
//      A·C는 불변(2,000,000·5,000,000은 0.9%가 부동소수 오차 없이 떨어짐).
//      B'(over150Priority) 신설 — 사업주 0.9%+0.45% float 합산 결함(40,499) 회귀 잠금.
//    ※ 2026-08-04(티켓 #30) 장기요양 승수 정정(0.129457 → 9,448/71,900)으로 A~D의
//      장기요양·소계·총합이 전부 이동했다. 근로자/사업주 각 +141~491원.
//        A 근로자소계 194,207→194,348 · 총합 393,414→393,696
//        B 장기요양 13,961→14,172 · 근로자소계 291,311→291,522 · 총합 590,122→590,544
//        B' 근로자소계 291,311→291,522 · 사업주소계 304,811→305,022 · 총합 596,122→596,544
//        C 근로자소계 485,519→485,870 · 총합 983,538→984,240
//        D 근로자소계 660,252→660,743 · 총합 1,338,004→1,338,986
//      planning/four-insurance-calculator-content.md §1-2의 승수 문구는 티켓 #32
//      (2026-08-05)에서 정정 완료 — 구 승수 `0.129457` 0건, 구 금액 21종 전건 0회를
//      2026-08-07 QA가 실측(마스터 초안 9종 + QA 추가 12종. 초안 목록은 구 장기요양
//      A·C·D와 구 사업주 소계를 빠뜨려, 그 목록만으로는 오염 문서를 통과시켰을 표본이다).
//   🔴 그러나 §1-4는 아직 정정이 남았다(2026-08-07 QA 적발). #32가 굵은 값만 갱신하고
//      괄호 안 개정 이력은 그대로 둬서 **거짓 인과**가 됐다 — L107·117·132·144·169가
//      07-14 소계·총합 오차를 통째로 "float floor 결함 → #10에서 해소"로 귀속시키는데,
//      실제 격차 212원 중 float floor는 1원뿐이고 211원은 장기요양 승수(#30)다.
//      (L131·L143·L249는 고용보험 단독이라 정확 — 정정 대상 아님.) 담당: 기획팀.
// =============================================================================

suite("four-insurance", (t) => {
  const under150: BusinessSize = "under150";

  // 앵커 A: T=2,000,000
  const a = calculateFourInsurance({ monthlyTaxable: 2_000_000, businessSize: under150 });
  assert.ok(a !== null, "4대보험 A null");
  // A의 장기요양은 손계산 앵커다: 건강 71,900원(절사 없음) × 9,448/71,900 = 9,448원 정확값.
  //   = 보수 2,000,000 × 0.9448% ÷ 2 (법정 직접요율 경로와 원 단위까지 일치)
  t.eq(a!.longTermCare.employee, 9_448, "A 장기요양 근로자(=200만×0.9448%÷2, 정확값)");
  t.eq(a!.longTermCare.total, 18_896, "A 장기요양 총액(=200만×0.9448%)");
  t.eq(a!.employeeTotal, 194_348, "A 근로자 소계(#30: 194,207 → 194,348)");
  t.eq(a!.employerTotal, 199_348, "A 사업주 소계(#30: 199,207 → 199,348)");
  t.eq(a!.grandTotal, 393_696, "A 총합(#30: 393,414 → 393,696)");

  // 앵커 B(대표): T=3,000,000
  const b = calculateFourInsurance({ monthlyTaxable: 3_000_000, businessSize: under150 });
  assert.ok(b !== null, "4대보험 B null");
  t.eq(b!.nationalPension.employee, 142_500, "B 국민연금 근로자");
  t.eq(b!.healthInsurance.employee, 107_850, "B 건강보험 근로자");
  t.eq(b!.longTermCare.employee, 14_172, "B 장기요양 근로자(#30: 13,961 → 14,172)");
  t.eq(b!.longTermCare.total, 28_344, "B 장기요양 총액(=300만×0.9448%)");
  t.eq(b!.employmentInsurance.employee, 27_000, "B 고용보험 근로자");
  t.eq(b!.employmentInsurance.employer, 34_500, "B 고용보험 사업주(1.15%)");
  t.eq(b!.employeeTotal, 291_522, "B 근로자 소계(#30: 291,311 → 291,522)");
  t.eq(b!.employerTotal, 299_022, "B 사업주 소계(#30: 298,811 → 299,022)");
  t.eq(b!.grandTotal, 590_544, "B 총합(#30: 590,122 → 590,544)");

  // 앵커 B': T=3,000,000 · over150Priority(사업주 0.9%+0.45%=1.35%)
  //   float `0.009 + 0.0045`는 0.013499999999999998로 평가되어 floor가 40,499가 됐다.
  //   정수 bp(135/10,000) 전환으로 40,500. 이 앵커가 사업주분 부동소수 결함을 잠근다.
  const bPriority = calculateFourInsurance({
    monthlyTaxable: 3_000_000,
    businessSize: "over150Priority",
  });
  assert.ok(bPriority !== null, "4대보험 B' null");
  t.eq(bPriority!.employmentInsurance.employee, 27_000, "B' 고용보험 근로자(0.9%)");
  t.eq(bPriority!.employmentInsurance.employer, 40_500, "B' 고용보험 사업주(1.35%)");
  t.eq(bPriority!.employeeTotal, 291_522, "B' 근로자 소계(규모 무관, B와 동일)");
  t.eq(bPriority!.employerTotal, 305_022, "B' 사업주 소계(#30: 304,811 → 305,022)");
  t.eq(bPriority!.grandTotal, 596_544, "B' 총합(#30: 596,122 → 596,544)");

  // 앵커 C: T=5,000,000
  const c = calculateFourInsurance({ monthlyTaxable: 5_000_000, businessSize: under150 });
  t.eq(c!.longTermCare.employee, 23_620, "C 장기요양 근로자(=500만×0.9448%÷2, 정확값)");
  t.eq(c!.employeeTotal, 485_870, "C 근로자 소계(#30: 485,519 → 485,870)");
  t.eq(c!.employerTotal, 498_370, "C 사업주 소계(#30: 498,019 → 498,370)");
  t.eq(c!.grandTotal, 984_240, "C 총합(#30: 983,538 → 984,240)");

  // 앵커 D: T=7,000,000 → 국민연금 상한 clamp(659만) 검증
  const d = calculateFourInsurance({ monthlyTaxable: 7_000_000, businessSize: under150 });
  t.eq(d!.pensionBase, 6_590_000, "D 기준소득월액 상한 clamp");
  t.eq(d!.isPensionCapped, true, "D isPensionCapped");
  t.eq(d!.nationalPension.employee, 313_025, "D 국민연금 근로자(clamp 고정)");
  t.eq(d!.employmentInsurance.employee, 63_000, "D 고용보험 근로자(0.9%)");
  t.eq(d!.longTermCare.employee, 33_068, "D 장기요양 근로자(#30: 32,577 → 33,068)");
  t.eq(d!.employeeTotal, 660_743, "D 근로자 소계(#30: 660,252 → 660,743)");
  t.eq(d!.employerTotal, 678_243, "D 사업주 소계(#30: 677,752 → 678,243)");
  t.eq(d!.grandTotal, 1_338_986, "D 총합(#30: 1,338,004 → 1,338,986)");

  // 계약: 무효 입력 → null
  t.eq(calculateFourInsurance({ monthlyTaxable: 0, businessSize: under150 }), null, "T=0 → null");
});

// =============================================================================
// 2-b) 장기요양 승수 정본 잠금 (2026-08-04 티켓 #30)
//
// 결함: `LONG_TERM_CARE_MULTIPLIER = 0.129457`은 어느 연도의 어느 고시와도 대응되지
//   않는 오기였다(2025년 정본 0.9182÷7.09 = 0.1295063과도 불일치). 라이브 계산기 2개가
//   법정액보다 1.48% 적게 표시했다(보수 100만원 총액 9,306원 vs 법정 9,448원).
//
// 정본(2026-08-04 조문 대조):
//   노인장기요양보험법 시행령 제4조     — 장기요양보험료율 100만분의 9,448 (= 0.9448%)
//   국민건강보험법 시행령 제44조제1항  — 건강보험료율 1만분의 719 (= 7.19%)
//   ⇒ "건강보험료 대비" 승수 = 9,448 / 71,900 = 0.131404728789…(공표 반올림 13.14%)
//
// 왜 정수 쌍인가: 실수 승수는 절사 경계에서 갈린다. 아래 앵커 L4가 그 자리에서 증명한다.
//   (9자리 0.131404729조차 건강보험료 280,652원에서 +1원 어긋난다 — 전수 41,449건)
// =============================================================================

suite("장기요양 승수 정본(#30)", (t) => {
  // --- 상수 정본 ---
  t.eq(LONG_TERM_CARE_RATE_PPM, 9_448, "장기요양요율 = 100만분의 9,448(시행령 §4)");
  t.eq(HEALTH_INSURANCE_TOTAL_RATE_PPM, 71_900, "건강보험료율 = 100만분의 71,900(시행령 §44①)");
  t.eq(Number.isInteger(LONG_TERM_CARE_RATE_PPM), true, "분자는 정수여야 한다");
  t.eq(Number.isInteger(HEALTH_INSURANCE_TOTAL_RATE_PPM), true, "분모는 정수여야 한다");
  // 승수는 정수 쌍에서 파생돼야 한다(리터럴 재도입 금지 — #30 재발 방지)
  t.eq(
    LONG_TERM_CARE_MULTIPLIER,
    9_448 / 71_900,
    "승수는 9,448/71,900 파생값(리터럴이면 값이 갈린다)"
  );
  t.eq(round2(LONG_TERM_CARE_MULTIPLIER * 100), 13.14, "표시 요율 13.14%");
  t.ok(LONG_TERM_CARE_MULTIPLIER !== 0.129457, "구 오기 0.129457 재도입 금지");

  // 법정 직접요율 경로(참조 구현) — 근로자분 = 보수 × 0.9448% ÷ 2
  const directEmployee = (T: number): number => Math.floor((T * 4_724) / 1_000_000);
  const directTotal = (T: number): number => Math.floor((T * 9_448) / 1_000_000);
  const care = (T: number): number =>
    calculateFourInsurance({ monthlyTaxable: T, businessSize: "under150" })!.longTermCare
      .employee;

  // --- 앵커 L1: 손계산 앵커(건강보험료가 절사 없이 떨어지는 보수) ---
  //   T=1,000,000 → 건강 35,950 → 35,950 × 9,448/71,900 = 4,724 정확값
  //   구 승수였다면 4,653 (총액 9,306 vs 법정 9,448 — 라이브에 노출됐던 오차)
  t.eq(care(1_000_000), 4_724, "L1 보수 100만 장기요양 근로자 = 100만×0.9448%÷2");
  t.eq(care(1_000_000) * 2, 9_448, "L1 총액 = 100만 × 0.9448%(법정 직접요율과 일치)");
  t.eq(Math.floor(Math.floor(1_000_000 * 0.03595) * 0.129457), 4_653, "L1 구 승수 재현 = 4,653(앵커 비공허)");

  // --- 앵커 L2: 승수 경로 == 법정 직접요율 경로 (건강보험료 절사가 없는 전 구간) ---
  //   건강보험료 근로자분 = T × 719/20,000 이므로 T가 20,000의 배수면 절사 손실이 0이다.
  //   그 구간 100개 전수에서 근로자분이 법정 직접요율과 **원 단위까지 일치**해야 한다.
  {
    let mismatch = 0;
    for (let T = 20_000; T <= 2_000_000; T += 20_000) {
      if (care(T) !== directEmployee(T)) mismatch++;
    }
    t.eq(mismatch, 0, "L2 20,000원 배수 100건: 승수 경로 == 법정 직접요율(근로자분)");
  }

  // --- 앵커 L3: 잔여 편차의 상한 계약 ---
  //   건강보험료 자체를 근로자/사업주 각각 floor 하므로(기존 설계, #30과 무관)
  //   총액은 법정 직접요율보다 최대 2원 적을 수 있다. 절대 초과(+)는 없어야 한다.
  //   ※ 이 편차는 승수 결함이 아니다: 완전정확 산술로 계산해도
  //     floor(T×0.9448%÷2)×2 는 floor(T×0.9448%)와 50% 확률로 1원 갈린다.
  {
    let over = 0;
    let worst = 0;
    for (let T = 1_000_000; T <= 1_002_000; T++) {
      const d = care(T) * 2 - directTotal(T);
      if (d > 0) over++;
      worst = Math.min(worst, d);
    }
    t.eq(over, 0, "L3 총액이 법정 직접요율을 초과하는 보수 없음(과다청구 금지)");
    t.ok(worst >= -2, `L3 총액 하향 편차 2원 이내(실측 ${worst})`);
  }

  // --- 앵커 L4: 손으로 반올림한 리터럴 재도입 차단(비공허성 증명) ---
  //   건강보험료 280,652원(= 월 보수 7,806,732원, 연봉 약 9,368만)에서
  //   정수 쌍 36,878 / 9자리 실수 0.131404729 는 36,879 로 갈린다.
  //   ⚠️ 이 앵커가 잡는 것은 "리터럴 재도입"이지 "곱셈 순서"가 아니다.
  //     파생 double을 그대로 곱하는 변형 `floor(h × LONG_TERM_CARE_MULTIPLIER)`는
  //     h=1~2,000만 전수에서 정수 쌍과 완전히 동일했다(2026-08-04 실측). 즉 그 변형은
  //     이 스위트로 검출되지 않으며, 검출할 필요도 없다(결과가 같다).
  t.eq(care(7_806_732), 36_878, "L4 보수 7,806,732원 장기요양 근로자(정수 쌍 산술)");
  t.eq(
    Math.floor(280_652 * 0.131404729),
    36_879,
    "L4 9자리 실수 승수는 36,879(+1원) — 정수 쌍이 아니면 여기서 갈린다"
  );
  t.eq(Math.floor((280_652 * 9_448) / 71_900), 36_878, "L4 정수 쌍 경로 36,878");
  //   공표 반올림 0.1314도 못 쓴다: 건강보험료 71,900원에서 9,447(정본 9,448) — 1원 과소.
  t.eq(Math.floor(71_900 * 0.1314), 9_447, "L4 공표 반올림 0.1314는 9,447(1원 과소)");
});

// =============================================================================
// 3) loan — 대출 상환(원리금균등/원금균등)
//    출처: planning/loan-interest-calculator-content.md §1-3
//          + planning/dsr-calculator-content.md §1-4 앵커 B(엔진 실측 잠금)
//    ※ 2026-07-29 해소(티켓 #9): 과거 이 주석은 §1-3 수기 근사치
//      (899,130 / 2,368,790 / 836,806)와 엔진 실측(899,127 / 2,368,572 / 836,817)의
//      불일치를 "보고 대상"으로 적어두고 엔진값만 잠갔다. 그러나 그 근사치는 이미
//      lib/calculators.ts의 라이브 본문으로 복사돼 사용자에게 노출되고 있었고,
//      이 주석은 아무도 escalate하지 않아 13일간 방치됐다.
//      → 본문·기획문서를 엔진값으로 정정 완료. 이제 문서와 엔진이 일치한다.
//      교훈: 테스트가 문서 불일치를 발견하면 주석에 적지 말고 티켓으로 올릴 것.
// =============================================================================

suite("loan", (t) => {
  // 원리금균등 (30M, 5%, 36개월)
  const ep = calculateLoan(30_000_000, 5, 36, "equalPayment");
  assert.ok(ep && ep.type === "equalPayment", "loan equalPayment null/type");
  if (ep.type === "equalPayment") {
    t.eq(ep.monthlyPayment, 899_127, "원리금균등 월상환(문서 §1-3 정정값과 일치)");
    t.eq(ep.totalInterest, 2_368_572, "원리금균등 총이자(문서 정정값과 일치)");
    t.eq(ep.totalPayment, 32_368_572, "원리금균등 총상환");
  }

  // 원금균등 (30M, 5%, 36개월)
  const pr = calculateLoan(30_000_000, 5, 36, "equalPrincipal");
  assert.ok(pr && pr.type === "equalPrincipal", "loan equalPrincipal null/type");
  if (pr.type === "equalPrincipal") {
    t.eq(pr.firstPayment, 958_333, "원금균등 1회차(원금 833,333+이자 125,000)");
    t.eq(pr.lastPayment, 836_817, "원금균등 마지막회차(문서 정정값과 일치)");
    t.eq(pr.totalInterest, 2_312_500, "원금균등 총이자");
    t.eq(pr.totalPayment, 32_312_500, "원금균등 총상환(= P + 총이자)");
  }

  // DSR 앵커 B의 핵심 경로: 주담대 3억/4.5%/360개월 월상환 = 1,520,056 (문서 §1-4 정합)
  const dsrB = calculateLoan(300_000_000, 4.5, 360, "equalPayment");
  assert.ok(dsrB && dsrB.type === "equalPayment", "DSR-B loan null/type");
  if (dsrB.type === "equalPayment") {
    t.eq(dsrB.monthlyPayment, 1_520_056, "DSR-B 월상환(§1-4 앵커 정합)");
  }

  // 계약: 무효 입력 → null
  t.eq(calculateLoan(0, 5, 36, "equalPayment"), null, "원금 0 → null");
  t.eq(calculateLoan(30_000_000, -1, 36, "equalPayment"), null, "음수 금리 → null");
  t.eq(calculateLoan(30_000_000, 5, 36.5, "equalPayment"), null, "비정수 개월 → null");
  // r=0 무이자 분기
  const zero = calculateLoan(1_200_000, 0, 12, "equalPayment");
  assert.ok(zero && zero.type === "equalPayment", "무이자 null/type");
  if (zero.type === "equalPayment") {
    t.eq(zero.monthlyPayment, 100_000, "무이자 월상환 = P/n");
    t.eq(zero.totalInterest, 0, "무이자 총이자 0");
  }
});

// =============================================================================
// 4) DSR 파생 경로 — loan 엔진 monthlyPayment×12로 DSR% 재현
//    출처: planning/dsr-calculator-content.md §1-4 앵커 A/B/C (QA 검증, 엔진 실측)
//    DSR% = (신규 연원리금 + 기존 연원리금) / 연소득 × 100  (소수 1자리 반올림)
//    ※ 불일치(보고 대상): 앵커 C의 신규 월상환을 문서는 "약 1,013,369"(=1,520,056×2/3
//      근사)로 적었으나 엔진 직접계산은 1,013,371 → 연원리금 12,160,452(문서 12,160,424).
//      DSR 대표값(44.3%)은 양쪽 동일. 엔진값 잠금.
// =============================================================================

suite("dsr", (t) => {
  const dsrPct = (newYear: number, existingYear: number, income: number): number =>
    round1(((newYear + existingYear) / income) * 100);

  // 앵커 A(간편): 연소득 5천, 신규 없음, 기존 연 2천 → 40.0%
  t.eq(dsrPct(0, 20_000_000, 50_000_000), 40.0, "DSR-A 40.0%");

  // 앵커 B(대표): 연소득 6천, 신규 3억/4.5%/360 원리금균등, 기존 0 → 30.4%
  const b = calculateLoan(300_000_000, 4.5, 360, "equalPayment");
  assert.ok(b && b.type === "equalPayment", "DSR-B loan");
  const bNewYear = b.type === "equalPayment" ? b.monthlyPayment * 12 : 0;
  t.eq(bNewYear, 18_240_672, "DSR-B 신규 연원리금(1,520,056×12)");
  t.eq(dsrPct(bNewYear, 0, 60_000_000), 30.4, "DSR-B 30.4%");

  // 앵커 C(합산·초과): 연소득 5천, 신규 2억/4.5%/360, 기존 연 1천 → 44.3%
  const c = calculateLoan(200_000_000, 4.5, 360, "equalPayment");
  assert.ok(c && c.type === "equalPayment", "DSR-C loan");
  const cNewYear = c.type === "equalPayment" ? c.monthlyPayment * 12 : 0;
  t.eq(cNewYear, 12_160_452, "DSR-C 신규 연원리금(엔진 1,013,371×12; 문서 12,160,424 근사)");
  t.eq(dsrPct(cNewYear, 10_000_000, 50_000_000), 44.3, "DSR-C 44.3%");
});

// =============================================================================
// 5) loan-prepayment — 중도상환수수료(슬라이딩·3년 캡)
//    출처: planning/loan-prepayment-fee-content.md §1-4 앵커 A~D (QA 검증, floor)
// =============================================================================

suite("loan-prepayment", (t) => {
  const a = calculateLoanPrepayment({ amount: 10_000_000, feeRate: 0.5, elapsedMonths: 6, totalMonths: 24 });
  assert.ok(a.ok, "PRE-A ok");
  if (a.ok) {
    t.eq(a.result.baseMonths, 24, "A 분모 D_m(캡 미적용)");
    t.eq(a.result.fee, 37_500, "A 수수료 37,500");
  }

  const b = calculateLoanPrepayment({ amount: 100_000_000, feeRate: 0.65, elapsedMonths: 12, totalMonths: 360 });
  assert.ok(b.ok, "PRE-B ok");
  if (b.ok) {
    t.eq(b.result.baseMonths, 36, "B 분모 3년 캡");
    t.eq(b.result.isCapped, true, "B isCapped");
    t.eq(b.result.fee, 433_333, "B 수수료 433,333");
  }

  const c = calculateLoanPrepayment({ amount: 50_000_000, feeRate: 1.2, elapsedMonths: 24, totalMonths: 360 });
  assert.ok(c.ok && c.result.fee === 200_000, "C 수수료 200,000");
  if (c.ok) t.eq(c.result.fee, 200_000, "C 수수료 200,000");

  const d = calculateLoanPrepayment({ amount: 50_000_000, feeRate: 1.2, elapsedMonths: 40, totalMonths: 360 });
  assert.ok(d.ok, "PRE-D ok");
  if (d.ok) {
    t.eq(d.result.isExempt, true, "D 면제(3년 경과)");
    t.eq(d.result.fee, 0, "D 수수료 0(면제)");
  }

  // ---------------------------------------------------------------------------
  // 앵커 E·F (2026-08-01 티켓 #21) — f의 이진부동소수 오차로 floor가 1원을 깎던 밴드
  //
  // 결함: 구식 `Math.floor((A * R_m * f) / (100 * D_m))`은 수학적 정답이 **정확히
  //   정수**인 조합에서 중간값이 정답 바로 아래로 떨어져(예: 2362499.9999999995)
  //   1원을 깎았다. QA 전수 스캔 1,332,000 조합 중 14,791건(1.110%)이 어긋났고
  //   **전부 −1원**(항상 사용자에게 적게 표시). 처방 = 정수 bp + BigInt 산술.
  //
  // ★ 위 앵커 A~D는 이 밴드를 전부 비켜간다(QA 확인). A(0.5%)·B(0.65%)·C(1.2%)는
  //   구식 float식으로도 같은 값이 나와서 결함을 통과시킨다. 그래서 두 개를 따로 둔다.
  //   기대값은 엔진 출력 복사가 아니라 손계산이다:
  //     E) 1,000만 × 0.7%  × 9 ÷ 12 = 70,000 × 0.75 = 52,500  (구 엔진 52,499)
  //     F) 1,000만 × 0.35% × 9 ÷ 9  = 35,000 × 1    = 35,000  (구 엔진 34,999)
  //   특히 F는 **잔존=기준(경과 0개월, 잔존비율 100%)** 이라 사용자가 암산으로
  //   바로 잡아내는 형태였다.
  // ---------------------------------------------------------------------------

  // 앵커 E: 잔존 9/12
  const e = calculateLoanPrepayment({ amount: 10_000_000, feeRate: 0.7, elapsedMonths: 3, totalMonths: 12 });
  assert.ok(e.ok, "PRE-E ok");
  if (e.ok) {
    t.eq(e.result.remainingMonths, 9, "E 잔존 9개월");
    t.eq(e.result.baseMonths, 12, "E 분모 12개월");
    t.eq(e.result.fee, 52_500, "E 수수료 52,500(구 float식이면 52,499)");
  }

  // 앵커 F: 경과 0개월 → 잔존비율 100%. 수수료 = A × f 그대로여야 한다.
  const fAnchor = calculateLoanPrepayment({ amount: 10_000_000, feeRate: 0.35, elapsedMonths: 0, totalMonths: 9 });
  assert.ok(fAnchor.ok, "PRE-F ok");
  if (fAnchor.ok) {
    t.eq(fAnchor.result.ratio, 1, "F 잔존비율 100%(경과 0개월)");
    t.eq(fAnchor.result.fee, 35_000, "F 수수료 35,000 = 1,000만 × 0.35%(구 float식이면 34,999)");
  }

  // ---------------------------------------------------------------------------
  // 앵커 G·H (2026-08-01 티켓 #21 항목 D) — bp 변환의 **반올림 방향**을 잠근다
  //
  // ★ 요율을 아무거나 고르면 안 되는 자리다. 지우거나 요율을 "더 평범한 값"으로
  //   바꾸지 말 것. 위 앵커 A~F의 요율(0.5·0.65·1.2·0.7·0.35·0)은 전부
  //   `f × 10,000`이 부동소수 오차 없이 딱 떨어져서 **round·floor·ceil이 모두 같다.**
  //   즉 A~F는 "정수 bp 산술로 바뀌었다"는 잡아도 "어느 방향으로 반올림하는가"는
  //   전혀 잠그지 않는다. QA 변이 테스트에서 실제로 확인됐다:
  //     Math.round → Math.floor 로 바꿔도 320 assertions ALL PASS (못 잡음)
  //     Math.round → Math.ceil  로 바꿔도 320 assertions ALL PASS (못 잡음)
  //   #21은 반올림 방향 때문에 1원이 깎인 티켓이다. 그 처방으로 도입한 새 반올림이
  //   무보호면 티켓이 스스로를 부정한다. 그래서 방향에 민감한 요율을 일부러 고른다.
  //
  //   floor 변이가 bp를 깎는 2자리 요율 55종 / ceil 변이가 올리는 요율 60종이 있고
  //   **전부 실존 은행 요율대**다(0.57·0.69·1.13·1.14·1.38·1.39·1.63·2.01% …).
  //   1억·전액잔존이면 편차가 ±100원이며, floor 방향은 #21이 고친 것과 똑같은
  //   클래스(사용자에게 적게 표시)의 결함이 된다.
  //
  //   G) f=0.57% → 0.57*10000 = 5699.999999999999 : round 5700 / floor 5699
  //      → floor 변이 시 569,900원이 되어 이 앵커가 깨진다. (ceil은 5700으로 동일)
  //   H) f=0.07% → 0.07*10000 = 700.0000000000001 : round 700 / ceil 701
  //      → ceil 변이 시 70,100원이 되어 이 앵커가 깨진다. (floor는 700으로 동일)
  //   두 방향이 서로 다른 요율에서만 갈리므로 **G·H 둘 다 있어야** 양방향이 잠긴다.
  //
  //   기대값은 엔진 출력 복사가 아니라 손계산이다(경과 0개월 = 잔존비율 100%):
  //     G) 1억 × 0.57% = 570,000     H) 1억 × 0.07% = 70,000
  // ---------------------------------------------------------------------------

  const g = calculateLoanPrepayment({ amount: 100_000_000, feeRate: 0.57, elapsedMonths: 0, totalMonths: 36 });
  assert.ok(g.ok, "PRE-G ok");
  if (g.ok) {
    t.eq(g.result.fee, 570_000, "G 수수료 570,000 = 1억 × 0.57%(bp를 floor로 내리면 569,900)");
  }

  const h = calculateLoanPrepayment({ amount: 100_000_000, feeRate: 0.07, elapsedMonths: 0, totalMonths: 36 });
  assert.ok(h.ok, "PRE-H ok");
  if (h.ok) {
    t.eq(h.result.fee, 70_000, "H 수수료 70,000 = 1억 × 0.07%(bp를 ceil로 올리면 70,100)");
  }

  // G·H 비공허성 — 고른 요율이 **실제로 방향에 민감한지** 그 자리에서 증명한다.
  //   SCALE은 엔진의 (모듈 private) FEE_RATE_SCALE과 같은 값이어야 한다. 엔진 배율을
  //   바꾸면 아래가 깨지고, 그때는 새 배율에서 방향이 갈리는 요율로 G·H를 다시 골라야
  //   한다. (값만 통과시키고 방향 보호는 사라지는 '조용한 무력화'를 막는 잠금)
  //   먼저 엔진의 실효 배율을 **공개 API만으로 역산**한다. 소수 5자리 요율은 배율에
  //   따라 결과가 갈리므로(0.12346% → 배율 1e4면 bp 1235 = 123,500원 / 1e5면 bp 12346
  //   = 123,460원) 이 한 줄이 배율 변경을 감지한다. 이게 없으면 배율만 바꿔도 아래
  //   방향 민감도가 조용히 사라지면서 G·H가 값만 통과시키는 껍데기가 된다(실측 확인함).
  const probe = calculateLoanPrepayment({
    amount: 100_000_000,
    feeRate: 0.12346,
    elapsedMonths: 0,
    totalMonths: 36,
  });
  assert.ok(
    probe.ok && probe.result.fee === 123_500,
    "엔진 bp 배율이 10,000(해상도 0.0001%p)이어야 한다 — 배율을 바꿨다면 G·H 요율을 " +
      "그 배율에서 round≠floor / round≠ceil 인 값으로 다시 골라야 앵커가 유효하다"
  );

  const SCALE = 10_000; // 위 프로브로 엔진 배율과 일치함을 확인한 값
  assert.ok(
    Math.floor(0.57 * SCALE) !== Math.round(0.57 * SCALE),
    "G 요율 0.57%는 floor≠round 여야 앵커가 유효하다"
  );
  assert.ok(
    Math.ceil(0.07 * SCALE) !== Math.round(0.07 * SCALE),
    "H 요율 0.07%는 ceil≠round 여야 앵커가 유효하다"
  );

  // 앵커 비공허성 증명: 구(결함) float식을 그 자리에서 재현해 실제로 −1원임을 단언한다.
  //   이 두 줄이 통과한다는 건 E·F가 "결함이 살아있으면 반드시 깨지는" 앵커라는 뜻이다.
  //   (오차 0인 입력만 골라 통과시키는 무의미한 앵커 원천 차단 — 티켓 #19 스위트와 동일 원칙)
  const legacyFloat = (A: number, f: number, R: number, D: number): number =>
    Math.floor((A * R * f) / (100 * D));
  t.eq(legacyFloat(10_000_000, 0.7, 9, 12), 52_499, "E 구 float식은 52,499(앵커 비공허)");
  t.eq(legacyFloat(10_000_000, 0.35, 9, 9), 34_999, "F 구 float식은 34,999(앵커 비공허)");

  // 계약: 음수 입력 → invalid
  const bad = calculateLoanPrepayment({ amount: -1, feeRate: 0.5, elapsedMonths: 6, totalMonths: 24 });
  t.eq(bad.ok, false, "음수 금액 → invalid");

  // ---------------------------------------------------------------------------
  // 계약(티켓 #21): 비정수 금액·개월 → invalid-input
  //   STEP 4가 BigInt 산술이라 비정수가 들어오면 BigInt()가 RangeError를 **던진다.**
  //   엔진은 예외 대신 기존 에러 규약으로 떨어져야 한다. 가드가 빠지면 아래는
  //   assertion 실패가 아니라 throw로 스위트가 FAIL 난다(그것도 회귀 신호).
  //   현행 UI(금액 숫자마스크 · 개월 step="1")는 비정수를 못 만들지만 엔진 계약으로 못박는다.
  // ---------------------------------------------------------------------------
  const fracElapsed = calculateLoanPrepayment({ amount: 10_000_000, feeRate: 0.7, elapsedMonths: 6.5, totalMonths: 24 });
  t.eq(fracElapsed.ok, false, "비정수 경과개월(6.5) → invalid(예외 아님)");
  if (!fracElapsed.ok) t.eq(fracElapsed.error, "invalid-input", "에러코드 invalid-input");

  const fracTotal = calculateLoanPrepayment({ amount: 10_000_000, feeRate: 0.7, elapsedMonths: 6, totalMonths: 24.5 });
  t.eq(fracTotal.ok, false, "비정수 총기간(24.5) → invalid");

  const fracAmount = calculateLoanPrepayment({ amount: 10_000_000.5, feeRate: 0.7, elapsedMonths: 6, totalMonths: 24 });
  t.eq(fracAmount.ok, false, "비정수 금액 → invalid");

  const nanAmount = calculateLoanPrepayment({ amount: NaN, feeRate: 0.7, elapsedMonths: 6, totalMonths: 24 });
  t.eq(nanAmount.ok, false, "NaN 금액 → invalid");

  const infRate = calculateLoanPrepayment({ amount: 10_000_000, feeRate: Infinity, elapsedMonths: 6, totalMonths: 24 });
  t.eq(infRate.ok, false, "Infinity 수수료율 → invalid");

  // f × 10,000 이 Infinity로 넘치는 요율(≳1e305)도 예외 없이 invalid로 떨어져야 한다.
  const hugeRate = calculateLoanPrepayment({ amount: 10_000_000, feeRate: 1e305, elapsedMonths: 6, totalMonths: 24 });
  t.eq(hugeRate.ok, false, "bp 변환 오버플로 요율 → invalid(예외 아님)");

  // 정상 경계: 0원·0% 는 유효 입력이며 수수료 0 (거부 대상이 아님)
  const zeroRate = calculateLoanPrepayment({ amount: 10_000_000, feeRate: 0, elapsedMonths: 6, totalMonths: 24 });
  assert.ok(zeroRate.ok, "0% ok");
  if (zeroRate.ok) t.eq(zeroRate.result.fee, 0, "0% → 수수료 0");
});

// =============================================================================
// 6) bmi — 체질량지수 + 구간 판정
//    출처: planning/bmi-calculator-content.md §1(KSSO 2018 구간) · §2(170/65→정상)
//    ※ 불일치(보고 대상): §2 해설문은 170/65를 "BMI 22.5"로 적었으나(소수 1자리 표기),
//      엔진 bmi 필드는 소수 2자리라 22.49다(rawBmi 22.4913). 판정(정상체중)은 동일.
//      표시 자릿수 차이일 뿐 산식 일치 → 엔진값 잠금.
// =============================================================================

suite("bmi", (t) => {
  const r1 = calculateBmi(170, 65);
  assert.ok(r1 !== null, "bmi 170/65 null");
  t.eq(r1!.bmi, 22.49, "170/65 BMI(2자리; 해설 22.5는 1자리 표기)");
  t.approx(r1!.rawBmi, 22.4913, 0.001, "170/65 rawBmi");
  t.eq(r1!.status, "normal", "170/65 정상체중");

  const r2 = calculateBmi(170, 70);
  t.eq(r2!.bmi, 24.22, "170/70 BMI");
  t.eq(r2!.status, "overweight", "170/70 과체중(23≤BMI<25)");

  // 구간 판정(rawBmi 기준, 반올림 오판정 방지)
  t.eq(calculateBmi(200, 72)!.status, "underweight", "200/72 → 18.0 저체중(<18.5)");
  t.eq(calculateBmi(170, 73)!.status, "obese", "170/73 → 25.26 비만(≥25)");

  // 계약: 0/음수 → null
  t.eq(calculateBmi(0, 70), null, "키 0 → null");
  t.eq(calculateBmi(170, 0), null, "몸무게 0 → null");
});

// =============================================================================
// 7) age — 만 나이(결정적 산식, referenceDate 주입)
//    출처: lib/age.ts 계약 + 직접 손계산(referenceDate 고정으로 결정적).
// =============================================================================

suite("age", (t) => {
  // 생일 안 지남: 2000-06-15 기준일 2026-03-01 → 만 25, 연 26
  const a = calculateManAge("2000-06-15", new Date(2026, 2, 1));
  assert.ok(a !== null, "age a null");
  t.eq(a!.manAge, 25, "생일 전 만나이 = 연나이-1");
  t.eq(a!.yearAge, 26, "연나이 = 2026-2000");
  t.eq(a!.daysToNextBirthday, 106, "다음 생일(6/15)까지 106일");

  // 생일 당일: 2000-01-01 기준일 2020-01-01 → 만 20, 남은 0
  const b = calculateManAge("2000-01-01", new Date(2020, 0, 1));
  t.eq(b!.manAge, 20, "생일 당일 만 20");
  t.eq(b!.daysToNextBirthday, 0, "생일 당일 남은 0일");

  // 계약: 미래 출생/잘못된 형식 → null
  t.eq(calculateManAge("2027-01-01", new Date(2026, 6, 15)), null, "미래 출생 → null");
  t.eq(calculateManAge("abc", new Date(2026, 6, 15)), null, "형식 오류 → null");
  t.eq(calculateManAge("2026-02-30", new Date(2026, 6, 15)), null, "존재하지 않는 날짜 → null");
});

// =============================================================================
// 8) dday — D-Day(결정적, referenceDate 주입, 항상 오늘 포함)
//    출처: planning/dday-calculator-content.md §2(고정 동작) + lib/dday.ts 계약.
// =============================================================================

suite("dday", (t) => {
  const future = calculateDday("2026-12-25", new Date(2026, 6, 15));
  assert.ok(future !== null, "dday future null");
  t.eq(future!.type, "future", "미래 type");
  t.eq(future!.days, 163, "2026-07-15→12-25 = 163일");
  t.eq(future!.label, "D-163", "라벨 D-163");

  const past = calculateDday("2026-07-01", new Date(2026, 6, 15));
  t.eq(past!.type, "past", "과거 type");
  t.eq(past!.days, 14, "지난 지 14일");
  t.eq(past!.label, "D+14", "라벨 D+14");

  const today = calculateDday("2026-07-15", new Date(2026, 6, 15));
  t.eq(today!.type, "today", "당일 type");
  t.eq(today!.label, "D-Day", "라벨 D-Day");

  // 계약
  t.eq(calculateDday("", new Date(2026, 6, 15)), null, "빈 입력 → null");
  t.eq(calculateDday("2026-02-30", new Date(2026, 6, 15)), null, "존재하지 않는 날짜 → null");
});

// =============================================================================
// 9) service-period — 근속연수·근무일수(양 끝 포함 +1)
//    출처: planning/service-period-calculator-content.md §1-3 앵커 A/C/E (QA 검증)
// =============================================================================

suite("service-period", (t) => {
  // 앵커 A: 2020-01-01 → 2023-01-01
  const a = calculateServicePeriod("2020-01-01", "2023-01-01");
  assert.ok(a.ok, "SP-A ok");
  if (a.ok) {
    t.eq(a.value.totalDays, 1097, "A 재직일수 1,097(양 끝 포함)");
    t.eq([a.value.years, a.value.months, a.value.days], [3, 0, 1], "A 3년0개월1일");
    t.eq(a.value.decimalYears, 3.0, "A 3.0년");
  }

  // 앵커 C(대표): 2020-03-02 → 2025-08-15
  const c = calculateServicePeriod("2020-03-02", "2025-08-15");
  assert.ok(c.ok, "SP-C ok");
  if (c.ok) {
    t.eq(c.value.totalDays, 1993, "C 재직일수 1,993");
    t.eq([c.value.years, c.value.months, c.value.days], [5, 5, 14], "C 5년5개월14일");
    t.eq(c.value.decimalYears, 5.5, "C 5.5년");
  }

  // 앵커 E(엣지): 같은 날 입·퇴사 → 1일
  const e = calculateServicePeriod("2023-06-01", "2023-06-01");
  assert.ok(e.ok, "SP-E ok");
  if (e.ok) {
    t.eq(e.value.totalDays, 1, "E 같은 날 = 1일(+1 검증)");
    t.eq([e.value.years, e.value.months, e.value.days], [0, 0, 1], "E 0년0개월1일");
  }

  // ---------------------------------------------------------------------------
  // 앵커 F~I(티켓 #2): 말일 입사 + 짧은 달(2월) 차용 경계
  //   기존 앵커 A/C/E는 입사일이 1일·2일·1일이라 "차용(borrow)" 경로 자체를 밟지
  //   않아 이 결함 계열을 구조적으로 못 잡는다. 아래는 차용 1회/2회 경로를 잠근다.
  //
  //   시맨틱 (A) 반복차용의 정의(민법 §160③ 방식(B-2) 아님 — 정책 미결):
  //     종료일⁺ = 종료일+1일. (입사일 → 종료일⁺)를 캘린더 분해하되,
  //     일(日)이 음수면 "한 달씩 거슬러 올라간 달"의 실제 일수를 음수가 해소될
  //     때까지 빌린다. 즉 N년 M개월을 더한 가상일자(예: 2026-02-31 = 2026-03-03)
  //     로부터 종료일⁺까지 남은 일수가 D다.
  //
  //   ※ 기대값은 엔진 출력 복사가 아니라 아래 손계산으로 유도한 값이다.
  // ---------------------------------------------------------------------------

  // 앵커 F(차용 2회, 구 버전이 "26년 1개월 -1일"을 내던 대표 결함):
  //   2000-01-31 → 종료일⁺ 2026-03-02.
  //   26년 → 2026-01-31. 여기서 2026-03-02까지: 1/31→2/28 = 28일, →3/2 = +2일 = 30일.
  //   (26년 1개월 = 가상 2026-02-31 = 3/3 로 종료일⁺ 3/2를 넘어서므로 개월은 0.)
  //   ⇒ 26년 0개월 30일.
  //   totalDays: 2000-01-31→2026-01-31 = 26×365 + 윤일 7회(2000·04·08·12·16·20·24)
  //              = 9,497일. +(1/31→3/1 = 29일) = 9,526일. 양 끝 포함 +1 ⇒ 9,527일.
  //   decimalYears = 9,527/365 = 26.10… ⇒ 26.1
  const f = calculateServicePeriod("2000-01-31", "2026-03-01");
  assert.ok(f.ok, "SP-F ok");
  if (f.ok) {
    t.eq(f.value.totalDays, 9527, "F 재직일수 9,527");
    t.eq([f.value.years, f.value.months, f.value.days], [26, 0, 30], "F 26년0개월30일(차용 2회, 음수 잔존 금지)");
    t.ok(f.value.days >= 0, "F 일(日) 비음수");
    t.eq(f.value.decimalYears, 26.1, "F 26.1년");
  }

  // 앵커 G(차용 1회 · 비음수 경계, F와 같은 입사일):
  //   2000-01-31 → 종료일⁺ 2026-03-11. 26년 → 2026-01-31,
  //   +1개월 = 가상 2026-02-31 = 3/3. 3/3 → 3/11 = 8일. ⇒ 26년 1개월 8일.
  //   (= 구 버전도 동일하게 내던 값 → 회귀 방지용 고정)
  //   totalDays = 9,527 + 9 = 9,536. 9,536/365 = 26.12… ⇒ 26.1
  const g = calculateServicePeriod("2000-01-31", "2026-03-10");
  assert.ok(g.ok, "SP-G ok");
  if (g.ok) {
    t.eq(g.value.totalDays, 9536, "G 재직일수 9,536");
    t.eq([g.value.years, g.value.months, g.value.days], [26, 1, 8], "G 26년1개월8일(차용 1회, 회귀 고정)");
    t.eq(g.value.decimalYears, 26.1, "G 26.1년");
  }

  // 앵커 H(평년 2월 말일 퇴사, 구 버전 "1년 1개월 -2일"):
  //   2020-01-31 → 종료일⁺ 2021-03-01. 1년 → 2021-01-31.
  //   1/31→2/28 = 28일, →3/1 = +1일 ⇒ 29일. (1개월 = 가상 2/31 = 3/3 > 3/1 → 0개월)
  //   ⇒ 1년 0개월 29일.
  //   totalDays: 2020-01-31→2021-01-31 = 366일(2020 윤년, 2/29 포함),
  //              +(1/31→2/28 = 28일) = 394일. +1 ⇒ 395일. 395/365 = 1.08… ⇒ 1.1
  const h = calculateServicePeriod("2020-01-31", "2021-02-28");
  assert.ok(h.ok, "SP-H ok");
  if (h.ok) {
    t.eq(h.value.totalDays, 395, "H 재직일수 395");
    t.eq([h.value.years, h.value.months, h.value.days], [1, 0, 29], "H 1년0개월29일");
    t.eq(h.value.decimalYears, 1.1, "H 1.1년");
  }

  // 앵커 I(윤년 2/29 퇴사 — 윤년 하드코딩 금지 확인, 구 버전 "0년 1개월 -1일"):
  //   2024-01-31 → 종료일⁺ 2024-03-01. 0년. 1/31→2/29 = 29일, →3/1 = +1일 ⇒ 30일.
  //   ⇒ 0년 0개월 30일. totalDays = 29 + 1 = 30일. 30/365 = 0.08… ⇒ 0.1
  const i = calculateServicePeriod("2024-01-31", "2024-02-29");
  assert.ok(i.ok, "SP-I ok");
  if (i.ok) {
    t.eq(i.value.totalDays, 30, "I 재직일수 30");
    t.eq([i.value.years, i.value.months, i.value.days], [0, 0, 30], "I 0년0개월30일(윤년 2/29 = Date 계산)");
  }

  // 앵커 J(months 음수 보정 경로 — 이 수정의 유일한 미검증 하중선이었음):
  //   위 A~I는 전부 보정 전 months >= 0 이라 `if (months < 0)` 경로를 밟지 않는다.
  //   1999-12-31 → 종료일⁺ 2000-01-15. years = 1, months = 0 - 11 = -11,
  //   days = 15 - 31 = -16 → 차용 1회(12월 31일) ⇒ days 15, months -12.
  //   보정 전 months = -12 는 전역 최솟값이며(구조공간 완전 열거 확인),
  //   +12 보정 1회로 정확히 0이 된다 ⇒ 0년 0개월 15일. totalDays = 1 + 14 = 15일.
  //   보정이 1회로 부족해지는 변경이 들어오면 이 앵커가 즉시 깨진다.
  const j = calculateServicePeriod("1999-12-31", "2000-01-14");
  assert.ok(j.ok, "SP-J ok");
  if (j.ok) {
    t.eq(j.value.totalDays, 15, "J 재직일수 15");
    t.eq([j.value.years, j.value.months, j.value.days], [0, 0, 15], "J 0년0개월15일(months 보정 전 -12, 전역 최솟값)");
    t.ok(j.value.months >= 0, "J 개월 비음수");
  }

  // 계약: 종료<입사, 잘못된 입사일
  const err = calculateServicePeriod("2025-01-01", "2024-12-31");
  t.eq(err.ok, false, "종료<입사 → ok:false");
  if (!err.ok) t.eq(err.error, "end-before-start", "error end-before-start");
  const bad = calculateServicePeriod("bad", "2024-12-31");
  t.eq(bad.ok, false, "입사일 오류 → ok:false");
  if (!bad.ok) t.eq(bad.error, "invalid-start", "error invalid-start");
});

// =============================================================================
// 10) severance — 법정 퇴직금(1일 평균임금 × 30 × 재직일수 ÷ 365)
//     출처: planning/severance-pay-calculator-content.md §1-4 앵커 A/C/E (QA 검증)
//     referenceDate 주입(퇴사일 명시 → 결정적).
// =============================================================================

suite("severance", (t) => {
  // 앵커 A(대표): 2019-01-01 → 2024-12-31, P=900만, 상여 600만
  const a = calculateSeverance(
    { startDateISO: "2019-01-01", endDateISO: "2024-12-31", recentPay: 9_000_000, annualBonus: 6_000_000, annualLeavePay: 0 },
    new Date(2026, 0, 1)
  );
  assert.ok(a.ok && a.eligible, "SEV-A ok/eligible");
  if (a.ok && a.eligible) {
    t.eq(a.service.totalDays, 2192, "A 재직일수 2,192");
    t.eq(a.amounts.avgPeriodDays, 92, "A 산정기간 92일");
    t.eq(a.amounts.wageTotal, 10_500_000, "A 임금총액 W(상여 3/12)");
    t.approx(a.amounts.dailyAverage, 114_130.4348, 0.01, "A 1일 평균임금");
    t.eq(a.amounts.severancePay, 20_562_239, "A 예상 퇴직금");
  }

  // 앵커 C: 2021-05-01 → 2025-04-30, P=960만 (산정기간 평년 2월 → 89일)
  const c = calculateSeverance(
    { startDateISO: "2021-05-01", endDateISO: "2025-04-30", recentPay: 9_600_000, annualBonus: 0, annualLeavePay: 0 },
    new Date(2026, 0, 1)
  );
  assert.ok(c.ok && c.eligible, "SEV-C ok/eligible");
  if (c.ok && c.eligible) {
    t.eq(c.amounts.avgPeriodDays, 89, "C 산정기간 89일");
    t.eq(c.amounts.severancePay, 12_952_686, "C 예상 퇴직금");
  }

  // 앵커 E(엣지): 1년 미만 → 지급 대상 아님
  const e = calculateSeverance(
    { startDateISO: "2025-01-01", endDateISO: "2025-08-31", recentPay: 9_000_000, annualBonus: 0, annualLeavePay: 0 },
    new Date(2026, 0, 1)
  );
  assert.ok(e.ok, "SEV-E ok");
  t.eq(e.ok && e.eligible, false, "E 1년 미만 → eligible:false");

  // 계약: 종료<입사 → ok:false
  const err = calculateSeverance(
    { startDateISO: "2025-01-01", endDateISO: "2024-01-01", recentPay: 9_000_000, annualBonus: 0, annualLeavePay: 0 },
    new Date(2026, 0, 1)
  );
  t.eq(err.ok, false, "종료<입사 → ok:false");
});

// =============================================================================
// 11) electricity — 주택용 저압 누진제
//     출처: planning/electricity-bill-calculator-content.md §1-4 앵커 A~D (QA 검증, 2.7%)
// =============================================================================

suite("electricity", (t) => {
  // 앵커 A: 200kWh 기타계절 (1단계)
  const a = calculateElectricity({ usage: 200, season: "other" });
  assert.ok(a.ok, "ELEC-A ok");
  if (a.ok) {
    t.eq(a.result.tier, 1, "A 1단계");
    t.eq(a.result.total, 31_220, "A 최종 청구 31,220");
  }

  // 앵커 B(대표): 350kWh 기타계절 (2단계)
  const b = calculateElectricity({ usage: 350, season: "other" });
  assert.ok(b.ok, "ELEC-B ok");
  if (b.ok) {
    t.eq(b.result.energyFee, 56_190, "B 전력량요금");
    t.eq(b.result.subtotal, 62_690, "B 전기요금계");
    t.eq(b.result.vat, 6_269, "B 부가세");
    t.eq(b.result.powerFund, 1_690, "B 전력기금");
    t.eq(b.result.total, 70_640, "B 최종 청구 70,640");
  }

  // 앵커 C: 500kWh 하계 (3단계)
  const c = calculateElectricity({ usage: 500, season: "summer" });
  assert.ok(c.ok, "ELEC-C ok");
  if (c.ok) {
    t.eq(c.result.tier, 3, "C 3단계");
    t.eq(c.result.total, 110_280, "C 최종 청구 110,280");
  }

  // 앵커 D: 400kWh 기타계절 (2단계 상단)
  const d = calculateElectricity({ usage: 400, season: "other" });
  assert.ok(d.ok && d.result.total === 83_530, "D 최종 청구 83,530");

  // 계약: 음수 사용량 → invalid
  const bad = calculateElectricity({ usage: -5, season: "other" });
  t.eq(bad.ok, false, "음수 사용량 → invalid");
});

// =============================================================================
// 12) units — 단위 변환(canonical-base + 온도 오프셋)
//     출처: planning/unit-converter-content.md §1-6 검증표 (소수 2자리 표기 기준)
// =============================================================================

suite("units", (t) => {
  // 정확값(무손실 계수)
  t.eq(convert(1, "inch", "cm", "length"), 2.54, "1 inch = 2.54 cm");
  t.eq(convert(1, "mile", "km", "length"), 1.609344, "1 mile = 1.609344 km");
  t.eq(convert(1, "lb", "g", "weight"), 453.59237, "1 lb = 453.59237 g");
  t.eq(convert(3, "geun", "kg", "weight"), 1.8, "3 근 = 1.8 kg");
  t.eq(convert(1, "gallon", "L", "volume"), 3.785411784, "1 gallon = 3.785411784 L");

  // 온도(오프셋)
  t.eq(convert(100, "celsius", "fahrenheit", "temperature"), 212, "100℃ = 212℉");
  t.eq(convert(25, "celsius", "kelvin", "temperature"), 298.15, "25℃ = 298.15K");
  t.approx(convert(70, "fahrenheit", "celsius", "temperature")!, 21.11, 0.005, "70℉ ≈ 21.11℃");

  // 면적(평↔㎡): 400/121 상수 — 표시 2자리 반올림으로 대조
  t.eq(round2(convert(20, "pyeong", "sqm", "area")!), 66.12, "20평 ≈ 66.12㎡");
  t.eq(round2(convert(84, "sqm", "pyeong", "area")!), 25.41, "84㎡ ≈ 25.41평");
  t.eq(round2(convert(33, "pyeong", "sqm", "area")!), 109.09, "33평 ≈ 109.09㎡");

  // 계약: 잘못된 단위 id / NaN → null
  t.eq(convert(1, "bad", "cm", "length"), null, "잘못된 단위 → null");
  t.eq(convert(NaN, "cm", "inch", "length"), null, "NaN → null");
});

// =============================================================================
// 13) savings-interest — 적금·예금 이자(세전·과세·세후수령·실효수익률)
//     출처: planning/savings-interest-design.md §3-5 + 마스터 확정 검산(예금 앵커).
//     라운딩: 내부 전정밀도, 표시값 원단위 반올림, Tier② 행 정합(세후이자=세전-과세).
// =============================================================================

suite("savings-interest", (t) => {
  // 앵커(마스터 확정): 예금 1,000만·3.5%·12개월·단리·일반과세
  const dep = calculateSavingsInterest({
    principalOrMonthly: 10_000_000,
    months: 12,
    annualRate: 3.5,
    mode: "deposit",
    method: "simple",
    taxType: "general",
  });
  assert.ok(dep.ok, "SAV-예금 ok");
  if (dep.ok) {
    t.eq(dep.amounts.pretaxInterest, 350_000, "예금 세전이자");
    t.eq(dep.amounts.taxAmount, 53_900, "예금 이자과세(15.4%)");
    t.eq(dep.amounts.afterTaxInterest, 296_100, "예금 세후이자");
    t.eq(dep.amounts.afterTaxReceived, 10_296_100, "예금 세후 수령액");
    t.eq(dep.amounts.effectiveRatePercent, 2.96, "예금 실효수익률 2.96%");
  }

  // 적금 월 50만·3.5%·12개월·단리·일반과세 (n(n+1)/2 가중 검증)
  const ins = calculateSavingsInterest({
    principalOrMonthly: 500_000,
    months: 12,
    annualRate: 3.5,
    mode: "installment",
    method: "simple",
    taxType: "general",
  });
  assert.ok(ins.ok, "SAV-적금 ok");
  if (ins.ok) {
    t.eq(ins.amounts.principalTotal, 6_000_000, "적금 총납입원금");
    t.eq(ins.amounts.pretaxInterest, 113_750, "적금 세전이자(가중)");
    t.eq(ins.amounts.taxAmount, 17_518, "적금 이자과세");
    t.eq(ins.amounts.afterTaxInterest, 96_232, "적금 세후이자(=세전-과세, 정합)");
    t.eq(ins.amounts.afterTaxReceived, 6_096_232, "적금 세후 수령액");
  }

  // 월복리 > 단리 (예금 1,000만·3.5%·12개월·일반과세)
  const cmp = calculateSavingsInterest({
    principalOrMonthly: 10_000_000,
    months: 12,
    annualRate: 3.5,
    mode: "deposit",
    method: "monthlyCompound",
    taxType: "general",
  });
  assert.ok(cmp.ok, "SAV-월복리 ok");
  if (cmp.ok) {
    t.eq(cmp.amounts.pretaxInterest, 355_670, "예금 월복리 세전이자");
    t.ok(cmp.amounts.pretaxInterest > 350_000, "월복리 > 단리");
  }

  // 비과세: 세금 0, 세후이자=세전이자
  const free = calculateSavingsInterest({
    principalOrMonthly: 500_000,
    months: 24,
    annualRate: 4,
    mode: "installment",
    method: "simple",
    taxType: "taxFree",
  });
  assert.ok(free.ok, "SAV-비과세 ok");
  if (free.ok) {
    t.eq(free.amounts.taxAmount, 0, "비과세 과세 0");
    t.eq(free.amounts.afterTaxInterest, free.amounts.pretaxInterest, "비과세 세후=세전");
  }

  // 엣지: 연이율 0% → 이자 0, 세후수령=원금 (게이트 아님, 정상 결과)
  const zero = calculateSavingsInterest({
    principalOrMonthly: 10_000_000,
    months: 12,
    annualRate: 0,
    mode: "deposit",
    method: "monthlyCompound",
    taxType: "general",
  });
  assert.ok(zero.ok, "SAV-0% ok");
  if (zero.ok) {
    t.eq(zero.amounts.pretaxInterest, 0, "0% 세전이자 0");
    t.eq(zero.amounts.afterTaxReceived, 10_000_000, "0% 세후수령=원금");
  }

  // 계약: 무효 입력 → ok:false 판별 유니온
  t.eq(
    calculateSavingsInterest({ principalOrMonthly: 0, months: 12, annualRate: 3.5, mode: "deposit", method: "simple", taxType: "general" }).ok,
    false,
    "금액 0 → ok:false"
  );
  t.eq(
    calculateSavingsInterest({ principalOrMonthly: 100, months: 12.5, annualRate: 3.5, mode: "deposit", method: "simple", taxType: "general" }).ok,
    false,
    "비정수 개월 → ok:false"
  );
  t.eq(
    calculateSavingsInterest({ principalOrMonthly: 100, months: 12, annualRate: -1, mode: "deposit", method: "simple", taxType: "general" }).ok,
    false,
    "음수 이율 → ok:false"
  );
  t.eq(
    calculateSavingsInterest({ principalOrMonthly: 100, months: 601, annualRate: 3.5, mode: "deposit", method: "simple", taxType: "general" }).ok,
    false,
    "600개월 초과 → ok:false"
  );
});

// =============================================================================
// 14) car-tax — 자동차세(본세·차령경감·교육세·연세액·정기분·연납)
//     출처: planning/car-tax-design.md §3-2 워크드 예시 케이스 A/B/C (마스터 확정).
//     라운딩: baseTax 먼저 정수화 후 교육세·할인·연세액 파생(Tier 정합).
// =============================================================================

suite("car-tax", (t) => {
  // 케이스 A: 2,000cc · 2020등록 · 내연 (1,600cc 초과 200원/cc, 차령 6년 20% 경감)
  const a = calculateCarTax({ kind: "combustion", cc: 2000, registerYear: 2020 });
  assert.ok(a.ok, "CAR-A ok");
  if (a.ok) {
    t.eq(a.amounts.baseTaxRaw, 400_000, "A 본세(경감 전) 2000×200");
    t.eq(a.amounts.carAge, 6, "A 차령 6년");
    t.eq(a.amounts.reliefRate, 0.2, "A 경감률 20%");
    t.eq(a.amounts.baseTax, 320_000, "A 본세(경감 후)");
    t.eq(a.amounts.educationTax, 96_000, "A 지방교육세(30%)");
    t.eq(a.amounts.annualTotal, 416_000, "A 연세액 총액(Tier①)");
    t.eq(a.amounts.semiAnnual, 208_000, "A 정기분 각 회차");
    t.eq(a.amounts.prepayDiscount, 9_600, "A 연납 할인액(본세 3%)");
    t.eq(a.amounts.prepayTotal, 406_400, "A 연납 납부액");
  }

  // 케이스 B: 전기·수소차 · 2023등록 (정액 10만, 경감 없음)
  const b = calculateCarTax({ kind: "eco", cc: 0, registerYear: 2023 });
  assert.ok(b.ok, "CAR-B ok");
  if (b.ok) {
    t.eq(b.amounts.baseTax, 100_000, "B 본세 정액 10만");
    t.eq(b.amounts.reliefRate, 0, "B eco 경감 없음");
    t.eq(b.amounts.educationTax, 30_000, "B 교육세 3만");
    t.eq(b.amounts.annualTotal, 130_000, "B 연세액 총액");
    t.eq(b.amounts.semiAnnual, 65_000, "B 정기분 각 65,000");
    t.eq(b.amounts.prepayDiscount, 3_000, "B 연납 할인 3,000");
    t.eq(b.amounts.prepayTotal, 127_000, "B 연납 납부액");
  }

  // 케이스 C: 1,600cc · 2010등록 · 내연 (경감 상한 50%, 1,600cc는 140원/cc 구간)
  const c = calculateCarTax({ kind: "combustion", cc: 1600, registerYear: 2010 });
  assert.ok(c.ok, "CAR-C ok");
  if (c.ok) {
    t.eq(c.amounts.baseTaxRaw, 224_000, "C 본세(경감 전) 1600×140");
    t.eq(c.amounts.reliefRate, 0.5, "C 경감률 상한 50%");
    t.eq(c.amounts.baseTax, 112_000, "C 본세(경감 후)");
    t.eq(c.amounts.annualTotal, 145_600, "C 연세액 총액");
  }

  // 경계값: 1,600cc → 140원/cc, 1,601cc → 200원/cc (cc<=maxCc 순차 매칭)
  const edge1600 = calculateCarTax({ kind: "combustion", cc: 1600, registerYear: 2026 });
  const edge1601 = calculateCarTax({ kind: "combustion", cc: 1601, registerYear: 2026 });
  assert.ok(edge1600.ok && edge1601.ok, "경계 ok");
  if (edge1600.ok) t.eq(edge1600.amounts.baseTaxRaw, 224_000, "1600cc → 140원/cc");
  if (edge1601.ok) t.eq(edge1601.amounts.baseTaxRaw, 320_200, "1601cc → 200원/cc");

  // 차령<3 → 경감 0% (2024등록=차령2, 2026등록=차령0)
  const age2 = calculateCarTax({ kind: "combustion", cc: 2000, registerYear: 2024 });
  const age0 = calculateCarTax({ kind: "combustion", cc: 2000, registerYear: 2026 });
  assert.ok(age2.ok && age0.ok, "차령<3 ok");
  if (age2.ok) t.eq(age2.amounts.reliefRate, 0, "차령 2년 → 경감 0");
  if (age0.ok) {
    t.eq(age0.amounts.reliefRate, 0, "차령 0년 → 경감 0");
    t.eq(age0.amounts.baseTax, 400_000, "차령 0년 본세=경감 전");
  }

  // 방어: 배기량 정수 1~9,999 밖 → invalid-cc
  t.eq(calculateCarTax({ kind: "combustion", cc: 0, registerYear: 2020 }).ok, false, "cc 0 → invalid-cc");
  t.eq(calculateCarTax({ kind: "combustion", cc: -100, registerYear: 2020 }).ok, false, "cc 음수 → invalid-cc");
  t.eq(calculateCarTax({ kind: "combustion", cc: 1999.5, registerYear: 2020 }).ok, false, "cc 소수 → invalid-cc");
  t.eq(calculateCarTax({ kind: "combustion", cc: 10000, registerYear: 2020 }).ok, false, "cc 9,999 초과 → invalid-cc");
  const badCc = calculateCarTax({ kind: "combustion", cc: 0, registerYear: 2020 });
  t.eq(badCc.ok === false && badCc.error, "invalid-cc", "cc 에러코드 invalid-cc");

  // 방어: 등록연도 정수 1900~2026 밖 or 비정수 → invalid-year
  t.eq(calculateCarTax({ kind: "combustion", cc: 2000, registerYear: 1899 }).ok, false, "연도 1900 미만 → invalid-year");
  t.eq(calculateCarTax({ kind: "combustion", cc: 2000, registerYear: 2027 }).ok, false, "연도 2026 초과 → invalid-year");
  t.eq(calculateCarTax({ kind: "combustion", cc: 2000, registerYear: 2020.5 }).ok, false, "연도 비정수 → invalid-year");
  const badYear = calculateCarTax({ kind: "combustion", cc: 2000, registerYear: 2027 });
  t.eq(badYear.ok === false && badYear.error, "invalid-year", "연도 에러코드 invalid-year");
  // eco도 등록연도 방어는 동일 적용(배기량은 무시)
  t.eq(calculateCarTax({ kind: "eco", cc: 0, registerYear: 2027 }).ok, false, "eco 연도 초과 → invalid-year");
});

// =============================================================================
// 15) annual-leave-allowance — 미사용 연차수당(월통상임금 ÷ 209 × 8 × 미사용일수)
//     출처: planning/annual-leave-allowance-content.md §검산 기록
//           + lib/calculators.ts interpretation/Q1(라이브 본문, 2026-07-29 QA 검증)
//     기대값 취득: 2026-07-30 스크래치에서 lib/annual-leave-allowance.ts를 그대로
//       import 해 실행한 출력을 그대로 옮겼다(수기 계산값 아님).
//         calculateAnnualLeaveAllowance({monthlyWage:3_000_000,unusedDays:10,serviceYears:5})
//         → {kind:"paid", amounts:{hourlyOrdinaryWage:14354, dailyOrdinaryWage:114833,
//            allowance:1148325}, accrual:{accruedDays:17, underOneYear:false}}
//
//     ★ 이 스위트가 지키는 핵심 결함(기획 문서가 "재현성 리스크"로 지목한 것):
//       총액을 **표시용 1일 통상임금(114,833)** 에 곱하면 1,148,330이 되어 라이브
//       본문(1,148,325)과 5원 어긋난다. 총액은 전 정밀도 dailyRaw × 일수를 1회만
//       반올림해야 한다. 앵커 A/B/C가 이 경로를 3중으로 잠근다.
// =============================================================================

suite("annual-leave", (t) => {
  // 앵커 A(대표 = 라이브 본문·07-29 검증값): 월 통상임금 300만 · 미사용 10일 · 근속 5년
  const a = calculateAnnualLeaveAllowance({
    monthlyWage: 3_000_000,
    unusedDays: 10,
    serviceYears: 5,
  });
  assert.ok(a.ok, "AL-A ok");
  if (a.ok) {
    t.eq(a.kind, "paid", "A kind=paid(미사용>0)");
    t.eq(a.amounts.hourlyOrdinaryWage, 14_354, "A 시간당 통상임금(3,000,000÷209=14,354.07)");
    t.eq(a.amounts.dailyOrdinaryWage, 114_833, "A 1일 통상임금(×8=114,832.54 반올림)");
    // 표시용 1일값 곱셈(114,833×10=1,148,330)이면 여기서 깨진다.
    t.eq(a.amounts.allowance, 1_148_325, "A 연차수당 총액(전 정밀도 1회 반올림; 표시값 곱하면 1,148,330)");
    t.eq(a.accrual?.serviceYears, 5, "A 근속연수 에코");
    t.eq(a.accrual?.accruedDays, 17, "A 근속 5년 발생 연차 17일");
    t.eq(a.accrual?.underOneYear, false, "A 1년 이상");
  }

  // 앵커 B(반올림 방향 — 시간당·1일 둘 다 올림 경계): 월 250만 · 7일
  //   hourlyRaw 11,961.7224 → round 11,962 (floor면 11,961)
  //   dailyRaw  95,693.7799 → round 95,694  (floor면 95,693)
  //   총액 raw  669,856.4593 → 669,856. 표시값 곱(95,694×7)이면 669,858.
  const b = calculateAnnualLeaveAllowance({ monthlyWage: 2_500_000, unusedDays: 7 });
  assert.ok(b.ok, "AL-B ok");
  if (b.ok) {
    t.eq(b.amounts.hourlyOrdinaryWage, 11_962, "B 시간당(반올림; floor면 11,961)");
    t.eq(b.amounts.dailyOrdinaryWage, 95_694, "B 1일(반올림; floor면 95,693)");
    t.eq(b.amounts.allowance, 669_856, "B 총액(표시값 곱하면 669,858)");
    t.eq(b.accrual, undefined, "B 근속 미입력 → accrual undefined");
  }

  // 앵커 C(반올림 방향 — 총액이 올림되는 일수): 월 300만 · 3일
  //   총액 raw 344,497.6077 → round 344,498 (floor면 344,497 / 표시값 곱이면 344,499)
  const c = calculateAnnualLeaveAllowance({ monthlyWage: 3_000_000, unusedDays: 3 });
  assert.ok(c.ok, "AL-C ok");
  if (c.ok) {
    t.eq(c.amounts.allowance, 344_498, "C 총액 344,498(floor면 344,497·표시값 곱이면 344,499)");
  }

  // 앵커 D(반차 0.5일 — 소수 일수 허용): 총액 raw 57,416.2679 → 57,416
  const d = calculateAnnualLeaveAllowance({ monthlyWage: 3_000_000, unusedDays: 0.5 });
  assert.ok(d.ok, "AL-D ok");
  if (d.ok) {
    t.eq(d.kind, "paid", "D 0.5일도 paid");
    t.eq(d.amounts.allowance, 57_416, "D 반차 0.5일 총액 57,416");
  }

  // 앵커 E(0일 = 게이트 아님, 중립 kind:"zero"): 통상임금은 그대로 산출, 총액만 0
  const e = calculateAnnualLeaveAllowance({ monthlyWage: 3_000_000, unusedDays: 0 });
  assert.ok(e.ok, "AL-E ok");
  if (e.ok) {
    t.eq(e.kind, "zero", "E 미사용 0일 → kind=zero(ok:false 아님)");
    t.eq(e.amounts.hourlyOrdinaryWage, 14_354, "E 시간당은 그대로 산출");
    t.eq(e.amounts.allowance, 0, "E 총액 0");
  }

  // 발생 연차일수 테이블 — 15 + floor((n−1)÷2), 상한 25 / 1년 미만 1개월당 1일·상한 11
  //   ※ n=2 → 15 는 off-by-one 잠금이다. floor(n÷2)로 바뀌면 16이 되어 깨진다.
  t.eq(computeAccruedLeaveDays(0.5), { accruedDays: 6, underOneYear: true }, "근속 0.5년 → 6일(1개월당 1일)");
  t.eq(computeAccruedLeaveDays(0.99), { accruedDays: 11, underOneYear: true }, "근속 1년 미만 상한 11일");
  t.eq(computeAccruedLeaveDays(1), { accruedDays: 15, underOneYear: false }, "근속 1년 → 15일");
  t.eq(computeAccruedLeaveDays(2), { accruedDays: 15, underOneYear: false }, "근속 2년 → 15일(floor((n−1)/2) off-by-one 잠금)");
  t.eq(computeAccruedLeaveDays(3), { accruedDays: 16, underOneYear: false }, "근속 3년 → 16일");
  t.eq(computeAccruedLeaveDays(4), { accruedDays: 16, underOneYear: false }, "근속 4년 → 16일");
  t.eq(computeAccruedLeaveDays(7), { accruedDays: 18, underOneYear: false }, "근속 7년 → 18일");
  t.eq(computeAccruedLeaveDays(23), { accruedDays: 25, underOneYear: false }, "근속 23년 → 25일(상한)");
  t.eq(computeAccruedLeaveDays(40), { accruedDays: 25, underOneYear: false }, "근속 40년 → 25일(상한 고정)");

  // 계약: 무효 입력 → ok:false 판별 유니온 + 에러코드
  const badWage = calculateAnnualLeaveAllowance({ monthlyWage: 0, unusedDays: 10 });
  t.eq(badWage.ok, false, "통상임금 0 → ok:false");
  t.eq(badWage.ok === false && badWage.error, "invalid-wage", "에러코드 invalid-wage");
  const badDays = calculateAnnualLeaveAllowance({ monthlyWage: 3_000_000, unusedDays: -1 });
  t.eq(badDays.ok === false && badDays.error, "invalid-unused-days", "음수 일수 → invalid-unused-days");
  const badYears = calculateAnnualLeaveAllowance({ monthlyWage: 3_000_000, unusedDays: 10, serviceYears: -1 });
  t.eq(badYears.ok === false && badYears.error, "invalid-service-years", "음수 근속 → invalid-service-years");
  const nanWage = calculateAnnualLeaveAllowance({ monthlyWage: NaN, unusedDays: 10 });
  t.eq(nanWage.ok === false && nanWage.error, "invalid-wage", "NaN 통상임금 → invalid-wage");
});

// =============================================================================
// 16) weekly-holiday-allowance — 주휴수당((min(h,40) ÷ 40) × 8 × 시급)
//     출처: planning/weekly-holiday-allowance-design.md §5 예시(주 20h·10,320원)
//           + lib/blog.ts 라이브 근무형태 표(주 15/20/25/30/40h, 2026-07-29 QA 검증
//             — **2026년 최저시급 기준 시점**의 표다)
//     ※ 위 "출처"는 **그 시점의 것**이고, 앞으로도 그렇게만 읽어야 한다. 라이브 블로그
//       표는 이후 minimumWageHolidayExample() 파생으로 바뀌어, 최저시급 상수를 교체하면
//       새 기준값으로 이동한다. 반면 아래 앵커는 **교체 후에도 그대로 두는 것이 정답**이다
//       — 앵커는 시급을 리터럴 인자로 넘겨 "고정 입력 → 고정 출력"을 잠그는 장치이지,
//       라이브 표시값을 따라가는 장치가 아니다. 따라서 교체 후 "라이브 표 ≠ 앵커"는
//       엔진 결함이 아니라 정상이며, 그걸 근거로 앵커 값을 갱신하면 회귀 잠금이 풀린다.
//     기대값 취득: 2026-07-30 스크래치에서 lib/weekly-holiday-allowance.ts를 그대로
//       import 해 실행한 출력을 그대로 옮겼다(수기 계산값 아님).
//         calculateWeeklyHolidayAllowance({hourlyWage:10_320, weeklyHours:20})
//         → {eligible:true, amounts:{appliedHours:20, capApplied:false,
//            holidayConvertedHours:4, weeklyAllowance:41280, monthlyAllowance:179362,
//            effectiveHourlyWage:12384, monthlyWageWithHoliday:1076170}}
//     ※ 시급 상수(2026 최저시급 10,320원)는 lib/minimum-wage.ts가 단일 소스지만,
//       엔진은 시급을 인자로만 받으므로 여기서는 리터럴을 쓴다(요율 상수 아님).
// =============================================================================

suite("weekly-holiday", (t) => {
  // 앵커 A(대표 = 디자인 §5 예시 · **2026년 기준 시점**의 라이브 블로그 표).
  //   인자·기대값은 최저시급 교체 후에도 갱신하지 않는다 — 위 ※ 참조.
  const a = calculateWeeklyHolidayAllowance({ hourlyWage: 10_320, weeklyHours: 20 });
  assert.ok(a.ok && a.eligible, "WH-A ok/eligible");
  if (a.ok && a.eligible) {
    t.eq(a.amounts.appliedHours, 20, "A 적용 소정근로시간 20");
    t.eq(a.amounts.capApplied, false, "A 40시간 상한 미적용");
    t.eq(a.amounts.holidayConvertedHours, 4, "A 주휴 환산 4시간((20÷40)×8)");
    t.eq(a.amounts.weeklyAllowance, 41_280, "A 1주 주휴수당 41,280");
    // raw 179,361.6 → 반올림 179,362. floor로 되돌리면 179,361.
    t.eq(a.amounts.monthlyAllowance, 179_362, "A 월 환산 179,362(4.345주; floor면 179,361)");
    t.eq(a.amounts.effectiveHourlyWage, 12_384, "A 주휴 포함 실질시급 12,384(명목×1.2)");
    // raw 1,076,169.6 → 1,076,170.
    t.eq(a.amounts.monthlyWageWithHoliday, 1_076_170, "A 주휴 포함 월 예상급여 1,076,170(floor면 1,076,169)");
  }

  // 앵커 B(지급 게이트 경계 15시간): 15h는 발생, 14.9h는 미발생
  const b15 = calculateWeeklyHolidayAllowance({ hourlyWage: 10_320, weeklyHours: 15 });
  assert.ok(b15.ok && b15.eligible, "WH-B15 ok/eligible(15h는 발생)");
  if (b15.ok && b15.eligible) {
    t.eq(b15.amounts.holidayConvertedHours, 3, "B15 주휴 환산 3시간");
    t.eq(b15.amounts.weeklyAllowance, 30_960, "B15 1주 주휴수당 30,960");
    t.eq(b15.amounts.monthlyAllowance, 134_521, "B15 월 환산 134,521");
  }
  const b149 = calculateWeeklyHolidayAllowance({ hourlyWage: 10_320, weeklyHours: 14.9 });
  assert.ok(b149.ok, "WH-B14.9 ok");
  t.eq(b149.ok && b149.eligible, false, "B14.9 초단시간(<15h) → eligible:false");
  t.ok(b149.ok && b149.eligible === false && b149.info.weeklyHours === 14.9, "B14.9 게이트여도 info는 유지");

  // 앵커 C(40시간 상한 + 실질시급 분모): 시급 10,320원 · 주 45시간
  //   상한이 없으면 주휴수당이 (45÷40)×8×10,320 = 92,880으로 부풀고,
  //   실질시급 분모를 clamp된 40으로 쓰면 12,384가 되어 12,155와 갈린다.
  const c = calculateWeeklyHolidayAllowance({ hourlyWage: 10_320, weeklyHours: 45 });
  assert.ok(c.ok && c.eligible, "WH-C ok/eligible");
  if (c.ok && c.eligible) {
    t.eq(c.amounts.appliedHours, 40, "C 적용 시간 40으로 상한");
    t.eq(c.amounts.capApplied, true, "C capApplied");
    t.eq(c.amounts.holidayConvertedHours, 8, "C 주휴 환산 8시간(상한)");
    t.eq(c.amounts.weeklyAllowance, 82_560, "C 1주 주휴수당 82,560(상한 없으면 92,880)");
    // raw 12,154.6667 → 12,155. 분모를 appliedHours(40)로 쓰면 12,384가 된다.
    t.eq(c.amounts.effectiveHourlyWage, 12_155, "C 실질시급 12,155(분모=실제 45h; clamp면 12,384)");
    t.eq(c.amounts.monthlyWageWithHoliday, 2_376_541, "C 주휴 포함 월 예상급여 2,376,541");
  }

  // 앵커 D(정확히 40시간 = 상한 미적용 경계)
  const d = calculateWeeklyHolidayAllowance({ hourlyWage: 10_320, weeklyHours: 40 });
  assert.ok(d.ok && d.eligible, "WH-D ok/eligible");
  if (d.ok && d.eligible) {
    t.eq(d.amounts.capApplied, false, "D h=40은 상한 미적용(초과가 아님)");
    t.eq(d.amounts.weeklyAllowance, 82_560, "D 1주 주휴수당 82,560");
    t.eq(d.amounts.monthlyAllowance, 358_723, "D 월 환산 358,723");
    t.eq(d.amounts.effectiveHourlyWage, 12_384, "D 실질시급 12,384");
  }

  // 앵커 E(반올림 방향 — 주 단위 금액 자체가 소수인 경우): 시급 10,321원 · 주 18시간
  //   weeklyRaw 37,155.6 → round 37,156 (floor면 37,155)
  //   monthlyRaw 161,441.082 → 161,441 / effectiveRaw 12,385.0 근방
  const e = calculateWeeklyHolidayAllowance({ hourlyWage: 10_321, weeklyHours: 18 });
  assert.ok(e.ok && e.eligible, "WH-E ok/eligible");
  if (e.ok && e.eligible) {
    t.eq(e.amounts.holidayConvertedHours, 3.6, "E 주휴 환산 3.6시간");
    t.eq(e.amounts.weeklyAllowance, 37_156, "E 1주 주휴수당 37,156(raw 37,155.6; floor면 37,155)");
    t.eq(e.amounts.monthlyAllowance, 161_441, "E 월 환산 161,441");
    t.eq(e.amounts.effectiveHourlyWage, 12_385, "E 실질시급 12,385");
    t.eq(e.amounts.monthlyWageWithHoliday, 968_646, "E 주휴 포함 월 예상급여 968,646");
  }

  // 계약: 무효 입력 → ok:false 판별 유니온 + 에러코드
  const badWage = calculateWeeklyHolidayAllowance({ hourlyWage: 0, weeklyHours: 20 });
  t.eq(badWage.ok, false, "시급 0 → ok:false");
  t.eq(badWage.ok === false && badWage.error, "invalid-wage", "에러코드 invalid-wage");
  const badHours = calculateWeeklyHolidayAllowance({ hourlyWage: 10_320, weeklyHours: 0 });
  t.eq(badHours.ok === false && badHours.error, "invalid-hours", "근로시간 0 → invalid-hours");
  const nanWage = calculateWeeklyHolidayAllowance({ hourlyWage: NaN, weeklyHours: 20 });
  t.eq(nanWage.ok === false && nanWage.error, "invalid-wage", "NaN 시급 → invalid-wage");
});

// =============================================================================
// 17) loan-prepayment '계산식' 표시행 — 좌변·우변 등식 정합 (2026-07-31 티켓 #19)
//
// 결함: components/LoanPrepaymentFeeCalculator.tsx의 '계산식' ClauseRow가
//   좌변에 **표시용 반올림 잔존비율**(formatRatio = pct.toFixed(1))을 쓰면서
//   우변에는 엔진의 **전정밀도** fee = floor(A × f × R_m / (100 × D_m))를 찍었다.
//   → 사용자가 화면의 좌변을 그대로 곱해도 우변이 안 나온다(최대 수백 원 어긋남).
//   블로그 본문 F-3(2026-07-30, lib/blog.ts L4116)과 동일 결함 클래스인데,
//   이쪽은 계산기 결과화면이라 노출도가 더 높았다.
//
// 처방: 좌변을 반올림 없는 분수형 `R_m ÷ D_m`으로 바꾸고 `(원 미만 절사)` 명시.
//
// ★ 이 스위트의 설계 원칙 — "값이 무엇이다"가 아니라 "결함을 잡는가":
//   앵커마다 3중으로 잠근다.
//     (a) 렌더 문자열 완전 일치      → 반올림% 표기로 되돌리면 즉시 깨진다
//     (b) 구조 가드 !/%\s*=/         → 좌변 끝이 "…% ="(반올림 비율) 형태면 깨진다
//     (c) 좌변 정수산술 재계산 == fee → 분수형이 실제로 등식을 만족함을 증명
//   추가로 (d) **앵커 비공허성 증명**: 같은 입력에서 구(결함) 좌변을 실제로
//   계산해 fee와 어긋남을 단언한다. 오차가 0인 입력만 골라 "통과"시키는
//   무의미한 앵커를 원천 차단한다(A1은 +234원, A2는 −38원으로 부호도 반대).
//
// 기대 문자열은 지어낸 게 아니라 2026-07-31 스크래치에서 실제 빌더를 실행해 얻었다.
// =============================================================================

suite("prepayment 계산식 표시", (t) => {
  /**
   * 좌변(분수형)을 부동소수 없이 정수 산술로 재계산: floor(A × f × R ÷ (100 × D)).
   * BigInt로 곱해서 엔진의 float 곱셈 경로와 독립적으로 정답을 얻는다.
   * (BigInt 리터럴 `100n`은 tsconfig target ES2017에서 금지 → BigInt() 생성자 사용.)
   */
  const exactFloor = (A: number, feeRateX100: number, R: number, D: number): number =>
    Number(
      (BigInt(A) * BigInt(feeRateX100) * BigInt(R)) / (BigInt(10_000) * BigInt(D))
    );

  /** 구(결함) 좌변 재현: 화면에 찍히던 반올림 잔존비율(소수 1자리)로 곱한 값. */
  const buggyLeftSide = (A: number, feeRate: number, ratio: number): number => {
    const shownPct = Number((ratio * 100).toFixed(1)); // = formatRatio 표시값
    return Math.floor((A * feeRate * shownPct) / (100 * 100));
  };

  interface Anchor {
    label: string;
    input: { amount: number; feeRate: number; elapsedMonths: number; totalMonths: number };
    feeRateX100: number;
    expected: string;
    /** 구 표기가 만들어내던 오차(원). 0이면 앵커가 공허하다는 뜻 → 단언으로 금지. */
    legacyError: number;
  }

  const anchors: Anchor[] = [
    {
      // 블로그 F-3와 같은 시나리오(1억·0.7%·경과 12개월·만기 360 → 3년 캡).
      // 구 표기: "1억원 × 0.7% × 66.7% = 466,666원" → 좌변을 곱하면 466,900원(+234).
      label: "A1 1억·0.7%·잔존24/36",
      input: { amount: 100_000_000, feeRate: 0.7, elapsedMonths: 12, totalMonths: 360 },
      feeRateX100: 70,
      expected: "1억원 × 0.7% × 24 ÷ 36 = 466,666원(원 미만 절사)",
      legacyError: 234,
    },
    {
      // 폼 기본값 경로(T=36, f=0.7). ratio 86.1…% → 구 좌변은 301,350원(−38).
      // 오차 부호가 A1과 반대라 "항상 크게/작게 나온다"는 오해도 차단한다.
      label: "A2 5천만·0.7%·잔존31/36",
      input: { amount: 50_000_000, feeRate: 0.7, elapsedMonths: 5, totalMonths: 36 },
      feeRateX100: 70,
      expected: "5,000만원 × 0.7% × 31 ÷ 36 = 301,388원(원 미만 절사)",
      legacyError: -38,
    },
    {
      // 엔진 스위트 앵커 B(위 5번)와 완전히 같은 입력 — 엔진값 433,333 고정 상태에서
      // 표시 문자열만 검증하므로, 엔진/표시 중 어느 쪽이 틀어져도 잡힌다.
      label: "A3 1억·0.65%·잔존24/36",
      input: { amount: 100_000_000, feeRate: 0.65, elapsedMonths: 12, totalMonths: 360 },
      feeRateX100: 65,
      expected: "1억원 × 0.65% × 24 ÷ 36 = 433,333원(원 미만 절사)",
      legacyError: 217,
    },
  ];

  for (const a of anchors) {
    const out = calculateLoanPrepayment(a.input);
    assert.ok(out.ok, `${a.label}: 엔진 ok`);
    if (!out.ok) continue;
    const r = out.result;
    assert.ok(!r.isExempt, `${a.label}: 비면제 경로여야 한다`);

    const line = formatPrepaymentFormulaLine(r);

    // (a) 렌더 문자열 완전 일치
    t.eq(line, a.expected, `${a.label} 계산식 렌더 문자열`);

    // (b) 구조 가드: 좌변 끝이 "…% ="(= 반올림 잔존비율)이면 결함 복귀
    t.ok(
      !/%\s*=/.test(line),
      `${a.label} 좌변에 반올림 잔존비율%가 없다(있으면 티켓 #19 회귀)`
    );
    t.ok(line.includes(` ÷ ${r.baseMonths} =`), `${a.label} 분수형 분모 ÷${r.baseMonths} 표기`);
    t.ok(line.endsWith("원(원 미만 절사)"), `${a.label} 절사 라운딩 명시`);

    // (c) 좌변(분수형)을 정수 산술로 재계산하면 우변 fee와 정확히 일치
    t.eq(
      exactFloor(r.amount, a.feeRateX100, r.remainingMonths, r.baseMonths),
      r.fee,
      `${a.label} 좌변 재계산 == 우변 fee(등식 성립)`
    );

    // (d) 앵커 비공허성: 구(결함) 좌변은 fee와 실제로 어긋난다
    const legacy = buggyLeftSide(r.amount, r.feeRate, r.ratio);
    t.eq(legacy - r.fee, a.legacyError, `${a.label} 구 표기 오차 ${a.legacyError}원(0이면 앵커 무효)`);
    t.ok(legacy !== r.fee, `${a.label} 구 표기는 등식이 깨진다(앵커가 결함을 노출)`);
  }

  // 면제 분기는 이 빌더를 쓰지 않는다(화면은 "0원 (면제)" 고정). 경로 분리 잠금.
  const exempt = calculateLoanPrepayment({
    amount: 50_000_000,
    feeRate: 1.2,
    elapsedMonths: 40,
    totalMonths: 360,
  });
  assert.ok(exempt.ok, "면제 케이스 ok");
  if (exempt.ok) {
    t.eq(exempt.result.isExempt, true, "면제 → 계산식 행 대신 '0원 (면제)' 행이 렌더된다");
    t.eq(exempt.result.fee, 0, "면제 수수료 0");
  }
});

// =============================================================================
// 18) loan-prepayment 잔존비율 표기 — 자릿수(#16) · 등호 방향(#15) (티켓 #22)
//
// 표준: planning/ratio-percent-display-rules.md §2-2(정수 처리) · §2-3(등호 방향).
//
// #16 결함: formatRatio가 정수 판정을 **반올림 전** 값으로 해서, 9÷31 = 29.032%가
//   화면에 "29.0%"로 찍혔다. 표준은 "반올림 후 정수면 소수점 생략" → "29%".
//   (`.0`의 유무는 미관이 아니라 "반올림값 vs 정확값"의 신호라서 의미가 있다 — §2-2)
//   처방: lib/ratio-display.ts formatDsr와 동일하게 Math.round(x*10)/10 후 정수 판정.
//   (#18 처리 시 formatDsr가 DsrCalculator.tsx:45 → lib/ratio-display.ts로 이동)
//
// #15 결함: '잔존기간' 근거행이 항상 `=`였다. 우변이 반올림 표시값이면 등식이 거짓이라
//   `≈`가 맞고, **정확히 나누어떨어질 때만** `=`다(18 ÷ 24 = 75%).
//   처방: R×1000 % D === 0 (정수 산술) 로 분기.
//
// ★ 정확성 판정을 부동소수로 하면 안 되는 이유를 앵커로 못박는다:
//   D ≤ 36 전 조합 중 11/20 · 7/25 · 14/25는 ratio*100이 55.00000000000001 등
//   비정수로 나와서, 실수 비교식으로 짜면 **정확값인데 ≈** 로 오판한다.
//   E5 앵커가 정확히 그 케이스이며 (c)에서 오판 재현까지 단언한다(비공허성).
// =============================================================================

suite("prepayment 잔존비율 표기(#15·#16)", (t) => {
  /** 구(결함) formatRatio 재현 — 반올림 **전** 값으로 정수 판정. */
  const legacyFormatRatio = (ratio: number): string => {
    const pct = ratio * 100;
    return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  };

  // ── (1) formatRatio 표시값 (표준 §3-3 L200 제안 케이스 그대로) ──
  t.eq(formatRatio(24 / 36), "66.7", "#16 24/36 → 66.7 (무한소수 → 1자리)");
  t.eq(formatRatio(18 / 24), "75", "#16 18/24 → 75 (정확값, .0 금지)");
  t.eq(formatRatio(9 / 31), "29", "#16 9/31 → 29 (반올림 후 정수 → 소수점 생략)");

  // 비공허성: 9/31은 구 구현에서 실제로 "29.0"이었다(이 앵커가 결함을 노출한다).
  t.eq(legacyFormatRatio(9 / 31), "29.0", "#16 구 구현은 9/31을 29.0으로 표기(앵커 유효)");
  t.eq(legacyFormatRatio(24 / 36), "66.7", "#16 무한소수 케이스는 신·구 동일(표시 불변)");

  // 반올림은 round-half-up(§2-2) — 절사/올림이면 깨진다.
  t.eq(formatRatio(5 / 36), "13.9", "#16 5/36 = 13.888…% → 13.9 (절사면 13.8)");
  t.eq(formatRatio(11 / 20), "55", "#16 11/20 → 55 (float 55.00000000000001에도 정수 표기)");

  interface RatioAnchor {
    label: string;
    input: { amount: number; feeRate: number; elapsedMonths: number; totalMonths: number };
    /** 기대 R_m ÷ D_m */
    rd: [number, number];
    expected: string;
  }

  const anchors: RatioAnchor[] = [
    {
      // ≈ 분기: 24 ÷ 36 = 66.666…% → 표시 66.7%는 근사다.
      label: "E1 잔존24/36(무한소수)",
      input: { amount: 100_000_000, feeRate: 0.7, elapsedMonths: 12, totalMonths: 360 },
      rd: [24, 36],
      expected: "24개월 ÷ 36개월 ≈ 66.7%",
    },
    {
      // = 분기: 18 ÷ 24 = 75% 정확값(표준 §3-1 각주의 바로 그 예시).
      label: "E2 잔존18/24(정확값)",
      input: { amount: 100_000_000, feeRate: 0.7, elapsedMonths: 6, totalMonths: 24 },
      rd: [18, 24],
      expected: "18개월 ÷ 24개월 = 75%",
    },
    {
      // #15 + #16 동시 검증: 29.032…% → 표시 "29"(소수점 생략) + 근사이므로 ≈.
      //   구 코드였다면 "9개월 ÷ 31개월 = 29.0%" — 두 결함이 한 줄에 다 있었다.
      label: "E3 잔존9/31(반올림 후 정수, 근사)",
      input: { amount: 100_000_000, feeRate: 0.7, elapsedMonths: 22, totalMonths: 31 },
      rd: [9, 31],
      expected: "9개월 ÷ 31개월 ≈ 29%",
    },
    {
      // = 분기(1자리 소수까지 정확): 27 ÷ 36 = 75%.
      label: "E4 잔존27/36(정확값)",
      input: { amount: 100_000_000, feeRate: 0.7, elapsedMonths: 9, totalMonths: 36 },
      rd: [27, 36],
      expected: "27개월 ÷ 36개월 = 75%",
    },
    {
      // ★ float 함정 앵커: ratio*100 = 55.00000000000001. 정확값 55%이므로 `=`가 맞다.
      //   정확성 판정을 실수 비교로 짜면 여기서 ≈로 뒤집힌다.
      label: "E5 잔존11/20(float 함정, 정확값)",
      input: { amount: 100_000_000, feeRate: 0.7, elapsedMonths: 9, totalMonths: 20 },
      rd: [11, 20],
      expected: "11개월 ÷ 20개월 = 55%",
    },
  ];

  for (const a of anchors) {
    const out = calculateLoanPrepayment(a.input);
    assert.ok(out.ok, `${a.label}: 엔진 ok`);
    if (!out.ok) continue;
    const r = out.result;
    assert.ok(!r.isExempt, `${a.label}: 비면제 경로여야 한다`);
    t.eq([r.remainingMonths, r.baseMonths], a.rd, `${a.label} 엔진 R_m/D_m`);

    const line = formatRemainingRatioLine(r);

    // (a) 렌더 문자열 완전 일치
    t.eq(line, a.expected, `${a.label} 잔존기간 행 렌더 문자열`);

    // (b) 등호 부호가 정확성과 일치한다(정수 산술 정답과 대조)
    const exact = (r.remainingMonths * 1000) % r.baseMonths === 0;
    t.eq(line.includes(" = "), exact, `${a.label} = 는 정확히 나누어떨어질 때만`);
    t.eq(line.includes(" ≈ "), !exact, `${a.label} ≈ 는 반올림 표시값일 때만`);

    // (c) float 오판 재현 — 실수 비교로 짰다면 어떻게 되는가
    const floatSaysExact = Number.isInteger(r.ratio * 100 * 10);
    if (a.label.startsWith("E5")) {
      t.eq(
        floatSaysExact,
        false,
        `${a.label} 실수 비교는 정확값을 근사로 오판한다(정수 산술이어야 하는 이유)`
      );
      t.eq(exact, true, `${a.label} 정수 산술은 정확값으로 올바르게 판정`);
    }
  }

  // 면제 분기는 이 빌더를 쓰지 않는다(화면은 '경과 …→ 잔존 0' + '0원 (면제)' 고정).
  const exempt = calculateLoanPrepayment({
    amount: 50_000_000,
    feeRate: 0.7,
    elapsedMonths: 36,
    totalMonths: 36,
  });
  assert.ok(exempt.ok, "면제 케이스 ok");
  if (exempt.ok) {
    t.eq(exempt.result.isExempt, true, "잔존 0 → 잔존기간 행 대신 면제 행이 렌더된다");
    t.eq(formatRatio(exempt.result.ratio), "0", "면제 ratio 0 → '0'(0.0 아님)");
  }
});

// =============================================================================
// 19) DSR '계산식' 근거행 — 등호 방향 (티켓 #22 / 표준 Batch 3 표 #18)
//
// 표준: planning/ratio-percent-display-rules.md §2-3 '부가 규칙 — 등호 방향'(L139-142).
//   반올림된 표시 백분율이 등호 우변에 오면 엄밀히 거짓이므로 `=` 대신 `≈`를 쓴다.
//   **정확히 나누어떨어지는 경우만 `=`** — "무조건 ≈ 치환"이 아니라 조건부 분기다.
//
// 판정식: totalYear × 1000 % income === 0 (정수 산술).
//   totalYear·income은 둘 다 정수다 — monthlyPayment는 lib/loan.ts에서 Math.round된
//   정수이고(× 12), 기존 원리금·연소득은 콤마 제거 후 숫자만 남긴 입력이다.
//
// ★ 실수 비교(Number.isInteger(dsr*10))로 짜면 안 되는 이유를 앵커로 못박는다:
//   3,330,000 ÷ 10,000,000은 정확히 33.3%인데 dsr*10 = 333.00000000000006이라
//   실수 비교는 근사로 오판한다.
//   (08-04 QA 독립 재검산 3,042,499 조합 — 엔진 실경로 973,434 / 조밀 합성 격자
//    1,748,665 / 소액·경계 320,400 — 에서 정수 산술 판정식은 BigInt 진리값과
//    불일치 0, 거짓 `=` 0.
//    실수 비교의 오판 **건수**는 스윕 범위에 종속적이라 여기 적지 않는다. 범위와
//    무관하게 성립하는 건 방향이다: 오판은 언제나 truth=true를 false로 뒤집는 쪽
//    — 즉 정확값에 `≈`를 붙이는 결함이 되고, 거짓 `=`를 만드는 방향은 관측된 적이 없다.)
//
// ★ 안전정수 가드: 입력에 상한(maxLength)이 없어 totalYear×1000이 2^53을 넘을 수 있다.
//   그 구간은 판정 불가이므로 보수적으로 `≈`로 떨어뜨린다(거짓 `=`를 만들지 않는 방향).
// =============================================================================

suite("dsr 계산식 등호 방향(#18)", (t) => {
  interface DsrLineAnchor {
    label: string;
    totalYear: number;
    income: number;
    expected: string;
  }

  const anchors: DsrLineAnchor[] = [
    {
      // ≈ 분기 · 이번 변경의 주 타깃. 기획 §1-4 앵커 B(3억/4.5%/360, 연소득 6천).
      //   18,240,672 ÷ 60,000,000 = 30.40112% → 표시 30.4%는 근사다.
      label: "D1 앵커B(무한소수 아님이지만 반올림 발생)",
      totalYear: 18_240_672,
      income: 60_000_000,
      expected: "18,240,672 ÷ 60,000,000 ≈ 30.4 %",
    },
    {
      // = 분기 · 디자인 스펙 §3-5 예시. 38.4%는 정확값이므로 `=`가 옳다.
      //   "무조건 ≈로 치환"했다면 이 앵커가 깨진다.
      label: "D2 디자인 §3-5 예시(정확값)",
      totalYear: 19_200_000,
      income: 50_000_000,
      expected: "19,200,000 ÷ 50,000,000 = 38.4 %",
    },
    {
      // = 분기 · 대출 없음(0%). 0은 항상 정확값.
      label: "D3 대출 없음",
      totalYear: 0,
      income: 50_000_000,
      expected: "0 ÷ 50,000,000 = 0 %",
    },
    {
      // = 분기 · 기획 §1-4 앵커 A(간편경로 40%). 반올림 후 정수 → 소수점 생략.
      label: "D4 앵커A(정확값·정수)",
      totalYear: 20_000_000,
      income: 50_000_000,
      expected: "20,000,000 ÷ 50,000,000 = 40 %",
    },
    {
      // ★ float 함정 앵커: dsr*10 = 333.00000000000006. 정확값 33.3%이므로 `=`가 맞다.
      //   정확성 판정을 실수 비교로 짜면 여기서 ≈로 뒤집힌다.
      label: "D5 float 함정(정확값)",
      totalYear: 3_330_000,
      income: 10_000_000,
      expected: "3,330,000 ÷ 10,000,000 = 33.3 %",
    },
    {
      // ≈ 분기 · 딱 떨어지지 않는 일반 케이스(24.691356% → 24.7%).
      label: "D6 일반 근사",
      totalYear: 12_345_678,
      income: 50_000_000,
      expected: "12,345,678 ÷ 50,000,000 ≈ 24.7 %",
    },
    {
      // ★ 안전정수 초과: 10조 × 1000 = 1e16 > 2^53. 값 자체는 정확히 100%지만
      //   판정 불가 구간이므로 보수적으로 ≈로 떨어져야 한다(거짓 `=` 금지).
      label: "D7 안전정수 초과(판정 불가 → 보수적 ≈)",
      totalYear: 10_000_000_000_000,
      income: 10_000_000_000_000,
      expected: "10,000,000,000,000 ÷ 10,000,000,000,000 ≈ 100 %",
    },
  ];

  for (const a of anchors) {
    const dsr = (a.totalYear / a.income) * 100;
    const line = formatDsrFormulaLine(a.totalYear, a.income, dsr);

    // (a) 렌더 문자열 완전 일치 (공백·" %" 앞 공백까지 포함)
    t.eq(line, a.expected, `${a.label} DSR 계산식 행 렌더 문자열`);

    // (b) 등호 부호가 판정식과 일치한다
    const exact = isRatioExactAt1Decimal(a.totalYear, a.income);
    t.eq(line.includes(" = "), exact, `${a.label} = 는 정확히 나누어떨어질 때만`);
    t.eq(line.includes(" ≈ "), !exact, `${a.label} ≈ 는 반올림/판정불가일 때만`);
  }

  // 비공허성 ①: D5는 실수 비교로 짰다면 실제로 뒤집힌다.
  t.eq(
    Number.isInteger(3_330_000 / 10_000_000 * 100 * 10),
    false,
    "#18 실수 비교는 3,330,000÷10,000,000(정확히 33.3%)을 근사로 오판한다"
  );
  t.eq(
    isRatioExactAt1Decimal(3_330_000, 10_000_000),
    true,
    "#18 정수 산술은 같은 값을 정확값으로 올바르게 판정"
  );

  // 비공허성 ②: 안전정수 가드가 없으면 D7은 거짓 `=`가 된다.
  t.eq(Number.isSafeInteger(10_000_000_000_000 * 1000), false, "#18 D7은 안전정수 초과 구간");
  t.eq(
    (10_000_000_000_000 * 1000) % 10_000_000_000_000 === 0,
    true,
    "#18 가드 없으면 % 결과가 0이라 거짓 `=`가 만들어진다"
  );

  // 판정식 계약: 분모 0/음수는 판정 불가(false) — 0 나눗셈으로 NaN이 새지 않게.
  t.eq(isRatioExactAt1Decimal(1_000_000, 0), false, "#18 분모 0 → 판정 불가(false)");

  // formatDsr는 표시 전용 — 자릿수 표준(§2-2)은 이미 준수 상태이며 이번 변경으로 불변.
  t.eq(formatDsr(30.40112), "30.4", "#18 formatDsr 30.40112 → 30.4 (변경 없음)");
  t.eq(formatDsr(40), "40", "#18 formatDsr 40 → 40 (반올림 후 정수 → 소수점 생략)");
  t.eq(formatDsr(0), "0", "#18 formatDsr 0 → 0");

  // 중도상환과 판정식을 공유한다(중복 구현 제거) — 개월 인자에서도 동작이 같아야 한다.
  t.eq(isRatioExactAt1Decimal(18, 24), true, "#18 공유 판정식: 18÷24 = 75% 정확값");
  t.eq(isRatioExactAt1Decimal(24, 36), false, "#18 공유 판정식: 24÷36 = 66.666…% 근사");
  t.eq(isRatioExactAt1Decimal(11, 20), true, "#18 공유 판정식: 11÷20 = 55% 정확값(float 함정)");
});

// =============================================================================
// 요율 → 정수 bp 변환 가드 (2026-07-29 티켓 #10)
//
// 고용보험 계산은 요율을 정수 베이시스포인트(1/10,000)로 바꿔서 쓴다:
//   EMPLOYMENT_INSURANCE_BP   = Math.round(EMPLOYMENT_INSURANCE_RATE * 10_000)
//   EMPLOYMENT_STABILITY_BP[] = Math.round(EMPLOYMENT_STABILITY_RATE[..] * 10_000)
//
// 이 변환은 **0.5bp 단위 요율을 조용히 반올림한다.** 예를 들어 요율이 0.925%로
// 바뀌면 92.5bp가 정답인데 Math.round가 에러 없이 93으로 올려 버려서, 아무도
// 모르는 사이에 보험료가 틀어진다(0.5bp × 300만원 = 월 150원).
//
// 그래서 "현행 요율이 전부 정수 bp로 정확히 표현되는가"를 여기서 잠근다.
// 요율 갱신자가 0.5bp 요율을 넣으면 이 테스트가 즉시 깨지고, 그때는 bp 분모를
// 10_000에서 100_000으로 올리는 등 표현 방식을 바꿔야 한다.
// =============================================================================

suite("rate→bp 변환 가드", (t) => {
  const cases: { label: string; rate: number }[] = [
    { label: "고용보험(근로자) 0.9%", rate: EMPLOYMENT_INSURANCE_RATE },
    { label: "고용안정 under150 0.25%", rate: EMPLOYMENT_STABILITY_RATE.under150 },
    { label: "고용안정 over150Priority 0.45%", rate: EMPLOYMENT_STABILITY_RATE.over150Priority },
    { label: "고용안정 from150to1000 0.65%", rate: EMPLOYMENT_STABILITY_RATE.from150to1000 },
    { label: "고용안정 over1000 0.85%", rate: EMPLOYMENT_STABILITY_RATE.over1000 },
  ];

  for (const c of cases) {
    // Math.round 가 값을 바꾸지 않아야 한다 = 정수 bp로 정확히 표현된다.
    const scaled = c.rate * 10_000;
    t.eq(
      Math.abs(scaled - Math.round(scaled)) < 1e-6,
      true,
      `${c.label} → 정수 bp로 표현 가능(${scaled})`
    );
  }

  // 가드가 실제로 동작하는지 자체 검증: 0.5bp 요율은 반드시 걸려야 한다.
  const halfBp = 0.00925 * 10_000; // 92.5 — 정수 bp로 표현 불가
  t.eq(Math.abs(halfBp - Math.round(halfBp)) < 1e-6, false, "가드 자체 검증: 0.925%는 정수 bp 불가로 감지");
  t.eq(Math.round(halfBp), 93, "가드 자체 검증: Math.round가 92.5를 93으로 올림(요율 왜곡)");
});

// =============================================================================
// 최저시급 파생 리터럴 금지 (2026-08-06 티켓 #41)
//
// 티켓 #40에서 최저시급 단일 소스(lib/minimum-wage.ts)를 복구했지만, 하드코딩
// 재발을 막는 장치는 "주석뿐"이었다. 이 스위트가 그 강제 장치다.
//
// 규칙: lib/·components/·app/ 의 .ts/.tsx 안에 **현재 최저시급 금액과 그 파생금액**을
//       숫자 리터럴로 적으면 FAIL. 세 표기 모두 잡는다 —
//       천단위 쉼표형 / 쉼표 없는 형 / TS 숫자 구분자형(자릿수 사이 밑줄).
//       ※ 여기에 각 표기의 예시를 실제 금액으로 적지 말 것 — 이 파일도 스캔 대상이
//         아니라서 그 리터럴은 아무 장치에도 안 걸리고 다음 교체 회차에 그대로 썩는다.
//       파생금액 = minimumWageHolidayExample(h)의 주휴수당 4종,
//       h는 **0.5시간 격자로 15 ≤ h ≤ 60** 열거(= 91개 지점).
//
// 설계 원칙 3가지:
//  1) 금지 토큰을 이 파일에 하드코딩하지 않는다. lib/minimum-wage.ts에서 런타임에
//     파생시킨다 — 상수를 교체하면 금지 목록도 같이 이동해야 테스트가 안 썩는다.
//  2) 경로는 cwd가 아니라 __dirname 기준(tsx는 CJS로 트랜스폼 → __dirname 유효).
//  3) **공허한 PASS 방지**: 스캐너가 파일을 못 읽거나 토큰이 비면 "적중 0건"이 나와
//     아무것도 검사하지 않고 통과한다. 그래서 (a) 매처 자기시험(양성/음성 대조군),
//     (b) 스캔 대상 존재 확인, (c) 토큰 개수 > 0 을 같은 스위트에서 단언한다.
//
// R2 변경(2026-08-06, QA FAIL 1 + 마스터 실측 1):
//  · h 열거를 정수 → 0.5시간 격자로 확대. 정수만 돌면 주 37.5시간(실재하는 근로형태)의
//    파생금액이 금지 목록에서 빠져 **조용히 통과**했다(QA 재현: lib/blog.ts에 심은
//    "주 37.5시간 주휴수당 …원, 월 …원"이 PASS). 확대 후 현재 소스 전체 재측정 =
//    **토큰 470개 / 74개 파일 / 적중 0건**(2026-08-06 실측) → 오탐 0이라 그대로 채택.
//  · TS 숫자 구분자 표기 미탐 보완. 매칭 직전 줄을 정규화한다(아래 normalize 참조).
//
// R3 변경(2026-08-06, QA NOTE 채택):
//  · **격자 폭이 자기보장되지 않았다.** 격자를 정수로 되돌려도 전 스위트가 통과해(QA
//    사보타주 S5), 미래에 누가 격자를 좁히면 R2에서 고친 결함이 조용히 재발한다.
//    → 양성 대조군 5(반정수 지점)를 추가해, 격자를 정수로 되돌리면 즉시 FAIL하게 했다.
//
// 이 규칙이 **못 잡는 것**은 lib/minimum-wage.ts 헤더 (c)에 적어 두었다.
// =============================================================================

suite("최저시급 리터럴 금지", (t) => {
  // ── (1) 금지 토큰 파생 (하드코딩 금지) ──────────────────────────────────────
  /** 토큰 → 유래 라벨. 같은 숫자가 여러 유래를 가지면 첫 유래를 남긴다. */
  const origin = new Map<string, string>();
  const addToken = (formatted: string, from: string): void => {
    for (const tok of [formatted, formatted.replace(/,/g, "")]) {
      if (!origin.has(tok)) origin.set(tok, from);
    }
  };

  addToken(MINIMUM_WAGE_TEXT, "MINIMUM_WAGE");
  // 0.5시간 격자(half를 정수로 돌려 부동소수 누적을 피한다). 정수만 열거하면
  // 주 37.5시간·17.5시간처럼 실재하는 소정근로시간의 파생금액이 통째로 빠진다.
  for (let half = 15 * 2; half <= 60 * 2; half++) {
    const h = half / 2;
    const ex = minimumWageHolidayExample(h);
    addToken(ex.weeklyAllowance, `h=${h} weeklyAllowance`);
    addToken(ex.monthlyAllowance, `h=${h} monthlyAllowance`);
    addToken(ex.effectiveHourlyWage, `h=${h} effectiveHourlyWage`);
    addToken(ex.monthlyWageWithHoliday, `h=${h} monthlyWageWithHoliday`);
  }
  // 주의: holidayConvertedHours("4.0" 등)는 토큰에 넣지 않는다 — 최저시급과 무관한
  //       소수 표기까지 전부 오탐으로 잡는다.

  // (c) 토큰이 비면 스캔은 항상 0건 = 공허한 PASS. 개수를 먼저 잠근다.
  const tokens = [...origin.keys()].sort((a, b) => b.length - a.length);
  t.ok(tokens.length > 0, "(c) 금지 토큰 집합이 비어 있지 않다");
  t.ok(
    origin.has(MINIMUM_WAGE_TEXT) && origin.has(String(MINIMUM_WAGE)),
    "(c) 최저시급 본값이 쉼표형·무쉼표형 모두 토큰에 포함된다"
  );

  // ── (2) 표기 정규화 + 매처 (숫자 경계 유지) ────────────────────────────────
  // TS 숫자 구분자(자릿수 사이 밑줄)는 이 저장소의 관용 표기다 — lib/minimum-wage.ts
  // 자신이 MINIMUM_WAGE를 그 표기로 선언하고, lib/·components/·app/에 같은 표기의 수치
  // 리터럴이 105개 있다(2026-08-06 실측, 밑줄 문자 기준으로는 156개). 즉 상수가
  // 재하드코딩된다면 가장 유력한 형태가 하필 이것이다.
  // 토큰을 3배로 늘리는 대신 **매칭 직전에 줄을 정규화**해서 잡는다.
  //   · 지우는 것은 "숫자와 숫자 사이의 _" 뿐이다. 식별자 속 밑줄(WAGE_<숫자>)이나
  //     무관한 더 큰 수(앞자리가 붙은 구분자 표기)의 경계는 그대로 남아 오탐이 늘지
  //     않는다 (아래 음성 대조군 3·4가 그 자리에서 증명한다).
  //   · 정규화는 **탐지 전용**이다. 줄 번호는 원문 인덱스를 그대로 쓰고, FAIL
  //     메시지에는 원문 줄을 함께 실어 소스에서 찾을 수 있게 한다(아래 (4)).
  const normalize = (line: string): string => line.replace(/(?<=\d)_(?=\d)/g, "");

  const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 앞뒤가 숫자/쉼표/마침표면 더 큰 수의 일부이므로 적중시키지 않는다.
  const pattern = `(?<![\\d,.])(?:${tokens.map(escapeRe).join("|")})(?![\\d,.])`;
  const matchAll = (line: string): string[] =>
    normalize(line).match(new RegExp(pattern, "g")) ?? [];

  /** 숫자 문자열을 TS 숫자 구분자 표기로 (뒤에서 3자리마다 밑줄) */
  const groupUnderscore = (digits: string): string =>
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, "_");

  // ── (3a) 매처 자기시험: 양성 대조군은 반드시 적중해야 한다 ──────────────────
  const positive = `const x = "${MINIMUM_WAGE_TEXT}원";`;
  t.eq(matchAll(positive), [MINIMUM_WAGE_TEXT], "(a) 양성 대조군: 최저시급 리터럴을 적중");
  const derived = minimumWageHolidayExample(20);
  t.eq(
    matchAll(`실질시급 ${derived.effectiveHourlyWage}원`),
    [derived.effectiveHourlyWage],
    "(a) 양성 대조군: 파생금액(h=20 실질시급) 리터럴을 적중"
  );
  t.eq(
    matchAll(derived.effectiveHourlyWage.replace(/,/g, "")),
    [derived.effectiveHourlyWage.replace(/,/g, "")],
    "(a) 양성 대조군: 무쉼표 표기도 적중"
  );
  // 양성 대조군 3·4 — TS 숫자 구분자 표기(정규화 경로). 적중값은 무쉼표 토큰이 된다.
  const wagePlain = String(MINIMUM_WAGE);
  t.eq(
    matchAll(`const X = ${groupUnderscore(wagePlain)};`),
    [wagePlain],
    "(a) 양성 대조군: 최저시급의 숫자 구분자 표기를 적중"
  );
  const derivedPlain = derived.monthlyWageWithHoliday.replace(/,/g, "");
  t.eq(
    matchAll(`const Y = ${groupUnderscore(derivedPlain)};`),
    [derivedPlain],
    "(a) 양성 대조군: 파생금액의 숫자 구분자 표기를 적중(h=20 주휴 포함 월급여)"
  );
  // 정규화가 실제로 표기를 바꾸는지(대조군이 공허하지 않은지) 그 자리에서 확인
  t.ok(
    groupUnderscore(wagePlain) !== wagePlain && normalize(groupUnderscore(wagePlain)) === wagePlain,
    "(a) 대조군 비공허: 구분자 표기가 실제로 존재하고 정규화로 복원된다"
  );
  // 양성 대조군 5 — **격자 폭 자기보장**(R3). 위 대조군들은 격자를 정수로 되돌려도 전부
  //   통과한다(QA 사보타주 S5 실증) — 즉 R2에서 고친 축만 "공허한 PASS 방지"(설계 원칙 3)의
  //   보호를 못 받고 있었다. 반정수 지점의 파생금액이 금지 목록에 드는지를 여기서 잠근다.
  //   ※ 토큰 개수나 격자 지점 수를 하드코딩해 잠그지 않는다(상수·격자를 정당하게 바꿀 때
  //     썩는다). 잠그는 것은 **"반정수 h의 파생금액이 토큰 집합에 있는가"라는 성질**뿐이다.
  const halfPoint = 37.5; // 실재하는 소정근로시간(주 5일 × 7.5시간)
  t.eq(Number.isInteger(halfPoint), false, "(a) 격자 폭 대조군이 실제로 반정수 지점이다");
  const halfEx = minimumWageHolidayExample(halfPoint);
  const halfNeighbors = [
    minimumWageHolidayExample(Math.floor(halfPoint)),
    minimumWageHolidayExample(Math.ceil(halfPoint)),
  ];
  //   h에 따라 값이 변하는 항목만 쓴다. 실질시급은 h ≤ 40에서 h와 무관한 상수라 정수
  //   격자에서도 우연히 적중해 대조군이 공허해진다(= 격자 폭을 못 잠근다).
  for (const key of ["weeklyAllowance", "monthlyAllowance", "monthlyWageWithHoliday"] as const) {
    const value = halfEx[key];
    t.ok(
      halfNeighbors.every((n) => n[key] !== value),
      `(a) 격자 폭 대조군 비공허: h=${halfPoint} ${key}가 이웃 정수 h와 값이 다르다`
    );
    t.ok(origin.has(value), `(a) 격자 폭: h=${halfPoint} ${key}가 금지 토큰에 포함(정수 격자로 되돌리면 FAIL)`);
    t.eq(matchAll(`${value}원`), [value], `(a) 격자 폭: h=${halfPoint} ${key} 리터럴을 매처가 적중`);
  }
  // 음성 대조군 1 — 최저시급과 무관한 금액(토큰이 아님을 런타임에 확인하고 쓴다)
  let controlAmount = 1_000_000;
  while (origin.has(formatThousands(controlAmount))) controlAmount += 1;
  t.eq(
    matchAll(`월 ${formatThousands(controlAmount)}원`),
    [],
    "(a) 음성 대조군: 무관한 금액은 적중하지 않는다"
  );
  // 음성 대조군 2 — 숫자 경계: 더 큰 수의 일부는 적중하지 않는다
  t.eq(matchAll(`9${MINIMUM_WAGE_TEXT}`), [], "(a) 음성 대조군: 앞자리가 붙은 큰 수는 미적중");
  t.eq(matchAll(`${MINIMUM_WAGE_TEXT}0`), [], "(a) 음성 대조군: 뒷자리가 붙은 큰 수는 미적중");
  // 음성 대조군 3 — 구분자 표기의 **더 큰 수**는 정규화 후에도 미적중이어야 한다
  //   (정규화가 큰 수를 잘게 쪼개 오탐을 만들지 않는다는 증명)
  t.eq(
    matchAll(`const Z = ${groupUnderscore("10" + wagePlain)};`),
    [],
    "(a) 음성 대조군: 앞자리가 붙은 큰 수의 구분자 표기는 미적중"
  );
  // 음성 대조군 4 — 식별자 속 밑줄은 지우지 않는다(정규화 범위가 숫자↔숫자로 한정)
  t.eq(
    normalize(`const WAGE_${wagePlain}_LABEL = 1;`),
    `const WAGE_${wagePlain}_LABEL = 1;`,
    "(a) 음성 대조군: 식별자의 밑줄은 정규화 대상이 아니다"
  );

  // ── (3b) 스캔 대상 수집 + 존재 확인 ────────────────────────────────────────
  const projectRoot = path.resolve(__dirname, "../..");
  const scanRoots = ["lib", "components", "app"];
  /** 단일 소스 자신은 제외 (여기에는 값이 있어야 한다) */
  const selfPath = path.resolve(projectRoot, "lib/minimum-wage.ts");
  const rel = (abs: string): string => path.relative(projectRoot, abs).split(path.sep).join("/");

  const collect = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...collect(full));
      else if (/\.tsx?$/.test(entry.name) && path.resolve(full) !== selfPath) out.push(full);
    }
    return out;
  };

  const files: string[] = [];
  for (const root of scanRoots) {
    const abs = path.resolve(projectRoot, root);
    t.ok(fs.existsSync(abs), `(b) 스캔 루트 존재: ${root}/`);
    const found = collect(abs);
    t.ok(found.length > 0, `(b) 스캔 루트가 비어 있지 않다: ${root}/ (${found.length}개)`);
    files.push(...found);
  }
  const relFiles = files.map(rel);
  t.ok(relFiles.length > 0, `(b) 스캔 파일 수 > 0 (${relFiles.length}개)`);
  // walk가 조용히 깨져도 알아채도록, 리터럴이 실제로 있었던 두 파일을 이름으로 확인.
  t.ok(relFiles.includes("lib/blog.ts"), "(b) 스캔 목록에 lib/blog.ts 포함");
  t.ok(relFiles.includes("lib/calculators.ts"), "(b) 스캔 목록에 lib/calculators.ts 포함");
  t.ok(!relFiles.includes("lib/minimum-wage.ts"), "(b) 단일 소스 자신은 스캔에서 제외");

  // ── (4) 실제 스캔 ─────────────────────────────────────────────────────────
  //   FAIL 메시지에는 적중 토큰과 **원문 줄**을 함께 싣는다. 정규화 경로로 잡힌 경우
  //   토큰(쉼표 없는 숫자열)이 소스에 그 형태로 존재하지 않아(소스에는 밑줄이 끼어 있다)
  //   토큰만 찍으면 사용자가 검색으로 못 찾는다. 그래서 원문 줄과 정규화 여부를 명시한다.
  const hits: string[] = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const found = matchAll(line);
      if (found.length === 0) return;
      const viaNormalize = normalize(line) !== line;
      const snippet = line.trim().slice(0, 120);
      for (const tok of found) {
        hits.push(
          `${rel(file)}:${i + 1}  "${tok}"  (유래: ${origin.get(tok)})` +
            (viaNormalize ? "  [숫자 구분자 제거 후 매칭 — 소스 표기는 다름]" : "") +
            `\n      원문: ${snippet}`
        );
      }
    });
  }

  const shown = hits.slice(0, 20);
  const overflow = hits.length > 20 ? `\n  … 외 ${hits.length - 20}건` : "";
  t.eq(
    hits.length,
    0,
    `최저시급 파생 리터럴이 소스에 하드코딩됨 (${hits.length}건)\n  ` +
      shown.join("\n  ") +
      overflow +
      "\n  → 이 값들은 리터럴로 적지 말고 lib/minimum-wage.ts의 헬퍼로 만들 것:" +
      "\n     금액 표기 = MINIMUM_WAGE_TEXT / MINIMUM_WAGE_LABEL," +
      "\n     주휴수당 파생금액 = minimumWageHolidayExample(주간 소정근로시간)."
  );
});

// -----------------------------------------------------------------------------
// 총계
// -----------------------------------------------------------------------------

console.log("");
console.log(`총 ${totalCases} assertions · ${failedSuites === 0 ? "ALL SUITES PASS" : failedSuites + " SUITE(S) FAILED"}`);

if (failedSuites > 0) {
  process.exit(1);
}
