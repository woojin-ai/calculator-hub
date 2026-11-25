import Link from "next/link";
import { FOCUS_RING_LINK, FOCUS_RING_LINK_ROUNDED } from "@/lib/focusRing";

const NAV_ITEMS = [
  { href: "/salary", label: "급여" },
  { href: "/loan", label: "대출" },
  { href: "/date", label: "날짜" },
  { href: "/life", label: "생활" },
  { href: "/excel", label: "엑셀" },
  { href: "/blog", label: "블로그" },
  { href: "/support", label: "고객센터" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-brand-border bg-brand-surface">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-1 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:gap-2 sm:px-6 sm:py-0">
        <Link
          href="/"
          className={`shrink-0 text-lg font-bold tracking-tight text-brand-text ${FOCUS_RING_LINK_ROUNDED}`}
        >
          계산기 허브
        </Link>
        {/*
          모바일은 2행 헤더(로고 행 / 메뉴 행)로 nav가 컨테이너 전체 폭을 쓴다 → 375px에서 6개 전부 표시.
          overflow-x-auto는 320px급 초소형 기기용 안전장치로 유지하며,
          그 구간에서만 우측 페이드로 스크롤 가능 단서를 준다.
          임계값은 구성안 §5-3의 추정치(339px)를 실측으로 보정한 값이다.
          2026-11-25 "엑셀" 메뉴 추가로 7개가 되면서 모바일 좌우 여백을 px-2 → px-1.5로 줄였고,
          nav 콘텐츠 실폭 327px(375px 뷰포트 실측) 기준 뷰포트 358px 이하에서 초과가 발생한다.
          Tailwind v4의 max-[359px]는 `@media not (min-width: 359px)`로 컴파일되어
          358px 이하에만 적용되므로 375px에서는 7개 전부 보이고 페이드가 나타나지 않는다.
          design/site-header-mobile-nav-spec.md §5-3
        */}
        <nav
          aria-label="주요 메뉴"
          className="flex w-full min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap max-[359px]:[mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)] sm:w-auto sm:flex-1 sm:justify-end sm:gap-2"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-1.5 py-2 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-brand-bg hover:text-brand-primary sm:px-3 ${FOCUS_RING_LINK}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
