import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  categoryInfo,
  getCalculatorBySlug,
  type CalculatorMeta,
} from "@/lib/calculators";
import {
  blogPosts,
  getBlogPostBySlug,
  getReadingTimeMinutes,
  getRelatedBlogPosts,
  type BlogPost,
  type BlogSection,
} from "@/lib/blog";
import { buildBlogPostJsonLd } from "@/lib/blog-jsonld";
import RelatedCalculators from "@/components/RelatedCalculators";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} | 계산기 허브`,
    description: post.description,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
  };
}

// 발행일 "YYYY-MM-DD" → "2026. 7. 15." 표기 (ko-KR).
function formatPublishedDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${year}. ${month}. ${day}.`;
}

// 본문 한 블록을 태그로 매핑 (design 2-3/2-4 클래스). 전부 플레인 텍스트 매핑이며
// 본문에는 dangerouslySetInnerHTML을 쓰지 않는다.
function renderSection(section: BlogSection, index: number) {
  switch (section.type) {
    case "heading":
      return (
        <h2
          key={index}
          className="mt-8 text-xl font-bold text-brand-text first:mt-0"
        >
          {section.text}
        </h2>
      );
    case "paragraph":
      return (
        <p
          key={index}
          className="text-pretty text-base leading-relaxed text-brand-text"
        >
          {section.text}
        </p>
      );
    case "list":
      return section.ordered ? (
        <ol
          key={index}
          className="list-decimal space-y-1 pl-5 text-base leading-relaxed text-brand-text"
        >
          {section.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul
          key={index}
          className="list-disc space-y-1 pl-5 text-base leading-relaxed text-brand-text"
        >
          {section.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <aside
          key={index}
          data-variant={section.variant}
          className={
            section.variant === "warning"
              ? "rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
              : "rounded-xl border border-brand-border bg-brand-bg p-4 text-sm leading-relaxed text-brand-text-secondary"
          }
        >
          {section.text}
        </aside>
      );
    case "calculatorCta": {
      const calc = getCalculatorBySlug(section.slug);
      if (!calc) return null; // 존재하지 않는 계산기 링크 금지(방어)
      return (
        <div
          key={index}
          className="my-6 rounded-xl border border-brand-border bg-brand-bg p-4"
        >
          <p className="text-sm text-brand-text-secondary">
            이 내용이 궁금하다면
          </p>
          <Link
            href={`/calculator/${calc.slug}`}
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            {section.label ?? `${calc.title} 바로가기`}
          </Link>
        </div>
      );
    }
  }
}

// relatedCalculatorSlugs → live CalculatorMeta[] 변환 (존재·live만).
function resolveRelatedCalculators(post: BlogPost): CalculatorMeta[] {
  return post.relatedCalculatorSlugs
    .map((slug) => getCalculatorBySlug(slug))
    .filter(
      (c): c is CalculatorMeta => !!c && c.status === "live",
    );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const readingMinutes = getReadingTimeMinutes(post);
  const related = resolveRelatedCalculators(post);
  const siblingPosts = getRelatedBlogPosts(post);
  const jsonLd = buildBlogPostJsonLd(post);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <nav className="mb-2 text-xs text-brand-text-secondary">
        <Link href="/" className="hover:text-brand-primary">
          홈
        </Link>{" "}
        /{" "}
        <Link href="/blog" className="hover:text-brand-primary">
          블로그
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
        {post.title}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-text-secondary sm:text-sm">
        <time dateTime={post.publishedDate} className="tabular-nums">
          {formatPublishedDate(post.publishedDate)}
        </time>
        <span aria-hidden="true">·</span>
        <span>읽는 시간 {readingMinutes}분</span>
        <span aria-hidden="true">·</span>
        <span className="rounded-full bg-brand-bg px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
          {categoryInfo[post.category].title}
        </span>
      </div>

      <article className="mt-6 space-y-4">
        {post.body.map((section, i) => renderSection(section, i))}
      </article>

      <hr className="mt-10 border-brand-border" />

      <RelatedCalculators calculators={related} columns={2} />

      <RelatedBlogPosts
        posts={siblingPosts}
        headingText="함께 읽으면 좋은 글"
        columns={2}
      />

      <div className="mt-10">
        <Link
          href="/blog"
          className="text-sm text-brand-text-secondary hover:text-brand-primary"
        >
          ← 블로그 목록으로
        </Link>
      </div>
    </div>
  );
}
