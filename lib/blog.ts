// 블로그 데이터 모델 (planning/blog-spec.md §1 채택).
// calculators.ts와 동일한 순수 데이터 배열 방식. 본문은 마크다운 문자열이 아니라
// 구조화된 섹션 배열(discriminated union)로 표현 → 렌더가 순수 switch 매핑이 되어
// 마크다운 파서·본문 dangerouslySetInnerHTML이 전혀 필요 없고 XSS 위험이 없다.

export type BlogCategory = "salary" | "loan" | "date" | "life";
// 계산기와 동일한 4개 카테고리 재사용 → 향후 카테고리별 목록 필터/색인 일관성 확보.

/** 본문 한 블록. type으로 구분되는 discriminated union. */
export type BlogSection =
  | { type: "heading"; text: string } // <h2> 소제목
  | { type: "paragraph"; text: string } // 문단(플레인 텍스트)
  | { type: "list"; ordered?: boolean; items: string[] } // ul/ol
  | { type: "callout"; variant: "info" | "warning"; text: string } // 안내/주의 박스(YMYL 면책 등)
  | { type: "calculatorCta"; slug: string; label?: string }; // 계산기로 보내는 내부링크 CTA 버튼

export interface BlogPost {
  /** URL 마지막 세그먼트. 영문 소문자-하이픈. calculators.ts slug와 동일 규칙 */
  slug: string;
  /** H1 + <title> 기반 문구 (권장 60자 이내) */
  title: string;
  /** meta description (권장 150자 이내). 목록 카드 요약에도 재사용 */
  description: string;
  /** 계산기와 동일한 4개 카테고리 중 하나 */
  category: BlogCategory;
  /** 롱테일 키워드 태그. 목록 필터/관련글 근거로 확장 가능 */
  tags: string[];
  /** 발행일. ISO 날짜 문자열 "YYYY-MM-DD" (JSON-LD·정렬·표시에 그대로 사용) */
  publishedDate: string;
  /** 수정일. 없으면 렌더/JSON-LD에서 publishedDate로 폴백 */
  updatedDate?: string;
  /** 이 글이 밀어주는 관련 계산기 slug 배열(내부링크 근거). calculators.ts slug와 일치해야 함 */
  relatedCalculatorSlugs: string[];
  /** 본문. 위에서 아래로 렌더 */
  body: BlogSection[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "salary-net-income-guide-2026",
    title: "2026년 연봉 실수령액, 세금·4대보험 얼마나 떼나 계산법 정리",
    description:
      "세전 연봉에서 국민연금·건강보험·고용보험 등 4대보험과 근로소득세가 얼마나 빠지는지, 2026년 요율과 실제 예시로 실수령액 계산법을 정리했습니다. 계산기로 내 연봉도 바로 확인해 보세요.",
    category: "salary",
    tags: ["연봉 실수령액", "4대보험", "근로소득세", "세전 세후"],
    publishedDate: "2026-07-15",
    relatedCalculatorSlugs: [
      "salary-net-calculator",
      "severance-pay-calculator",
      "service-period-calculator",
    ],
    body: [
      {
        type: "paragraph",
        text: "\"연봉 4,000만원 계약했는데 통장에는 왜 그만큼 안 들어올까?\" 많은 직장인이 연봉계약서 숫자와 실제 월급의 차이에 당황합니다. 계약서에 적힌 세전 연봉과, 세금·보험료를 뗀 뒤 실제로 통장에 꽂히는 실수령액(세후 급여)은 항상 차이가 납니다. 이 글에서는 2026년 기준으로 연봉에서 무엇이, 얼마나 빠지는지 항목별로 정리하고, 실제 예시로 한눈에 보여드립니다.",
      },
      {
        type: "heading",
        text: "실수령액이란? 세전 연봉과 무엇이 다른가",
      },
      {
        type: "paragraph",
        text: "세전 연봉은 세금과 4대 보험료를 빼기 전의 급여 총액으로, 근로계약서나 연봉계약서에 적히는 금액입니다. 실수령액은 여기서 4대 보험료와 근로소득세·지방소득세를 모두 뺀, 실제로 통장에 입금되는 금액입니다. 즉 '연봉'과 '실수령액' 사이에는 매달 일정한 금액이 공제로 빠져나가며, 이 공제 구조를 알면 내 월급이 왜 이 금액인지 정확히 이해할 수 있습니다.",
      },
      {
        type: "heading",
        text: "연봉에서 빠지는 4대 보험료 (2026년 근로자 부담 요율)",
      },
      {
        type: "paragraph",
        text: "가장 먼저 빠지는 것이 4대 보험입니다. 근로자가 부담하는 2026년 요율은 다음과 같습니다. 회사가 절반가량을 함께 부담하지만, 아래는 급여에서 공제되는 근로자 몫 기준입니다.",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "국민연금: 과세 대상 급여의 4.75%",
          "건강보험: 과세 대상 급여의 3.595%",
          "장기요양보험: 건강보험료의 약 12.95% (급여가 아니라 건강보험료에 붙습니다)",
          "고용보험: 과세 대상 급여의 0.9%",
        ],
      },
      {
        type: "paragraph",
        text: "여기서 '과세 대상 급여'는 월 급여에서 비과세 항목을 뺀 금액입니다. 대표적인 비과세가 식대로, 월 20만원까지는 세금과 보험료가 붙지 않습니다. 그래서 같은 연봉이라도 비과세액이 클수록 공제가 줄어 실수령액이 늘어납니다.",
      },
      {
        type: "heading",
        text: "근로소득세와 지방소득세는 어떻게 정해지나",
      },
      {
        type: "paragraph",
        text: "4대 보험 다음으로 근로소득세가 빠집니다. 근로소득세는 국세청 근로소득 간이세액표를 기준으로 하며, 부양가족 수와 8~20세 자녀 수에 따라 달라집니다. 부양가족이 많을수록 인적공제가 늘어 세금이 줄어듭니다. 그리고 이렇게 계산된 근로소득세의 10%가 지방소득세로 추가로 부과됩니다. 매달 떼는 이 세금은 어디까지나 임시 금액이며, 이듬해 연말정산에서 각종 공제를 반영해 최종 세액이 정산됩니다.",
      },
      {
        type: "heading",
        text: "실제 예시: 연봉 4,000만원이면 얼마 받나",
      },
      {
        type: "paragraph",
        text: "연봉 4,000만원, 월 비과세(식대) 20만원, 부양가족 본인 1인을 기준으로 하면 공제 항목은 다음과 같습니다.",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "국민연금: 148,817원",
          "건강보험: 112,643원",
          "장기요양보험: 14,582원",
          "고용보험: 28,199원 (4대 보험 합계 약 304,241원)",
          "근로소득세: 105,888원",
          "지방소득세: 10,588원",
        ],
      },
      {
        type: "paragraph",
        text: "이 공제를 모두 반영하면 매월 실수령액은 약 291만원, 연 환산 약 3,495만원이 됩니다. 세전 연봉 4,000만원과 비교하면 1년에 약 500만원 이상이 세금·보험료로 빠지는 셈입니다. 부양가족이나 자녀가 더 많거나 비과세액이 크면 이 금액은 늘어납니다. 내 조건을 직접 넣어 확인하려면 아래 계산기를 이용하세요.",
      },
      {
        type: "calculatorCta",
        slug: "salary-net-calculator",
      },
      {
        type: "heading",
        text: "자주 묻는 점",
      },
      {
        type: "paragraph",
        text: "성과급·상여금은 이 계산에 포함되지 않습니다. 매달 균등하게 나눠 받는 급여를 기준으로 하므로, 특정 달에 몰아 지급되는 상여는 지급 시점과 방식에 따라 세금이 따로 계산됩니다. 또 계산된 세금이 급여명세서와 수천 원 단위로 다를 수 있는데, 근로소득세가 간이세액표를 근사한 값이고 연말정산으로 다시 정산되기 때문입니다.",
      },
      {
        type: "paragraph",
        text: "이직·퇴사를 앞두고 있다면 실수령액과 함께 퇴직금·근속연수도 미리 확인해 두면 좋습니다. 퇴직금은 평균임금과 재직일수로 계산되고, 근속연수는 각종 수당·연차 산정의 기준이 됩니다.",
      },
      {
        type: "calculatorCta",
        slug: "severance-pay-calculator",
      },
      {
        type: "calculatorCta",
        slug: "service-period-calculator",
      },
      {
        type: "callout",
        variant: "warning",
        text: "본 내용과 예시 수치는 2026년 기준 참고용이며 법적·재무적 효력이 없습니다. 근로소득세는 간이세액표를 근사한 값이라 실제 원천징수액과 다를 수 있고, 4대 보험료도 회사의 신고·산정 방식이나 기준소득월액 적용 시점에 따라 실제 공제액과 소액 차이가 날 수 있습니다. 정확한 금액은 회사 급여명세서나 국세청 홈택스에서 확인하시기 바랍니다.",
      },
    ],
  },
];

/** 발행일 내림차순 정렬된 전체 글 (목록 페이지용) */
export function getAllBlogPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) =>
    b.publishedDate.localeCompare(a.publishedDate),
  );
}

/** slug로 단건 조회 (상세 페이지용). 없으면 undefined */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

/** 본문 텍스트 길이 기반 예상 읽기 시간(분, 최소 1). 한국어 약 500자/분 가정 */
export function getReadingTimeMinutes(post: BlogPost): number {
  const chars = post.body.reduce((sum, s) => {
    if (s.type === "paragraph" || s.type === "heading" || s.type === "callout") {
      return sum + s.text.length;
    }
    if (s.type === "list") return sum + s.items.join("").length;
    return sum; // calculatorCta는 UI 요소이므로 제외
  }, 0);
  return Math.max(1, Math.round(chars / 500));
}
