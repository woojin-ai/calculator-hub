import type { Metadata } from "next";
import { CROSS_SITE_LINKS } from "@/lib/cross-site-links";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "사이트 모음 | 계산기 허브",
  description:
    "계산기 허브, 청약레이더, 부동산 실거래가 대시보드, 대출모아 — 운영 중인 사이트 모음입니다.",
  alternates: { canonical: canonicalUrl("/links") },
  robots: { index: false, follow: true },
};

export default function LinksPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center px-4 py-12 sm:py-16">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary text-xl font-bold text-white">
          계
        </div>
        <h1 className="text-lg font-bold text-brand-text">계산기 허브 팀</h1>
        <p className="mt-1 text-sm text-brand-text-secondary">
          운영 중인 사이트 모음
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {CROSS_SITE_LINKS.filter((site) => site.status === "live" && site.url).map(
          (site) => (
            <a
              key={site.id}
              href={site.url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-brand-border bg-brand-surface p-4 transition-all hover:border-brand-primary hover:shadow-md active:scale-[0.98]"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${site.badgeBg} ${site.badgeText}`}
              >
                {site.initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-brand-text">
                  {site.name}
                </p>
                <p className="truncate text-xs text-brand-text-secondary">
                  {site.description}
                </p>
              </div>
              <span className="shrink-0 text-brand-text-secondary" aria-hidden>
                →
              </span>
            </a>
          )
        )}
      </div>

      <p className="mt-10 text-center text-xs text-brand-text-secondary">
        인스타그램 @breanabarbara2026
      </p>
    </div>
  );
}
