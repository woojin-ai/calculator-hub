# 관련 섹션 열 수(columns) 확정 구성안 — 5개 호출부 일괄 정리

- 문서 유형: 개발 전 화면 구성안(확정 스펙). 개발팀은 §5의 변경 전/후 코드를 그대로 구현한다.
- 대상: `components/RelatedCalculators.tsx`, `components/RelatedBlogPosts.tsx` 및 전체 호출부 5곳
- 작성: 디자인팀 / 기준일 2026-07-19
- 선행 문서: `design/blog-related-posts-section-spec.md` (**본 문서가 그 §7-3 / §8-1 일부를 대체함 — §8 참조**), `design/category-related-blog-ui-spec.md`, `design/homepage-grid-fix.md`
- 신규 컴포넌트 / 신규 색 토큰 / 신규 간격 값: **없음**

---

## 0. 사전 사실 확인 (전부 실제 파일 Read로 확인. 추정은 "추정" 표기)

### 0-1. 컴포넌트 현황

| 컴포넌트 | `columns` prop | 그리드 |
|---|---|---|
| `RelatedBlogPosts.tsx` | **있음** (`columns?: 2 \| 3`, 기본 3) | `GRID_CLASS[columns]` 상수 조회 |
| `RelatedCalculators.tsx` | **없음** | `grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` **하드코딩** (line 14) |

→ 백로그 메모의 "columns prop이 이미 있어 호출부 2줄이면 끝"은 **`RelatedCalculators`에 대해서는 사실이 아니다.** 컴포넌트 수정이 선행되어야 한다. (마스터 정정 내용 확인 완료)

### 0-2. 호출부 전수 (직접 grep 재확인 — 마스터 목록과 일치, 5곳이 전부)

| # | 위치 | 컴포넌트 | 컨테이너 | 현재 열 |
|---|---|---|---|---|
| 1 | `app/calculator/[slug]/page.tsx:142` | RelatedCalculators | `max-w-3xl` (line 95) | 3 |
| 2 | `app/calculator/[slug]/page.tsx:146` | RelatedBlogPosts | `max-w-3xl` | 3 (미지정) |
| 3 | `app/blog/[slug]/page.tsx:192` | RelatedCalculators | `max-w-3xl` (line 154) | 3 |
| 4 | `app/blog/[slug]/page.tsx:194` | RelatedBlogPosts | `max-w-3xl` | 2 (`columns={2}`) |
| 5 | `components/CategoryPage.tsx:48` | RelatedBlogPosts | `max-w-5xl` (line 20) | 3 (미지정) |

`app/page.tsx`는 `max-w-5xl`(line 44)이며 이 두 컴포넌트를 쓰지 않는다 → 범위 밖.

### 0-3. Tailwind 설정 확인

`app/globals.css`는 `@import "tailwindcss"` + 색 토큰만 정의. **브레이크포인트·간격·max-width 오버라이드 없음** → v4 기본값 그대로 적용된다. `tailwindcss: ^4` (package.json).
`sm`=640px, `lg`=1024px, `gap-4`=16px, `max-w-3xl`=768px, `max-w-5xl`=1024px, `p-4`/`px-4`=16px, `sm:px-6`=24px.

---

## 1. 근본 원인과 판정 기준

### 1-1. 역방향 반응형의 원인 (한 문장)

`max-w-3xl` 컨테이너는 **뷰포트 768px 이상에서 폭이 720px로 고정**된다. 그런데 `lg:grid-cols-3`은 컨테이너가 아니라 **뷰포트** 1024px를 보고 열을 하나 더 만든다. 즉 **가용 폭은 1px도 늘지 않았는데 열만 늘어나므로, 카드는 순수하게 쪼그라들기만 한다.** 이것이 마스터가 실측한 1023px 352px → 1280px 229.328px의 정체다.

계산으로 실측과 일치 확인:
- 2열: (720 − 16) ÷ 2 = **352px** → 실측 352px ✓
- 3열: (720 − 16×2) ÷ 3 = **229.333px** → 실측 229.328px ✓ (서브픽셀 오차)

### 1-2. 판정 기준 — "288px 바닥선"

임의의 미학 기준 대신, **이미 라이브에서 승인·통과된 최소 카드 폭**을 바닥선으로 삼는다.

> 뷰포트 640px(sm)에서 2열 카드 폭 = (592 − 16) ÷ 2 = **288px**. 이 폭은 사이트 전역에서 이미 정상 동작 중인 값이다.
> **규칙: 어떤 관련 섹션 그리드도 288px보다 좁은 카드를 렌더해서는 안 된다.**

| 배치 | 카드 폭 | 판정 |
|---|---|---|
| `max-w-3xl` 3열 (호출부 1·2·3 현행) | **229.33px** | **위반 (−58.67px)** |
| `max-w-3xl` 2열 | 352px | 통과 |
| `max-w-5xl` 3열 (호출부 5) | **314.67px** | **통과 (+26.67px)** |

이 한 줄짜리 기준이 "호출부 1·2·3은 고치고, 5는 손대지 않는다"는 결론을 그대로 만들어낸다.

### 1-3. `CalculatorCard`가 229px에서 겪는 구체적 손상

`CalculatorCard.tsx` line 17~34는 **제목 `<h3>`와 상태 배지가 같은 flex 행**에 있다. 배지·제목 어느 쪽에도 `flex-shrink-0`·`truncate`·`line-clamp`가 없다.

- 카드 내부 폭 = 229.33 − 32(`p-4`) = **197.33px**
- 배지 `바로 사용 가능` = 12px 7글자 + 점(6px) + gap(4px) + `px-2`(16px) ≈ **110px** *(추정 — 글리프 폭 실측 아님)*
- 제목에 남는 폭 ≈ **87px** ≈ 16px 기준 5.4자/줄 *(추정)*

→ `연차수당 계산기`, `주휴수당 계산기` 같은 7~8자 제목이 2줄로 접히고, 배지 텍스트 자체가 2줄로 깨질 수 있다(배지에 `whitespace-nowrap`이 없음 — 코드 확인). 2열(내부 폭 320px)이면 제목에 약 210px ≈ 13자/줄이 남아 대부분 1줄에 들어간다.

`BlogPostCard` 쪽 손상은 선행 문서 `blog-related-posts-section-spec.md` §1-2에 이미 정량화되어 있다(3열에서 40자 제목의 53%만 노출). 마스터가 실측한 `titleClipped:false` @352px가 그 결론을 뒷받침한다.

---

## 2. 호출부별 확정 결정

| # | 위치 | 결정 | 근거 |
|---|---|---|---|
| 1 | `calculator/[slug]:142` RelatedCalculators | **3열 → 2열** | 229.33px로 288 바닥선 위반. §1-3의 제목/배지 압착. 바로 아래 호출부 2와 열 경계가 정렬됨 |
| 2 | `calculator/[slug]:146` RelatedBlogPosts | **3열 → 2열** (`columns={2}`) | 동일 위반. 호출부 4에서 2열/352px가 제목 미절단으로 **실측 검증 완료** — 같은 컨테이너·같은 카드이므로 결과가 동일함이 보장됨 |
| 3 | `blog/[slug]:192` RelatedCalculators | **3열 → 2열** — **범위 포함** | 컨테이너가 호출부 1과 **동일한 `max-w-3xl`**이라 결함이 픽셀 단위로 동일하다. 게다가 바로 아래 호출부 4가 이미 2열이라, 지금 라이브는 **같은 화면에서 관련 계산기 3열(229px) / 함께 읽으면 좋은 글 2열(352px)이 열 경계가 어긋난 채 겹쳐 보인다.** 방치하면 이번 수정이 만든 부정합이 남는다 → 반드시 포함 |
| 4 | `blog/[slug]:194` RelatedBlogPosts | **변경 없음** (2열 유지) | 이미 올바름. 4장 × 2열 = 2×2 완전 충전 |
| 5 | `CategoryPage.tsx:48` RelatedBlogPosts | **제외 — 3열 유지** | §7 참조 |

---

## 3. 카드 장수 × 열 수 (홀수 꼬리 검토)

### 3-1. 실제 렌더 장수 (`lib/` Read로 확인)

| # | 소스 함수 | 상한 | 실제 장수 |
|---|---|---|---|
| 1 | `getRelatedCalculators(slug)` (`calculators.ts:679`) | `limit = 3` 기본 | **항상 3장** (live 16개라 항상 채워짐) |
| 2 | `getBlogPostsForCalculator` (`blog.ts:4573`) | `.slice(0, 3)` | 0~3장 (가변) |
| 3 | `resolveRelatedCalculators` (`blog/[slug]:128`) | **slice 없음** — `relatedCalculatorSlugs` 전량 | **1~3장.** 데이터 실측: 1개짜리 1편, 2개짜리 2편, 나머지는 전부 3개 |
| 4 | `getRelatedBlogPosts` (`blog.ts:4637`) | `POST_RELATED_BLOG_LIMIT = 4` | 최대 4장 |
| 5 | `getBlogPostsByCategory` (`blog.ts:4588`) | `CATEGORY_RELATED_BLOG_LIMIT = 6` | 최대 6장 |

### 3-2. 2열에서의 꼬리 형태

| # | 장수 | 2열 배치 | 판정 |
|---|---|---|---|
| 1 | 3장 | 2 + 1 (좌측 반폭 잔여) | **허용** |
| 2 | 0~3장 | 0 / 1 / 2 / 2+1 | 허용 |
| 3 | 대부분 3장 | 2 + 1 | 허용 |
| 4 | 4장 | 2 × 2 완전 충전 | 최적 |

**"2 + 1 좌측 잔여"를 허용하는 근거:** 선행 문서 `blog-related-posts-section-spec.md` §8-2에서 이미 승인된 판단이다 — *"카드를 중앙 정렬하거나 늘려 채우면 그리드 축이 어긋나 오히려 정렬 규칙이 깨지고, 좌측 정렬 잔여 카드는 웹에서 보편적으로 학습된 패턴"*. 본 문서는 이 판단을 그대로 승계한다. **꼬리 카드를 중앙 정렬하거나(=`homepage-grid-fix.md`의 flex+`justify-center` 방식) 폭을 늘려 채우지 말 것.**

> 홈페이지(`homepage-grid-fix.md`)가 flex+`justify-center`를 쓰는 것과 상충하지 않는다. 홈페이지는 **개수가 로드맵에 따라 계속 변하는 대표 목록**이라 중앙 정렬이 맞고, 여기는 **상하로 두 그리드가 스택되어 열 경계 정렬이 더 중요한 회유 섹션**이다. 중앙 정렬하면 위아래 그리드의 열 축이 어긋난다.

### 3-3. 검토했으나 기각한 대안 — "호출부 1을 4장으로 늘려 2×2 만들기"

`getRelatedCalculators(slug, 4)`로 4장을 뽑으면 완전 충전이 되므로 검토했으나 **기각한다.**

`lib/calculators.ts:690` 의 override 분기 때문이다. `relatedSlugs`를 정의한 계산기가 **9개이고, 전부 정확히 3개짜리 배열**이다(전수 확인). override가 있으면 `limit`과 무관하게 3장이 상한이다. 따라서 `limit=4`를 넘기면:

- override 있는 9개 페이지 → 여전히 3장 (2+1)
- override 없는 나머지 → 4장 (2×2)

즉 **페이지마다 꼬리 모양이 달라지는 더 나쁜 상태**가 된다. 통일하려면 데이터 9곳에 4번째 slug를 추가해야 하는데, 이는 내부링크 설계 = 기획 소관이고 화면 스펙 범위를 벗어난다. → **호출부 1은 3장 유지, 2+1 허용.** (4장 통일을 원하면 §9에 사용자 확인 항목으로 남김)

---

## 4. `RelatedCalculators`에 `columns` prop 추가 — 방식 확정

**결론: `RelatedBlogPosts`와 100% 동일한 `GRID_CLASS` 상수 패턴으로 prop을 추가한다.**

호출부에서 그리드 클래스를 문자열로 주입하거나, 컨테이너 폭을 바꾸거나, 컴포넌트를 분기 복제하는 방식은 모두 기각한다:
- 클래스 문자열 주입 → 컴포넌트가 레이아웃 결정권을 잃고 호출부마다 값이 흩어진다.
- 컨테이너를 `max-w-5xl`로 넓히는 안 → 본문 가독성 폭(`max-w-3xl`)은 블로그/계산기 상세의 확립된 톤이며 이를 바꾸는 건 큰 방향 전환이다. **기각.**
- `@container` 쿼리로 근본 수정하는 안 → 원인상 가장 정확하지만(§1-1) 사이트 전역 그리드 규약 변경이라 이번 범위를 넘는다. §9에 후속 검토로 남김.

### 4-1. `components/RelatedCalculators.tsx` 변경 전/후 (전문)

**변경 전**
```tsx
import type { CalculatorMeta } from "@/lib/calculators";
import CalculatorCard from "@/components/CalculatorCard";

export default function RelatedCalculators({
  calculators,
}: {
  calculators: CalculatorMeta[];
}) {
  if (calculators.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-brand-text">관련 계산기</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {calculators.map((calculator) => (
          <CalculatorCard key={calculator.slug} calculator={calculator} />
        ))}
      </div>
    </section>
  );
}
```

**변경 후**
```tsx
import type { CalculatorMeta } from "@/lib/calculators";
import CalculatorCard from "@/components/CalculatorCard";

// Tailwind JIT는 문자열 조합 클래스를 스캔하지 못하므로 반드시 완전한 클래스 문자열을 상수로 둔다.
const GRID_CLASS = {
  2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
} as const;

export default function RelatedCalculators({
  calculators,
  columns = 3,
}: {
  calculators: CalculatorMeta[];
  columns?: 2 | 3;
}) {
  if (calculators.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-brand-text">관련 계산기</h2>
      <div className={GRID_CLASS[columns]}>
        {calculators.map((calculator) => (
          <CalculatorCard key={calculator.slug} calculator={calculator} />
        ))}
      </div>
    </section>
  );
}
```

**제약 (개발팀 필독)**
- `GRID_CLASS` 두 문자열은 `RelatedBlogPosts.tsx:5~8`과 **바이트 단위로 동일**해야 한다. 복붙 권장. 두 컴포넌트가 갈라지면 열 경계가 어긋난다.
- **금지:** `` `grid-cols-${columns}` `` 류 문자열 조합. Tailwind JIT가 스캔하지 못해 CSS가 생성되지 않는다.
- 기본값을 `3`으로 두어 **prop 미지정 시 렌더 결과가 변경 전과 완전히 동일**하게 유지한다(하위호환).
- **변경 금지:** `mt-10`, `mb-4`, `gap-4`, `length === 0 → return null` 가드, `<h2>관련 계산기</h2>` 문구와 클래스, `CalculatorCard` 호출 형태.
- `CalculatorCard.tsx` / `BlogPostCard.tsx` **수정 없음.**
- 공통 상수 파일로 추출하지 말 것 — 지금은 2개 컴포넌트뿐이고, 추출은 이번 변경의 리스크만 키운다.

---

## 5. 호출부별 변경 전/후 코드

### 5-1. 호출부 1 — `app/calculator/[slug]/page.tsx:141~143`

```tsx
// 변경 전
      {calculator.status === "live" && (
        <RelatedCalculators calculators={related} />
      )}

// 변경 후
      {calculator.status === "live" && (
        <RelatedCalculators calculators={related} columns={2} />
      )}
```

### 5-2. 호출부 2 — `app/calculator/[slug]/page.tsx:145~147`

```tsx
// 변경 전
      {calculator.status === "live" && (
        <RelatedBlogPosts posts={relatedPosts} />
      )}

// 변경 후
      {calculator.status === "live" && (
        <RelatedBlogPosts posts={relatedPosts} columns={2} />
      )}
```

`headingText`는 넘기지 않는다 → 기본값 `"관련 글"` 유지.

### 5-3. 호출부 3 — `app/blog/[slug]/page.tsx:192`

```tsx
// 변경 전
      <RelatedCalculators calculators={related} />

// 변경 후
      <RelatedCalculators calculators={related} columns={2} />
```

### 5-4. 호출부 4 — `app/blog/[slug]/page.tsx:194~198`

**변경 없음.** 현행 유지:
```tsx
      <RelatedBlogPosts
        posts={siblingPosts}
        headingText="함께 읽으면 좋은 글"
        columns={2}
      />
```

### 5-5. 호출부 5 — `components/CategoryPage.tsx:48`

**제외 — 변경 없음.** 이유는 §7.

### 5-6. 변경 요약

| 파일 | 변경 |
|---|---|
| `components/RelatedCalculators.tsx` | `GRID_CLASS` 상수 + `columns` prop 추가 (§4-1) |
| `app/calculator/[slug]/page.tsx` | 2줄에 `columns={2}` 추가 (142, 146행) |
| `app/blog/[slug]/page.tsx` | 1줄에 `columns={2}` 추가 (192행) |
| `components/RelatedBlogPosts.tsx` | **수정 없음** |
| `components/CategoryPage.tsx` | **수정 없음** |
| `components/CalculatorCard.tsx`, `BlogPostCard.tsx` | **수정 없음** |
| `lib/**` | **수정 없음** |

---

## 6. 뷰포트별 예상 수치

### 6-1. 계산기 상세 / 블로그 상세 (`max-w-3xl`, 호출부 1·2·3·4)

컨테이너 = min(768, 뷰포트) / 콘텐츠 폭 = 컨테이너 − 패딩(`<640`은 32px, `≥640`은 48px)

| 뷰포트 | 콘텐츠 폭 | 현행 열/카드 폭 | **변경 후 열/카드 폭** | 카드 내부 폭(−32) |
|---|---|---|---|---|
| 375px (모바일) | 343px | 1열 / 343px | **1열 / 343px (변화 없음)** | 311px |
| 640px (sm 진입) | 592px | 2열 / 288px | **2열 / 288px (변화 없음)** | 256px |
| 1023px | 720px | 2열 / 352px | **2열 / 352px (변화 없음)** | 320px |
| **1280px (데스크톱)** | 720px | 3열 / **229.33px** | **2열 / 352px (+122.67px)** | **320px** |

**핵심 결과: 변경 후 뷰포트 640px 이상 전 구간에서 카드 폭이 단조 증가하거나 유지된다.** 1023↔1280 경계의 123px 역방향 축소가 사라진다. **모바일 375px은 두 설정 모두 `grid-cols-1`이라 픽셀 변화가 0이다** — 모바일 회귀 리스크 없음.

### 6-2. 카테고리 페이지 (`max-w-5xl`, 호출부 5 — 제외 대상, 참고용)

| 뷰포트 | 콘텐츠 폭 | 열 / 카드 폭 |
|---|---|---|
| 375px | 343px | 1열 / 343px |
| 1023px | 975px | 2열 / 479.5px |
| 1280px | 976px | 3열 / **314.67px** |

카테고리 페이지에도 **동일 메커니즘의 축소(479.5 → 314.67)는 존재한다.** 다만 결과값 314.67px이 288px 바닥선을 통과하므로 손상이 아니다. §7 참조.

---

## 7. 범위에서 제외한 항목

### 7-1. 호출부 5 (`components/CategoryPage.tsx:48`) — **제외**

세 가지 독립적인 이유가 모두 같은 방향을 가리킨다.

1. **결함이 아니다.** 카드 폭 314.67px로 288px 바닥선을 +26.67px 통과한다. `BlogPostCard` 내부 폭 282.67px는 선행 문서 §1-2에서 40자 제목의 약 78% 노출로 계산된 값이며, 이미 정상 동작으로 승인된 배치다.
2. **화면 성격이 다르다.** 호출부 1~4는 본문 아래 붙는 **회유 섹션**이지만, 카테고리 페이지는 **목록 화면**이다. 목록 화면은 한 화면에 더 많은 선택지를 보여주는 밀도가 목적이며, 넓은 컨테이너(`max-w-5xl`)가 그것을 뒷받침한다.
3. **바꾸면 오히려 깨진다.** `CategoryPage.tsx:41`의 계산기 목록 그리드가 `lg:grid-cols-3`(314.67px)이고, 관련 글 그리드는 그 **바로 아래**에 온다. 관련 글만 2열(480px)로 바꾸면 위아래 두 그리드의 열 경계가 어긋난다. 이는 `design/category-related-blog-ui-spec.md` §1·§5 체크리스트에서 *"두 그리드가 동일 그리드 클래스를 유지"* 로 **명시적으로 승인된 제약을 위반**하는 것이다.

추가로 6장 ÷ 3열 = 정확히 2행 완전 충전이라 꼬리 문제도 없다.

### 7-2. `app/page.tsx` (홈) — 제외

`max-w-5xl`(line 44)이고 두 컴포넌트를 사용하지 않는다. 대표 계산기 그리드는 `homepage-grid-fix.md`의 flex+`justify-center`가 별도 적용된 영역이다. 무관.

### 7-3. `@container` 기반 근본 수정 — 이번 범위 제외

§1-1의 진짜 원인은 "뷰포트 브레이크포인트를 폭 고정 컨테이너에 적용"이다. Tailwind v4 내장 `@container`로 전환하면 컨테이너 폭 기준으로 열이 결정되어 이런 종류의 버그가 구조적으로 재발하지 않는다. 다만 사이트 전역 그리드 규약 변경이라 이번 티켓에 묶지 않는다. §9 참조.

---

## 8. 선행 스펙과의 관계 (개발팀·마스터 주의)

본 문서는 `design/blog-related-posts-section-spec.md`의 다음 두 항목을 **의도적으로 대체(supersede)한다.**

| 선행 문서 항목 | 선행 결정 | 본 문서 결정 |
|---|---|---|
| §7-3 | `RelatedCalculators.tsx` **수정 없음** | **수정함** (`columns` prop 추가) |
| §8-1 검수 항목 | *"`관련 계산기`는 **3열** 유지"* | **2열로 변경** |

**모순이 아니라 범위 확장이다.** 선행 문서는 §1-1 표에서 이미 `max-w-3xl` 3열 = 229.3px를 "디자인 의도가 유지되지 않는 값"으로 계산해 두었으나, 변경 리스크를 줄이려고 그 회차에는 블로그 글 섹션만 고치고 `RelatedCalculators`를 손대지 않았다. 마스터의 1280px 실측(229.328px)이 그 계산을 실물로 확인해 주었으므로, 이번에 같은 기준을 남은 호출부에 일괄 적용한다.

→ **개발팀은 선행 문서 §8-1의 "관련 계산기 3열 유지" 체크 항목을 더 이상 사용하지 말 것.** 본 문서 §10이 최신 검수 기준이다.

---

## 9. 사용자(마스터) 확인 필요 — 임의 진행하지 않은 항목

이 실행은 무인 시간대이므로 아래는 결정하지 않고 남긴다. **개발팀은 아래 항목 없이 §5만 구현하면 되며, 이들은 후속 티켓 후보다.**

1. **호출부 1의 카드 장수 3 → 4 통일.** 2×2 완전 충전이 되지만 `lib/calculators.ts`의 `relatedSlugs` 9곳(전부 3개짜리)에 4번째 slug를 추가해야 한다(§3-3). 내부링크 설계 = 기획 소관.
2. **호출부 3의 장수 편차.** `resolveRelatedCalculators`에 상한이 없어 데이터에 따라 1~3장이다. 지금은 최대 3이라 문제없지만, 향후 `relatedCalculatorSlugs`가 4개 이상인 글이 생기면 이 섹션만 길어진다. 상한 정책 필요 여부 = 기획/개발 판단.
3. **`@container` 전환**(§7-3). 이 버그 계열의 구조적 재발 방지책.
4. **`CalculatorCard` 제목/배지 flex 압착 보강**(§1-3). 2열 전환으로 실용상 해소되지만, 배지에 `shrink-0 whitespace-nowrap`이 없다는 구조적 취약점 자체는 남는다. 별도 티켓 권장.

---

## 10. 구현 후 디자인 검수 체크리스트 (역할 ②)

dev 서버에서 데스크톱 1280px + 모바일 375px 두 뷰포트로 확인한다.

### 10-1. 필수
- [ ] **1280px `/calculator/salary-net-calculator`**: `관련 계산기` **2열**, 카드 폭 **≈352px**(실측), 3장이 2+1 좌측 정렬.
- [ ] **1280px 동일 페이지**: `관련 글` **2열**, 카드 폭 ≈352px. 위 `관련 계산기` 그리드와 **열 경계·거터가 픽셀 단위로 정렬**.
- [ ] **1280px `/blog/<임의 글>`**: `관련 계산기` 2열(≈352px)이며, 아래 `함께 읽으면 좋은 글` 2열과 열 경계 정렬. (수정 전 이 두 섹션이 어긋나 있던 것이 해소되었는지가 핵심)
- [ ] **역방향 축소 해소**: 1023px ↔ 1280px 리사이즈 시 위 세 섹션 카드 폭이 **352px에서 변하지 않음**.
- [ ] **모바일 375px**: 모든 관련 섹션 1열 / 카드 폭 ≈343px, **가로 스크롤 0**, 수정 전과 픽셀 동일(모바일 회귀 없음).
- [ ] **1280px `CalculatorCard` 압착 해소**: 제목과 `바로 사용 가능` 배지가 한 행에 들어가고 배지 텍스트가 줄바꿈되지 않음.
- [ ] **1280px 제목 미절단**: `BlogPostCard` 40자급 제목이 2줄에서 30자 이상 노출.

### 10-2. 회귀 (변경하지 않기로 한 것이 정말 안 변했는지)
- [ ] **`/salary` 등 카테고리 4곳**: `관련 글`이 **여전히 3열**, 카드 폭 ≈314.67px. 위 계산기 목록 그리드와 열 경계 정렬 유지.
- [ ] **홈(`/`)**: 대표 계산기 그리드 배치 변화 없음.
- [ ] `mt-10` / `mb-4` / `gap-4` 간격 전부 불변, `<h2>관련 계산기</h2>` 문구 불변.
- [ ] 헤딩 아웃라인 레벨 건너뜀 0 (h1 → h2 → h3 …).
- [ ] **빌드 산출 CSS에 `sm:grid-cols-2` 단독 규칙이 존재**(JIT purge 사고 없음). `GRID_CLASS[2]`에는 `lg:grid-cols-3`이 없으므로 이 확인이 특히 중요.
- [ ] 키보드 탭 이동 시 카드 `focus-visible` 링 정상.

### 10-3. 광고 배치 (AdSense 승인 후 적용, 지금은 자리만 고정)
- [ ] **금지 위치 재확인**: `관련 계산기` 그리드와 `관련 글` 그리드 **사이**에 광고 슬롯을 넣지 않는다. 위아래가 모두 클릭 가능한 카드 그리드라 오클릭 유도 배치로 해석될 수 있다(선행 문서 §7-5와 동일 원칙). 그리드 내부 삽입도 금지.
- [ ] **허용 위치**: 본문/계산기 영역 종료 직후 ~ 회유 섹션 시작 전 1곳.
