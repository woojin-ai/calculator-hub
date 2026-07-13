export type BmiStatus = "underweight" | "normal" | "overweight" | "obese";

export interface BmiResult {
  /** 화면 표시용 BMI 값 (소수 둘째 자리 반올림) */
  bmi: number;
  /** 상태 판정에 사용한 반올림 전 실제 계산값 */
  rawBmi: number;
  /** 대한비만학회(KSSO) 2018 성인 기준 4구간 판정 (저체중/정상체중/과체중/비만) */
  status: BmiStatus;
}

export const BMI_STATUS_LABEL: Record<BmiStatus, string> = {
  underweight: "저체중",
  normal: "정상체중",
  overweight: "과체중",
  obese: "비만",
};

/**
 * 키(cm)와 몸무게(kg)로 BMI를 계산한다.
 *
 * 중요: 상태 구간 판정은 반올림 전의 실제 계산값(rawBmi) 기준으로 수행하고,
 * 화면 표시용 값(bmi)만 소수 둘째 자리로 반올림한다. 반올림된 값으로 구간을
 * 판정하면 예: 22.996(정상체중)이 23.0으로 반올림되어 과체중으로 오판정되는
 * 경계 오류가 발생할 수 있다 (planning/bmi-calculator-content.md 1절 참고).
 *
 * 대한비만학회(KSSO) 2018 성인 기준, 경계값은 이상(≥) 포함 / 미만(<) 제외:
 * - 저체중: BMI < 18.5
 * - 정상체중: 18.5 ≤ BMI < 23.0
 * - 과체중: 23.0 ≤ BMI < 25.0
 * - 비만: BMI ≥ 25.0
 *
 * 입력값이 비어 있거나 0 이하인 경우 null을 반환한다.
 */
export function calculateBmi(
  heightCm: number,
  weightKg: number
): BmiResult | null {
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);

  return {
    bmi: Math.round(rawBmi * 100) / 100,
    rawBmi,
    status: getBmiStatus(rawBmi),
  };
}

function getBmiStatus(rawBmi: number): BmiStatus {
  if (rawBmi < 18.5) return "underweight";
  if (rawBmi < 23.0) return "normal";
  if (rawBmi < 25.0) return "overweight";
  return "obese";
}
