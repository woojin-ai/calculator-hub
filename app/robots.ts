import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// coming-soon 계산기 상세 페이지는 robots.txt의 Disallow가 아니라
// 각 페이지의 <meta name="robots" content="noindex"> 로 색인을 막는다.
// (robots.txt로 크롤링 자체를 막으면 검색엔진이 noindex 태그를 읽지 못해
//  이미 다른 곳에서 링크된 경우 오히려 콘텐츠 없이 색인될 수 있어 더 위험하다.
//  app/calculator/[slug]/page.tsx의 generateMetadata 참고)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
