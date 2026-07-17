import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getAllBlogPosts, toBlogListItems, BLOG_PAGE_SIZE } from "@/lib/blog";
import BlogListWithSearch from "@/components/BlogListWithSearch";
import { SITE_URL } from "@/lib/site";

type BlogSearchParams = Promise<{ page?: string | string[] }>;

// 파싱 실패/1 이하/배열 입력 → 1. 계약: 항상 1 이상의 정수를 반환한다.
// (design/blog-pagination-search-ui-spec.md §2-2)
function normalizePage(raw: string | string[] | undefined): number {
  if (raw === undefined || Array.isArray(raw)) return 1;
  if (!/^\d+$/.test(raw)) return 1;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: BlogSearchParams;
}): Promise<Metadata> {
  const { page: raw } = await searchParams;
  const page = normalizePage(raw);

  // 범위를 벗어나는 페이지(notFound() 처리 대상)는 정식 메타데이터를 만들지 않는다
  // — app/blog/[slug]/page.tsx, app/calculator/[slug]/page.tsx가 존재하지 않는
  // 리소스에 대해 {}를 반환하는 것과 동일한 관례.
  const totalPages = Math.max(
    1,
    Math.ceil(getAllBlogPosts().length / BLOG_PAGE_SIZE),
  );
  if (page > totalPages) return {};

  const suffix = page > 1 ? ` (${page}페이지)` : "";
  return {
    title: `블로그${suffix} | 계산기 허브`,
    description: `계산기 활용법과 생활 정보를 정리한 글 모음입니다.${suffix}`,
    alternates: {
      canonical: page > 1 ? `${SITE_URL}/blog?page=${page}` : `${SITE_URL}/blog`,
    },
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: BlogSearchParams;
}) {
  const { page: raw } = await searchParams;
  const requestedPage = normalizePage(raw);

  // raw가 있을 때만 정규화 검사(undefined인 기본 /blog는 그대로 통과 — 무한 리다이렉트 방지)
  if (raw !== undefined && requestedPage <= 1) {
    permanentRedirect("/blog");
  }

  const allPosts = getAllBlogPosts(); // 발행일 내림차순
  const totalPages = Math.max(1, Math.ceil(allPosts.length / BLOG_PAGE_SIZE));

  if (requestedPage > totalPages) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
        블로그
      </h1>
      <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
        계산기 활용법과 생활 정보를 정리한 글 모음입니다.
      </p>

      {allPosts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-brand-border bg-brand-surface p-8 text-center text-sm text-brand-text-secondary">
          아직 등록된 글이 없습니다. 곧 찾아뵙겠습니다.
        </div>
      ) : (
        <BlogListWithSearch
          allPosts={toBlogListItems(allPosts)}
          currentPage={requestedPage}
        />
      )}
    </div>
  );
}
