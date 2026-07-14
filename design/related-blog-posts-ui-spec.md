# 화면 구성안 — 계산기 상세 하단 "관련 글" 블록

- 문서 유형: 개발 전 화면 구성안(레이아웃 스펙)
- 대상 페이지: `app/calculator/[slug]/page.tsx`
- 신규 컴포넌트(예상): `components/RelatedBlogPosts.tsx` (개발팀 구현)
- 재사용 자산: `components/BlogPostCard.tsx`, `components/RelatedCalculators.tsx` 패턴
- 작성: 디자인팀 / 기준일 2026-07-15

---

## 0. 이 블록이 하는 일

블로그 글에는 이미 "이 글이 밀어주는 관련 계산기"(`relatedCalculatorSlugs`)로 blog → calculator 내부링크가 있다. 이 블록은 그 **역방향**이다: 현재 계산기를 지원(언급)하는 블로그 글 카드 목록을 계산기 상세 페이지 하단에 보여준다.

- 데이터 근거: `lib/blog.ts`의 `blogPosts` 중 `relatedCalculatorSlugs`에 현재 계산기 `slug`가 포함된 글.
- 정렬: `publishedDate` 내림차순(최신 우선) 권장 — `getAllBlogPosts()`와 동일 관례.
- 개수: 그리드가 3열이므로 최대 3~6편 노출 권장(3의 배수가 시각적으로 가장 깔끔). 상한은 개발팀이 정하되 3편이면 데스크톱 1행으로 떨어져 가장 안정적.
- 로직/필터/헬퍼 함수는 개발팀 몫. 본 문서는 화면 구성만 규정한다.

---

## 1. 블록 구조 (section / heading / grid)

`RelatedCalculators.tsx`와 **시각적으로 완전히 일관**되게 만든다. 동일한 마진·제목 스타일·그리드를 그대로 재사용한다.

```
<section className="mt-10">
  <h2 className="mb-4 text-xl font-bold text-brand-text">관련 글</h2>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {posts.map((post) => (
      <BlogPostCard key={post.slug} post={post} headingLevel="h3" />
    ))}
  </div>
</section>
```

- 섹션 제목 문구: **"관련 글"** (RelatedCalculators의 "관련 계산기"와 대칭. "관련 블로그", "함께 읽으면 좋은 글" 등으로 늘어지지 않게 짧게 유지.)
- 제목 클래스: `mb-4 text-xl font-bold text-brand-text` — "관련 계산기"/"자주 묻는 질문"/"결과 해석" 섹션 제목과 100% 동일.
- 섹션 외곽 마진: `mt-10` — 위 블록들과 동일 리듬.
- 그리드: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` — RelatedCalculators와 동일. 신규 그리드 규칙을 만들지 않는다.
- 색상 토큰: 카드 스타일은 BlogPostCard가 이미 `brand-border`/`brand-surface`/`brand-primary`/`brand-text`/`brand-text-secondary`/`brand-bg`만 사용. **신규 색 도입 없음.**

---

## 2. "관련 계산기" 블록과의 상하 배치 순서

**권장 순서(위 → 아래):**

```
... 계산기 UI → 결과 해석 → 자주 묻는 질문 → [관련 계산기] → [관련 글]
```

즉 **"관련 글"은 "관련 계산기" 아래**에 둔다.

이유:
1. **1차 의도 우선.** 계산기 페이지 방문자의 즉시 목적은 "계산"이다. "관련 계산기"는 같은 도구 사용 흐름(다른 값을 또 계산)으로 이어져 태스크 연속성이 가장 높다. "관련 글"은 더 깊은 읽기 콘텐츠로 2차 의도.
2. **자연스러운 페이지 마무리(read-more 푸터).** 도구 → 도구 → 읽을거리 순서가 "다 썼으면 더 읽어보라"는 동선으로 매끄럽다. 읽기 콘텐츠는 체류시간(dwell time) 확보에 유리하지만, 페이지 맨 끝 "더 읽기" 자리에서 가장 자연스럽다.
3. **기존 코드 최소 변경.** 현재 `RelatedCalculators`가 페이지 마지막(라인 130~132)이다. 그 바로 아래에 `RelatedBlogPosts`를 붙이면 된다.

두 블록은 동일한 `mt-10`·동일 제목 스타일이라 나란히 놓여도 시각적으로 형제 섹션처럼 자연 정렬된다.

---

## 3. 반응형 — 뷰포트별 열 수와 배치

그리드는 Tailwind 기본 브레이크포인트 기준(sm=640px, lg=1024px):

| 뷰포트 | 조건 | 열 수 | 클래스 근거 |
|---|---|---|---|
| 모바일 | ≤ 639px | **1열** (세로 스택) | `grid-cols-1` |
| 태블릿 | 640 ~ 1023px | **2열** | `sm:grid-cols-2` |
| 데스크톱 | ≥ 1024px | **3열** | `lg:grid-cols-3` |

카드 간 간격은 전 뷰포트 `gap-4`.

### 컨테이너 폭 주의 (검수 시 반드시 확인)
- 페이지 컨테이너는 `mx-auto max-w-3xl`(=768px)로 캡되어 있다. 브레이크포인트는 **뷰포트** 기준이므로, 뷰포트가 1024px 이상이어도 그리드가 담기는 실제 폭은 768px이다.
- 따라서 데스크톱 3열에서 카드 1장 폭은 `(768 - 좌우패딩 - gap×2) / 3` ≈ **약 230px**. RelatedCalculators도 같은 컨테이너에서 같은 그리드를 쓰므로 이 조건은 이미 검증된 폭이다 — 신규 위험 아님.

### BlogPostCard 가로 오버플로 점검 포인트 (개발팀 셀프체크 & 디자인 검수 항목)
BlogPostCard는 `flex flex-col`, 고정 폭/`min-w` 없음, 텍스트는 `line-clamp-2`로 잘리므로 **구조상 가로 오버플로가 발생하지 않는다.** 다만 검수 시 아래를 실제로 확인한다:
1. **약 230px 폭(데스크톱 3열)** 에서 배지 pill + 2줄 제목 + 2줄 요약 + 날짜 메타행이 깨지지 않고 들어가는지.
2. 날짜 메타행(`time · 읽는 시간 N분`)이 `flex ... gap-2 text-xs`라 좁은 폭에서 자연 줄바꿈될 수 있음 — 줄바꿈되어도 레이아웃은 안 깨지지만, 230px에서 한 줄 유지되는지 확인(문제 시 개발팀에 메타행 `flex-wrap` 허용 요청).
3. **모바일(≤360px, 예: iPhone SE)** 1열에서 긴 카테고리명 배지나 긴 제목이 가로 스크롤을 유발하지 않는지 — `line-clamp-2`가 제목을, pill이 `self-start`로 폭을 콘텐츠에 맞추므로 안전하지만 실기기 폭에서 확인.

---

## 4. 빈 상태 (참조 글 0편)

- **참조 글이 0편이면 섹션 전체를 렌더하지 않는다.** 빈 "관련 글" 제목만 덩그러니 남기지 않는다.
- RelatedCalculators / FaqAccordion과 동일한 조기 반환 패턴을 따른다:
  ```
  if (posts.length === 0) return null;
  ```
- 참고: 현재 `blogPosts`가 4편뿐이라 대부분의 계산기 slug는 참조 글이 0편이다(예: bmi-calculator, four-insurance-calculator, unit-converter 등). 따라서 **"0편이면 미렌더"는 예외가 아니라 당장의 기본 상태**다 — 이 분기가 없으면 대부분 페이지에 빈 제목이 뜬다. 반드시 구현.

---

## 5. 접근성 & 헤딩 계층 (중요)

### 5-1. 헤딩 레벨 충돌 — BlogPostCard 카드 제목이 `<h2>`인 문제
현재 페이지 헤딩 계층:
- `h1` = 계산기명 (page.tsx 라인 106)
- `h2` = "결과 해석" / "자주 묻는 질문" / "관련 계산기" 섹션 제목
- `h3` = **CalculatorCard의 카드 제목** (CalculatorCard.tsx 라인 17)

즉 이 페이지 관례는 **"섹션 제목 h2 → 그 안의 카드 제목 h3"** 이다. 그런데 `BlogPostCard.tsx` 라인 24는 카드 제목을 **`<h2>`** 로 하드코딩하고 있다. 이 컴포넌트를 그대로 재사용하면:
- "관련 글"(h2) 섹션 안의 카드 제목들도 h2가 되어, **섹션 제목과 카드 제목이 동일 레벨**이 된다.
- 스크린리더 문서 개요에서 카드 제목들이 섹션의 하위가 아니라 형제로 잡혀 계층이 무너지고, "관련 계산기"(h3 카드)와 "관련 글"(h2 카드)의 계층이 서로 어긋난다.

**디자인 권고(개발팀 반영 요청):**
- BlogPostCard에 **헤딩 레벨을 주입할 수 있는 prop**(예: `headingLevel?: "h2" | "h3"`, 기본값 `"h2"`)을 추가한다.
  - 기본값 `"h2"` 유지 → 블로그 **목록 페이지**에서는 카드가 h1 아래 최상위 항목이라 h2가 맞으므로 기존 동작/시맨틱 불변.
  - 이 "관련 글" 블록에서는 `headingLevel="h3"`로 넘겨 **카드 제목을 h3**로 렌더 → CalculatorCard 관례와 일치, 계층 정상화.
- **시각 스타일은 절대 바꾸지 않는다.** 기존 클래스(`line-clamp-2 text-base font-semibold text-brand-text group-hover:text-brand-primary sm:text-lg`)를 태그만 h3로 바꿔 그대로 적용. 렌더링 외형은 픽셀 동일, 시맨틱만 교정.
- prop 주입이 어렵다는 개발팀 회신이 오면 대안으로 마스터를 통해 재협의(핑퐁). 시각 회귀를 유발하는 방식(스타일 변경/컴포넌트 분기 복제)은 지양.

### 5-2. 나머지 접근성 요건
- **섹션 heading 필수.** `<section>` + 보이는 `<h2>관련 글</h2>`로 랜드마크/개요에 노출. 제목 없는 익명 섹션 금지.
- **카드 링크 포커스 상태.** BlogPostCard는 `<Link>` 전체가 클릭 타깃(카드 전체 클릭). `group` + `hover:border-brand-primary hover:shadow-md`로 hover 피드백이 있으나 **키보드 포커스(:focus-visible) 링이 명시적으로 없다.** 검수 시 탭 이동으로 포커스가 시각적으로 드러나는지 확인하고, 안 보이면 개발팀에 `focus-visible:outline` 또는 `focus-visible:ring` 계열 보강을 요청한다(브라우저 기본 아웃라인이 카드 radius와 안 맞아 잘리는 경우 특히).
  - 참고: 이 포커스 링 이슈는 BlogPostCard/CalculatorCard 공통 사안이므로, 보강한다면 두 카드 일관되게. (본 블록 단독 변경으로 카드 컴포넌트에 개별 스타일을 얹지 말 것 — 일관성 우선.)
- **링크 접근명.** 카드 안 제목 텍스트가 링크의 접근명이 되므로 별도 `aria-label` 불필요. 배지(카테고리)는 장식적 반복 정보가 아니라 유효 텍스트이므로 그대로 노출 OK.
- 광고 배치: 본 블록은 광고를 포함하지 않는다. (계산기 페이지 광고 배치 정책은 별도 문서 관할. "관련 글" 카드 사이에 인피드 광고를 끼워 클릭을 유도하는 배치는 금지 — 콘텐츠 카드와 광고를 시각적으로 혼동시키지 않는다.)

---

## 6. 구현 체크리스트 (개발팀)

- [ ] `components/RelatedBlogPosts.tsx` 신규 생성. props: `posts: BlogPost[]`.
- [ ] `posts.length === 0`이면 `return null` (빈 제목 미렌더). — 현재 대부분 계산기가 0편이므로 필수.
- [ ] 최상위 `<section className="mt-10">`.
- [ ] 제목 `<h2 className="mb-4 text-xl font-bold text-brand-text">관련 글</h2>`.
- [ ] 그리드 `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">` (RelatedCalculators와 동일).
- [ ] 카드는 기존 `BlogPostCard` 재사용. `key={post.slug}`.
- [ ] BlogPostCard에 `headingLevel?: "h2" | "h3"` prop 추가(기본 `"h2"`), 카드 제목 태그를 이 값으로 렌더. **클래스/외형 불변.**
- [ ] 본 블록에서는 `<BlogPostCard post={post} headingLevel="h3" />`로 호출.
- [ ] 정렬: `publishedDate` 내림차순. 노출 개수 상한(권장 3 또는 6) 설정.
- [ ] 데이터 필터(현재 slug를 `relatedCalculatorSlugs`에 포함하는 글)는 `lib/blog.ts` 기준으로 구현(헬퍼 신설은 개발팀 재량).
- [ ] `app/calculator/[slug]/page.tsx`에서 **`RelatedCalculators` 렌더 바로 아래**에 `RelatedBlogPosts` 렌더 배치.
  - [ ] 노출 조건은 기존 관례에 맞춰 검토(예: `calculator.status === "live"`일 때). 단 빈 배열이면 컴포넌트가 스스로 `null` 반환하므로 이중 안전.
- [ ] (권장) 카드 `:focus-visible` 링 보강 — BlogPostCard/CalculatorCard 공통으로 일관 적용.
- [ ] 신규 색 토큰 도입 없음 확인(brand-* 토큰만).

## 7. 구현 후 디자인 검수 항목 (역할 ②)

- [ ] dev 서버 프리뷰에서 참조 글이 **있는** 계산기(예: `salary-net-calculator`, `dsr-calculator`, `electricity-bill-calculator`, `age-calculator`)와 **없는** 계산기(예: `bmi-calculator`) 양쪽 확인.
- [ ] 없는 계산기에서 "관련 글" 섹션이 아예 안 뜨는지(빈 제목 없음).
- [ ] 데스크톱(≥1024px, 컨테이너 768px) 3열 / 태블릿(640~1023px) 2열 / 모바일(≤639px) 1열 실제 확인.
- [ ] 약 230px 카드 폭 및 모바일 360px 폭에서 가로 오버플로/가로 스크롤 없음.
- [ ] "관련 계산기" 바로 아래에 "관련 글"이 위치, 두 섹션 간 간격이 `mt-10` 리듬으로 균일.
- [ ] 카드 제목이 h3로 렌더되는지(개발자도구 요소 검사) + 문서 개요 계층 정상.
- [ ] 키보드 탭 이동 시 카드 포커스가 시각적으로 드러나는지.
- [ ] "관련 글" 카드 스타일이 블로그 목록 페이지 카드와 픽셀 동일(외형 회귀 없음).
