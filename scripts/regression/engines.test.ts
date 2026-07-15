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

import { calculateSalary } from "../../lib/salary";
import {
  calculateFourInsurance,
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
//    출처: lib/calculators.ts §interpretation(line 162, QA검증 = 엔진 실측)
//          + planning/salary-net-calculator-content.md §1-4(연봉 4천만·부양1·비과세20만·자녀0)
//    ※ 불일치(보고 대상): planning §1-4 표는 국민연금 148,810 / 건강 112,640 /
//      장기요양 14,580 / 고용 28,200 / 합계 304,230 등 수기 근사치를 적어 두었으나
//      엔진 실측(= 라이브 interpretation)은 148,817 / 112,643 / 14,582 / 28,199 /
//      304,241 이다. 라이브 콘텐츠는 이미 엔진값으로 정정돼 있고 planning 문서만
//      구식 → 문서 정정 필요. 여기서는 엔진 실측을 정답으로 잠근다.
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

  // 계약: 무효 입력은 null
  t.eq(calculateSalary({ annualSalary: 0, taxFreeMonthly: 0, dependents: 1, children: 0 }), null, "연봉 0 → null");
  t.eq(calculateSalary({ annualSalary: 40_000_000, taxFreeMonthly: 0, dependents: 0, children: 0 }), null, "부양가족<1 → null");
  t.eq(calculateSalary({ annualSalary: NaN, taxFreeMonthly: 0, dependents: 1, children: 0 }), null, "NaN → null");
});

// =============================================================================
// 2) four-insurance — 4대보험료(근로자/사업주/합계)
//    출처: planning/four-insurance-calculator-content.md §1-4 앵커 A~D (QA 검증, 150인 미만)
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
  t.eq(b!.employmentInsurance.employee, 26_999, "B 고용보험 근로자(float floor 실측)");
  t.eq(b!.employmentInsurance.employer, 34_500, "B 고용보험 사업주(1.15%)");
  t.eq(b!.employeeTotal, 291_310, "B 근로자 소계");
  t.eq(b!.employerTotal, 298_811, "B 사업주 소계");
  t.eq(b!.grandTotal, 590_121, "B 총합");

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
  t.eq(d!.employeeTotal, 660_251, "D 근로자 소계");
  t.eq(d!.employerTotal, 677_752, "D 사업주 소계");
  t.eq(d!.grandTotal, 1_338_003, "D 총합");

  // 계약: 무효 입력 → null
  t.eq(calculateFourInsurance({ monthlyTaxable: 0, businessSize: under150 }), null, "T=0 → null");
});

// =============================================================================
// 3) loan — 대출 상환(원리금균등/원금균등)
//    출처: planning/loan-interest-calculator-content.md §1-3
//          + planning/dsr-calculator-content.md §1-4 앵커 B(엔진 실측 잠금)
//    ※ 불일치(보고 대상): loan-interest §1-3은 "약" 표기 수기 근사치
//      (원리금 899,130/총이자 2,368,790, 원금균등 마지막회차 836,806)를 적었으나
//      엔진 실측은 899,127 / 2,368,572 / 836,817 이다. 문서가 스스로 "근사"라 명시 →
//      엔진값 잠금.
// =============================================================================

suite("loan", (t) => {
  // 원리금균등 (30M, 5%, 36개월)
  const ep = calculateLoan(30_000_000, 5, 36, "equalPayment");
  assert.ok(ep && ep.type === "equalPayment", "loan equalPayment null/type");
  if (ep.type === "equalPayment") {
    t.eq(ep.monthlyPayment, 899_127, "원리금균등 월상환(문서 §1-3=899,130 근사)");
    t.eq(ep.totalInterest, 2_368_572, "원리금균등 총이자(문서=2,368,790 근사)");
    t.eq(ep.totalPayment, 32_368_572, "원리금균등 총상환");
  }

  // 원금균등 (30M, 5%, 36개월)
  const pr = calculateLoan(30_000_000, 5, 36, "equalPrincipal");
  assert.ok(pr && pr.type === "equalPrincipal", "loan equalPrincipal null/type");
  if (pr.type === "equalPrincipal") {
    t.eq(pr.firstPayment, 958_333, "원금균등 1회차(원금 833,333+이자 125,000)");
    t.eq(pr.lastPayment, 836_817, "원금균등 마지막회차(문서=836,806 근사)");
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

  // 계약: 음수 입력 → invalid
  const bad = calculateLoanPrepayment({ amount: -1, feeRate: 0.5, elapsedMonths: 6, totalMonths: 24 });
  t.eq(bad.ok, false, "음수 금액 → invalid");
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

// -----------------------------------------------------------------------------
// 총계
// -----------------------------------------------------------------------------

console.log("");
console.log(`총 ${totalCases} assertions · ${failedSuites === 0 ? "ALL SUITES PASS" : failedSuites + " SUITE(S) FAILED"}`);

if (failedSuites > 0) {
  process.exit(1);
}
