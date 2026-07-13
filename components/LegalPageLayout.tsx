import type { ReactNode } from "react";
import Link from "next/link";

export interface LegalSection {
  id: string;
  heading: string;
  body: ReactNode;
}

/**
 * `/privacy`, `/terms` 공통 템플릿.
 * 참고: design/legal-pages-ui-spec.md (1~5장)
 */
export default function LegalPageLayout({
  title,
  effectiveDateLabel,
  intro,
  sections,
}: {
  title: string;
  effectiveDateLabel: string;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div>
        <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-2 text-xs text-brand-text-secondary">
          {effectiveDateLabel}
        </p>
        {intro && (
          <div className="mt-4 text-sm leading-relaxed text-brand-text-secondary sm:text-base">
            {intro}
          </div>
        )}
      </div>

      <details className="mt-6 rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-brand-text marker:content-none">
          목차
        </summary>
        <ol className="mt-3 space-y-1">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-sm text-brand-text-secondary hover:text-brand-primary"
              >
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </details>

      <div>
        {sections.map((section, index) => (
          <section key={section.id} id={section.id}>
            <h2
              className={`text-lg font-bold text-brand-text sm:text-xl ${
                index === 0 ? "mt-6" : "mt-8"
              }`}
            >
              {section.heading}
            </h2>
            <div className="mt-3 text-sm leading-relaxed text-brand-text-secondary sm:text-base">
              {section.body}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-brand-border bg-brand-surface p-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-6">
        <p className="text-sm text-brand-text-secondary">
          {title}에 대해 궁금한 점이 있으시면 고객센터에서 문의해주세요.
        </p>
        <Link
          href="/support"
          className="mt-4 inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-brand-primary px-5 text-sm font-semibold text-brand-primary transition-colors hover:bg-blue-50 sm:mt-0"
        >
          고객센터로 이동
        </Link>
      </div>
    </div>
  );
}
