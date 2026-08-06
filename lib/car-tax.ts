// =============================================================================
// 자동차세 법정수치 단일 소스 + 계산 엔진
//
// 2026년 비영업용 승용차 기준. 화면(자동차세 계산기)의
//   ① 배기량 힌트의 구간표 안내 ② 결과 Tier② "차령 경감률" 병기
//   ③ 결과 Tier③ "연납 할인(약 4.58%)" 라벨 ④ 하단 출처 병기
// 가 전부 이 파일의 상수 1곳만 참조하도록 하고, 세율/할인율 숫자 하드코딩을
// 금지한다. 매년 1월 개정 확인 후 이 파일만 갱신하면 전 화면이 갱신된다.
//
// 출처: 위택스(wetax.go.kr), 지방세법(행정안전부). 마스터 웹검색 확정 2026-07-16.
// 범위(v1 면책): 비영업용 승용차만 다룬다. 영업용·승합·화물·이륜 등 기타 차종은
//   세율 체계가 달라 v1 범위 밖(화면 배너로 안내, 게이트 아님).
//
// 라운딩 정책(savings-interest.ts와 동일 원칙): 내부는 전 정밀도, baseTax를 먼저
//   원단위 반올림(정수화)한 뒤 그 값으로 교육세·할인액·연세액을 파생시켜 Tier 간
//   합이 정확히 맞게 한다. 정기분 각 회차 = round(annualTotal/2)이며, 진실값은
//   annualTotal이다(round(annualTotal/2)×2가 1원 어긋날 수 있음).
// =============================================================================

export type CarKind = "combustion" | "eco"; // 일반 승용(내연) / 전기·수소차

export const CAR_TAX_BASE_YEAR = 2026;

/** cc당 세액 구간표 (구간 flat — 전체 배기량 × 해당 구간 세율, 누진 아님). */
export const CC_TAX_BRACKETS = [
  { maxCc: 1000, wonPerCc: 80 }, // 1,000cc 이하 80원/cc
  { maxCc: 1600, wonPerCc: 140 }, // 1,600cc 이하 140원/cc
  { maxCc: Infinity, wonPerCc: 200 }, // 1,600cc 초과 200원/cc
] as const;

export const EDUCATION_TAX_RATE = 0.3; // 지방교육세 = 본세(경감후) × 30%
export const ECO_CAR_BASE_TAX = 100_000; // 전기·수소차 본세 정액(비영업 승용)
/** 지방세법 시행령 제125조제6항 — 법 제128조제3항 계산식의 「대통령령으로 정하는 이자율」. */
export const PREPAY_INTEREST_RATE = 0.05;
/** 지방세법 제128조제3항 제1호(1월 16~31일) — 납부기한 1/31의 다음 날부터 12/31까지 = 334일(2026, 평년). */
export const PREPAY_JAN_DAYS = 334;
/** 같은 호 계산식의 분모. 윤년은 366. */
export const PREPAY_YEAR_DAYS = 365;
/**
 * 1월 연납의 실질 할인율(본세 대비). 이자율 5%와 혼동 금지 — 단위가 다르다.
 * 334/365 × 5% ≈ 4.58%.
 *
 * 같은 호 단서의 한도(「과세기간 경과분을 차감한 연세액의 100분의 10의 범위」)는
 * 1월 연납의 실질 할인율이 약 4.58%로 10%에 크게 못 미쳐 **도달 불가**하므로
 * 한도 분기를 구현하지 않는다(죽은 코드 방지).
 */
export const PREPAY_EFFECTIVE_RATE =
  (PREPAY_JAN_DAYS * PREPAY_INTEREST_RATE) / PREPAY_YEAR_DAYS;
/**
 * 화면에 실제 인쇄되는 연납 공제율 라벨(티켓 #55). 「약 4.58%」.
 *
 * 🔴 컴포넌트에 두지 말고 여기(순수 모듈)에 둔다 — 티켓 #22에서 확립된 정본 패턴이다.
 * 컴포넌트 안에 있으면 회귀 테스트가 이 정의를 잠글 수 없어(클라이언트 컴포넌트 import 금지),
 * 상수는 정상인데 라벨만 하드코딩으로 오염되는 축이 열린 채로 남는다(QA 사보타주 S3 실증).
 * ⚠️ 여기 둔다고 화면 출력 전체가 잠기는 것은 아니다 — 컴포넌트가 이 import를 버리고
 * 문자열을 인라인하면 회귀는 통과한다(티켓 #59에서 소스 스캔으로 닫을 예정).
 * 반올림: Math.round는 5%로 뭉개져 실제 공제액과 자기모순이 되므로 소수 2자리를 살린다.
 */
export const PREPAY_DISCOUNT_PERCENT = `약 ${(PREPAY_EFFECTIVE_RATE * 100).toFixed(2)}%`;
export const AGE_RELIEF_START_YEAR = 3; // 등록 3년차부터 경감
export const AGE_RELIEF_PER_YEAR = 0.05; // 매년 5%씩
export const AGE_RELIEF_MAX = 0.5; // 최대 50%

/** 배기량 허용 범위(비영업 승용차 현실 범위): 정수 1~9,999cc. */
const CC_MIN = 1;
const CC_MAX = 9999;
/** 최초등록연도 허용 범위: 정수 1900~기준연도(2026). */
const REGISTER_YEAR_MIN = 1900;

export interface CarTaxInput {
  /** 일반 승용(내연) / 전기·수소차 */
  kind: CarKind;
  /** 총배기량 (cc) — 내연일 때만 사용. 전기·수소차는 무시된다. */
  cc: number;
  /** 자동차등록증상 최초등록연도 (차령 경감 산정용) */
  registerYear: number;
}

/** 계산 결과 금액 (baseTax 이하 전부 원단위 반올림, reliefRate는 소수). */
export interface CarTaxAmounts {
  /** 본세(경감 전) — combustion: cc×구간단가, eco: 정액 10만 */
  baseTaxRaw: number;
  /** 차령 경감률 (소수, 예: 0.20 = 20%) */
  reliefRate: number;
  /** 차령 (년) = 기준연도 − 최초등록연도 */
  carAge: number;
  /** 본세(경감 후) = round(baseTaxRaw × (1 − reliefRate)) */
  baseTax: number;
  /** 지방교육세 = round(baseTax × 30%) */
  educationTax: number;
  /** 연 자동차세 총액 = baseTax + educationTax (Tier①) */
  annualTotal: number;
  /** 정기분 회차액 = round(annualTotal / 2) (6월·12월 각) */
  semiAnnual: number;
  /** 연납 할인액 = round(baseTax × 334/365 × 5%) (본세 경감후에만 적용, 실질 약 4.58%) */
  prepayDiscount: number;
  /** 연납 납부액 = annualTotal − prepayDiscount */
  prepayTotal: number;
}

export type CarTaxError = "invalid-cc" | "invalid-year";

export type CarTaxOutcome =
  | { ok: true; input: CarTaxInput; amounts: CarTaxAmounts }
  | { ok: false; error: CarTaxError };

/**
 * 비영업용 승용차 입력을 받아 연 자동차세·정기분·연납 시나리오를 계산한다.
 * - 게이트 없음: 유효 입력이면 항상 정상 수치 결과(차령<3·미래연도 근사는 경감 0%).
 * - 배기량 정수 1~9,999 밖(내연) → invalid-cc, 등록연도 정수 1900~2026 밖 →
 *   invalid-year 로 판별 유니온 방어.
 * - baseTax를 먼저 반올림한 뒤 교육세·할인·연세액을 파생해 Tier 간 합을 맞춘다.
 */
export function calculateCarTax(input: CarTaxInput): CarTaxOutcome {
  const { kind, cc, registerYear } = input;

  // [등록연도 방어] 정수 1900~기준연도(2026). 미래연도(차령 음수) 차단.
  if (
    !Number.isFinite(registerYear) ||
    !Number.isInteger(registerYear) ||
    registerYear < REGISTER_YEAR_MIN ||
    registerYear > CAR_TAX_BASE_YEAR
  ) {
    return { ok: false, error: "invalid-year" };
  }

  // [A] 본세(경감 전) baseTaxRaw
  let baseTaxRaw: number;
  if (kind === "combustion") {
    // [배기량 방어] 정수 1~9,999cc (전기차는 배기량 없으므로 검증 생략)
    if (
      !Number.isFinite(cc) ||
      !Number.isInteger(cc) ||
      cc < CC_MIN ||
      cc > CC_MAX
    ) {
      return { ok: false, error: "invalid-cc" };
    }
    // 구간 flat: 전체 배기량 × 매칭 구간 단가 (cc <= maxCc 순차 매칭)
    const bracket = CC_TAX_BRACKETS.find((b) => cc <= b.maxCc)!;
    baseTaxRaw = cc * bracket.wonPerCc;
  } else {
    baseTaxRaw = ECO_CAR_BASE_TAX; // eco: 정액 10만 (배기량·차령경감 무관)
  }

  // [B] 차령·경감률
  const carAge = CAR_TAX_BASE_YEAR - registerYear;
  const reliefRate =
    kind === "combustion" && carAge >= AGE_RELIEF_START_YEAR
      ? Math.min(AGE_RELIEF_MAX, (carAge - 2) * AGE_RELIEF_PER_YEAR)
      : 0;

  // [C]~[H] baseTax 먼저 정수화 → 나머지 파생 (Tier 정합)
  const baseTax = Math.round(baseTaxRaw * (1 - reliefRate));
  const educationTax = Math.round(baseTax * EDUCATION_TAX_RATE);
  const annualTotal = baseTax + educationTax;
  const semiAnnual = Math.round(annualTotal / 2);
  const prepayDiscount = Math.round(
    (baseTax * PREPAY_JAN_DAYS * PREPAY_INTEREST_RATE) / PREPAY_YEAR_DAYS,
  );
  const prepayTotal = annualTotal - prepayDiscount;

  const amounts: CarTaxAmounts = {
    baseTaxRaw,
    reliefRate,
    carAge,
    baseTax,
    educationTax,
    annualTotal,
    semiAnnual,
    prepayDiscount,
    prepayTotal,
  };

  return { ok: true, input, amounts };
}

/**
 * 배기량에 매칭되는 cc당 세액 구간을 사람이 읽는 문자열로 조합한다(요약 문구용).
 * 세율 숫자를 화면에 직접 박지 말고 항상 이 헬퍼/상수에서 조합한다(§0).
 *   cc ≤ 1000 → "1,000cc 이하 80원/cc"
 *   1000 < cc ≤ 1600 → "1,600cc 이하 140원/cc"
 *   cc > 1600 → "1,600cc 초과 200원/cc"
 */
export function formatCcBracketLabel(cc: number): string {
  const [low, mid] = CC_TAX_BRACKETS;
  if (cc <= low.maxCc) {
    return `${low.maxCc.toLocaleString("ko-KR")}cc 이하 ${low.wonPerCc}원/cc`;
  }
  if (cc <= mid.maxCc) {
    return `${mid.maxCc.toLocaleString("ko-KR")}cc 이하 ${mid.wonPerCc}원/cc`;
  }
  const over = CC_TAX_BRACKETS[2];
  return `${mid.maxCc.toLocaleString("ko-KR")}cc 초과 ${over.wonPerCc}원/cc`;
}
