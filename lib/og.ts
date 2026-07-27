import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

/**
 * OG/트위터 카드에 노출되는 사이트 이름.
 * 값 자체는 기존 JSON-LD(site-jsonld.ts / calculator-jsonld.ts / blog-jsonld.ts)의
 * "계산기 허브" 리터럴과 동일해야 한다. 다만 그 3개 파일의 리터럴을 이 상수로
 * 치환하는 리팩터링은 이번 범위가 아니다(JSON-LD 62/62 회귀 위험 회피,
 * planning/og-metadata-spec.md §5-3 말미).
 */
export const SITE_NAME = "계산기 허브";

/** OG는 `언어_지역` 형식이므로 <html lang="ko">와 달리 ko_KR을 쓴다. */
const OG_LOCALE = "ko_KR";

type BuildOpenGraphInput = {
  /** 페이지 경로. 같은 페이지의 canonical에 넘기는 것과 "같은 문자열"을 넘긴다. 예: "/salary", "/blog?page=2" */
  path: string;
  /** 기본 "website". 블로그 상세만 "article" (planning/og-metadata-spec.md §4) */
  type?: "website" | "article";
  /** type === "article"일 때만 사용. "YYYY-MM-DD" */
  publishedDate?: string;
  /** type === "article"일 때만 사용. 없으면 publishedDate로 폴백 */
  updatedDate?: string;
};

/** "YYYY-MM-DD" → OG가 기대하는 ISO8601 datetime(KST). */
function toOgDateTime(date: string): string {
  return `${date}T00:00:00+09:00`;
}

/**
 * 페이지 metadata에 넣을 openGraph 값을 만든다(순수 함수).
 *
 * - og:title/og:description은 **의도적으로 설정하지 않는다.** Next.js가 그 페이지의
 *   최종 title/description을 자동 상속시킨다(카피 이중 관리 방지, 사양 §0-2 A).
 * - og:url은 canonical과 동일한 canonicalUrl()로 만들어 두 값이 어긋날 수 없게 한다.
 * - og:image는 1단계 범위 밖이다. 이미지 도입 시 이 파일 한 곳만 수정하면
 *   전 페이지 + 트위터 카드(summary → summary_large_image)가 일괄 승급된다(사양 §3-5, §5-1).
 */
export function buildOpenGraph(
  input: BuildOpenGraphInput,
): Metadata["openGraph"] {
  const base = {
    url: canonicalUrl(input.path),
    siteName: SITE_NAME,
    locale: OG_LOCALE,
  };

  if (input.type === "article") {
    const published = input.publishedDate;
    return {
      ...base,
      type: "article",
      publishedTime: published ? toOgDateTime(published) : undefined,
      modifiedTime: published
        ? toOgDateTime(input.updatedDate ?? published)
        : undefined,
    };
  }

  return { ...base, type: "website" };
}
