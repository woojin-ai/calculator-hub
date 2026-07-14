import {
  categoryInfo,
  getCalculatorsByCategory,
  type CalculatorCategory,
} from "@/lib/calculators";
import { SITE_URL } from "@/lib/site";

/**
 * 사이트 전역(루트) JSON-LD(@graph) 생성 순수 헬퍼 (기획안 §8-1/§8-3).
 * - 인자 없음, 결정적. 값은 SITE_URL과 리터럴에서만 파생.
 * - 노드: WebSite + Organization (항상 2노드).
 * - locked 결정: WebSite에 SearchAction/potentialAction 미포함, Organization에 logo 미포함.
 * - app/layout.tsx body 최상단에 단일 script로 주입 → 전 페이지 공통 출력.
 */
export function buildSiteJsonLd(): object {
  const website = {
    "@type": "WebSite",
    name: "계산기 허브",
    url: SITE_URL,
    inLanguage: "ko",
  };

  const organization = {
    "@type": "Organization",
    name: "계산기 허브",
    url: SITE_URL,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [website, organization],
  };
}

/**
 * 카테고리 페이지 JSON-LD(@graph) 생성 순수 헬퍼 (기획안 §8-2/§8-3).
 * - 노드: CollectionPage(항상) + ItemList(live 계산기 ≥1일 때만).
 * - live 필터 필수: getCalculatorsByCategory는 status를 거르지 않으므로 여기서 추린다.
 * - ItemList의 ListItem은 item이 아니라 url 키를 사용(§8-3 주의).
 * - live가 0개면 ItemList 노드를 @graph에서 생략(CollectionPage만). 빈 배열 미출력.
 */
export function buildCategoryJsonLd(category: CalculatorCategory): object {
  const info = categoryInfo[category];

  const collectionPage = {
    "@type": "CollectionPage",
    name: info.title,
    description: info.description,
    url: `${SITE_URL}/${category}`,
    inLanguage: "ko",
  };

  const graph: object[] = [collectionPage];

  const liveCalculators = getCalculatorsByCategory(category).filter(
    (c) => c.status === "live",
  );

  if (liveCalculators.length > 0) {
    const itemList = {
      "@type": "ItemList",
      itemListElement: liveCalculators.map((c, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: c.title,
        url: `${SITE_URL}/calculator/${c.slug}`,
      })),
    };
    graph.push(itemList);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
