# 블로그 목록 + 글 상세 — UI 구성안 (v1.1, 2026-08-01)

> **[v1.1 갱신 — 브레드크럼 정정]** 초판 §0 표와 §2-2가 브레드크럼을 `text-xs`(Caption 12px)로
> 규정하면서 그 근거를 **구현 코드("계산기 상세 93행")에서 가져왔다.** 규범이 코드에서 역류한
> 것이고, 그 결과 11~58×16px짜리 터치 타깃이 52개 라우트로 복제됐다(2026-08-01 코드 수정 완료).
> 이번 판에서 ① 브레드크럼 스펙을 확정 사양으로 교체하고 ② 코드 역참조 표기를 제거했으며
> ③ §3의 44px 선언과 실채택값 36px의 충돌을 명시했다. 브레드크럼 정본 정의는
> `design-system.md` §3-5에 신설됐고, 이 문서는 그것을 참조한다. 나머지 레이아웃은 변경 없음.

> 대상: `app/blog/page.tsx`(현재 빈 스텁) 및 신규 `app/blog/[slug]/page.tsx`
> 본 문서는 `design/design-system.md`를 그대로 따르며, 기존 라이브 컴포넌트/토큰을 최대한
> 재사용한다. 코드는 작성하지 않으며 개발팀이 본 문서를 참고해 구현한다.
> **새 색/여백 토큰은 만들지 않는다 — 기존 `brand-*` 토큰과 Tailwind 기본 스케일만 사용.**

---

## 0. 전제 — 기존 시스템에서 그대로 가져오는 것

| 항목 | 재사용 대상 | 값 |
|---|---|---|
| 페이지 컨테이너(목록·상세 공통) | `app/calculator/[slug]/page.tsx` 84행 | `mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12` |
| 페이지 대제목(H1) | 계산기 상세 106행 | `text-2xl font-bold text-brand-text sm:text-[2rem]` |
| 대제목 아래 소개문 | 계산기 상세 109행 | `mt-2 text-sm text-brand-text-secondary sm:text-base` |
| 섹션 제목(H2) | `RelatedCalculators`/`FaqAccordion`/`ResultInterpretation` | `text-xl font-bold text-brand-text` |
| 카드 표면 | `CalculatorCard` 14행 | `rounded-xl border border-brand-border bg-brand-surface p-4 transition-all hover:border-brand-primary hover:shadow-md` |
| 중립 배지(카테고리용) | `CalculatorCard`의 "준비 중" 배지 29행 | `rounded-full bg-brand-bg px-2 py-0.5 text-xs font-medium text-brand-text-secondary` |
| Breadcrumb(현재 위치 내비) | `design-system.md` **§3-5 브레드크럼** | 컨테이너 `-ml-3 mb-2 flex flex-wrap items-center gap-2 text-sm text-brand-text-secondary` + 각 크럼 `inline-flex min-h-9 items-center px-3 …` (전문은 2-2) |
| 보조 링크(하단 복귀 링크 등) | `design-system.md` §2 Body Small | `text-sm text-brand-text-secondary` + `hover:text-brand-primary` |
| 빈 상태 박스 | 현재 blog 스텁 18행 | `rounded-xl border border-dashed border-brand-border bg-brand-surface p-8 text-center text-sm text-brand-text-secondary` |
| 하단 "관련 계산기" 섹션 | `components/RelatedCalculators.tsx` **그대로** | (변경 없이 import) |

> **[v1.1] 위 표의 "N행" 표기에 대하여.** 브레드크럼 행은 `design-system.md` §3-5 참조로 교체했다
> (구 표기 "계산기 상세 93행"이 `text-xs` 결함을 규범으로 승격시킨 경로다). 나머지 행에 남은
> "N행" 표기는 **행 번호가 이미 어긋났을 가능성이 있고**, `design-system.md` §3-5의 "스펙은 코드를
> 인용하지 않는다" 규칙과도 충돌한다. 이 표를 전면 정리하려면 각 값의 정본을 `design-system.md`
> §3에 컴포넌트로 승격시키는 별도 작업이 필요하므로, **이번 판에서는 손대지 않고 남겨 둔다**
> (디자인팀 → 마스터 별건 제안). **새 스펙을 쓸 때 이 표기 방식을 따라 하지 말 것.**

**두 페이지 모두 `max-w-3xl` 단일 컬럼**을 쓴다. 이유:
- 상세 글은 장문 텍스트라 읽기 좋은 폭(약 65자)이 필요 → 계산기 상세와 동일한 `max-w-3xl`.
- 목록도 같은 폭을 써서 목록↔상세 이동 시 콘텐츠 정렬선이 흔들리지 않게 통일.
- **목록을 `CategoryPage`처럼 다열 그리드(`max-w-5xl` 3열)로 하지 않는 이유**: 글이 1편일 때
  다열 그리드는 카드 하나가 화면 좌측 1/3만 차지해 "덩그러니" 어색하다. 아래 1장처럼 세로
  스택(`space-y-4`)으로 하면 1편일 때도, 여러 편일 때도 자연스럽다. 카드의 **시각 스타일(테두리·
  radius·hover)은 계산기 카드와 100% 동일**하게 유지하므로 시각적 일관성은 확보된다.

---

## 1. 블로그 목록 페이지 `/blog`

### 1-1. 레이아웃 구조 (위 → 아래)

```
[페이지 컨테이너 max-w-3xl]
  [H1] 블로그
  [소개문 1~2줄]
  ──────────────────────────────
  [글 카드 리스트]  ← space-y-4 세로 스택
    ┌───────────────────────────────────────┐
    │ [카테고리 배지]                          │  ← 카드 상단
    │ [글 제목 H2]                            │
    │ [요약 2줄까지]                           │
    │ [발행일 · 읽는시간]                       │  ← 카드 하단 메타
    └───────────────────────────────────────┘
    (카드 반복)
  ──────────────────────────────
  [하단 광고 여백]  ← 글이 여러 편이라 스크롤이 길 때만 (5장)
```

- H1/소개문은 현재 스텁(11~17행)의 마크업을 그대로 유지하되, 소개문 카피만 "준비 중" 문구에서
  실제 소개(예: "계산기 활용법과 생활 정보를 정리한 글 모음입니다.")로 교체 — **카피는 기획팀**.

### 1-2. 글 카드 (신규 컴포넌트 `BlogPostCard`)

`CalculatorCard`를 참고해 만들되 내부 구성만 블로그용으로 바꾼다. 카드 전체가 `<Link>`.

- 루트: `Link href={`/blog/${post.slug}`}` +
  `group flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-surface p-4 transition-all hover:border-brand-primary hover:shadow-md`
  (= `CalculatorCard`와 동일 클래스)
- 내부(위 → 아래):
  1. **카테고리 배지**: `<span>` 중립 배지 스타일(0장 표 참고). 텍스트는 `categoryInfo[post.category].title`
     재사용(예: "생활 계산기"). `CalculatorCard`처럼 우상단에 띄우지 말고 **카드 좌상단 단독 배치**
     (글 카드는 제목이 길어 우측 정렬 배지와 충돌 가능).
     → `<div class="flex"><span class="배지">…</span></div>` 또는 `self-start`.
  2. **제목**: `<h2 class="text-base font-semibold text-brand-text group-hover:text-brand-primary sm:text-lg">`
     — 카드 안이므로 시각적으로는 H3급이지만 목록 문서 구조상 `h2` 태그 권장(접근성/SEO).
     길면 `line-clamp-2`.
  3. **요약**: `<p class="text-pretty text-xs leading-relaxed text-brand-text-secondary sm:text-sm line-clamp-2">`
     (`CalculatorCard`의 설명 문단 34행과 동일 톤, 2줄 클램프).
  4. **메타 줄**: `<div class="mt-1 flex items-center gap-2 text-xs text-brand-text-secondary">`
     - 발행일 `<time dateTime={ISO}>2026. 7. 15.</time>` (`tabular-nums`)
     - 구분점 `<span aria-hidden>·</span>`
     - 읽는시간 `<span>읽는 시간 4분</span>`

### 1-3. 글 개수별 처리

| 상황 | 처리 |
|---|---|
| 0편 | 카드 리스트 대신 기존 빈 상태 박스(0장 표) 그대로. 문구: "아직 등록된 글이 없습니다. 곧 찾아뵙겠습니다." |
| 1편 | `space-y-4` 스택에 카드 1개 → 좌우 꽉 찬 카드 1장, 자연스러움. 추가 처리 불필요. |
| 여러 편 | 동일 스택에 카드 N개. 최신순(발행일 desc) 정렬 권장(정렬 로직은 개발팀). |

> `sm` 이상에서 2열 그리드로 바꾸고 싶은 유혹이 있으나, 1편·홀수편일 때 빈칸이 생겨 어색하므로
> **초기에는 세로 스택 고정**을 권장한다. 글이 10편 이상으로 늘면 그때 `sm:grid-cols-2` 도입을
> 별도 검토(그 시점에 디자인팀 재스펙).

---

## 2. 글 상세 페이지 `/blog/[slug]`

### 2-1. 레이아웃 구조 (위 → 아래)

```
[페이지 컨테이너 max-w-3xl]
  [Breadcrumb] 홈 / 블로그
  [H1] 글 제목
  [메타 줄] 발행일 · 읽는 시간 · 카테고리 배지
  ──────────────────────────────
  [본문]  ← h2 소제목 + 문단 + (본문 중간 내부링크 CTA)
  [본문 중간 광고 여백]  ← 본문이 길 때, 문단 사이 (5장)
  ──────────────────────────────
  [관련 계산기]  ← RelatedCalculators 컴포넌트 그대로 재사용
  [하단 광고 여백]
  [← 목록으로 돌아가기]
```

### 2-2. 상단 헤더 (Breadcrumb · 제목 · 메타)

- **Breadcrumb(현재 위치 내비)**: `design-system.md` **§3-5 브레드크럼** 컴포넌트 정의를 그대로 따른다.
  이 문서는 항목만 지정한다 — `홈`(`/`) / `블로그`(`/blog`).

  ```
  <nav aria-label="현재 위치"
       className="-ml-3 mb-2 flex flex-wrap items-center gap-2 text-sm text-brand-text-secondary">
    <Link href="/" className="inline-flex min-h-9 items-center px-3 transition-colors hover:text-brand-primary {FOCUS_RING_LINK_ROUNDED}">홈</Link>
    <span aria-hidden="true">/</span>
    <Link href="/blog" className="(위와 동일)">블로그</Link>
  </nav>
  ```

  - `text-sm`(Body Small) — **대화형 요소에 Caption 12px 스케일 금지**(§3-5 규칙). 이 문서 이전 판이
    지정했던 `text-xs`는 스케일 오분류였으므로 **폐기**한다.
  - 각 크럼은 `min-h-9`(36px) + `px-3`으로 터치 타깃을 확보한다. `홈`처럼 글자 폭 11px짜리 짧은
    라벨도 약 37px 폭이 된다(패딩 없이 텍스트만 두면 타깃이 글자 폭 그대로 무너진다).
  - `-ml-3`은 첫 크럼의 `px-3` 좌패딩 상쇄용 — 크럼 텍스트가 아래 H1과 같은 좌측 정렬선에 놓인다.
  - 값의 근거·터치 타깃 기준의 정본은 `design-system.md` §3-5다. **여기서 클래스를 재선언·변형하지 않는다.**
- **H1**: `text-2xl font-bold text-brand-text sm:text-[2rem]` (0장 표).
- **메타 줄** (`mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-text-secondary sm:text-sm`):
  - `<time dateTime>`: 발행일 (`tabular-nums`)
  - `·` 읽는 시간 N분
  - `·` 카테고리 배지(1-2와 동일 중립 배지) — **선택**: 메타는 텍스트만 두고 배지는 생략해도 됨.
    일관성 위해 목록 카드와 같은 배지 사용을 권장.

### 2-3. 본문 (핵심 — 신규 스타일 결정 지점)

본문은 이 사이트에서 **처음 등장하는 장문 콘텐츠**다. `ResultInterpretation`은 짧은 보조 텍스트라
`text-brand-text-secondary`(회색)를 쓰지만, 블로그 본문은 페이지의 주(主) 콘텐츠이므로 가독성을
위해 **본문 문단은 기본 텍스트색(`text-brand-text`)** 을 쓰도록 한다. (design-system.md 2장 Body =
Text Primary #111827 정의와도 일치. 회색은 캡션/보조용.)

렌더 방식(마크다운→HTML 등)은 개발팀 결정. 최종 산출 태그에 아래 클래스가 적용되게 한다.
Tailwind `prose`(typography 플러그인) 도입 시에도 아래 값에 맞춰 커스터마이즈할 것.

| 요소 | 태그 | 클래스 |
|---|---|---|
| 본문 래퍼 | `<div>` / `<article>` | `mt-6 space-y-4` (헤더와 24px 간격, 문단 간 16px) |
| 소제목 | `<h2>` | `mt-8 text-xl font-bold text-brand-text` (섹션 제목 스케일, 첫 h2는 mt 없이) |
| 소소제목 | `<h3>` | `mt-6 text-lg font-semibold text-brand-text` |
| 문단 | `<p>` | `text-pretty text-base leading-relaxed text-brand-text` (모바일도 16px 유지, 축소 금지) |
| 목록 | `<ul>/<ol>` | `list-disc/decimal pl-5 space-y-1 text-base leading-relaxed text-brand-text` |
| 인라인 링크 | `<a>` | `font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-hover` |
| 강조 | `<strong>` | `font-semibold text-brand-text` |

### 2-4. 본문 중간 "내부링크 CTA" (계산기로 유도)

글 안에서 관련 계산기로 자연스럽게 넘기는 강조 박스. 광고가 아니라 **콘텐츠형 CTA**이므로
광고와 명확히 다른, 브랜드 톤이 살짝 들어간 박스로 만든다.

- 박스: `my-6 rounded-xl border border-brand-border bg-brand-bg p-4`
  (카드 표면 `bg-brand-surface`(흰색)와 달리 `bg-brand-bg`(연회색)로 살짝 구분 → 본문 흐름 속
  "쉬어가는 블록"으로 인지)
- 내부:
  - 안내 문구 `<p class="text-sm text-brand-text-secondary">` — 예: "이 내용이 궁금하다면"
  - 링크 버튼형 `<Link href={`/calculator/…`} class="mt-2 inline-flex items-center gap-1 rounded-lg
    bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover">`
    — 예: "만 나이 계산기 사용하기 →"
- 이 CTA의 대상 계산기 slug·문구는 **기획팀이 글 콘텐츠와 함께 지정**. 디자인은 자리·스타일만.

### 2-5. 하단 "관련 계산기" + 목록 복귀

- **관련 계산기**: `components/RelatedCalculators.tsx`를 **그대로 재사용**(신규 컴포넌트 불필요).
  - 이 컴포넌트는 `calculators: CalculatorMeta[]`를 받아 `mt-10` 섹션 + H2 "관련 계산기" +
    3열 그리드(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)로 렌더한다 → 계산기 상세와 100% 동일 UI.
  - 글별로 `post.relatedSlugs`를 정의하고, 페이지에서 slug → live `CalculatorMeta` 배열로 변환해
    전달(변환 로직은 개발팀, `getRelatedCalculators`의 slug 처리 로직 참고). 빈 배열이면 컴포넌트가
    자동으로 `null` 반환하므로 안전.
- **목록으로 돌아가기**: 관련 계산기 아래 `mt-10`.
  `<Link href="/blog" class="text-sm text-brand-text-secondary hover:text-brand-primary">← 블로그 목록으로</Link>`
  (Breadcrumb과 별개로, 글을 다 읽은 사용자의 다음 동선 확보용. 하단에 한 번 더 제공.)

---

## 3. 반응형 규칙 (모바일 ≤640px / 데스크톱)

Tailwind 기본 브레이크포인트, 기존 `sm:` 관례를 그대로 따른다.

| 항목 | 모바일(기본, 0~639px) | 데스크톱(`sm`~ 640px 이상) |
|---|---|---|
| 컨테이너 패딩 | `px-4 py-8` | `sm:px-6 sm:py-12` |
| H1 | `text-2xl`(24px) | `sm:text-[2rem]`(32px) |
| 목록 소개문 / 상세 메타 | `text-sm`(14px) / `text-xs` | `sm:text-base` / `sm:text-sm` |
| 목록 카드 배치 | 1열 세로 스택 `space-y-4` | 동일(초기엔 다열 전환 안 함 — 1-3 참고) |
| 목록 카드 제목 | `text-base`(16px) | `sm:text-lg`(18px) |
| 목록 카드 요약 | `text-xs` | `sm:text-sm` |
| 본문 문단 | `text-base`(16px, **축소 금지**) | 동일 16px (읽기 폭 max-w-3xl로 제어) |
| 본문 소제목 h2 | `text-xl`(20px) | 동일 |
| 내부링크 CTA 버튼 | `py-2`(높이 약 40px) | 동일. 터치 타겟 44px 확보 위해 `px-4 py-2` 유지 |
| 브레드크럼(2-2) | `text-sm` + 각 크럼 `min-h-9`(36px) `px-3`, 크럼 간 `gap-2` | 동일(모바일·데스크톱 같은 값) |

- **터치 타깃 기준 — 문서 간 충돌 있음(미해결, 별건 티켓)**
  - `design-system.md` §4 원칙 3은 "터치 타겟 최소 44×44px"을 선언한다.
  - 그러나 현재 라이브 사이트의 **내비게이션 링크류는 36px(`min-h-9`/`h-9`)를 하한으로 채택**해
    구현돼 있다 — 2-2 브레드크럼(`/calculator/*` 16개 + `/blog/*` 36개 = **52개 라우트**),
    `SiteHeader` nav(약 36px, `design/site-header-mobile-nav-spec.md` §8-4에 별건 제기됨),
    기간 단위 토글(`h-9`, `design/loan-interest-calculator-ui-spec.md` §2-3(B)).
  - **이 문서는 어느 쪽이 정본인지 정하지 않는다.** 44px 재정본화는 사이트 전 nav를 다시 그리는
    결정이라 마스터가 별건 티켓으로 분리했다. 여기서는 사실만 기록한다 —
    **선언값 44px / 내비류 실채택값 36px, 브레드크럼은 36px 계열.**
  - 정본화 전까지 이 페이지의 실무 기준: **본문 조작 요소**(글 카드 `p-4`, 2-4 CTA 버튼 `px-4 py-2`,
    입력류)는 위 44px 선언을 목표로 두고, **내비게이션 링크**(브레드크럼, 2-5 하단 복귀 링크)는
    36px 하한을 따른다.
  - 참고: 위 표의 CTA 버튼 행은 스스로 "높이 약 40px"이라 적으면서 같은 칸에서 "44px 확보"라고
    말한다. 이 40 vs 44도 같은 별건에 딸린 미해결 항목이므로, 값을 임의로 바꾸지 않고 남겨 둔다.
- 이미지 삽입 시(썸네일/본문 이미지) `w-full h-auto rounded-xl` + `loading="lazy"` 권장 —
  단, 현 스펙에는 이미지 영역을 필수로 두지 않는다(콘텐츠 준비 상황에 따라 기획팀 결정).

---

## 4. 광고 배치 (design-system.md 5장 준수)

블로그 특화 주의사항만 명시. **클릭 유도·콘텐츠 오인 배치 금지 원칙은 동일.**

- **목록 페이지**: 상단 배너·중간 광고 넣지 않음(글이 적을 때 콘텐츠보다 광고가 많아 보이는
  역효과). 글이 여러 편이라 스크롤이 길어질 때만 **리스트 최하단 1개**, "광고" 캡션 라벨 표기.
- **상세 페이지**:
  - **본문 중간**: 문단과 문단 "사이"에만, 위아래 `margin 24px 이상`. **h2 소제목 바로 위/아래,
    또는 2-4 내부링크 CTA와 인접 배치 금지**(내부 CTA(파랑 버튼)와 광고가 붙으면 사용자가 광고를
    콘텐츠 버튼으로 오인할 수 있음 — 둘 사이 최소 32px 여백 + 광고엔 "광고" 캡션).
  - **하단**: `RelatedCalculators` 섹션 다음, "목록으로 돌아가기" 위.
  - **관련 계산기 카드 그리드 바로 위/아래**는 카드형 광고와 시각적으로 섞이므로, 광고를 둘 경우
    배경(`bg-brand-bg`)·"광고" 라벨로 계산기 카드(`bg-brand-surface`)와 명확히 분리.
- 모든 광고 슬롯은 콘텐츠 카드와 다른 여백/배경 + Caption 크기 "광고" 라벨 필수.

---

## 5. 신규/재사용 컴포넌트 & 데이터 매핑 (개발팀 참고)

| 항목 | 신규/재사용 | 내용 |
|---|---|---|
| `components/BlogPostCard.tsx` | **신규** | 1-2 스펙. `CalculatorCard.tsx` 마크업/클래스 복제 후 내부만 교체(제목/요약/메타/배지). props: `post: BlogPostMeta` |
| `app/blog/page.tsx` | 개편 | 현재 스텁의 H1/소개문 유지 + 카드 리스트(`space-y-4`) 또는 빈 상태 분기(1-3) |
| `app/blog/[slug]/page.tsx` | **신규** | 2장 스펙. `generateStaticParams`/`generateMetadata`는 계산기 상세(43~65행) 패턴 참고 |
| `RelatedCalculators` | **재사용** | 2-5. 변경 없이 import |
| `categoryInfo` (`lib/calculators.ts`) | **재사용** | 카테고리 배지 라벨 |
| `lib/blog.ts` | **신규(데이터)** | `BlogPostMeta` 타입 + 글 목록. 필드 제안: `slug, title, category(CalculatorCategory), summary, publishedAt(ISO), readingMinutes, relatedSlugs, body` — **본문/카피/읽는시간 산정은 기획팀**, 디자인 범위 밖 |
| Tailwind typography(`prose`) | 선택 | 본문 렌더에 도입 시 2-3 표 값에 맞춰 커스터마이즈(폰트색 `brand-text`, 링크 `brand-primary`) |

> **읽는 시간** 표기는 콘텐츠 성격 정보다. 산정 기준(예: 분당 글자수)은 기획팀이 정하고 `lib/blog.ts`
> 데이터에 넣거나 개발팀이 본문 길이로 계산. 디자인은 "발행일 · 읽는 시간 N분 · 카테고리" 배치와
> 스타일만 정의한다.

---

## 6. 다른 팀 전달 사항

**기획팀 확인/제공 요청**
- 목록 소개문 실제 카피(현 스텁의 "준비 중" 문구 교체).
- 각 글의 `category`, `summary`(2줄 이내), `publishedAt`, `readingMinutes`, `relatedSlugs`,
  본문(h2 소제목 구조 포함), 2-4 내부링크 CTA의 대상 계산기 slug·문구.
- 카테고리 체계: 블로그 글을 계산기와 **동일한 `CalculatorCategory`(salary/loan/date/life)** 로
  분류할지, 블로그 전용 카테고리를 새로 둘지 결정 필요. 새 체계면 정보구조 변경이므로
  기획팀+개발팀 협의 후 마스터 확인. (본 스펙은 기존 `categoryInfo` 재사용을 기본 가정.)

**개발팀 전달 사항**
- `BlogPostCard.tsx` 신규(1-2), `app/blog/page.tsx` 개편(1장), `app/blog/[slug]/page.tsx` 신규(2장).
- `RelatedCalculators`는 그대로 재사용, `relatedSlugs → live CalculatorMeta[]` 변환만 구현.
- 본문 문단은 `text-brand-text`(회색 아님) 기본. `ResultInterpretation`의 회색과 다른 점 주의.
- 구현 후 데스크톱 + 모바일(≤640px) 뷰포트로 디자인팀 재검수 예정(글 0편/1편/여러 편 3케이스).

**마스터 팀장 확인 필요**
- 없음 — 신규 색/토큰/브랜딩 변경 없이 기존 시스템 재사용 범위 내 설계. (블로그 전용 카테고리
  신설을 선택할 경우에 한해 정보구조 변경 사안으로 별도 확인 필요.)
