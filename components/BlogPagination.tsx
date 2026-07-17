import Link from "next/link";
import { FOCUS_RING_CARD, FOCUS_RING_LINK } from "@/lib/focusRing";

// design/blog-pagination-search-ui-spec.md §2-4
// 순수 <Link>/<span>만 사용하는 프레젠테이션 컴포넌트 — 자체는 "use client" 불필요.
// (상위 BlogListWithSearch가 클라이언트 컴포넌트라 번들엔 함께 포함되지만 문제 없음)

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  /** 예: "/blog" */
  basePath: string;
}

type PageToken = number | "ellipsis-start" | "ellipsis-end";

// totalPages<=7이면 전부 표시. 초과 시 1페이지·마지막 페이지·현재±1은 항상 표시하고
// 그 사이는 "…"로 축약(경계에 가까우면 한쪽 "…"는 자연히 생략).
function getPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const tokens: PageToken[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) tokens.push("ellipsis-start");
  for (let page = start; page <= end; page++) tokens.push(page);
  if (end < totalPages - 1) tokens.push("ellipsis-end");
  tokens.push(totalPages);

  return tokens;
}

function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

const NAV_BUTTON_BASE =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-brand-border px-4 text-sm font-medium transition-colors";

export default function BlogPagination({
  currentPage,
  totalPages,
  basePath,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const tokens = getPageTokens(currentPage, totalPages);

  return (
    <nav
      aria-label="블로그 목록 페이지 네비게이션"
      className="mt-10 flex items-center justify-center gap-3"
    >
      {hasPrev ? (
        <Link
          href={pageHref(basePath, currentPage - 1)}
          className={`${NAV_BUTTON_BASE} text-brand-text-secondary hover:border-brand-primary hover:text-brand-primary ${FOCUS_RING_CARD}`}
        >
          <span aria-hidden="true">‹</span> 이전
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${NAV_BUTTON_BASE} text-brand-text-disabled`}
        >
          <span aria-hidden="true">‹</span> 이전
        </span>
      )}

      {/* 번호 세그먼트 — sm 이상만 표시 */}
      <div className="hidden items-center gap-1 rounded-lg border border-brand-border bg-brand-surface p-1 sm:flex">
        {tokens.map((token) => {
          if (token === "ellipsis-start" || token === "ellipsis-end") {
            return (
              <span
                key={token}
                className="flex h-11 min-w-11 items-center justify-center text-sm text-brand-text-secondary"
              >
                …
              </span>
            );
          }
          const isCurrent = token === currentPage;
          return (
            <Link
              key={token}
              href={pageHref(basePath, token)}
              aria-current={isCurrent ? "page" : undefined}
              className={`flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm font-semibold transition-colors ${FOCUS_RING_LINK} ${
                isCurrent
                  ? "bg-brand-primary text-white"
                  : "text-brand-text-secondary hover:bg-brand-bg hover:text-brand-primary"
              }`}
            >
              {token}
            </Link>
          );
        })}
      </div>

      {/* 모바일 축약 표시 — sm 미만만 표시 */}
      <span className="text-sm font-medium tabular-nums text-brand-text sm:hidden">
        {currentPage} / {totalPages} 페이지
      </span>

      {hasNext ? (
        <Link
          href={pageHref(basePath, currentPage + 1)}
          className={`${NAV_BUTTON_BASE} text-brand-text-secondary hover:border-brand-primary hover:text-brand-primary ${FOCUS_RING_CARD}`}
        >
          다음 <span aria-hidden="true">›</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${NAV_BUTTON_BASE} text-brand-text-disabled`}
        >
          다음 <span aria-hidden="true">›</span>
        </span>
      )}
    </nav>
  );
}
