// 크로스 사이트 내비게이션 위젯 — design/cross-site-nav-widget-spec.md 기준
// 데스크톱(xl, 1280px~): 우측 뷰포트 고정 세로 레일(§4)
// 모바일(~1279px): 우하단 FAB → <details>로 펼치는 패널, JS 불필요(§5)
// 두 버전 모두 항상 함께 서버 렌더링하고 Tailwind 반응형 클래스로만 전환한다(§4-2).
import {
  CROSS_SITE_LINKS,
  type CrossSiteId,
  type CrossSiteLink,
} from "@/lib/cross-site-links";
import { FOCUS_RING_CARD } from "@/lib/focusRing";

function SiteBadge({
  site,
  variant,
}: {
  site: CrossSiteLink;
  variant: "rail" | "panel";
}) {
  const base =
    variant === "rail"
      ? "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold";

  return (
    <span
      aria-hidden="true"
      className={`${base} ${site.badgeBg} ${site.badgeText}`}
    >
      {site.initial}
    </span>
  );
}

// 데스크톱 레일 아이템 — 배지(위) + 축약 라벨(아래) 세로 스택.
// 상태 3가지: 현재 사이트(§6) / 준비 중(§7) / 일반 링크(§4-3).
function RailItem({
  site,
  isCurrent,
}: {
  site: CrossSiteLink;
  isCurrent: boolean;
}) {
  if (isCurrent) {
    return (
      <div
        aria-current="page"
        className="flex w-16 flex-col items-center gap-1 rounded-xl bg-blue-50 px-1 py-2 text-center"
      >
        <SiteBadge site={site} variant="rail" />
        <span className="w-full break-keep text-[11px] font-semibold leading-tight text-brand-primary">
          {site.shortLabel}
        </span>
        <span className="w-full text-[9px] text-brand-text-secondary">
          현재
        </span>
      </div>
    );
  }

  if (!site.url) {
    return (
      <div
        aria-disabled="true"
        className="flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center opacity-70"
      >
        <SiteBadge site={site} variant="rail" />
        <span className="w-full break-keep text-[11px] font-medium leading-tight text-brand-text-disabled">
          {site.shortLabel}
        </span>
        <span className="w-full text-[9px] text-brand-text-disabled">
          준비 중
        </span>
      </div>
    );
  }

  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      title={site.description}
      aria-label={`${site.name} — ${site.description} (새 탭에서 열림)`}
      className={`group flex w-16 flex-col items-center gap-1 rounded-xl border border-transparent px-1 py-2 text-center transition-colors hover:border-brand-border hover:bg-brand-bg ${FOCUS_RING_CARD}`}
    >
      <SiteBadge site={site} variant="rail" />
      <span className="w-full break-keep text-[11px] font-medium leading-tight text-brand-text-secondary group-hover:text-brand-primary">
        {site.shortLabel}
      </span>
    </a>
  );
}

// 모바일 FAB 패널 행 — 배지 + 풀네임 + 설명 가로 배치(§5-4).
// 포커스 링은 Tier B-2(FOCUS_RING_INSET)와 같은 링 두께/색이지만, 이 행은 항상
// rounded-xl이 적용돼 있어 FOCUS_RING_INSET의 focus-visible:rounded-md를 그대로
// 붙이면 포커스 시 모서리 반경이 rounded-xl→rounded-md로 줄어드는 충돌이 생긴다.
// 그래서 상수 대신 스펙 §5-4가 명시한 4개 포커스 클래스를 그대로 쓴다.
function PanelRow({
  site,
  isCurrent,
}: {
  site: CrossSiteLink;
  isCurrent: boolean;
}) {
  if (isCurrent) {
    return (
      <div
        aria-current="page"
        className="flex items-center gap-3 rounded-xl bg-blue-50 px-2 py-2.5"
      >
        <SiteBadge site={site} variant="panel" />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-brand-primary">
            {site.name}
          </span>
          <span className="text-xs text-brand-text-secondary">
            {site.description} · 현재 사이트
          </span>
        </span>
      </div>
    );
  }

  if (!site.url) {
    return (
      <div
        aria-disabled="true"
        className="flex items-center gap-3 rounded-xl px-2 py-2.5 opacity-70"
      >
        <SiteBadge site={site} variant="panel" />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-brand-text-disabled">
            {site.name}
          </span>
          <span className="text-xs text-brand-text-disabled">
            {site.description} · 준비 중
          </span>
        </span>
      </div>
    );
  }

  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-brand-bg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset"
    >
      <SiteBadge site={site} variant="panel" />
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-brand-text">
          {site.name}
        </span>
        <span className="text-xs text-brand-text-secondary">
          {site.description}
        </span>
      </span>
      <span className="sr-only">(새 탭에서 열림)</span>
    </a>
  );
}

export default function CrossSiteNav({
  currentSiteId,
}: {
  currentSiteId: CrossSiteId;
}) {
  return (
    <>
      {/* 데스크톱 레일 — xl(1280px)부터 노출(§4-1) */}
      <nav
        aria-label="관련 서비스 바로가기"
        className="fixed right-4 top-1/2 z-40 hidden max-h-[80vh] w-20 -translate-y-1/2 flex-col gap-1 overflow-y-auto rounded-2xl border border-brand-border bg-brand-surface p-2 shadow-md xl:flex"
      >
        <p
          aria-hidden="true"
          className="mb-1 px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-brand-text-secondary"
        >
          관련 서비스
        </p>
        <ul className="flex flex-col gap-1">
          {CROSS_SITE_LINKS.map((site) => (
            <li key={site.id}>
              <RailItem site={site} isCurrent={site.id === currentSiteId} />
            </li>
          ))}
        </ul>
      </nav>

      {/*
        모바일 FAB — xl 미만에서 노출(§5-2). `.cross-site-fab` 클래스는
        app/globals.css의 :has() 규칙(§5-3)이 입력 포커스 시 이 요소를 통째로
        페이드아웃시키는 타깃이다. nav로 감싸는 이유는 §9(둘 다 랜드마크로 감쌀 것)
        — 시각적으로는 항상 fixed라 요소 종류가 바뀌어도 레이아웃에 영향 없다.
      */}
      <nav
        aria-label="관련 서비스 바로가기"
        className="cross-site-fab fixed right-4 z-40 xl:hidden"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <details className="group relative">
          <summary
            aria-label="관련 서비스 바로가기"
            className="flex h-14 w-14 list-none items-center justify-center rounded-full bg-brand-primary shadow-md transition-transform marker:content-none [&::-webkit-details-marker]:hidden focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand-primary/30 active:scale-95"
          >
            <span aria-hidden="true" className="grid grid-cols-2 gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </summary>

          <div className="absolute bottom-[calc(100%+0.75rem)] right-0 max-h-[70vh] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-brand-border bg-brand-surface p-2 shadow-md">
            <p className="mb-1 px-2 pt-1 text-xs font-semibold text-brand-text-secondary">
              관련 서비스
            </p>
            <ul className="flex flex-col">
              {CROSS_SITE_LINKS.map((site) => (
                <li key={site.id}>
                  <PanelRow site={site} isCurrent={site.id === currentSiteId} />
                </li>
              ))}
            </ul>
          </div>
        </details>
      </nav>
    </>
  );
}
