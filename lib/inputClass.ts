// 폼 필드(인풋/셀렉트/텍스트에어리어) 공유 Tailwind 클래스 단일소스.
// 화면 변화 0 목적의 순수 추출 — design/input-class-consolidation-spec.md 기준.

// [드리프트 에피센터] 07-15 outline-none→outline-hidden lockstep의 원인 토큰 클러스터.
// 모든 폼 필드가 공유하는 타이포/아웃라인/포커스 언어. 여기 한 곳만 고치면 20곳 반영.
export const FIELD_FOCUS =
  "text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

// 플레인 텍스트 인풋 공통. border 색(에러 조건부 or border-brand-border)·폭·pr-* 는 스팟에서 부착.
export const INPUT_BASE = `h-12 rounded-lg border px-4 ${FIELD_FOCUS}`;

// 셀렉트 공통 코어 — 폭 토큰(w-full/w-auto/min-w-0)만 제외. 폭은 스팟이 결정.
export const SELECT_CORE = `h-12 appearance-none rounded-lg border border-brand-border bg-white pl-4 pr-9 ${FIELD_FOCUS}`;

// 표준 셀렉트(폭 100%) 드롭인 — Electricity/FourInsurance/SalaryNet.
export const SELECT_BASE = `${SELECT_CORE} w-full`;

// 텍스트에어리어(문의폼) — h-12 대신 min-h, py-3 추가.
export const TEXTAREA_BASE = `min-h-[140px] rounded-lg border px-4 py-3 ${FIELD_FOCUS}`;
