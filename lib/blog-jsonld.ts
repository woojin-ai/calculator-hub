import { SITE_URL } from "@/lib/site";
import type { BlogPost } from "@/lib/blog";

/**
 * 블로그 상세 페이지용 JSON-LD(@graph) 생성 순수 헬퍼 (planning/blog-spec.md §3).
 * - lib/calculator-jsonld.ts의 @graph 패턴과 동일. 인자 없이 결정적.
 * - 노드: BreadcrumbList(항상) + BlogPosting(항상).
 * - 조작 금지: 개인 저자·로고 URL·가짜 평점 미포함. author/publisher는
 *   site-jsonld의 Organization("계산기 허브")을 재사용하며 logo도 넣지 않는다.
 */
export function buildBlogPostJsonLd(post: BlogPost): object {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const publisher = {
    "@type": "Organization",
    name: "계산기 허브",
    url: SITE_URL,
  };

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "블로그",
        item: `${SITE_URL}/blog`,
      },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const blogPosting = {
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedDate,
    dateModified: post.updatedDate ?? post.publishedDate,
    author: publisher, // 개인 저자 없음 → 조직을 저자로 (조작 금지)
    publisher, // logo 미포함(site-jsonld와 일관)
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "ko",
  };

  return {
    "@context": "https://schema.org",
    "@graph": [breadcrumbList, blogPosting],
  };
}
