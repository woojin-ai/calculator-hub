import { categoryInfo, type CalculatorCategory, type CalculatorMeta } from "@/lib/calculators";
import { SITE_URL } from "@/lib/site";

/**
 * category → schema.org applicationCategory 파생 맵 (기획안 §1-2).
 * 데이터 소스에 새 필드를 추가하지 않고 코드 상수로만 파생한다.
 */
const APPLICATION_CATEGORY_MAP: Record<CalculatorCategory, string> = {
  salary: "FinanceApplication",
  loan: "FinanceApplication",
  date: "UtilitiesApplication",
  life: "UtilitiesApplication",
};

/**
 * 계산기 상세 페이지용 JSON-LD(@graph) 생성 순수 헬퍼.
 * - status !== "live" 이면 null 반환(호출부에서 script 미렌더).
 * - 노드: BreadcrumbList(항상) + WebApplication(항상) + FAQPage(faq 있을 때만).
 * 기획안 `planning/calculator-jsonld-seo-spec.md` §1/§3/§4 그대로 구현.
 */
export function buildCalculatorJsonLd(calculator: CalculatorMeta): object | null {
  if (calculator.status !== "live") return null;

  const url = `${SITE_URL}/calculator/${calculator.slug}`;

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryInfo[calculator.category].title,
        item: `${SITE_URL}/${calculator.category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: calculator.title,
        item: url,
      },
    ],
  };

  const webApplication = {
    "@type": "WebApplication",
    name: calculator.title,
    description: calculator.shortDescription,
    url,
    applicationCategory: APPLICATION_CATEGORY_MAP[calculator.category],
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    inLanguage: "ko",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
  };

  const graph: object[] = [breadcrumbList, webApplication];

  if (calculator.faq && calculator.faq.length > 0) {
    const faqPage = {
      "@type": "FAQPage",
      mainEntity: calculator.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    };
    graph.push(faqPage);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
