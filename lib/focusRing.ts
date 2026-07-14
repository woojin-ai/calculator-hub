// 키보드(focus-visible) 포커스 링 — design/focus-visible-ring-ui-spec.md 기준
// 티어 A: 테두리 있는 카드 (인풋 포커스 언어 복제)
export const FOCUS_RING_CARD =
  "focus-visible:outline-hidden focus-visible:border-brand-primary focus-visible:ring-4 focus-visible:ring-brand-primary/15";

// 티어 B-1: 테두리 없는 알약/인라인 링크 (여백 있음, outset)
export const FOCUS_RING_LINK =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary";

// 티어 B-1 인라인 텍스트(로고·푸터): 링 모서리 둥글게
export const FOCUS_RING_LINK_ROUNDED = `${FOCUS_RING_LINK} focus-visible:rounded-md`;

// 티어 B-2: 촘촘한 컨테이너 내부 행(summary), inset
export const FOCUS_RING_INSET =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset focus-visible:rounded-md";
