export type RepaymentType = "equalPayment" | "equalPrincipal";

export const REPAYMENT_TYPE_LABEL: Record<RepaymentType, string> = {
  equalPayment: "원리금균등상환",
  equalPrincipal: "원금균등상환",
};

export interface EqualPaymentResult {
  type: "equalPayment";
  /** 매월 상환액(고정, 원 단위 반올림) */
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
}

export interface EqualPrincipalResult {
  type: "equalPrincipal";
  /** 1회차 상환액(원금+이자) */
  firstPayment: number;
  /** 마지막 회차 상환액(원금+이자, 잔여 원금 보정 포함) */
  lastPayment: number;
  totalInterest: number;
  totalPayment: number;
}

export type LoanResult = EqualPaymentResult | EqualPrincipalResult;

/**
 * 대출원금(principal, 원), 연이자율(annualRatePercent, %), 상환개월수(months)를 받아
 * 상환방식(repaymentType)에 따른 상환 결과를 계산한다.
 *
 * 공식 출처: planning/loan-interest-calculator-content.md 1장.
 *
 * - r = 0(무이자 대출) 예외 처리: 원리금균등상환 공식은 r=0일 때 분모가 0이 되어 계산할 수
 *   없으므로 M = P / n으로 별도 분기한다.
 * - 원금균등상환은 매월 원금을 floor(P / n)으로 고정하고, 나누어떨어지지 않아 발생하는
 *   잔여 원금을 마지막 회차에 전액 반영해 원금 합계가 정확히 P와 일치하도록 한다(마지막
 *   회차 반올림 보정).
 * - 원금균등상환의 각 회차 이자는 원 단위로 반올림한 뒤 합산해 totalInterest를 구하므로
 *   실제 현금흐름과 정확히 일치한다(totalPayment = P + totalInterest).
 *
 * 입력값이 유효하지 않으면(원금/기간이 0 이하, 기간이 정수가 아님, 이자율이 음수 등) null을
 * 반환한다.
 */
export function calculateLoan(
  principal: number,
  annualRatePercent: number,
  months: number,
  repaymentType: RepaymentType
): LoanResult | null {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(annualRatePercent) ||
    !Number.isFinite(months) ||
    principal <= 0 ||
    annualRatePercent < 0 ||
    months <= 0 ||
    !Number.isInteger(months)
  ) {
    return null;
  }

  const r = annualRatePercent / 12 / 100;
  const n = months;
  const P = principal;

  if (repaymentType === "equalPayment") {
    let monthlyPaymentRaw: number;
    if (r === 0) {
      monthlyPaymentRaw = P / n;
    } else {
      const factor = Math.pow(1 + r, n);
      monthlyPaymentRaw = (P * r * factor) / (factor - 1);
    }
    const monthlyPayment = Math.round(monthlyPaymentRaw);
    const totalPayment = monthlyPayment * n;
    const totalInterest = totalPayment - P;

    return {
      type: "equalPayment",
      monthlyPayment,
      totalInterest,
      totalPayment,
    };
  }

  // 원금균등상환
  const basePrincipal = Math.floor(P / n);
  const lastPrincipal = P - basePrincipal * (n - 1);

  let totalInterest = 0;
  let firstPayment = 0;
  let lastPayment = 0;

  for (let k = 1; k <= n; k++) {
    const principalK = k === n ? lastPrincipal : basePrincipal;
    const balanceBefore = P - basePrincipal * (k - 1);
    const interestK = Math.round(balanceBefore * r);
    totalInterest += interestK;

    const paymentK = principalK + interestK;
    if (k === 1) firstPayment = paymentK;
    if (k === n) lastPayment = paymentK;
  }

  const totalPayment = P + totalInterest;

  return {
    type: "equalPrincipal",
    firstPayment,
    lastPayment,
    totalInterest,
    totalPayment,
  };
}

/** 천단위 콤마가 포함된 원화 표기 문자열로 변환한다 (예: 1234567 -> "1,234,567"). */
export function formatWon(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}
