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
//   STEP 4  Fee = floor(A × f × R_m / (100 × D_m))   // 원 미만 절사
//           (구현은 f를 정수 bp로 올린 BigInt 산술 — 티켓 #21, 아래 STEP 4 주석 참조)
//
// 라운딩 정책(마스터 확정, 기획 §1-4·§8-4): 원 미만 절사.
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

/**
 * 수수료율 f(%)를 정수로 올리는 배율 (티켓 #21).
 *   bp = round(f × 10,000)  → 1bp = 0.0001%p 해상도.
 * UI 입력 step이 0.01(%)이므로 실사용 입력은 전부 무손실로 표현된다.
 * ※ 소수 5자리 이상 요율(예: 0.12345%)은 이 해상도에서 반올림된다(0.1235%).
 *   요율 자체를 더 잘게 받아야 하는 제도 변경이 생기면 이 상수를 올릴 것.
 */
const FEE_RATE_SCALE = 10_000;

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
 * 방어: 음수·비유한(NaN/Infinity)·비정수(금액/개월) 입력, 총기간 < 1 → invalid.
 */
export function calculateLoanPrepayment(
  input: LoanPrepaymentInput
): LoanPrepaymentOutcome {
  const { amount, feeRate, elapsedMonths, totalMonths } = input;

  // 방어: 비유한/음수 입력 차단 (판별유니온 — 전기요금 엔진 패턴)
  //
  // ★ 티켓 #21: 금액·개월은 **정수**여야 한다(Number.isInteger는 비유한도 걸러낸다).
  //   STEP 4가 BigInt 정수 산술이라 비정수가 들어오면 BigInt()가 RangeError를 던진다.
  //   예외 대신 기존 에러 규약({ok:false, error:"invalid-input"})으로 떨어뜨린다.
  //   현행 UI는 금액=숫자만 남기는 마스크, 개월=step="1"이라 비정수를 만들지 못하지만
  //   엔진 계약으로 못박아 둔다(형제 엔진 loan/savings-interest도 비정수 개월을 거부).
  //   수수료율 f만 소수를 허용한다(0.7·0.45 등) — STEP 4에서 정수 bp로 변환.
  if (
    !Number.isInteger(amount) ||
    !Number.isFinite(feeRate) ||
    !Number.isInteger(elapsedMonths) ||
    !Number.isInteger(totalMonths) ||
    // f × SCALE 이 Infinity로 넘치면 BigInt() 변환이 터진다(f ≳ 1e305).
    !Number.isFinite(feeRate * FEE_RATE_SCALE) ||
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

  // STEP 4  중도상환수수료 — BigInt 정수 산술 (원 미만 절사)
  //
  // ★ 티켓 #21 (2026-08-01): 구식 `Math.floor((A * R_m * f) / (100 * D_m))`은
  //   f가 이진부동소수라, **수학적 정답이 정확히 정수인 조합에서 중간값이 정답 바로
  //   아래로 떨어져** Math.floor가 1원을 깎았다.
  //     예) 1,000만원 × 0.35% × 9 ÷ 9 → 34,999원 (정답 35,000원)
  //         3억 × 1.4% × 9 ÷ 16     → 2,362,499원 (중간값 2362499.9999999995)
  //   QA 전수 스캔(1,332,000 조합)에서 14,791건(1.110%)이 어긋났고 **전부 −1원**,
  //   즉 항상 사용자에게 적게 표시됐다. 티켓 #19로 화면 계산식이 정확한 분수형
  //   `R_m ÷ D_m` + `(원 미만 절사)` 표기로 바뀌면서 이 1원이 그대로 드러난다.
  //
  // 처방: f를 정수 bp(= round(f × 10,000))로 올린 뒤 전 과정을 BigInt로 계산한다.
  //   Fee = floor(A × bp × R_m / (SCALE × 100 × D_m))
  //   같은 식을 Number 배정수로 쓰는 안(후보1)은 중간곱 A × bp × R_m 이 안전정수
  //   (MAX_SAFE_INTEGER = 9.0e15)를 넘는 순간 **정확성 보장이 깨져** 탈락했다.
  //   금액 A에는 상한이 없다(입력 마스크에 max 없음·JS 검증 없음·디자인 스펙에도
  //   규정 없음). 조 단위 금액이면 A=1e12 × bp=20,000 × R=36 = 7.2e17로 가볍게 넘는다.
  //   (2026-08-01 실측: 그 구간 566만 표본에서 후보1도 우연히 오차 0이었지만, 이는
  //    마지막 나눗셈의 ulp가 전파오차보다 커서 복원된 것일 뿐 보장이 아니다.
  //    BigInt는 자릿수 제한이 없어 이런 분석 자체가 필요 없다.)
  //
  // 라운딩 동치성: BigInt 나눗셈은 0 방향 절단(truncate)이다. 여기서는 피연산자가
  //   모두 **비음수**라(A ≥ 0, bp ≥ 0, R_m > 0 비면제 분기, D_m ≥ 1) 절단 = floor로
  //   동치이며, 기존 '원 미만 절사' 정책은 그대로 유지된다.
  // (BigInt 리터럴 `100n`은 tsconfig target ES2017에서 컴파일 에러 → BigInt() 생성자.)
  const feeRateBp = Math.round(f * FEE_RATE_SCALE);
  const fee = isExempt
    ? 0
    : Number(
        (BigInt(A) * BigInt(feeRateBp) * BigInt(R_m)) /
          (BigInt(FEE_RATE_SCALE * 100) * BigInt(D_m))
      );

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
