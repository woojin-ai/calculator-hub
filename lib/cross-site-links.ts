// 크로스 사이트 내비게이션 위젯 데이터 모델 — design/cross-site-nav-widget-spec.md §2 기준
// 다른 3개 사이트(부동산 실거래가 대시보드/청약레이더/대출모아)도 이 배열을 그대로 복사해
// 이식하고 currentSiteId만 자기 자신의 값으로 바꾼다(스펙 §13).

export type CrossSiteId =
  | "calculator-hub"
  | "realestate-hub"
  | "cheongryak-radar"
  | "loan-compare";

export interface CrossSiteLink {
  id: CrossSiteId;
  /** 전체 사이트명 — 모바일 패널·aria-label에 노출되는 풀네임 */
  name: string;
  /** 데스크톱 압축 레일용 축약 라벨 (좁은 폭에서 자연 줄바꿈 허용, 2줄 이내 권장) */
  shortLabel: string;
  /** 한 줄 설명 — 모바일 패널·title/aria-label에 사용 */
  description: string;
  /** 배포 전이면 null → 컴포넌트가 자동으로 "준비 중" 비활성 처리 */
  url: string | null;
  /** 배지 이니셜 1글자 */
  initial: string;
  badgeBg: string; // Tailwind 배경색 클래스
  badgeText: string; // Tailwind 텍스트색 클래스
  /** lib/calculators.ts의 CalculatorMeta.status와 동일 어휘 재사용(신규 어휘 발명 안 함) */
  status: "live" | "coming-soon";
}

// 순서 고정 — 4개 사이트 모두 이 순서 그대로 쓴다(현재 사이트를 맨 위로 재정렬하지 않음, §7)
export const CROSS_SITE_LINKS: CrossSiteLink[] = [
  {
    id: "calculator-hub",
    name: "계산기 허브",
    shortLabel: "계산기 허브",
    description: "실생활 계산기 모음",
    url: "https://calculator-hub-delta.vercel.app",
    initial: "계",
    badgeBg: "bg-blue-100",
    badgeText: "text-brand-primary",
    status: "live",
  },
  {
    id: "realestate-hub",
    name: "부동산 실거래가 대시보드",
    shortLabel: "부동산 실거래가",
    description: "아파트 실거래가 조회",
    url: "https://realestate-hub-6n4n.vercel.app",
    initial: "부",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    status: "live",
  },
  {
    id: "cheongryak-radar",
    name: "청약레이더",
    shortLabel: "청약레이더",
    description: "청약홈·LH·SH 청약 캘린더/알림",
    url: "https://cheongryak-radar.vercel.app",
    initial: "청",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-700",
    status: "live",
  },
  {
    id: "loan-compare",
    name: "대출모아",
    shortLabel: "대출모아",
    description: "대출·보험·예적금 비교",
    url: "https://loan-compare-ten.vercel.app",
    initial: "대",
    badgeBg: "bg-brand-bg",
    badgeText: "text-brand-text-secondary",
    status: "live",
  },
];
