import Link from "next/link";
import { FOCUS_RING_LINK, FOCUS_RING_LINK_ROUNDED } from "@/lib/focusRing";

const NAV_ITEMS = [
  { href: "/salary", label: "급여" },
  { href: "/loan", label: "대출" },
  { href: "/date", label: "날짜" },
  { href: "/life", label: "생활" },
  { href: "/blog", label: "블로그" },
  { href: "/support", label: "고객센터" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-brand-border bg-brand-surface">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className={`shrink-0 text-lg font-bold tracking-tight text-brand-text ${FOCUS_RING_LINK_ROUNDED}`}
        >
          계산기 허브
        </Link>
        {/* 항목이 6개로 늘어나 소형 모바일(375px)에서는 줄바꿈 대신 가로 스크롤로 처리 */}
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap sm:justify-end sm:gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-2 py-2 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-brand-bg hover:text-brand-primary sm:px-3 ${FOCUS_RING_LINK}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
