// =============================================================================
// 중도상환수수료 계산 모델 (슬라이딩/체감 방식 · 3년 캡)
//
// 계산 모델 원천: planning/loan-prepayment-fee-content.md
//   §1-1(STEP 0~4 파이프라인), §1-2(수수료 상수), §1-4(검증 앵커 A~D), §6(모델 요약표).
// 화면 구성: design/loan-prepayment-fee-ui-spec.md (§3-3 슬라이딩 게이지 파생값).
//
// 계산 파이프라인(기획 §1-1 그대로):
//   STEP 0  D_m = min(T_m, 36)            // 면제기준기간(분모), 3년 캡
//   STEP 1  R_m = D_m − E_m               // 잔존기간. R_m ≤ 0 이면 면제(Fee=0)
//   STEP 2  ratio = R_m / D_m             // 잔존비율
//   STEP 3  f_dec = f / 100               // 수수료율 소수화
//   STEP 4  Fee = floor(A × f × R_m / (100 × D_m))   // 원 미만 절사, 정수 곱 우선
//
// 라운딩 정책(마스터 확정, 기획 §1-4·§8-4): 원 미만 절사(Math.floor).
//   실제 은행은 반올림·일할 계산·최소 수수료 하한 등으로 수십~수백 원 차이가 날 수 있음(면책).
// =============================================================================

// -----------------------------------------------------------------------------
// 수수료 상수 (기준: 2026-07, 교차확인값 — 기획 §1-2)
//   ※ 갱신 대상(제도 변경 시 이 블록만 수정하면 엔진 전체에 반영 — 기획 §8-5):
//     - PREPAYMENT_CAP_MONTHS / PREPAYMENT_CAP_DAYS(3년 캡·면제 기준):
//         은행권 표준 관행. 상품·제도 개편으로 캡이 바뀌면 갱신.
//     - DEFAULT_FEE_RATE(수수료율 default): 2025 인하 후 주담대~신용 중간 시작값.
//         수수료율은 은행·상품·약정 시점(2025.1.13 개편)별로 갈리므로 사용자 입력이 최종.
// -----------------------------------------------------------------------------

/** 면제기준기간(분모) 상한 = 3년(36개월). 대출 실행 후 이 기간 경과 시 면제(은행 관행). */
export const PREPAYMENT_CAP_MONTHS = 36;

/** 면제기준기간 3년의 일수 기준(참고·문구용, 1,095일). */
export const PREPAYMENT_CAP_DAYS = 1_095;

/** 수수료율 default(%) — 힌트 성격(사용자 입력이 최종). 갱신 대상. */
export const DEFAULT_FEE_RATE = 0.7;

// -----------------------------------------------------------------------------
// 타입
// -----------------------------------------------------------------------------

export interface LoanPrepaymentInput {
  /** 중도상환(조기상환) 금액 A(원, ≥0) */
  amount: number;
  /** 중도상환수수료율 f(%, ≥0) */
  feeRate: number;
  /** 대출 실행 후 경과기간 E_m(개월, ≥0) */
  elapsedMonths: number;
  /** 대출 총 약정기간 T_m(개월, ≥1). 미입력 시 36(3년 캡) 가정 */
  totalMonths: number;
}

/** 슬라이딩 게이지 렌더용 파생값 (디자인 §3-3, 창=D_m 2세그먼트) */
export interface PrepaymentGauge {
  /** 게이지 창(window) = 면제기준기간 D_m개월 */
  window: number;
  /** 막대에 표시할 경과 개월 = min(E_m, D_m) (창을 넘으면 D_m로 clamp) */
  elapsedClamped: number;
  /** 잔존 개월 R_m (면제 시 0) */
  remaining: number;
  /** 경과 세그먼트 폭(%) = elapsedClamped / D_m × 100 */
  elapsedPercent: number;
  /** 잔존(수수료 발생) 세그먼트 폭(%) = R_m / D_m × 100 (면제 시 0) */
  remainingPercent: number;
  /** 경과/잔존 경계 마커 위치(0~100%) = 현재 상환 시점 */
  markerPercent: number;
  /** 면제 여부(경과가 창을 꽉 채움) */
  isExempt: boolean;
}

export interface LoanPrepaymentResult {
  /** 정규화된 중도상환금액 A(원) */
  amount: number;
  /** 적용 수수료율 f(%) */
  feeRate: number;
  /** 경과기간 E_m(개월) */
  elapsedMonths: number;
  /** 입력한 총 약정기간 T_m(개월) */
  totalMonths: number;
  /** 면제기준기간(분모) D_m = min(T_m, 36) */
  baseMonths: number;
  /** 3년 캡이 적용됐는지(T_m > 36). false면 만기 기준 */
  isCapped: boolean;
  /** 잔존기간 R_m = D_m − E_m (면제 시 0으로 표기) */
  remainingMonths: number;
  /** 잔존비율 ratio = R_m / D_m (0~1, 면제 시 0) */
  ratio: number;
  /** 중도상환수수료 Fee(원, floor). 면제 시 0 */
  fee: number;
  /** 면제 대상 여부(R_m ≤ 0) */
  isExempt: boolean;
  /** 게이지 파생값 */
  gauge: PrepaymentGauge;
}

export type LoanPrepaymentOutcome =
  | { ok: true; result: LoanPrepaymentResult }
  | { ok: false; error: "invalid-input" };

// -----------------------------------------------------------------------------
// 엔진
// -----------------------------------------------------------------------------

/**
 * 중도상환수수료를 계산한다(기획 §1-1 STEP 0~4).
 * 방어: 음수·비유한(NaN/Infinity) 입력, 총기간 < 1 → invalid.
 */
export function calculateLoanPrepayment(
  input: LoanPrepaymentInput
): LoanPrepaymentOutcome {
  const { amount, feeRate, elapsedMonths, totalMonths } = input;

  // 방어: 비유한/음수 입력 차단 (판별유니온 — 전기요금 엔진 패턴)
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(feeRate) ||
    !Number.isFinite(elapsedMonths) ||
    !Number.isFinite(totalMonths) ||
    amount < 0 ||
    feeRate < 0 ||
    elapsedMonths < 0 ||
    totalMonths < 1
  ) {
    return { ok: false, error: "invalid-input" };
  }

  const A = amount;
  const f = feeRate;
  const E_m = elapsedMonths;
  const T_m = totalMonths;

  // STEP 0  면제기준기간(분모) 결정 — 3년 캡
  const D_m = Math.min(T_m, PREPAYMENT_CAP_MONTHS);
  const isCapped = T_m > PREPAYMENT_CAP_MONTHS;

  // STEP 1  잔존기간 산출 (R_m ≤ 0 → 면제 확정)
  const R_m_raw = D_m - E_m;
  const isExempt = R_m_raw <= 0;
  const R_m = isExempt ? 0 : R_m_raw;

  // STEP 2  잔존비율
  const ratio = isExempt ? 0 : R_m / D_m;

  // STEP 4  중도상환수수료 (정수 곱 먼저, 나눗셈 마지막, floor로 원 미만 절사)
  //   A·R_m(정수)를 먼저 곱하고 f를 곱해 부동소수 오차를 최소화(기획 §1-1 STEP 4 동치식).
  const fee = isExempt ? 0 : Math.floor((A * R_m * f) / (100 * D_m));

  // ── 게이지 파생값 (디자인 §3-3) ──
  const elapsedClamped = Math.min(E_m, D_m);
  const elapsedPercent = (elapsedClamped / D_m) * 100;
  const remainingPercent = isExempt ? 0 : (R_m / D_m) * 100;
  const markerPercent = elapsedPercent;

  const gauge: PrepaymentGauge = {
    window: D_m,
    elapsedClamped,
    remaining: R_m,
    elapsedPercent,
    remainingPercent,
    markerPercent,
    isExempt,
  };

  return {
    ok: true,
    result: {
      amount: A,
      feeRate: f,
      elapsedMonths: E_m,
      totalMonths: T_m,
      baseMonths: D_m,
      isCapped,
      remainingMonths: R_m,
      ratio,
      fee,
      isExempt,
      gauge,
    },
  };
}
