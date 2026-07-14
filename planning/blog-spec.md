# 블로그 정보구조(IA) 스펙 — 계산기 허브

작성: 기획팀 / 대상: 개발팀
목적: `app/blog`를 빈 스텁에서 실제 콘텐츠 블로그로 전환. SEO 롱테일 유입 → 계산기 내부링크로 체류·페이지뷰↑ (AdSense).

전제(확정 사항, 뒤집지 말 것): 계산기 허브 컨셉, Next.js SSG, 카테고리 /salary /loan /date /life + /blog, `SITE_URL = https://calculator-hub-delta.vercel.app`.
설계 원칙: `lib/calculators.ts`와 동일한 **순수 데이터 배열** 방식. MDX 파이프라인·마크다운 렌더 라이브러리 추가 금지(의존성/보안/빌드 복잡도 회피).

---

## 1. 데이터 모델 (`lib/blog.ts` 신규)

`calculators.ts`의 `CalculatorMeta` 패턴을 그대로 따른다. 본문은 마크다운 문자열이 아니라 **구조화된 섹션 배열(discriminated union)** 로 표현한다. 이렇게 하면 렌더링이 순수 `switch` 매핑이 되어 마크다운 파서·`dangerouslySetInnerHTML`(본문)이 전혀 필요 없고, 텍스트가 전부 플레인 문자열이라 XSS 위험이 없다.

```ts
// lib/blog.ts

export type BlogCategory = "salary" | "loan" | "date" | "life";
// 계산기와 동일한 4개 카테고리 재사용 → 향후 카테고리별 목록 필터/색인 일관성 확보.

/** 본문 한 블록. type으로 구분되는 discriminated union. */
export type BlogSection =
  | { type: "heading"; text: string }                 // <h2> 소제목
  | { type: "paragraph"; text: string }               // 문단(플레인 텍스트)
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
  // 첫 글: planning/blog-post-01-draft.md 참고
];
```

### 조회 헬퍼 (calculators.ts의 getCalculatorBySlug 패턴과 동일)

```ts
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
```

### readingTime는 필드가 아니라 파생값으로

데이터에 숫자를 손으로 박아 넣으면 본문 수정 시 어긋난다(drift). 저장하지 말고 본문에서 결정적으로 계산하는 순수 헬퍼를 둔다.

```ts
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
```

> 인라인 링크(문단 문장 중간의 하이퍼링크)는 1차 구현 범위에서 제외한다. 내부링크는 문단 사이의 `calculatorCta` 블록으로만 처리한다(구현 단순 + 클릭률 높은 버튼형 CTA). 문장 중간 링크가 꼭 필요해지면 `paragraph.text`를 `(string | { text: string; href: string })[]` 런(run) 배열로 확장하는 것을 **향후 과제**로 남긴다. 지금은 확장하지 말 것.

---

## 2. 라우팅

`app/calculator/[slug]/page.tsx`의 구조를 그대로 미러링한다.

- `app/blog/page.tsx` — 목록. 기존 스텁을 교체. `getAllBlogPosts()`로 카드 리스트 렌더(제목, description, 카테고리, publishedDate, `getReadingTimeMinutes`). 글이 0개면 기존 "아직 등록된 글이 없습니다" 빈 상태 유지.
- `app/blog/[slug]/page.tsx` — 상세. 신규.
  - `export function generateStaticParams()` → `blogPosts.map(p => ({ slug: p.slug }))` (SSG 정적 생성).
  - `export async function generateMetadata({ params })` → `getBlogPostBySlug`로 조회, 없으면 `{}`. `title: `${post.title} | 계산기 허브``, `description: post.description`, `alternates: { canonical: `${SITE_URL}/blog/${post.slug}` }`.
  - 페이지 본문: 브레드크럼(홈 / 블로그) → `<h1>{post.title}</h1>` → 발행일·읽기시간 메타 → `body` 섹션 매핑 렌더 → 관련 계산기 링크.
  - 글 없으면 `notFound()`.

### 본문 렌더 매핑 (계산기 페이지의 컴포넌트 매핑과 동일한 발상)

```tsx
{post.body.map((section, i) => {
  switch (section.type) {
    case "heading":
      return <h2 key={i} className="...">{section.text}</h2>;
    case "paragraph":
      return <p key={i} className="...">{section.text}</p>;
    case "list":
      return section.ordered
        ? <ol key={i}>{section.items.map(...)}</ol>
        : <ul key={i}>{section.items.map(...)}</ul>;
    case "callout":
      // variant === "warning"이면 강조 스타일(YMYL 면책 박스)
      return <aside key={i} data-variant={section.variant}>{section.text}</aside>;
    case "calculatorCta": {
      const calc = getCalculatorBySlug(section.slug); // lib/calculators.ts 재사용
      if (!calc) return null; // 잘못된 slug는 안전하게 무시
      return (
        <Link key={i} href={`/calculator/${calc.slug}`}>
          {section.label ?? `${calc.title} 바로가기`}
        </Link>
      );
    }
  }
})}
```

> `calculatorCta`의 `label`이 없으면 `getCalculatorBySlug(slug).title`에서 자동 생성 → 데이터에 문구를 중복 저장하지 않아도 됨. slug가 존재하지 않으면 `null` 반환으로 방어(면책: 존재하지 않는 계산기로 링크 금지).

관련 계산기 섹션은 기존 `RelatedCalculators` 컴포넌트를 재사용하되, 입력을 `post.relatedCalculatorSlugs.map(getCalculatorBySlug).filter(Boolean).filter(live)`로 넘긴다.

---

## 3. SEO — BlogPosting JSON-LD (`lib/blog-jsonld.ts` 신규)

`lib/calculator-jsonld.ts`의 `buildCalculatorJsonLd`와 동일한 순수 헬퍼·@graph 패턴. `app/blog/[slug]/page.tsx`에서 계산기 페이지와 똑같이 `<script type="application/ld+json">`로 주입(같은 `.replace(/</g, "\\u003c")` 처리).

**조작 금지 원칙(중요):** 존재하지 않는 개인 저자 이름, 없는 로고 URL, 가짜 리뷰/평점을 넣지 않는다. 기존 `lib/site-jsonld.ts`의 Organization("계산기 허브")을 **author·publisher로 재사용**한다. site-jsonld가 의도적으로 logo를 뺀 것과 일관되게 여기서도 `logo`를 넣지 않는다(구글 BlogPosting에서 logo는 권장이지 필수 아님).

노드: `BreadcrumbList`(항상) + `BlogPosting`(항상).

```ts
import { SITE_URL } from "@/lib/site";
import type { BlogPost } from "@/lib/blog";

export function buildBlogPostJsonLd(post: BlogPost): object {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const publisher = { "@type": "Organization", name: "계산기 허브", url: SITE_URL };

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "블로그", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const blogPosting = {
    "@type": "BlogPosting",
    headline: post.title,            // 권장 110자 이내 → title이 이미 60자 이내라 안전
    description: post.description,
    datePublished: post.publishedDate,
    dateModified: post.updatedDate ?? post.publishedDate,
    author: publisher,               // 개인 저자 없음 → 조직을 저자로 (조작 금지)
    publisher,                       // logo 미포함(site-jsonld와 일관)
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "ko",
  };

  return { "@context": "https://schema.org", "@graph": [breadcrumbList, blogPosting] };
}
```

| BlogPosting 필드 | 매핑 소스 |
| --- | --- |
| headline | `post.title` |
| description | `post.description` |
| datePublished | `post.publishedDate` ("YYYY-MM-DD") |
| dateModified | `post.updatedDate ?? post.publishedDate` |
| author | Organization "계산기 허브" (site-jsonld 재사용) |
| publisher | Organization "계산기 허브" (logo 없음) |
| mainEntityOfPage | `${SITE_URL}/blog/${slug}` |
| inLanguage | "ko" |

---

## 4. 사이트맵 (개발팀 반영 필요)

`app/sitemap.ts`에 이미 `/blog`(목록)는 있음. 상세글을 동적으로 추가한다.

```ts
import { blogPosts } from "@/lib/blog";
// ...
const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
  url: `${SITE_URL}/blog/${post.slug}`,
  lastModified: post.updatedDate ?? post.publishedDate,
  changeFrequency: "monthly",
  priority: 0.6,
}));
return [...staticPages, ...liveCalculatorPages, ...blogPostPages];
```

---

## 5. 향후 확장 고려

- **글 추가**: `blogPosts` 배열에 객체 하나 추가하면 목록·상세·정적생성·사이트맵·JSON-LD가 모두 자동 반영(계산기와 동일 운영 모델).
- **카테고리별 목록**: `BlogCategory`가 계산기 카테고리와 동일하므로, 추후 `/blog?category=salary` 대신 정적 친화적으로 계산기 카테고리 페이지 하단에 "관련 글" 블록을 붙이는 확장이 쉬움(양방향 내부링크 강화).
- **관련글**: 지금은 `tags` 교집합으로 계산 가능(추가 필드 불필요). 필요 시 `getRelatedPosts(post)` 헬퍼만 더한다.
- **얇은 콘텐츠 방어(AdSense 리스크)**: 글 1편만으로 오픈해도 되지만, `/blog` 목록이 1건뿐이면 "얇은 사이트" 인상을 줄 수 있음. 목록 상단에 블로그 소개 문단 1개를 두고, 최소 3~4편 확보 로드맵을 권장(내용은 마스터 확인 후 순차).

---

## 6. 개발팀 체크리스트

1. `lib/blog.ts` 생성(위 타입 + 헬퍼 + `blogPosts` 배열, 첫 글은 draft 파일 반영).
2. `lib/blog-jsonld.ts` 생성.
3. `app/blog/page.tsx` 목록으로 교체(0건 빈 상태 유지).
4. `app/blog/[slug]/page.tsx` 신규(계산기 상세 페이지 구조 미러링).
5. `app/sitemap.ts`에 blogPostPages 추가.
6. 본문 렌더는 플레인 텍스트만 → `dangerouslySetInnerHTML`은 JSON-LD script에만 사용(본문 X).
