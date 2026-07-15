// =============================================================================
// 이자소득 과세율 단일 소스
//
// 예·적금 이자에 부과되는 이자소득 과세율. 화면(적금·예금 이자 계산기)의
//   ① 과세 세그먼트 버튼 라벨(INTEREST_TAX_LABEL)
//   ② 세율 안내 헬퍼(15.4% / 9.5% / 0%)
//   ③ 결과 Tier② "이자과세" 행의 적용세율 병기
// 세 곳이 전부 이 상수 1곳만 참조하도록 하고, 세율 숫자 하드코딩을 금지한다.
// 세율 개정 시 이 파일의 상수만 바꾸면 전 화면이 갱신된다.
//
// 출처: 마스터 웹검색 확정(2026-07-16). 일반과세 15.4%(이자소득세 14% +
//   지방소득세 1.4%) / 세금우대 9.5% / 비과세 0%.
// =============================================================================

export type InterestTaxType = "general" | "preferential" | "taxFree";

/** 이자소득 과세율 (소수, 예: 0.154 = 15.4%). */
export const INTEREST_TAX_RATE: Record<InterestTaxType, number> = {
  general: 0.154, // 일반과세 15.4% (이자소득세 14% + 지방소득세 1.4%)
  preferential: 0.095, // 세금우대 9.5%
  taxFree: 0, // 비과세 0%
};

/** 과세 유형 라벨 (세그먼트 버튼·요약 문구 공용). */
export const INTEREST_TAX_LABEL: Record<InterestTaxType, string> = {
  general: "일반과세",
  preferential: "세금우대",
  taxFree: "비과세",
};

/**
 * 과세 유형의 세율을 화면 표기용 퍼센트 문자열로 조합한다.
 * 정수 세율(0%)은 소수점을 붙이지 않고, 그 외에는 소수 1자리로 표기한다.
 *   general → "15.4%", preferential → "9.5%", taxFree → "0%"
 * 세율 숫자를 화면에 직접 박지 말고 항상 이 헬퍼를 통해 조합한다(§0).
 */
export function formatTaxRatePercent(taxType: InterestTaxType): string {
  const percent = INTEREST_TAX_RATE[taxType] * 100;
  const decimals = Number.isInteger(percent) ? 0 : 1;
  return `${percent.toFixed(decimals)}%`;
}
