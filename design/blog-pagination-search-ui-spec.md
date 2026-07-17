# 블로그 목록 — 페이지네이션 + 검색 UI 구성안 (v1.0, 2026-07-17)

- 문서 유형: 개발 전 화면 구성안(레이아웃/인터랙션 스펙)
- 대상 페이지: `app/blog/page.tsx` (블로그 목록 `/blog`)
- 재사용 자산: `components/BlogPostCard.tsx`(무수정 재사용), `lib/inputClass.ts`(`INPUT_BASE`), `lib/focusRing.ts`(`FOCUS_RING_CARD`/`FOCUS_RING_LINK`), `components/CategoryPage.tsx`의 그리드 패턴, `components/LoanInterestCalculator.tsx`의 세그먼트 토글 패턴, `components/LegalPageLayout.tsx`의 아웃라인 버튼 패턴
- 관련 선행 문서: `design/blog-layout-spec.md`(v1.0, 07-15 — 이 문서가 개편 대상으로 삼는 원 스펙), `design/design-system.md`, `design/input-class-consolidation-spec.md`, `design/focus-visible-ring-ui-spec.md`, `design/category-related-blog-ui-spec.md`
- 계기: 마스터 전달 — "블로그 글이 늘어나는데 계속 스크롤로만 보여줘서 불편하다. 페이지 나누고 검색 기능도 넣어달라"
- 작성: 디자인팀 / 기준일 2026-07-17

---

## 0. 설계 전 실측 — 현재 상태 확인

### 0-1. 코드 현황
`app/blog/page.tsx`(10~35행)는 `getAllBlogPosts()`로 전체 글을 가져와 `space-y-4` 세로 스택으로 **전부** 렌더한다. 페이지네이션·검색 없음. 컨테이너는 `max-w-3xl`.

### 0-2. 글 편수 정정 — "4편"이 아니라 실측 22편 (중요)
작업 지시에는 "현재 4편"이라고 되어 있으나, `lib/blog.ts`를 직접 열어 확인한 결과 **현재 22편**이 이미 실려 있다(`category:` 필드 22회, `publishedDate:` 필드 22회로 교차 확인).

| 발행일 | 편수 |
|---|---|
| 2026-07-15 | 4편 |
| 2026-07-16 | 5편 |
| 2026-07-17(오늘) | 13편 |
| **합계** | **22편** |

`design/blog-layout-spec.md`(07-15 작성 당시 1편/카테고리, 총 4편 가정)가 스스로 예고했던 조건 — *"글이 10편 이상으로 늘면 그때 `sm:grid-cols-2` 도입을 별도 검토(그 시점에 디자인팀 재스펙)"* — 를 이미 넘어섰다. 즉 이번 작업은 페이지네이션/검색뿐 아니라 **그 재스펙 시점이기도 하다.** 하루 만에 13편이 추가된 증가 속도를 볼 때, 페이지네이션은 "미래 대비"가 아니라 **지금 당장 필요한 수정**이다.

### 0-3. `BlogPostCard.tsx` 재사용성 확인 결과
그대로 재사용 가능하다 — 시각 마크업(배지·제목·요약·메타줄)과 `FOCUS_RING_CARD` 적용까지 이미 완비되어 있어 **변경 없음**. 다만 검색 기능을 위해 클라이언트로 보내는 데이터 모양과 관련해 프롭 계약 이슈가 하나 있다 → §3-2에서 별도로 다룬다(카드 마크업 자체는 안 바뀜).

---

## 1. 이번 변경의 구조적 결정 2가지 (요약)

### 결정 1 — 목록 컨테이너 `max-w-3xl` → `max-w-5xl` + 그리드 전환
현재 목록은 상세 페이지와 폭을 맞추려고 `max-w-3xl` 단일 컬럼(`space-y-4`)을 쓴다(원 스펙 근거: "목록↔상세 이동 시 정렬선 유지"). 그런데:
- §0-2에서 확인했듯 이미 10편 임계값을 넘었고, 원 스펙 스스로 이 시점에 그리드 재검토를 예고했다.
- 이 사이트에는 이미 **"목록은 넓게(5xl), 상세는 좁게(3xl)"** 선례가 있다 — 계산기 카테고리 목록(`CategoryPage.tsx`) = `max-w-5xl`, 계산기 상세(`calculator/[slug]/page.tsx`) = `max-w-3xl`. 블로그도 동일 원칙(목록=5xl, 상세=3xl)으로 맞추면 사이트 전역 패턴과 정합된다.
- 페이지당 개수(9개, §2-1)가 3열 그리드에서 깔끔하게 3행으로 채워진다.

**변경**: `/blog` 목록만 `max-w-5xl` + `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`로 전환(`CategoryPage.tsx`/`RelatedBlogPosts.tsx`와 완전히 동일한 그리드 클래스, 새 값 발명 없음). **`/blog/[slug]` 상세 페이지는 `max-w-3xl` 그대로 — 변경 없음.**

> 새 색·새 컴포넌트 원형을 만드는 게 아니라 사이트에 이미 있는 두 패턴(카테고리 목록 그리드, 상세 좁은 컬럼)을 블로그에도 동일 적용하는 것이므로 톤앤매너/브랜딩 변경이 아니라고 판단해 마스터 사전 확인 없이 진행한다. 이견 있으면 §8에서 회수 가능하도록 남겨둔다.

### 결정 2 — 검색+그리드+페이지네이션을 하나의 클라이언트 컴포넌트로 묶는다 (SEO 안전성 근거)
마스터 지시의 핵심 우선순위는 "JS 없이도 크롤러가 각 페이지를 개별 URL로 인덱싱"이다. 아래 구조로 이 요건을 만족한다:

- 페이지네이션은 **실 URL 기반**(`/blog`, `/blog?page=2`, …)이고 페이지당 콘텐츠는 서버(Server Component)가 요청 시점에 결정한다.
- 검색은 실시간 인터랙션이 필요하므로 클라이언트 컴포넌트(`"use client"`)가 맡는다.
- **검색 인풋과 그 결과 영역, 그리고 페이지네이션까지 한 클라이언트 컴포넌트 안에 두더라도 크롤러 인덱싱에는 지장이 없다.** React/Next.js는 클라이언트 컴포넌트도 최초 요청 시 서버에서 한 번 렌더링해 완전한 HTML을 응답에 포함시킨다(하이드레이션 전 "초기 상태" 기준). 검색어 상태의 초기값은 빈 문자열이므로, 이 컴포넌트의 서버 렌더 결과는 **검색 비활성 상태 = 현재 페이지 카드 그리드 + 페이지네이션 링크**와 100% 동일하다. 즉 JS를 끄고 봐도, 크롤러가 봐도 `<a href="/blog?page=2">` 같은 실제 링크가 최초 HTML에 그대로 존재한다.
- 따라서 굳이 페이지네이션만 서버 컴포넌트로 분리하는 복잡한 구조를 강제할 필요가 없다. **단순함을 우선한다.**

---

## 2. 페이지네이션 스펙

### 2-1. 페이지당 개수 — **9개**로 확정

- 근거 1(그리드 정합): `lg:grid-cols-3`에서 9 = 정확히 3행. 6도 2행으로 깔끔하지만, 아래 근거 2·3과 종합해 9를 최종 채택.
- 근거 2(총 페이지 수): 현재 22편 기준 9개/페이지 → 3페이지(9+9+4). 6개/페이지였다면 4페이지. 글이 하루 10편 이상 추가되는 현재 속도를 고려하면, 페이지 수가 너무 잘게 쪼개지지 않는 쪽(더 큰 개수)이 "페이지 넘기기 피로"를 줄인다.
- 근거 3(모바일 스크롤 실측 계산): `BlogPostCard` 1장은 배지(20px) + 제목 2줄(약 47px) + 요약 2줄(약 45px) + 메타줄(16px) + 상하 패딩(32px) + 내부 gap ≈ **카드 높이 약 195px**, `gap-4`(16px) 포함하면 카드당 약 211px. 9장 세로 스택 시 약 1,880px ≈ 375px 폭 기준 화면 4~5스크롤 분량. 사용자가 불편해했던 "22편 전부(약 4,600px, 10스크롤+)"보다 확연히 짧고, **무엇보다 "끝이 있다"는 확실한 경계가 생긴다** — 이번 피드백의 본질(끝없는 스크롤)을 정확히 해결한다.
- 6~9 범위 중 하한(6)보다 상한(9)을 택한 이유를 요약하면: 그리드 3열과의 정합 + 증가 속도 대비 총 페이지 수 억제. 최종 숫자는 상수 하나(`BLOG_PAGE_SIZE`)로 관리하므로 이후 운영하면서 6~8 사이로 조정해도 나머지 스펙(URL 구조·컴포넌트)은 전혀 안 바뀐다.

```ts
// lib/blog.ts에 추가 제안 (기존 CATEGORY_RELATED_BLOG_LIMIT과 동일한 상수 관례)
export const BLOG_PAGE_SIZE = 9;
```

### 2-2. URL 구조 — 쿼리스트링 방식 채택 (`/blog`, `/blog?page=N`)

**`/blog/page/2`(경로 세그먼트) 대신 `/blog?page=2`(쿼리스트링)를 채택한다.**

| 검토 항목 | `/blog?page=2` (채택) | `/blog/page/2` |
|---|---|---|
| 크롤러 인덱싱 가능 여부 | 가능 — 실제 `<a href>`가 최초 HTML에 존재하면 정적/동적 렌더 여부와 무관하게 크롤링됨(구글 공식 가이드상 쿼리스트링 페이지네이션도 정상 인덱싱 대상) | 가능(동일) |
| 라우트 충돌/신규 파일 | 없음 — 기존 `app/blog/page.tsx` 1개 파일에 `searchParams`만 추가 | `app/blog/page/[page]/page.tsx` 신규 폴더 필요 (단, `app/blog/[slug]/page.tsx`와 세그먼트 깊이가 달라 라우팅 충돌은 없음 — 검증 완료) |
| "1페이지" 중복 URL 처리 | `/blog`가 곧 1페이지 → 애초에 중복 URL이 생기지 않음 | `/blog/page/1`을 만들지, `/blog`로 리다이렉트할지 별도 규칙 필요 |
| 검색어 쿼리(`?q=`, 선택사항 §3-7)와 결합 | 자연스러움(`/blog?page=2&q=연봉`) | 경로+쿼리 혼용이라 다소 어색 |
| `robots.txt` 영향 | `app/robots.ts` 확인 완료 — `allow: "/"`, Disallow 규칙 없음 → 쿼리스트링 URL도 크롤링 제한 없음 | 영향 없음(동일) |
| `sitemap.xml` 영향 | `app/sitemap.ts` 확인 완료 — 현재도 `/blog`(1페이지) 1건만 등재, 개별 글은 `/blog/[slug]`로 별도 등재. **2페이지 이후는 사이트맵에 추가하지 않는다** — 1페이지의 실제 페이지네이션 링크를 통해 크롤러가 자연 발견하는 것이 표준 관행(사이트맵은 대표 URL 용도) | 동일 원칙 적용 가능 |

→ **쿼리스트링 방식이 구현 비용이 가장 낮고, 기존 파일 구조(1개 `page.tsx`)를 그대로 확장하며, 검색어와도 자연스럽게 결합**되므로 채택.

#### URL 규칙 (확정)
1. **1페이지 = `/blog`** (쿼리 없음). 페이지 번호 링크 중 "1"은 `/blog?page=1`이 아니라 **`/blog`를 가리킨다** — 동일 콘텐츠의 URL이 두 개 생기는 걸 원천 차단.
2. **N페이지(N≥2) = `/blog?page=N`**.
3. `?page=1`, `?page=0`, `?page=-3`, `?page=abc` 등 비정규 값이 들어오면 → **`/blog`로 308(영구) 리다이렉트**. `redirect()`(307)가 아니라 `permanentRedirect()`(308, `next/navigation`)를 쓴다 — "이 URL의 정식 주소는 저기다"라는 신호를 검색엔진에 명확히 준다.
4. `page`가 정수이고 전체 페이지 수(`totalPages`)보다 크면 → **`notFound()`(404)**. `app/blog/[slug]/page.tsx`가 존재하지 않는 slug에 이미 쓰고 있는 것과 동일한 패턴 재사용.
5. `totalPages <= 1`(글이 9편 이하)이면 **페이지네이션 UI 자체를 렌더하지 않는다**(`RelatedBlogPosts`/`RelatedCalculators`/`FaqAccordion`이 항목 0개일 때 `null`을 반환하는 사이트 관례와 동일).

```ts
// app/blog/page.tsx — 의사코드(흐름 참고용, 실제 구현/네이밍은 개발팀 재량)
import { notFound, permanentRedirect } from "next/navigation";
import { getAllBlogPosts, BLOG_PAGE_SIZE } from "@/lib/blog";

function normalizePage(raw: string | string[] | undefined): number {
  // 파싱 실패/1 이하 → 1. 배열로 들어오는 비정상 입력은 1로 취급.
  // (구현은 개발팀 — 이 함수의 "계약"만 고정: 항상 1 이상의 정수를 반환)
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page: raw } = await searchParams;
  const requestedPage = normalizePage(raw);

  // raw가 있을 때만 정규화 검사(undefined인 기본 /blog는 그대로 통과 — 무한 리다이렉트 방지)
  if (raw !== undefined && requestedPage <= 1) {
    permanentRedirect("/blog");
  }

  const allPosts = getAllBlogPosts(); // 기존 함수 그대로, 발행일 내림차순
  const totalPages = Math.max(1, Math.ceil(allPosts.length / BLOG_PAGE_SIZE));

  if (requestedPage > totalPages) notFound();

  // allPosts.length === 0 이면 기존 빈 상태 박스 분기(0-1 참고, 변경 없음) — 검색/페이지네이션 미노출
  // 이하 렌더는 §2-4·§3 참고
}
```

#### 메타데이터 (기존 패턴 재사용)
`app/blog/page.tsx`는 현재 정적 `export const metadata`를 쓰는데, `searchParams`를 읽으려면 **`generateMetadata({ searchParams })` 비동기 함수로 전환**해야 한다 — 새 패턴이 아니라 이미 `app/blog/[slug]/page.tsx`(24~38행)와 계산기 상세 페이지가 쓰고 있는 것과 동일한 방식.

```ts
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}): Promise<Metadata> {
  const { page: raw } = await searchParams;
  const page = normalizePage(raw);
  const suffix = page > 1 ? ` (${page}페이지)` : "";
  return {
    title: `블로그${suffix} | 계산기 허브`,
    description: `계산기 활용법과 생활 정보를 정리한 글 모음입니다.${suffix}`,
    alternates: {
      canonical: page > 1 ? `${SITE_URL}/blog?page=${page}` : `${SITE_URL}/blog`,
    },
  };
}
```
`alternates.canonical`은 각 페이지가 **자기 자신을 가리키는 self-canonical**로 둔다(2페이지가 1페이지를 canonical로 가리키지 않음) — 각 페이지가 서로 다른 글 목록(=다른 콘텐츠)을 담고 있으므로 구글의 현행 페이지네이션 권고(자기참조 canonical)와 일치.

> **참고(개발팀 FYI, 필수 조치 아님)**: `searchParams`를 읽으면 이 라우트는 빌드 타임 정적 생성이 아니라 **요청 시점 동적 렌더링**으로 전환된다(Next 16 문서 확인: "`searchParams` is a Request-time API... opts the page into dynamic rendering"). 사이트의 다른 32개 정적 페이지와 성격이 달라지지만, 이는 크롤링 가능성과는 무관하다(구글은 응답 시점의 완성된 HTML을 받으므로 정적/동적 여부는 인덱싱에 영향 없음). 다만 빌드 로그의 정적 페이지 수 카운트가 변경될 수 있다는 점만 인지해 두시길.

### 2-3. 레이아웃 구조 (전체 그림)

```
[페이지 컨테이너 max-w-5xl]                              ← 결정 1: 3xl→5xl
  [H1] 블로그
  [소개문 1~2줄]
  ──────────────────────────────
  [검색 인풋]                                            ← 신규, §3
  [상태줄: "전체 22편 중 1–9번째" 또는 "'검색어' 결과 N건"]   ← 신규, §3
  ──────────────────────────────
  (검색 비활성 시)
    [글 카드 그리드 3열/2열/1열, 최대 9장 = 현재 페이지]
    [페이지네이션: ‹ 이전  [1][2][3]  다음 ›]              ← 신규, 이 절
    [하단 광고 여백]                                       ← §6
  (검색 활성 시 — 페이지네이션·하단 광고 없음, §3-6)
    [검색 결과 그리드, 매칭 전체] 또는 [0건 안내 박스]
```

### 2-4. 페이지 이동 UI — 컴포넌트 스펙

신규 `components/BlogPagination.tsx`(재사용 가능하게 범용 props로 설계 — 추후 다른 목록에도 쓸 수 있도록).

```ts
interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string; // 예: "/blog"
}
```

- `totalPages <= 1`이면 **`null` 반환**(§2-2 규칙 5).
- href 계산 규칙: `page <= 1 ? basePath : `${basePath}?page=${page}``.

**데스크톱(`sm` 이상, 640px~) — 번호 세그먼트 노출**

기존 `LoanInterestCalculator.tsx`(121~145행)의 "상환 방식" 세그먼트 토글과 완전히 동일한 시각 언어(둘러싼 테두리 상자 + 내부 알약형 선택 표시)를 재사용한다.

```
<nav aria-label="블로그 목록 페이지 네비게이션" class="mt-10 flex items-center justify-center gap-3">
  {/* 이전 버튼 — LegalPageLayout 아웃라인 버튼 패턴 재사용 */}
  <Link|span
    class="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-brand-border px-4
           text-sm font-medium text-brand-text-secondary transition-colors
           hover:border-brand-primary hover:text-brand-primary {FOCUS_RING_CARD}"
    (비활성 시: <span aria-disabled="true"> + class를
     "... border-brand-border text-brand-text-disabled" 로, hover/FOCUS_RING 제거 — 링크 아님)
  >
    <span aria-hidden="true">‹</span> 이전
  </Link|span>

  {/* 번호 세그먼트 — sm 이상만 표시 */}
  <div class="hidden items-center gap-1 rounded-lg border border-brand-border bg-brand-surface p-1 sm:flex">
    {페이지번호 또는 "…"}
    - 번호: <Link aria-current={current ? "page" : undefined}
        class="flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm font-semibold
               transition-colors {FOCUS_RING_LINK}
               {current ? 'bg-brand-primary text-white'
                        : 'text-brand-text-secondary hover:bg-brand-bg hover:text-brand-primary'}">
        {n}
      </Link>
    - "…": <span class="flex h-11 min-w-11 items-center justify-center text-sm text-brand-text-secondary">…</span>
  </div>

  {/* 모바일 축약 표시 — sm 미만만 표시 */}
  <span class="text-sm font-medium tabular-nums text-brand-text sm:hidden">
    {currentPage} / {totalPages} 페이지
  </span>

  {/* 다음 버튼 — 이전 버튼과 대칭 */}
  <Link|span class="... 동일 패턴, 텍스트만 순서 반대">
    다음 <span aria-hidden="true">›</span>
  </Link|span>
</nav>
```

핵심 결정:
- **이전/다음 버튼은 항상 두 breakpoint 모두에 보인다** — "모바일 축약"은 가운데(번호 세그먼트 ↔ "N / 총페이지" 텍스트)만 바뀐다. 이전/다음까지 아이콘만 남기는 방식도 검토했으나, 375px 폭 실측 계산(아래) 결과 텍스트 포함 버전도 여유 있게 들어가 굳이 정보를 줄일 이유가 없었다(아이콘 단독은 오히려 스크린리더/저시력 사용자에게 불리).
- **비활성(1페이지의 "이전", 마지막 페이지의 "다음")은 완전히 숨기지 않고 비활성 스타일로 유지한다.** 숨기면 버튼 위치가 밀려 "이전"을 연타하던 사용자가 다음 페이지 번호를 실수로 클릭할 위험이 있다(레이아웃 안정성). 비활성 시 `<Link>`가 아니라 `<span aria-disabled="true">`로 렌더(죽은 링크 방지).
- 번호 세그먼트 색상: 현재 페이지 = `bg-brand-primary text-white`(선택 상태, `LoanInterestCalculator` 토글 선례 그대로), 나머지 = `text-brand-text-secondary` + hover. 컨테이너 배경은 원본 `bg-white` 대신 토큰 `bg-brand-surface`를 쓴다(같은 색, 토큰 일관성).
- Focus-visible 링: 테두리 있는 이전/다음 버튼 = **Tier A `FOCUS_RING_CARD`**(테두리 있는 요소 원칙), 자체 테두리 없는 번호 알약 = **Tier B-1 `FOCUS_RING_LINK`**(헤더 nav 알약과 동일 취급) — `design/focus-visible-ring-ui-spec.md`의 기존 분류 기준을 그대로 적용한 것이며 새 티어를 만들지 않았다.
- 페이지 번호가 많아질 경우(향후) 생략(…) 규칙: **`totalPages <= 7`이면 전부 표시.** 7 초과 시 1페이지·마지막 페이지·현재±1을 항상 표시하고 그 사이는 "…"로 축약(경계에 가까우면 한쪽 "…"는 자연히 생략). 현재 22편/9개 기준 `totalPages = 3`이라 이 규칙은 당장 작동하지 않지만, 증가 속도를 고려해 미리 정의해 둔다.

**모바일(640px 미만) 폭 실측 검증**

375px 뷰포트, 컨테이너 패딩 `px-4`(양쪽 16px) → 가용 폭 343px.

| 요소 | 대략 폭 |
|---|---|
| "‹ 이전" 버튼(`px-4`+아이콘+텍스트) | 약 68px |
| "3 / 5 페이지" 텍스트 | 약 80px(2자리 수 "12 / 15"까지도 약 95px) |
| "다음 ›" 버튼 | 약 68px |
| `gap-3`(12px) × 2 | 24px |
| **합계** | **약 240~255px** (343px 대비 여유 88~100px) |

320px(구형 소형 기기) 기준으로도 288px 가용 폭에 여유 있게 들어간다. **줄바꿈·가로 스크롤 없음.**

### 2-5. 엣지 케이스 요약표

| 상황 | 동작 |
|---|---|
| `/blog` (기본) | 1페이지, 리다이렉트 없음 |
| `/blog?page=2` (정상 범위) | 2페이지 렌더, self-canonical |
| `/blog?page=1` | `/blog`로 308 리다이렉트 |
| `/blog?page=0`, `?page=-1`, `?page=abc` | `/blog`로 308 리다이렉트(1 이하/파싱 실패 취급) |
| `/blog?page=999`(범위 초과) | 404(`notFound()`) |
| 전체 글 ≤ 9편(`totalPages<=1`) | 페이지네이션 UI 미노출(`null`) |
| 전체 글 0편 | 기존 빈 상태 박스만(검색창도 미노출 — §0-1 기존 로직 유지) |

---

## 3. 검색 기능 스펙

### 3-1. "클라이언트 사이드 필터링으로 충분한가" 검토 결과 — **적정하다고 판단**

작업 지시의 가정(별도 백엔드 없이 제목/요약/카테고리 클라이언트 필터링)을 실측 데이터로 검증했다.

- 검색에 필요한 필드만 추린 경량 데이터(아래 §3-2 `BlogListItem`) 기준, 글 1편당 대략 250~400바이트(제목+요약+카테고리+태그+날짜). **22편 기준 약 6~9KB(gzip 전), gzip 후 3~4KB 수준** — 이미지 1장보다도 작다.
- 이 증가 속도(하루 13편)를 반영해도 **100편까지 약 25~40KB, 300편이 되어도 약 100KB 안팎**으로, 클라이언트 필터링 성능에 문제가 될 수준이 아니다(단순 배열 `filter`는 이 규모에서 1ms 미만).
- CMS/백엔드가 없는 `lib/blog.ts` 하드코딩 배열 구조상, 검색 API를 새로 만드는 것은 이 프로젝트 규모에 비해 과설계다.

**결론: 클라이언트 사이드 필터링 채택.** 단, "글 본문 전체"가 아니라 **검색에 필요한 필드만 담은 경량 데이터**를 클라이언트로 보내야 한다는 전제가 붙는다 → 다음 절.

**재검토 트리거(향후)**: 글이 대략 300편을 넘어가거나, 검색 응답에 지연이 체감되면 그때 서버 검색(API 라우트) 또는 검색 인덱스 청크 분할을 재검토. 지금은 해당 사항 없음.

### 3-2. 데이터 계약 이슈 — `BlogPostCard`의 "읽는 시간" 계산 방식 (개발팀 확인 필요)

**문제**: `BlogPostCard.tsx`(19행)는 `getReadingTimeMinutes(post)`를 내부에서 호출하는데, 이 함수는 `post.body`(본문 전체 배열)의 글자 수를 세어 분을 계산한다. 그런데 §3-1에서 정한 "경량 데이터"에는 성능을 위해 **`body`를 포함하지 않는다.** 그대로 두면 검색 결과에 뜨는 카드마다 "읽는 시간 1분"으로 잘못 표시된다(빈 본문 → 최솟값 1로 폴백).

**제안 데이터 타입** (`lib/blog.ts`에 추가):
```ts
export interface BlogListItem {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  publishedDate: string;
  readingMinutes: number; // getReadingTimeMinutes(post) 결과를 서버에서 미리 계산해 저장
  tags: string[];          // 카드에는 미표시, 검색 매칭 전용(§3-4)
}
// 요구사항: getAllBlogPosts() 결과를 BlogListItem[]로 변환하는 헬퍼 필요(이름/구현은 개발팀).
// 예: toBlogListItems(posts: BlogPost[]): BlogListItem[]
```

**해결 옵션 2가지 (개발팀 판단 요청 — 화면에는 차이 없는 순수 타입/아키텍처 이슈)**

| | 옵션 A(권장) — `readingMinutes`를 prop으로 분리 | 옵션 B(대안) — 경량 데이터에도 `body` 포함 |
|---|---|---|
| 방식 | `BlogPostCard`의 `post` prop 타입을 `BlogListItem`(또는 카드가 실제 쓰는 필드만 `Pick`)으로 좁히고, 컴포넌트 내부 `getReadingTimeMinutes(post)` 호출을 제거 — 이미 계산된 `readingMinutes` 값을 그대로 표시 | `BlogPostCard`/`getReadingTimeMinutes` 완전 무수정. 클라이언트로 보내는 검색 인덱스에 `body`까지 통째로 포함 |
| 영향 범위 | `BlogPostCard.tsx` + 기존 호출부 3곳(`RelatedBlogPosts.tsx`, 그리고 그걸 쓰는 `CategoryPage.tsx`/계산기 상세)에서 `readingMinutes`를 미리 계산해 넘기도록 소폭 수정 | 무수정 |
| 장점 | 클라이언트 페이로드 최소(§3-1 산정치 그대로 유효), 컴포넌트가 "렌더링"에만 집중 | 구현 가장 빠름 |
| 단점 | 호출부 3곳 손대야 함(작은 diff) | 글이 늘수록 목록 페이지 방문자 **전원**이 검색에 안 쓰는 본문 데이터까지 매번 받음 — 이 사이트의 애드센스 승인 요건("빠른 로딩")과 방향이 어긋남 |

디자인팀 권고는 **A**. 다만 최종 구현 방식은 개발팀 재량이며, 어느 쪽을 택해도 화면 픽셀은 동일하다.

### 3-3. 검색창 배치 · 스타일

- **위치**: H1/소개문 바로 아래, 그리드 위(비고정/`sticky` 아님 — 이 사이트에 sticky 패턴이 전혀 없어 신규 도입하지 않음. 페이지당 9장으로 스크롤이 짧아져 고정할 실익도 작음).
- **스타일**: 기존 `lib/inputClass.ts`의 `INPUT_BASE` 그대로 재사용(새 인풋 스타일 발명 안 함).
  ```tsx
  <label htmlFor="blog-search" className="sr-only">블로그 글 검색</label>
  <input
    id="blog-search"
    type="search"
    placeholder="제목, 요약, 키워드로 검색"
    className={`${INPUT_BASE} w-full border-brand-border`}
  />
  ```
  - `type="search"`: 모바일에서 검색 전용 키보드 + 브라우저 기본 지우기(×) 버튼 제공.
  - 계산기 폼 필드는 라벨을 인풋 위에 **보이게** 두는 게 사이트 관례(design-system.md 3-1)이지만, 검색창은 목적이 플레이스홀더만으로 충분히 자명한 보조 UI라 **`sr-only` 라벨 + 보이는 플레이스홀더**로 의도적으로 다르게 처리한다(계산기 입력값처럼 "채워지면 라벨이 필요한" 필드가 아님). 접근성은 `sr-only` 라벨로 보장.
  - 포커스 스타일은 `INPUT_BASE`에 이미 포함(`focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15`) — 별도 `FOCUS_RING_*` 불필요(폼 필드는 `focus:`, 링크류만 `focus-visible:` — 기존 원칙 그대로).
- **상태줄**(검색창 바로 아래, `mt-3 text-xs text-brand-text-secondary`, `aria-live="polite"`로 스크린리더에 변경 안내):
  - 검색 비활성: `전체 22편 중 1–9번째`
  - 검색 활성: `'연봉'에 대한 검색 결과 3건`
- **아이콘 미사용**: 사이트 전역에 SVG 아이콘이 없고(⌄, ⇅ 같은 유니코드 심볼만 사용), 돋보기 이모지(🔍)는 컬러풀해 절제된 팔레트와 어울리지 않는다. 라벨+플레이스홀더만으로 검색 필드임이 충분히 드러나므로 아이콘 없이 간다.
- **실시간 필터링 채택**: 작업 지시가 권장한 대로 타이핑 즉시 필터링. §3-1에서 확인했듯 데이터 규모가 작아 디바운스 불필요(입력마다 즉시 재계산해도 체감 지연 없음). 데이터가 수백 편으로 늘어 체감 지연이 생기면 그때 디바운스(예: 150ms) 도입 검토.

### 3-4. 검색 매칭 기준

- **대상 필드**: 제목(`title`) + 요약(`description`) + 카테고리 **표시명**(`categoryInfo[category].title`, 예: "급여 계산기" — 내부 키 `salary` 자체는 매칭 대상 아님) + **태그**(`tags`).
  - 작업 지시는 "제목/요약/카테고리"만 제안했으나, 데이터에 이미 `tags`(롱테일 키워드, 예: "DSR", "총부채원리금상환비율")가 있고 포함 비용이 거의 없어 **태그도 매칭 대상에 추가할 것을 권장**한다. 사용자가 본문 키워드로 검색했을 때 놓치는 사례를 줄여준다.
- **매칭 규칙**:
  1. 대소문자 무시, 검색어 앞뒤 공백 제거(trim).
  2. 검색어를 공백 기준으로 토큰 분리, **모든 토큰이 부분 문자열로 포함되면 매치**(AND 방식). 예: "연봉 실수령액" 검색 시 두 단어를 모두 포함하는 글만 매치(단어 순서·인접 여부는 무관).
  3. 오타 허용(유사도 매칭)은 범위 밖 — 정확 부분일치만.
  4. 빈 문자열(공백만 입력)은 "검색 비활성"과 동일 취급(§3-6).
- 정렬: 매칭 결과도 발행일 내림차순 유지(관련도순 정렬은 이번 범위 밖 — 데이터 규모상 실익 적음).

### 3-5. 검색 결과 0건 상태

기존 "글 0편" 빈 상태 박스와 동일한 시각 언어를 재사용하되 문구와 복귀 동선만 추가한다.

```tsx
<div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-surface p-8 text-center text-sm text-brand-text-secondary">
  <p>&apos;{trimmedQuery}&apos;에 대한 검색 결과가 없습니다.</p>
  <p className="mt-1">다른 키워드로 검색하거나 전체 글을 확인해 보세요.</p>
  <button
    type="button"
    onClick={clearSearch}
    className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-brand-primary px-5 text-sm font-semibold text-brand-primary transition-colors hover:bg-blue-50"
  >
    전체 글 보기
  </button>
</div>
```
버튼 스타일은 `LegalPageLayout.tsx`(82행)/`about` 페이지의 기존 아웃라인 버튼과 동일 클래스 재사용(새 버튼 스타일 발명 안 함). `<Link>`가 아니라 `<button onClick={clearSearch}>`인 이유: 검색어는 클라이언트 로컬 상태라 페이지 이동 없이 `setQuery("")`만 하면 되기 때문(§3-6과 일관).

- 0건일 때는 위 §3-3 상태줄("검색 결과 N건")을 굳이 별도로 띄우지 않는다 — 빈 상태 박스 자체가 0건임을 이미 말해주므로 중복 문구 방지.

### 3-6. 검색 × 페이지네이션 상호작용 규칙 (명확화)

| 상태 | 그리드에 표시되는 것 | 페이지네이션 | 상태줄 |
|---|---|---|---|
| 검색창 비어 있음(기본) | 현재 URL의 페이지(`?page=N`)에 해당하는 9장 | **표시**(URL 기준) | "전체 22편 중 1–9번째" |
| 검색어 입력 중(1자 이상) | 전체 22편 중 매칭되는 글 **전부**(개수 제한 없음, 자체 페이지네이션 없음) | **숨김** | "'검색어' 결과 N건" |
| 검색어 입력 후 다시 지움(빈 문자열로) | **원래 있던 URL의 페이지로 그대로 복귀** | 다시 표시 | "전체 22편 중 …" |

- **검색 중 페이지네이션을 숨기는 이유**: 검색 결과는 발행일 순으로 흩어진 부분집합이라 "페이지" 개념이 무의미하고, 개수도 9개보다 적거나 많을 수 있어 페이지네이션과 공존시키면 혼란만 준다. 결과가 많아질 가능성은 §3-1에서 다룬 재검토 트리거(300편 등)에 포함.
- **검색을 지웠을 때 1페이지로 초기화하지 않고 원래 페이지로 복귀시키는 이유**: 이 화면은 클라이언트 로컬 상태(검색어)만 바뀌고 **URL(`?page=N`)은 애초에 변경되지 않는다.** 예를 들어 사용자가 `/blog?page=3`을 북마크/구글 검색 결과로 들어와 검색을 써 봤다가 지우면, 그가 원래 보던 3페이지로 자연스럽게 돌아가는 게 맞다 — 임의로 1페이지로 돌려보내면 사용자가 있던 위치를 잃는다.
- 페이지 번호 링크(`href`)는 검색어 상태와 무관하게 항상 `/blog` 또는 `/blog?page=N`만 가리킨다(검색어를 URL에 반영하는 것은 §3-7 선택사항).

**의사코드(구조 참고용 — 실제 구현/이름은 개발팀 재량)**:
```tsx
"use client";
// components/BlogListWithSearch.tsx
// props: allPosts(발행일 내림차순 정렬된 BlogListItem[] 전체), currentPage(서버가 계산해 전달)

interface Props {
  allPosts: BlogListItem[];
  currentPage: number;
}

export default function BlogListWithSearch({ allPosts, currentPage }: Props) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  const totalPages = Math.max(1, Math.ceil(allPosts.length / BLOG_PAGE_SIZE));
  const pagePosts = allPosts.slice((currentPage - 1) * BLOG_PAGE_SIZE, currentPage * BLOG_PAGE_SIZE);

  // 매칭 로직 자체 구현은 개발팀 — 매칭 기준은 §3-4
  const results = isSearching ? allPosts.filter((p) => matchesQuery(p, trimmed)) : pagePosts;

  return (
    <>
      {/* 검색 인풋 §3-3 */}
      {/* 상태줄 §3-3/§3-5 */}
      {results.length === 0 ? (
        /* §3-5 빈 상태 박스 */
        null
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => <BlogPostCard key={p.slug} post={p} />)}
        </div>
      )}
      {!isSearching && (
        <BlogPagination currentPage={currentPage} totalPages={totalPages} basePath="/blog" />
      )}
    </>
  );
}
```

### 3-7. 선택 사항 (이번 범위 밖 — 필요 시 다음 단계로)

- **검색어 URL 동기화(`?q=검색어`)**: 뒤로가기/북마크/공유가 가능해진다. `router.replace`로 서버 재요청 없이 URL만 갱신 가능(클라이언트 필터링이므로). 이번 1차 구현에서는 필수 아님 — 기본 요구사항(페이지 나누기 + 검색)만으로도 사용자 피드백은 해결됨.
- **인풋 안 "×" 지우기 버튼**: `type="search"`가 브라우저 기본 지우기 버튼을 제공하므로 커스텀 버튼은 필수 아님(브라우저별 노출 차이는 있음).
- 두 기능(페이지네이션/검색)은 서로 독립적으로 구현 가능 — 리스크를 낮추고 싶다면 **페이지네이션 먼저 배포 → 검색 다음 배포**로 나눠도 무방(§3-2의 데이터 계약 이슈가 검색 쪽에만 걸려 있어, 분리하면 페이지네이션은 더 빨리 내보낼 수 있음). 순서는 개발팀/마스터 판단.

---

## 4. 컴포넌트/파일 변경 요약

| 파일 | 상태 | 역할 |
|---|---|---|
| `app/blog/page.tsx` | **수정** | Server Component. `searchParams` 파싱 → 리다이렉트/404 검증(§2-2) → 경량 리스트 변환 → `<BlogListWithSearch>` 렌더. 컨테이너 `max-w-3xl`→`max-w-5xl`(§1 결정 1) |
| `components/BlogListWithSearch.tsx` | **신규**, `"use client"` | 검색 인풋 + 상태줄 + 결과 그리드/빈 상태 + (비검색 시)`<BlogPagination>` (§3-6) |
| `components/BlogPagination.tsx` | **신규** | 이전/다음 + 번호 세그먼트/모바일 축약(§2-4). 순수 `<Link>`/`<span>`만 사용 — 자체는 `"use client"` 불필요하나 상위가 클라이언트 컴포넌트라 번들엔 포함됨(문제 없음, 인터랙션 없는 소형 컴포넌트) |
| `components/BlogPostCard.tsx` | **무수정 또는 소폭 수정** | 시각 마크업 100% 그대로. `readingMinutes` prop 계약만 검토 필요(§3-2, 개발팀 판단) |
| `lib/blog.ts` | **추가** | `BLOG_PAGE_SIZE` 상수(§2-1), `BlogListItem` 타입 + 변환 헬퍼(§3-2) |
| `lib/inputClass.ts` | 재사용(무수정) | `INPUT_BASE` — 검색 인풋 |
| `lib/focusRing.ts` | 재사용(무수정) | `FOCUS_RING_CARD`(이전/다음 버튼), `FOCUS_RING_LINK`(번호 알약) |
| `app/sitemap.ts` | **변경 없음** | `/blog` 1건 등재 그대로 유지(§2-2) |
| `app/robots.ts` | **변경 없음** | 이미 전체 허용, 쿼리스트링 차단 규칙 없음 확인 완료 |
| `components/RelatedBlogPosts.tsx` | 옵션 A 채택 시만 소폭 수정 | 호출부에서 `readingMinutes` 계산해 전달(§3-2) |

**신규 색 토큰·신규 버튼/카드 원형 없음.** 전부 기존 `brand-*` 토큰과 이미 검증된 컴포넌트 패턴(세그먼트 토글, 아웃라인 버튼, 빈 상태 박스, 카드 그리드)의 재조합이다.

---

## 5. 반응형 규칙 종합

| 항목 | 모바일(0~639px) | 태블릿(640~1023px, `sm`) | 데스크톱(1024px~, `lg`) |
|---|---|---|---|
| 컨테이너 | `max-w-5xl px-4 py-8` | 동일 | `sm:px-6 sm:py-12` |
| 카드 그리드 | 1열(`grid-cols-1`) | 2열(`sm:grid-cols-2`) | 3열(`lg:grid-cols-3`) |
| 검색 인풋 | `w-full h-12`, 375px에서 여유 폭 확인(§3-3) | 동일 | 동일 |
| 페이지네이션 가운데 영역 | "N / 총 페이지" 텍스트 | 번호 세그먼트(`hidden … sm:flex`) | 동일 |
| 페이지네이션 이전/다음 | 아이콘+텍스트 항상 노출(§2-4 폭 실측) | 동일 | 동일 |
| 터치 타겟 | 이전/다음/번호 전부 `h-11`(44px) 이상 | 동일 | 동일 |

375px 실측(§2-4)·320px 안전선까지 확인 완료. 가로 스크롤 발생 요소 없음(모든 신규 요소가 `w-full` 또는 컨테이너 내 auto 폭).

---

## 6. 광고 배치 재확인 (`design/design-system.md` §5, `blog-layout-spec.md` §4 원칙 유지)

- 목록 페이지 광고는 기존 원칙("글이 여러 편이라 스크롤이 길 때만, 리스트 최하단 1개") 그대로 유지하되, 위치를 **"그리드 + 페이지네이션 아래"**로 명확히 한다(페이지네이션과 광고 사이 `margin 24px 이상`, "광고" 캡션 라벨 필수 — 기존 원칙 동일 적용).
- 매 페이지(1·2·3페이지 전부)에 동일하게 노출 — 페이지당 9장씩 항상 "스크롤이 있는" 분량이므로 조건 분기 불필요.
- **검색 결과 화면에는 광고를 넣지 않는다.** 검색 결과는 0~수십 건으로 편차가 크고, 결과가 1~2건일 때 바로 아래 광고가 붙으면 "콘텐츠보다 광고가 많아 보이는" 기존 금지 원칙에 저촉될 수 있다. 검색 중에는 광고 슬롯을 아예 렌더하지 않는 것이 가장 안전하다.
- 계산기 결과 영역·CTA 버튼 근처 30px 이내 배치 금지 등 기존 전역 원칙은 이 페이지에 그대로 적용(해당 요소가 이 페이지엔 없어 실질 충돌 없음).

---

## 7. 접근성 체크

- 페이지네이션: `<nav aria-label="블로그 목록 페이지 네비게이션">`, 현재 페이지 `aria-current="page"`, 비활성 버튼은 `<span aria-disabled="true">`(죽은 링크 아님).
- 검색: `<label htmlFor> sr-only` + `<input type="search">`, 상태줄 `aria-live="polite"`(결과 수 변경을 스크린리더에 알림).
- 포커스 링: 이전/다음 = `FOCUS_RING_CARD`(Tier A), 번호 알약 = `FOCUS_RING_LINK`(Tier B-1) — `design/focus-visible-ring-ui-spec.md` 기존 분류 재적용, 새 티어 없음.
- `BlogPostCard`는 이미 `FOCUS_RING_CARD` 적용 완료 상태(4행 import 확인) — 추가 조치 불필요.
- 검색 결과 그리드도 동일 `BlogPostCard`를 쓰므로 카드 자체의 키보드 접근성은 그대로 상속됨.

---

## 8. 다른 팀 전달 사항

**기획팀** — 이번 요청은 마스터가 직접 전달한 UX 이슈(스크롤 피로 + 검색 부재)이며 콘텐츠/카피 변경은 없다. 다만 아래 카피는 확정 전 기획팀 확인 있으면 좋음(없어도 디자인팀 기본안으로 진행 가능):
- 검색 플레이스홀더: "제목, 요약, 키워드로 검색"
- 0건 안내 문구, "전체 글 보기" 버튼 라벨
- 2페이지 이후 메타 타이틀 접미사 "(N페이지)" 표기 방식

**개발팀 확인 요청 (핑퐁 가능 지점)**
1. §3-2 `readingMinutes` 데이터 계약 — 옵션 A(prop 분리, 권장)/B(body 포함) 중 택1 후 회신.
2. §2-2 URL 정규화 로직(`normalizePage`, 308 리다이렉트 트리거)이 실제 Next 16 `searchParams`(Promise, 배열 가능성 포함) 타입과 충돌 없는지.
3. `app/blog/page.tsx`가 동적 렌더링으로 전환되는 것이 배포 파이프라인(Vercel)상 문제 없는지(정적 페이지 수 변화 인지 차원, §2-2 하단 참고 박스).
4. §3-7 제안대로 페이지네이션/검색을 분리 배포할지, 한 번에 배포할지.

**마스터 팀장 확인 필요**
- §1 결정 1(컨테이너 `max-w-3xl`→`max-w-5xl`, 세로 스택→그리드 전환)은 원 스펙이 스스로 예고했던 재검토 시점(10편 이상)에 해당하고 새 색/톤 변경이 없어 디자인팀 판단으로 진행했다. **다른 톤앤매너 변경이 아니라는 점에 이견 없으신지만 확인 부탁드린다.**
- §0-2에서 확인된 "실제 22편"(작업 지시의 "4편"과 다름) — 데이터 증가 속도가 예상보다 빨라 향후 콘텐츠 자동화 운영 계획에 참고 바람.

---

## 9. 구현 후 디자인 검수 체크리스트 (역할 ② 예고)

- [ ] `/blog`(1페이지), `/blog?page=2`, `/blog?page=3`(마지막, 4장만) 각각 실제로 다른 글이 뜨는지.
- [ ] `/blog?page=1` 접속 시 `/blog`로 리다이렉트되는지(주소창 확인).
- [ ] `/blog?page=999` 접속 시 404 페이지가 뜨는지.
- [ ] 각 페이지 `<title>`/메타 description이 페이지별로 다른지(2페이지 이후 "(N페이지)" 접미사).
- [ ] 데스크톱(1024px+) 3열, 태블릿(640~1023px) 2열, 모바일(375px) 1열 그리드 확인.
- [ ] 페이지네이션: 데스크톱 번호 세그먼트, 모바일 "N / 총페이지" 텍스트로 정확히 전환되는지(640px 경계에서 확인).
- [ ] 1페이지에서 "이전" 비활성, 마지막 페이지에서 "다음" 비활성 스타일(죽은 링크 아님, `span`인지 개발자도구로 확인).
- [ ] 검색어 입력 → 실시간으로 결과 그리드 갱신, 페이지네이션 사라짐.
- [ ] 검색어 지움 → 원래 있던 페이지 번호로 복귀(페이지 안 바뀐 채 그대로).
- [ ] 존재하지 않는 키워드 검색 → 0건 안내 박스 + "전체 글 보기" 버튼 동작.
- [ ] 검색 결과 카드의 "읽는 시간" 표시가 실제 글 길이와 맞는지(§3-2 이슈가 제대로 처리됐는지 직접 확인 — 전부 "1분"으로 뜨면 회귀).
- [ ] 브라우저 JS를 끈 상태(또는 "페이지 소스 보기")에서 페이지네이션 링크(`<a href="/blog?page=2">`)가 실제 HTML에 존재하는지(핵심 SEO 요건 검증).
- [ ] 키보드 Tab 이동 시 검색 인풋·이전/다음·번호 전부 포커스 링이 보이는지(마우스 클릭 시엔 안 보이는 게 정상 — focus-visible 원칙, §7).
- [ ] 광고 슬롯이 검색 중에는 안 보이고, 비검색 상태에서는 페이지네이션 아래 일관되게 보이는지(현재는 실제 광고 코드가 없으니 자리만 확인).
- [ ] 375px·320px 실기기 또는 뷰포트 시뮬레이션에서 가로 스크롤 없는지.

---

## 10. 요약 (마스터 lock 판단용)

| 항목 | 결정 | 비고 |
|---|---|---|
| 페이지당 개수 | **9개** | 3열×3행 정합 + 22편/증가속도 대비 총 페이지 수 억제 |
| URL 구조 | **쿼리스트링** `/blog`, `/blog?page=N` | `/blog/page/N` 대비 구현 비용 낮고 검색어 결합 자연스러움 |
| 컨테이너/그리드 | `max-w-3xl` 스택 → **`max-w-5xl` 그리드**(`CategoryPage`와 동일 클래스) | 원 스펙이 예고한 "10편 이상 재검토" 시점 도달, 마스터 확인 요청(§8) |
| 검색 방식 | **클라이언트 사이드, 실시간, 부분일치 AND** | 페이로드 실측(3~9KB) 근거로 적정성 확인 |
| 검색 매칭 필드 | 제목+요약+카테고리명 **+ 태그(추가 제안)** | 태그 추가는 권장사항, 비용 거의 없음 |
| 검색×페이지네이션 | 검색 중 페이지네이션 숨김, 결과는 전체 매칭(무제한), 검색 해제 시 원래 페이지 복귀 | §3-6 |
| 데이터 계약 이슈 | `BlogPostCard`의 읽는시간 계산 방식 — 옵션 A 권장 | 개발팀 최종 판단(§3-2) |
| 신규 색/컴포넌트 원형 | **없음** | 세그먼트 토글·아웃라인 버튼·빈 상태 박스 등 기존 패턴 재조합 |
