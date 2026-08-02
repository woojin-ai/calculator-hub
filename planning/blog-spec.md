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
  | {
      type: "table";                // 데이터 비교 표 (2026-08-02 추가)
      caption: string;              // 표 제목. 필수 — 접근성 이름 소스(aria-labelledby)
      headers: string[];            // 헤더 행. 필수
      rows: string[][];             // 각 행 길이 === headers.length
      align?: ("left" | "right")[]; // 생략 시 [0번 열 left, 나머지 right]
      note?: string;                // 표 하단 가정·출처. 선택
    }
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

### `table` 섹션 작성 규칙 (2026-08-02 추가 — 기획팀 필독)

**왜 추가됐나.** `BlogSection`에 표 타입이 없어 **블로그 36장 전부 `<table>` 0개**였는데, 본문 산문은
"표를 세로로 훑어보면", "위 표에서" 같은 표현을 **22곳**에서 써 **존재하지 않는 표를 가리키고
있었다**(2026-08-02 라이브 실측). 원고에서 표를 전제해 놓고 데이터 모델에 표가 없으면 이런 유령
참조가 생긴다. 아래 규칙은 그 재발을 막기 위한 것이다.

| 규칙 | 내용 |
|---|---|
| 캡션 필수 | `caption`은 스크린리더용 이름 소스이므로 **빈 문자열 금지**. "표 1", "아래 표" 같은 무의미 캡션도 금지 (예: ○ "연봉 구간별 실수령액 비교"). |
| 열 3개 상한 | `headers.length ≤ 3` (행 레이블 1 + 데이터 2). 375px 모바일 기준. 4열 이상이 필요하면 **표를 쪼갠다.** 근거: `design/design-system.md` §3-6 (5). |
| 행 길이 일치 | `rows`의 모든 행 길이 === `headers.length`. 빈 칸은 `"-"` 문자열로 채운다(길이를 줄이지 않는다). |
| 셀은 완성된 문자열 | 단위·기호를 포함한 표시용 문자열로 넣는다(예: `"3,120,000원"`, `"약 12.4%"`). 셀 안에 링크·강조 마크업을 쓰지 않는다. 숫자 표기는 `planning/ratio-percent-display-rules.md` 규칙을 따른다. |
| 첫 열 = 행 레이블 | 렌더 시 각 행의 첫 셀이 `<th scope="row">`가 된다. 첫 열에는 비교 축(연봉 구간, 조건명 등)을 둔다. 첫 열에 숫자 결과를 두지 않는다. |
| `align` | 생략이 기본. 생략 시 [0번 열 `left`, 나머지 `right`]로 렌더된다. 숫자 열은 우측 정렬이 정답이므로 대부분 생략하면 된다. |
| `note` | 계산 가정·기준연도·출처 등 단서. **면책·경고 문구는 여기 넣지 말고** `callout(variant:"warning")`을 쓴다(역할 분리). |
| 산문 정합 | 본문에서 "위 표에서"류 표현을 쓰려면 **그 근처에 실제 `table` 섹션이 있어야 한다.** 원고 검수 항목. |

> 화면 표현(마크업·클래스·치수·접근성 속성)의 정본은 `design/design-system.md` **§3-6 데이터 표(Table)**,
> 블로그 본문에서의 배치 규칙은 `design/blog-layout-spec.md` §2-3이다. 기획서에서 클래스를 적지 않는다.

> **⚠️ 글 기획서 QA 체크리스트를 쓸 때**: "BlogSection 기존 **5개** 타입만 사용했는가?"처럼 **개수를
> 박은 문항을 복사하지 말 것.** 유니온은 확장된다(이번이 그 사례다). 표준 문구와 이유는 **§7**.

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
    if (s.type === "table") {
      // 표는 읽는 시간에 포함한다(스캔도 체류 시간이다). 캡션 + 헤더 + 셀 + note 전체 길이.
      return (
        sum +
        s.caption.length +
        s.headers.join("").length +
        s.rows.reduce((r, row) => r + row.join("").length, 0) +
        (s.note?.length ?? 0)
      );
    }
    return sum; // calculatorCta는 UI 요소이므로 제외
  }, 0);
  return Math.max(1, Math.round(chars / 500));
}
```

> **`table` 분기를 빼면 안 되는 이유**: 표가 본문 분량의 상당 부분을 차지하는 글에서 읽는 시간이
> 과소 표기되고, 목록 카드의 "읽는 시간 N분"이 실제와 어긋난다. 표 셀은 문장보다 빨리 읽히긴 하지만
> **비교·대조에 드는 시간**이 있으므로 문자 수 기준을 그대로 적용한다(별도 가중치를 두지 않는다 —
> 임의 계수는 근거가 없고 검증도 안 된다).

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
    case "table": {
      // 마크업·클래스 정본은 design/design-system.md §3-6 (여기서 클래스를 정하지 않는다).
      // 필수 골격: <figure> > <div role="region" aria-labelledby tabIndex={0} overflow-x-auto>
      //            > <table> > <caption id> / <th scope="col"> / 행 첫 셀 <th scope="row">
      // 정렬 기본값: 0번 열 left, 나머지 right (section.align이 있으면 그 값)
      return (
        <figure key={i}>
          <div role="region" aria-labelledby={`tbl-${i}`} tabIndex={0}>
            <table>
              <caption id={`tbl-${i}`}>{section.caption}</caption>
              <thead>
                <tr>{section.headers.map((h, c) => <th key={c} scope="col">{h}</th>)}</tr>
              </thead>
              <tbody>
                {section.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) =>
                      c === 0
                        ? <th key={c} scope="row">{cell}</th>
                        : <td key={c}>{cell}</td>,
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {section.note && <figcaption>{section.note}</figcaption>}
        </figure>
      );
    }
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
7. **(2026-08-02 추가)** `BlogSection`에 `table` 타입 반영 + 상세 페이지 렌더 매핑에 `case "table"` 추가.
   `getReadingTimeMinutes`의 `table` 분기도 함께 넣는다(빠뜨리면 읽는 시간이 과소 표기된다).
   클래스는 `design/design-system.md` §3-6 그대로 — 특히 `overflow-x-auto`/`min-w-max`/
   `role="region"`/`aria-labelledby`/`tabIndex={0}`을 빼지 않는다.

---

## 7. 타입 체크 문구 작성 규칙 (스테일 체크리스트 방지) — 2026-08-02 신설

글 기획서(`planning/blog-post-NN-spec.md`)의 QA 체크리스트에 **`BlogSection` 타입 개수를 박아 넣지
않는다.**

- ❌ 금지: "BlogSection **기존 5개 타입만** 사용했는가?(신규 타입 추가 시 FAIL)"
- ✅ 표준: "BlogSection에 **정의된 타입만** 사용했는가?(정의되지 않은 임의 타입 사용 시 FAIL)"

**이유.** 개수를 박은 문구는 유니온이 확장되는 순간 전부 거짓이 된다. 실제로 `table` 타입 추가 이전에
작성된 기획서들이 "5개 타입만"이라고 적어 두었고, 이 문구를 그대로 복사하며 새 기획서를 쓰면
**표를 쓰는 것이 QA에서 FAIL로 판정**되어 결함이 아니라 개선이 차단된다. 체크리스트는 "현재 정의된
집합을 벗어나지 말라"는 뜻이지 "영원히 5개"라는 뜻이 아니다.

**과거 기획서는 이력이므로 소급 수정하지 않는다.** 이미 발행된 글의 기획서에 남은 "5개" 표기는
그 시점의 기록으로 둔다. **앞으로 쓰는 기획서부터** 위 표준 문구를 쓴다. 새 기획서를 이전 기획서
복사로 시작할 경우, 이 문항은 반드시 표준 문구로 교체하고 시작한다.

> 같은 원리로, 다른 체크 문항에서도 **"N개"·"N종"처럼 확장 가능한 집합의 크기를 문구에 박지
> 않는다.** 크기가 아니라 **출처(이 문서 §1의 정의)** 를 가리키게 쓴다.
