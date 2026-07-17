"use client";

import { useState } from "react";
import { categoryInfo } from "@/lib/calculators";
import { BLOG_PAGE_SIZE, type BlogListItem } from "@/lib/blog";
import BlogPostCard from "@/components/BlogPostCard";
import BlogPagination from "@/components/BlogPagination";
import { INPUT_BASE } from "@/lib/inputClass";

// design/blog-pagination-search-ui-spec.md §3
// 검색 인풋 + 상태줄 + 결과 그리드/빈 상태 + (비검색 시) 페이지네이션을 한 클라이언트
// 컴포넌트로 묶는다(§1 결정 2). 검색어 초기값이 빈 문자열이므로 이 컴포넌트의 서버
// 렌더 결과는 "검색 비활성 상태 = 현재 페이지 카드 그리드 + 페이지네이션 링크"와 100% 동일.

interface BlogListWithSearchProps {
  /** 발행일 내림차순 정렬된 전체 글(경량 데이터) */
  allPosts: BlogListItem[];
  /** app/blog/page.tsx가 searchParams 기준으로 계산해 전달하는 현재 페이지 */
  currentPage: number;
}

// 검색 대상: 제목 + 요약 + 카테고리 표시명 + 태그(§3-4). 한 문자열로 합쳐 소문자화.
function buildSearchHaystack(post: BlogListItem): string {
  return [
    post.title,
    post.description,
    categoryInfo[post.category].title,
    ...post.tags,
  ]
    .join(" ")
    .toLowerCase();
}

// 공백 기준 토큰 분리, 모든 토큰이 haystack에 부분 문자열로 포함되면 매치(AND, §3-4).
function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  return tokens.every((token) => haystack.includes(token));
}

export default function BlogListWithSearch({
  allPosts,
  currentPage,
}: BlogListWithSearchProps) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  const totalPages = Math.max(1, Math.ceil(allPosts.length / BLOG_PAGE_SIZE));
  const pagePosts = allPosts.slice(
    (currentPage - 1) * BLOG_PAGE_SIZE,
    currentPage * BLOG_PAGE_SIZE,
  );
  const rangeStart = (currentPage - 1) * BLOG_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * BLOG_PAGE_SIZE, allPosts.length);

  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const searchResults = isSearching
    ? allPosts.filter((post) => matchesAllTokens(buildSearchHaystack(post), tokens))
    : [];

  const results = isSearching ? searchResults : pagePosts;
  const isEmpty = isSearching && results.length === 0;

  return (
    <>
      <label htmlFor="blog-search" className="sr-only">
        블로그 글 검색
      </label>
      <input
        id="blog-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목, 요약, 키워드로 검색"
        className={`${INPUT_BASE} mt-8 w-full border-brand-border`}
      />

      {!isEmpty && (
        <p
          aria-live="polite"
          className="mt-3 text-xs text-brand-text-secondary"
        >
          {isSearching
            ? `'${trimmed}'에 대한 검색 결과 ${results.length}건`
            : `전체 ${allPosts.length}편 중 ${rangeStart}–${rangeEnd}번째`}
        </p>
      )}

      {isEmpty ? (
        <div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-surface p-8 text-center text-sm text-brand-text-secondary">
          <p>&apos;{trimmed}&apos;에 대한 검색 결과가 없습니다.</p>
          <p className="mt-1">
            다른 키워드로 검색하거나 전체 글을 확인해 보세요.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-brand-primary px-5 text-sm font-semibold text-brand-primary transition-colors hover:bg-blue-50"
          >
            전체 글 보기
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      {!isSearching && (
        <BlogPagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/blog"
        />
      )}
    </>
  );
}
