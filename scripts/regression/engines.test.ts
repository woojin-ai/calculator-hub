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

import { calculateSalary, EMPLOYMENT_INSURANCE_RATE } from "../../lib/salary";
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
  t.eq(r!.longTermCare, 14_582, "장기요양(엔진 실측; 문서 §1-4=14,580 구식)");
  t.eq(r!.employmentInsurance, 28_199, "고용보험(엔진 실측; 문서 §1-4=28,200 구식)");
  t.eq(r!.insuranceTotal, 304_241, "4대보험 합계");
  t.eq(r!.incomeTax, 105_888, "근로소득세(월)");
  t.eq(r!.localIncomeTax, 10_588, "지방소득세(월)");
  t.eq(r!.monthlyNet, 2_912_616, "월 실수령액(약 291만, §1-4 범위 289~293만 내)");
  t.eq(r!.annualNet, 34_951_392, "연 환산 실수령액(약 3,495만)");

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
  t.eq(s2!.insuranceTotal, 291_311, "S2 4대보험 합계");
  t.eq(s2!.monthlyNet, 2_609_952, "S2 월 실수령액");

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
// =============================================================================

suite("four-insurance", (t) => {
  const under150: BusinessSize = "under150";

  // 앵커 A: T=2,000,000
  const a = calculateFourInsurance({ monthlyTaxable: 2_000_000, businessSize: under150 });
  assert.ok(a !== null, "4대보험 A null");
  t.eq(a!.employeeTotal, 194_207, "A 근로자 소계");
  t.eq(a!.employerTotal, 199_207, "A 사업주 소계");
  t.eq(a!.grandTotal, 393_414, "A 총합");

  // 앵커 B(대표): T=3,000,000
  const b = calculateFourInsurance({ monthlyTaxable: 3_000_000, businessSize: under150 });
  assert.ok(b !== null, "4대보험 B null");
  t.eq(b!.nationalPension.employee, 142_500, "B 국민연금 근로자");
  t.eq(b!.healthInsurance.employee, 107_850, "B 건강보험 근로자");
  t.eq(b!.longTermCare.employee, 13_961, "B 장기요양 근로자");
  t.eq(b!.employmentInsurance.employee, 27_000, "B 고용보험 근로자");
  t.eq(b!.employmentInsurance.employer, 34_500, "B 고용보험 사업주(1.15%)");
  t.eq(b!.employeeTotal, 291_311, "B 근로자 소계");
  t.eq(b!.employerTotal, 298_811, "B 사업주 소계");
  t.eq(b!.grandTotal, 590_122, "B 총합");

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
  t.eq(bPriority!.employeeTotal, 291_311, "B' 근로자 소계(규모 무관, B와 동일)");
  t.eq(bPriority!.employerTotal, 304_811, "B' 사업주 소계");
  t.eq(bPriority!.grandTotal, 596_122, "B' 총합");

  // 앵커 C: T=5,000,000
  const c = calculateFourInsurance({ monthlyTaxable: 5_000_000, businessSize: under150 });
  t.eq(c!.employeeTotal, 485_519, "C 근로자 소계");
  t.eq(c!.employerTotal, 498_019, "C 사업주 소계");
  t.eq(c!.grandTotal, 983_538, "C 총합");

  // 앵커 D: T=7,000,000 → 국민연금 상한 clamp(659만) 검증
  const d = calculateFourInsurance({ monthlyTaxable: 7_000_000, businessSize: under150 });
  t.eq(d!.pensionBase, 6_590_000, "D 기준소득월액 상한 clamp");
  t.eq(d!.isPensionCapped, true, "D isPensionCapped");
  t.eq(d!.nationalPension.employee, 313_025, "D 국민연금 근로자(clamp 고정)");
  t.eq(d!.employmentInsurance.employee, 63_000, "D 고용보험 근로자(0.9%)");
  t.eq(d!.employeeTotal, 660_252, "D 근로자 소계");
  t.eq(d!.employerTotal, 677_752, "D 사업주 소계");
  t.eq(d!.grandTotal, 1_338_004, "D 총합");

  // 계약: 무효 입력 → null
  t.eq(calculateFourInsurance({ monthlyTaxable: 0, businessSize: under150 }), null, "T=0 → null");
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
//           + lib/blog.ts 라이브 근무형태 표(주 15/20/25/30/40h, 2026-07-29 QA 검증)
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
  // 앵커 A(대표 = 디자인 §5 예시·라이브 블로그 표): 시급 10,320원 · 주 20시간
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
//   처방: DsrCalculator.tsx:45 formatDsr와 동일하게 Math.round(x*10)/10 후 정수 판정.
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

// -----------------------------------------------------------------------------
// 총계
// -----------------------------------------------------------------------------

console.log("");
console.log(`총 ${totalCases} assertions · ${failedSuites === 0 ? "ALL SUITES PASS" : failedSuites + " SUITE(S) FAILED"}`);

if (failedSuites > 0) {
  process.exit(1);
}
