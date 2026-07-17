# 크로스 사이트 내비게이션 위젯 — 구성안 (v1.0, 2026-07-17)

- 문서 유형: 개발 전 화면 구성안(레이아웃/컴포넌트/인터랙션 스펙)
- 적용 대상: 계산기 허브 전역(모든 페이지) — `SiteHeader`/`SiteFooter`와 동급의 전역 컴포넌트로 `app/layout.tsx`에 마운트
- 재사용 자산: `lib/focusRing.ts`(포커스 링 3티어), `components/FaqAccordion.tsx`의 `<details>/<summary>` 디스클로저 패턴(JS 없이 접고 펼침), `components/CalculatorCard.tsx`의 "준비 중" 배지 톤(`bg-brand-bg text-brand-text-secondary`), `app/page.tsx`(`CATEGORY_ICON`)·`components/BmiCalculator.tsx`(`STATUS_STYLES`)의 raw Tailwind 팔레트 tint 배지 패턴
- 계기: 마스터 전달 — 사용자가 운영하는 4개 사이트(계산기 허브 / 부동산 실거래가 대시보드 / 청약레이더 / 대출모아)를 서로 연결하는 크로스 사이트 내비게이션 위젯. 시나리오: "아파트 관심 있는 사람이 실거래가 조회도 하고 청약도 신청하고 대출 비교도 했다가 연봉 계산도 하고" — 4개 사이트 간 자연스러운 사용자 여정을 링크로 연결
- 적용 범위: **이번 문서는 계산기 허브(이 사이트)에만 적용한다.** 나머지 3개 사이트(부동산 실거래가 대시보드/청약레이더/대출모아) 팀은 각자 대화창에서 이 문서를 참고해 이식할 예정 — §13에 이식 전용 가이드를 별도로 둔다.
- 함께 제공하는 정적 목업: `design/cross-site-nav-widget-mockup.html` (브라우저로 열어 1280px 기준 위/아래로 창 폭을 조절하면 데스크톱 레일 ↔ 모바일 FAB 전환을 실제로 확인 가능, `:has()` 기반 "입력 중 FAB 숨김"도 실제 동작)
- 작성: 디자인팀 / 기준일 2026-07-17

---

## 0. 요약 — 판단 6개 결론

| # | 판단 항목 | 결론 |
|---|---|---|
| 1 | 데스크톱 레이아웃 | 우측 뷰포트 고정(`position: fixed`, 세로 중앙), 배지(이니셜)+짧은 라벨 세로 스택, 폭 80px. **`xl`(1280px)부터 노출.** 이 사이트에서 가장 넓은 컨테이너(`max-w-5xl`=1024px, 홈/카테고리)를 기준으로 실측한 결과 1280px에서 콘텐츠와 32px 여유 확보(§5-1) |
| 2 | 모바일 처리 | 우측 하단 FAB(56px 원형) → 탭하면 위로 펼쳐지는 패널, `<details>`만으로 구현(JS 불필요). 하단 고정 스트립은 기각 — 상시 화면 잠식 + 입력 필드와 겹칠 확률 100%(§6-1) |
| 3 | 로고 처리 | 이미지 로고 신규 제작 안 함. **텍스트 이니셜 원형 배지(사이트별 색) + 사이트명 텍스트.** 4곳 다 로고 이미지 자산이 없고, 원격 이미지는 `next.config.ts`에 `images.remotePatterns` 추가가 필요하며, 로컬 복사는 4개 저장소에 파일을 매번 배포해야 하는 번거로움이 있음 — 텍스트+CSS는 이식 비용이 0(§4) |
| 4 | 현재 사이트 표시 | 4개 항목을 **항상 전부, 항상 같은 순서로** 표시(사이트마다 목록이 달라지지 않게). 현재 있는 사이트만 링크가 아닌 강조 표시(`aria-current="page"`, 옅은 배경 하이라이트)로 전환(§7) |
| 5 | 대출모아(미배포) | 목록에 포함하되 **비활성 상태**(`url: null` → "준비 중" 배지, 링크 아님)로 표시. 배포되면 데이터 배열 1줄(`url` 값)만 채우면 자동으로 활성 링크로 전환(§8) |
| 6 | 광고 레일과 충돌 | **충돌 없음.** 이 위젯은 컨테이너 *바깥* 여백(거터)에 위치하고, `design-system.md` §5의 사이드바 광고 계획은 컨테이너 *안쪽* 우측 1/3 컬럼을 전제로 한다 — 서로 다른 영역. 단, 향후 광고를 이 위젯처럼 뷰포트 고정형으로 만들면 충돌하므로 제약을 명시해 둔다(§9) |

---

## 1. 배경 조사 — 실측

### 1-1. 현재 페이지 컨테이너 폭 (전체 페이지 스캔 결과)

| 컨테이너 폭 | 사용 페이지 |
|---|---|
| `max-w-5xl`(1024px) | `SiteHeader`, `SiteFooter`, 홈(`app/page.tsx`), 카테고리(`CategoryPage.tsx`), 소개(`about`) — **사이트에서 가장 넓은 컨테이너** |
| `max-w-3xl`(768px) | 계산기 상세(`calculator/[slug]`), 블로그 목록/상세, 고객센터, 약관/개인정보 |

→ 데스크톱 레일의 충돌 여부는 **가장 넓은 컨테이너(1024px)를 기준으로 계산**해야 모든 페이지에서 안전하다(§5-1).

### 1-2. 기존 `fixed`/`sticky` 요소 — 없음

`grep`으로 전체 `components/`·`app/`를 확인한 결과 `sticky`, `fixed`, `bottom-0` 등 뷰포트 고정 요소는 **단 하나도 없다.** 헤더(`SiteHeader`)도 스크롤 시 함께 흘러가는 일반 요소다. 즉 이 위젯이 이 사이트에 처음 도입되는 "뷰포트 고정 UI"이므로, 다른 고정 요소와의 z-index 충돌은 현재 없음(향후를 위해 §9에서 규칙만 남겨둠).

### 1-3. 광고 슬롯 — 실제 구현 없음 (계획만 존재)

`adsbygoogle` 스크립트(소유권 확인용)와 `public/ads.txt`만 존재하고, 실제 광고 유닛/사이드바 컴포넌트는 코드에 없다(애드센스 심사 대기 중). `design-system.md` §5-3은 "데스크톱 `lg` 이상에서 우측 사이드바 sticky 광고 1개"를 **계획**으로만 적어 두었고, §4 원칙 4번은 "좌측 콘텐츠(2/3) + 우측 사이드바(1/3) 2단 레이아웃 고려 가능"이라고 명시한다 — 즉 향후 광고 사이드바는 **`max-w` 컨테이너 안쪽**에 컬럼을 나누는 방식을 전제로 하고 있다(§9에서 이 전제를 유지하도록 제약을 건다).

### 1-4. 로고 자산 — 없음

`public/images/`에는 카테고리 아이콘(`icons/*.webp`)과 히어로 일러스트만 있고, 이 사이트를 포함해 4개 사이트 어디에도 전용 로고 그래픽이 없다(사용자 확인 사항). `next.config.ts`에는 `images.remotePatterns` 설정이 없어, 다른 도메인의 이미지를 `next/image`로 바로 못 불러온다.

### 1-5. 재사용 가능한 기존 UI 패턴

| 패턴 | 위치 | 이번 위젯에 재사용 |
|---|---|---|
| `<details>/<summary>`로 JS 없이 접고 펼치기 | `FaqAccordion.tsx`, `SalaryNetCalculator.tsx`(337행) | 모바일 FAB → 패널 펼침(§6) |
| `group` + `group-open:rotate-*`로 자식 스타일 전환 | 위와 동일 | (선택) FAB 아이콘 상태 전환 |
| raw Tailwind 팔레트 tint 배지(브랜드 토큰 아님) | `app/page.tsx`(`CATEGORY_ICON`), `BmiCalculator.tsx`(`STATUS_STYLES`) | 사이트별 이니셜 배지 색(§4) |
| "준비 중" 회색 배지(`bg-brand-bg text-brand-text-secondary`) | `CalculatorCard.tsx` | 대출모아 배지(§8) |
| 반응형은 JS 아니라 Tailwind 클래스로 두 버전 모두 SSR(`hidden ... sm:flex` 류) | `BlogPagination.tsx`(설계 문서 기준), `app/page.tsx` 히어로 이미지(`hidden ... lg:block`) | 데스크톱 레일 ↔ 모바일 FAB 전환(§5, §6) |
| 외부 도메인 링크 = `target="_blank" rel="noopener noreferrer"` | `app/privacy/page.tsx` | 4개 사이트 링크 전부(§2) |
| 포커스 링 3티어 | `lib/focusRing.ts` | §10 |

---

## 2. 데이터 모델 — 4개 사이트

```ts
// lib/cross-site-links.ts (신규 제안)

export type CrossSiteId =
  | "calculator-hub"
  | "realestate-hub"
  | "cheongryak-radar"
  | "loan-compare";

export interface CrossSiteLink {
  id: CrossSiteId;
  /** 전체 사이트명 — 모바일 패널·aria-label에 노출되는 풀네임 */
  name: string;
  /** 데스크톱 압축 레일용 축약 라벨 (좁은 폭에서 자연 줄바꿈 허용, 2줄 이내 권장) */
  shortLabel: string;
  /** 한 줄 설명 — 모바일 패널·title/aria-label에 사용 */
  description: string;
  /** 배포 전이면 null → 컴포넌트가 자동으로 "준비 중" 비활성 처리 */
  url: string | null;
  /** 배지 이니셜 1글자 */
  initial: string;
  badgeBg: string; // Tailwind 배경색 클래스
  badgeText: string; // Tailwind 텍스트색 클래스
  /** lib/calculators.ts의 CalculatorMeta.status와 동일 어휘 재사용(신규 어휘 발명 안 함) */
  status: "live" | "coming-soon";
}

// 순서 고정 — 4개 사이트 모두 이 순서 그대로 쓴다(이유는 §7 참고)
export const CROSS_SITE_LINKS: CrossSiteLink[] = [
  {
    id: "calculator-hub",
    name: "계산기 허브",
    shortLabel: "계산기 허브",
    description: "실생활 계산기 모음",
    url: "https://calculator-hub-delta.vercel.app",
    initial: "계",
    badgeBg: "bg-blue-100",
    badgeText: "text-brand-primary",
    status: "live",
  },
  {
    id: "realestate-hub",
    name: "부동산 실거래가 대시보드",
    shortLabel: "부동산 실거래가",
    description: "아파트 실거래가 조회",
    url: "https://realestate-hub-6n4n.vercel.app",
    initial: "부",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    status: "live",
  },
  {
    id: "cheongryak-radar",
    name: "청약레이더",
    shortLabel: "청약레이더",
    description: "청약홈·LH·SH 청약 캘린더/알림",
    url: "https://cheongryak-radar.vercel.app",
    initial: "청",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-700",
    status: "live",
  },
  {
    id: "loan-compare",
    name: "대출모아",
    shortLabel: "대출모아",
    description: "대출·금융·보험 비교 블로그",
    url: null, // 배포 후 값 채우면 자동으로 활성 링크로 전환됨(§8)
    initial: "대",
    badgeBg: "bg-brand-bg",
    badgeText: "text-brand-text-secondary",
    status: "coming-soon",
  },
];
```

| 사이트 | URL | 설명 한 줄 | 상태 |
|---|---|---|---|
| 계산기 허브 | `https://calculator-hub-delta.vercel.app` | 실생활 계산기 모음 | live (현재 사이트) |
| 부동산 실거래가 대시보드 | `https://realestate-hub-6n4n.vercel.app` | 아파트 실거래가 조회 | live |
| 청약레이더 | `https://cheongryak-radar.vercel.app` | 청약홈·LH·SH 청약 캘린더/알림 | live |
| 대출모아 | *(미배포)* | 대출·금융·보험 비교 블로그 | coming-soon |

컴포넌트는 어느 사이트에서 렌더링되는지 알아야 "현재 사이트"를 표시할 수 있으므로, 호출부에서 자기 자신의 id를 넘긴다:

```tsx
// app/layout.tsx 안에서
<CrossSiteNav currentSiteId="calculator-hub" />
```

다른 3개 사이트는 위 배열을 그대로 복사해 자기 코드베이스에 두고, `currentSiteId`만 자기 자신의 값으로 바꾸면 된다(§13).

---

## 3. 로고/배지 처리 방식 (판단 3)

**결론: 이미지 로고를 새로 만들지 않는다. 원형 이니셜 배지(색상으로 사이트 구분) + 텍스트 사이트명으로 간다.**

### 근거
1. **자산이 아예 없다.** 4개 사이트 모두 워드마크(텍스트)만 쓰고 있고 전용 로고 그래픽이 없다 — 지금 새로 만들면 "화면 구성안" 범위를 벗어난 브랜딩 작업이 되고, 4곳 모두에 맞는 톤을 통일하는 과정에서 각 사이트 팀 합의가 먼저 필요해 이번 작업 범위를 넘어선다.
2. **원격 이미지는 기술적 마찰이 있다.** `next/image`로 다른 도메인의 이미지를 불러오려면 `next.config.ts`에 `images.remotePatterns`를 등록해야 한다(현재 미설정). 4개 사이트가 서로의 로고를 실시간으로 불러오게 하려면 4곳 모두 이 설정을 추가해야 한다.
3. **로컬 복사는 "이식 가능하게"라는 목표와 어긋난다.** 로고를 각 사이트 `public/images/`에 파일로 복사해두는 방식은 사용자가 이미 우려한 "이미지 파일을 매번 복사해야 하는 번거로움" 그 자체다. 텍스트+CSS는 코드(마크업+클래스 문자열)만 복사하면 끝 — 파일 배포 과정이 없다.
4. **디자인 시스템과의 정합성.** `design-system.md`는 절제된 팔레트, 아이콘보다 텍스트/톤 중심의 구성을 지향한다. 이 사이트에는 SVG 아이콘 라이브러리도 없고(유니코드 글리프 `▾ ▸ ⌄ ⓘ`만 사용), `app/page.tsx`(카테고리 아이콘)와 `BmiCalculator.tsx`(상태 배지)에 이미 "원형 tint 배경 + 색 텍스트/아이콘" 배지 패턴이 검증돼 있다 — 새 패턴을 발명하지 않고 기존 패턴을 그대로 재사용한다.

### 배지 스펙
- 크기: 데스크톱 레일 32px(`h-8 w-8`), 모바일 패널 36px(`h-9 w-9`) — 다른 크기를 새로 정의하지 않고 기존 아이콘 배지 스케일(홈 48px, 이번 것은 더 좁은 레일에 맞춰 축소) 안에서 고른 값.
- 모양: `rounded-full`, 배경은 사이트별 `bg-X-100`, 텍스트는 `text-X-700`(`BmiCalculator.tsx`의 `bg-amber-100 text-amber-700` 등과 동일 페어링 비율 — 새 명도 조합 발명 안 함), 굵기 `font-bold`, 내용은 사이트명 첫 글자 1개.
- 색 대비: violet-700/teal-700처럼 어두운 텍스트를 밝은 100톤 배경에 올리는 조합은 이미 코드베이스에서 검증된 emerald-700/amber-700/red-700 페어링과 동일한 명도 프로파일이라 WCAG AA(4.5:1)를 통과할 것으로 판단한다. 실제 빌드 후 대비 측정 도구로 재확인 권장(수치를 손으로 보증하진 않음).
- 대출모아만 예외적으로 무채색(`bg-brand-bg text-brand-text-secondary`) — 색을 안 준 게 아니라 "아직 없음" 상태를 `CalculatorCard.tsx`의 "준비 중" 배지와 동일한 언어로 의도적으로 표현한 것(§8).
- 향후 실제 로고 그래픽이 생기면: 배지 자리(`<span className="badge">이니셜</span>`)를 `<Image src={logoUrl} .../>`로 바꾸기만 하면 되도록, 배지를 별도 `Badge` 하위 컴포넌트로 분리해 두는 것을 권장(교체 지점 최소화).

---

## 4. 데스크톱 레이아웃 스펙 (판단 1)

### 4-1. 폭 계산 — 왜 `xl`(1280px)이 안전한가

일반 공식(다른 사이트 팀도 자기 숫자로 다시 계산할 것 — §13):

```
필요한 최소 뷰포트 폭(V_min) = 그 사이트에서 가장 넓은 페이지 컨테이너 최대폭(C)
                              + 2 × (레일의 뷰포트 우측 오프셋 O
                                     + 레일 폭 W
                                     + 콘텐츠와의 최소 여백 목표 G)
```

계산기 허브 실측값: `C=1024px`(§1-1, `max-w-5xl`), `O=16px`(`right-4`), `W=80px`(`w-20`), `G=24px`(디자인 목표 최소 여백).

```
V_min = 1024 + 2 × (16 + 80 + 24) = 1024 + 240 = 1264px
```

Tailwind 기본 브레이크포인트 중 1264px 이상인 첫 값은 `xl`(1280px) → **`xl:` 이상에서만 레일을 노출**하면 안전하다. 1280px에서 실제 여유를 검증하면:

```
gutter(1280px) = (1280 − 1024) / 2 = 128px
레일 점유폭     = 16(오프셋) + 80(폭) = 96px
실제 여유       = 128 − 96 = 32px   ← 목표(24px)보다 8px 더 확보, 안전
```

`lg`(1024px)는 `gutter = 0px`(홈/카테고리가 정확히 뷰포트를 꽉 채움)이라 절대 불가하고, `2xl`(1536px)까지 올리면 1366×768·1440×900 같은 매우 흔한 노트북 해상도에서까지 위젯이 숨어 실효성이 떨어진다 — `xl`이 "충돌 없음"과 "실사용 노출 범위" 사이의 정확한 경계값이다.

> 이 좁은 80px 폭 레일(아이콘+짧은 라벨을 세로로 쌓는 구조, §4-2)을 택했기 때문에 `xl`이 가능하다. 만약 "배지+가로 풀네임"(예: "부동산 실거래가 대시보드" 한 줄, 약 170~200px 폭) 구조였다면 `V_min`이 1450px 근처까지 올라가 사실상 `2xl`까지 숨겨야 했을 것 — **폭을 줄이는 설계 자체가 1280px 문제를 푸는 핵심 결정**이다.

### 4-2. 컴포넌트 구조

```
CrossSiteNav (components/CrossSiteNav.tsx)
├── 데스크톱 레일 — <nav>, 기본 hidden, xl:flex
│    └── 4 × <li> 아이템 — 배지(원형, 위) + 축약 라벨(텍스트, 아래) 세로 스택
└── 모바일 FAB — <div>, 기본 표시, xl:hidden
     └── <details> (summary = FAB 원형 버튼, 펼침 콘텐츠 = 패널)
          └── 4 × <li> 행 — 배지 + 풀네임 + 설명 가로 배치
```

두 버전(레일/FAB) 모두 **서버에서 항상 함께 렌더링**하고 Tailwind 반응형 클래스(`hidden xl:flex` / `xl:hidden`)로 전환한다. `useEffect`+`matchMedia`류의 JS 뷰포트 감지는 쓰지 않는다 — 이 사이트가 `app/page.tsx`(히어로 이미지 `hidden ... lg:block`)에서 이미 쓰고 있는 방식과 동일하게, 하이드레이션 시 깜빡임/불일치가 없다.

### 4-3. 데스크톱 레일 — 코드 스펙

```tsx
<nav
  aria-label="관련 서비스 바로가기"
  className="fixed right-4 top-1/2 z-40 hidden max-h-[80vh] w-20 -translate-y-1/2
             flex-col gap-1 overflow-y-auto rounded-2xl border border-brand-border
             bg-brand-surface p-2 shadow-md xl:flex"
>
  <p
    aria-hidden="true"
    className="mb-1 px-1 text-center text-[10px] font-semibold uppercase tracking-wide
               text-brand-text-secondary"
  >
    관련 서비스
  </p>
  <ul className="flex flex-col gap-1">
    {CROSS_SITE_LINKS.map((site) => (
      <li key={site.id}>
        {/* 현재 사이트 / 준비 중 / 일반 링크 — 3가지 상태는 §7·§8 참고 */}
        <a
          href={site.url!}
          target="_blank"
          rel="noopener noreferrer"
          title={site.description}
          aria-label={`${site.name} — ${site.description} (새 탭에서 열림)`}
          className={`group flex w-16 flex-col items-center gap-1 rounded-xl border
                      border-transparent px-1 py-2 text-center transition-colors
                      hover:border-brand-border hover:bg-brand-bg
                      focus-visible:outline-hidden focus-visible:border-brand-primary
                      focus-visible:ring-4 focus-visible:ring-brand-primary/15`}
        >
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs
                        font-bold ${site.badgeBg} ${site.badgeText}`}
          >
            {site.initial}
          </span>
          <span className="w-full break-keep text-[11px] font-medium leading-tight
                            text-brand-text-secondary group-hover:text-brand-primary">
            {site.shortLabel}
          </span>
        </a>
      </li>
    ))}
  </ul>
</nav>
```

핵심 치수: 컨테이너 `w-20`(80px, `p-2`=8px 패딩 양쪽) → 아이템 `w-16`(64px, 딱 안쪽 폭에 맞음). 배지 `h-8 w-8`(32px). 라벨 `text-[11px]`, 자연 줄바꿈(가장 긴 이름 "부동산 실거래가"는 공백 기준으로 "부동산" / "실거래가" 2줄로 자연스럽게 접힘).

> **구현 시 주의(실제로 목업 제작 중 발견한 버그 1건)**: `.rail-item`은 `flex flex-col items-center`(세로 flex + 가운데 정렬)인데, `items-center`는 `stretch`가 아니라서 자식(라벨)의 폭을 부모에 맞춰 주지 않는다. 라벨 `<span>`에 폭을 지정하지 않으면 "부동산 실거래가"(공백 포함 8글자, 11px 기준 약 88px)가 부모 아이템 폭(64px)보다 넓어 **줄바꿈되지 않고 옆으로 삐져나온다.** 그래서 라벨에 반드시 `w-full`(부모의 안쪽 폭 56px에 맞춰짐)을 줘야 하고, 거기에 더해 `break-keep`(Tailwind 3.4+에서 추가된 `word-break: keep-all` 유틸리티, 이 프로젝트는 v4라 사용 가능)도 함께 줘야 "부동산 실거" / "래가"처럼 단어 중간이 아니라 "부동산" / "실거래가"처럼 띄어쓰기 기준으로 깨끗하게 줄바꿈된다. 이 조합은 `design/cross-site-nav-widget-mockup.html`에서 실제로 검증했다(§12).

포커스 링은 `lib/focusRing.ts`의 **Tier A(`FOCUS_RING_CARD`)** 그대로 재사용(위 코드의 `focus-visible:*` 클래스 4개가 정확히 그 상수의 값과 동일 — 실제 구현 시 상수 import로 대체):

```tsx
import { FOCUS_RING_CARD } from "@/lib/focusRing";
// className={`... ${FOCUS_RING_CARD}`}
```

### 4-4. `position: fixed`를 쓰는 이유 (`sticky` 아님 — 중요, 이식 시 꼭 읽을 것)

사용자 요구사항 "오른쪽에 고정, 스크롤해도 같이 움직임(sticky)"은 **의미상 sticky이지만 구현은 CSS `position: fixed`로 한다.**

- 진짜 CSS `position: sticky`는 자신을 감싸는 **부모 컬럼의 높이 안에서만** 붙어 있고, 부모가 끝나면 함께 스크롤되어 사라진다 — 즉 페이지 전체를 2단 컬럼(본문+사이드바 컬럼)으로 재구성해야 의미가 있다.
- 이 사이트를 포함해 4개 사이트 전부 지금은 **단일 중앙 정렬 컬럼**(`mx-auto max-w-*`) 구조라 2단 컬럼 부모가 없다. `sticky`를 쓰려면 계산기 상세·블로그·홈·카테고리 등 템플릿마다 레이아웃을 새로 짜야 해서 비용이 크고, 무엇보다 **"이식 가능하게"라는 목표와 정면으로 부딪힌다** — 다른 3개 사이트의 페이지 구조를 내가 알 수 없으므로, 그쪽 레이아웃 구조에 의존하지 않는 방식이어야 한다.
- `position: fixed`로 **뷰포트 자체**를 기준 삼으면 페이지 템플릿이 무엇이든(1단 컬럼이든 그리드든) 완전히 동일하게 동작한다. `SiteHeader`/`SiteFooter`처럼 레이아웃 최상위에 한 번 마운트하면 끝 — 이것이 진짜 이식 가능한 형태다.
- 부가 이점: 다른 사이트의 헤더가 자체적으로 sticky/fixed인지 여부(계산기 허브는 아님, 다른 3곳은 모름)와 **완전히 무관하게** 항상 동일하게 동작한다(§4-5).

### 4-5. 헤더와 겹치지 않는 이유

레일은 `top-1/2 -translate-y-1/2`로 **뷰포트 세로 중앙**에 위치한다. 헤더 높이(이 사이트는 64px, `h-16`)와 무관하게, 일반적인 뷰포트 높이(600px 이상)에서 레일(최대 높이 약 300px 이하, 4개 항목 기준)의 상단은 언제나 헤더보다 한참 아래에 위치한다. 헤더가 `sticky`로 바뀌어도(이 사이트는 아니지만, 다른 사이트가 그럴 수 있음) 레일의 위치 계산식 자체가 헤더 위치에 의존하지 않으므로 영향이 없다.

---

## 5. 모바일 레이아웃 스펙 (판단 2)

### 5-1. 왜 FAB인가 — 3가지 옵션 비교

| 옵션 | 상시 화면 잠식 | 입력 필드/버튼과 겹칠 위험 | 채택 |
|---|---|---|---|
| 하단 고정 가로 스트립 | **큼** — 모든 페이지에서 항상 48~64px 상시 점유 | **확정적** — 폭 100%라 스크롤 중 계산 버튼이 그 위치를 지나가면 반드시 겹침 | 기각 |
| 페이지 최하단(footer 인근) 배치만 | 없음 | 없음(레이아웃상 배치, fixed 아님) | 기각(아래 이유) |
| **플로팅 FAB(접힘) → 탭하면 펼침** | **작음** — 코너에 56px 원 1개만 | 작음(코너만 겹칠 수 있고, 겹침 완화 조치 적용 §5-3) | **채택** |

- **하단 스트립 기각 이유**: `design-system.md` §4 원칙 1번 "모바일 화면에서 입력→결과가 스크롤 없이 한 화면에 들어오는 것을 최우선 목표로 한다"와 정면으로 배치된다. 상시 노출 스트립은 매 페이지 뷰포트 높이를 영구히 깎아먹고, 폭이 100%라 계산 버튼과 겹치는 시나리오를 피할 방법이 없다.
- **"footer만" 기각 이유**: 겹침 위험은 0이지만, 사용자가 페이지 맨 아래까지 스크롤해야만 발견 가능해 실사용 시나리오("계산하다가 다른 사이트도 가본다")의 진입점으로는 너무 약하다. 이 위젯의 존재 목적 자체가 무의미해질 정도로 발견성이 낮다.
- **FAB 채택 이유**: 상시 점유가 원 1개(56px)뿐이라 §4 원칙 1번을 크게 해치지 않고, 코너 배치라 전체 폭을 가리지 않으며, 탭해서 펼치는 패널은 사용자가 명시적으로 열었을 때만 나타나 일시적 오버레이는 정책상 허용 범위(사용자가 원해서 연 상태 — 자동 팝업/인터스티셜과 다름, `design-system.md` §5 금지사항의 "화면 전체를 덮는 팝업"에도 해당 안 됨: FAB 패널은 화면 전체가 아니라 256px 폭 카드 1개다).

### 5-2. FAB — 코드 스펙

```tsx
<div
  className="fixed right-4 z-40 xl:hidden cross-site-fab"
  style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
>
  <details className="group relative">
    <summary
      aria-label="관련 서비스 바로가기"
      className="flex h-14 w-14 list-none items-center justify-center rounded-full
                 bg-brand-primary shadow-md transition-transform
                 marker:content-none [&::-webkit-details-marker]:hidden
                 focus-visible:outline-hidden focus-visible:ring-4
                 focus-visible:ring-brand-primary/30 active:scale-95"
    >
      <span aria-hidden="true" className="grid grid-cols-2 gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    </summary>

    <div
      className="absolute bottom-[calc(100%+0.75rem)] right-0 max-h-[70vh] w-64
                 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border
                 border-brand-border bg-brand-surface p-2 shadow-md"
    >
      <p className="mb-1 px-2 pt-1 text-xs font-semibold text-brand-text-secondary">
        관련 서비스
      </p>
      <ul className="flex flex-col">
        {CROSS_SITE_LINKS.map((site) => (
          <li key={site.id}>{/* §5-4의 행 마크업 */}</li>
        ))}
      </ul>
    </div>
  </details>
</div>
```

- 아이콘은 SVG가 아니라 흰 점 4개(2×2 그리드) — 앱/사이트 전환을 뜻하는 보편적인 "그리드" 기호이며, 이 사이트가 SVG 아이콘 라이브러리를 쓰지 않는 기존 관례(유니코드 글리프만 사용)와 맞춘 순수 CSS 구현이다.
- `<details>`라 열고 닫는 데 JS가 전혀 필요 없다 — `FaqAccordion.tsx`와 완전히 동일한 원리. 클릭 시 다시 닫히는 것도 네이티브 동작(별도 닫기 버튼 없음 — FAQ 아코디언도 별도 닫기 버튼이 없는 것과 동일한 일관성 있는 선택).
- 크기 56px(`h-14 w-14`)는 `design-system.md` §4 원칙 3번 "터치 타겟 최소 44×44px"을 여유 있게 초과.
- `env(safe-area-inset-bottom)`로 iPhone 하단 홈 인디케이터 영역을 피한다.
- 패널 폭 `w-64`(256px) + `max-w-[calc(100vw-2rem)]` 안전장치로 320px 폭 기기에서도 좌우 잘림 없음(320px 기준: 패널이 48px~304px 구간에 위치, 여유 있음).

### 5-3. 입력 UI와 겹치지 않는 대응 — 사용자가 "중요"로 표시한 요구사항

FAB는 코너에 떠 있는 구조라 원리적으로 "그 지점을 지나가는 콘텐츠"와 부분적으로 겹칠 수 있다(모든 FAB 패턴의 공통적 한계). 계산기 폼(예: `SalaryNetCalculator.tsx`의 `계산하기` 버튼은 카드 폭 100%)이 스크롤 중 우하단 코너 위치에 걸리면 버튼 우측 끄트머리 일부가 가려질 수 있다. 아래 조치로 실질적 위험을 최소화한다.

1. **크기를 작게, 코너에만.** 원 56px(전체 화면 폭 대비 대략 15~17%)만 차지하므로, 겹치더라도 버튼의 우측 끝 일부에 그친다 — 버튼 중앙(사용자가 실제로 탭하는 지점)은 항상 비어 있다.
2. **입력 중에는 자동으로 숨긴다(핵심 조치).** 입력 필드가 포커스를 받으면(가상 키보드가 올라와 화면이 가장 좁아지는 바로 그 순간) FAB를 페이드아웃한다 — 순수 CSS `:has()`로 JS 없이 구현 가능:

```css
/* globals.css 또는 별도 CSS 파일에 추가 */
body:has(main input:focus, main select:focus, main textarea:focus) .cross-site-fab {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
```

   `:has()`는 2026년 기준 Chrome/Edge/Safari/Firefox 전부 안정적으로 지원한다(Firefox 121, 2023-12 이후). 구형 브라우저까지 방어하려면 대안으로 각 계산기 폼에 `onFocus`/`onBlur`로 전역 상태 토글하는 JS 방식도 가능하나(기능 로직이라 개발팀 재량), **1차로는 CSS만으로 충분**하다고 판단한다.
3. **z-index를 콘텐츠보다는 위, 그러나 "시스템 급" 요소보다는 낮게.** `z-40` 사용(이 사이트 기존 최대 사용값은 `z-10`이라 여유 있게 위) — 브라우저 자체 UI(주소창 등)와는 무관.
4. **완전한 무해화는 이 구조에서 불가능하다는 점을 투명하게 남긴다.** 위 3가지 조치를 다 적용해도 "이론상 0% 겹침"은 FAB 패턴 자체의 특성상 보장할 수 없다(스트립 방식만 0%를 보장하지만 스트립은 §5-1에서 이미 기각). 실제 겹침 체감이 있으면(개발 완료 후 실기기 확인 단계에서) 코너를 좌측으로 옮기거나, FAB를 더 작게(48px) 줄이는 재조정을 다음 이터레이션에서 검토한다.

### 5-4. 패널 내부 행 — 코드 스펙 (일반 링크 상태)

```tsx
<a
  href={site.url!}
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors
             hover:bg-brand-bg focus-visible:outline-hidden focus-visible:ring-2
             focus-visible:ring-brand-primary focus-visible:ring-inset"
>
  <span
    aria-hidden="true"
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                text-sm font-bold ${site.badgeBg} ${site.badgeText}`}
  >
    {site.initial}
  </span>
  <span className="flex flex-col">
    <span className="text-sm font-semibold text-brand-text">{site.name}</span>
    <span className="text-xs text-brand-text-secondary">{site.description}</span>
  </span>
  <span className="sr-only">(새 탭에서 열림)</span>
</a>
```

포커스 링은 **Tier B-2(`FOCUS_RING_INSET`)** — `FaqAccordion.tsx`의 `<summary>`처럼 촘촘한 리스트 행에 쓰는 것과 동일 티어.

---

## 6. "현재 사이트" 표시 (판단 4)

### 정렬 순서는 절대 바꾸지 않는다

4개 항목은 **어느 사이트에서 보든 항상 같은 순서**(계산기 허브 → 부동산 실거래가 대시보드 → 청약레이더 → 대출모아, §2 배열 순서 그대로)로 보여준다. "현재 사이트를 맨 위로 재정렬"하지 않는다 — 사용자가 4개 사이트를 오가며 매번 똑같은 순서의 리스트를 보게 되는 것 자체가 "이 4개가 하나의 네트워크"라는 인지를 쌓는 데 중요하다고 판단했다. 재정렬하면 사이트마다 리스트 모양이 달라져 이 효과가 사라진다.

### 시각 처리 — 링크가 아닌 강조 상태로

현재 사이트 항목은 `<a>`가 아니라 `<div>`/`<span>`으로 렌더링하고(자기 자신을 클릭해도 아무 일도 안 일어나는 죽은 링크를 만들지 않기 위함), 아래처럼 차별화한다.

```tsx
// 데스크톱 레일 아이템(현재 사이트 버전)
<div
  aria-current="page"
  className="flex w-16 flex-col items-center gap-1 rounded-xl bg-blue-50 px-1 py-2 text-center"
>
  <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-brand-primary">
    계
  </span>
  <span className="text-[11px] font-semibold leading-tight text-brand-primary">계산기 허브</span>
  <span className="text-[9px] text-brand-text-secondary">현재</span>
</div>
```

- 배경 `bg-blue-50`(배지 색과 같은 계열의 옅은 톤)로 행 전체를 하이라이트 — hover 없이도 "여기 있다"는 게 항상 보임.
- 라벨을 `font-semibold text-brand-primary`로 올려 다른 3개(`text-brand-text-secondary`)와 구분.
- 아주 작은 "현재" 캡션 1줄 추가(모바일 패널에서는 "현재 사이트"로 완전한 단어 사용, 공간 여유 있음).
- `aria-current="page"` — `BlogPagination`에서 이미 쓰고 있는 현재 페이지 표기 관례(`aria-current={current ? "page" : undefined}`)와 동일한 어휘 재사용. 링크가 아니어도 이 속성은 유효하다(브레드크럼의 "현재 위치" 표기와 같은 표준 패턴).
- 포커스 대상에서 자연히 제외됨(인터랙티브 요소가 아니므로 `tabindex` 부여하지 않음 — 스크린리더/키보드 사용자가 눌러도 아무 반응 없는 요소에 도달하지 않도록 하는 게 맞는 처리).

---

## 7. 대출모아(미배포) 처리 (판단 5)

목록에서 빼지 않고 **포함하되 비활성 상태**로 넣는다.

### 왜 포함하는가
§6에서 정한 "4개 사이트 모두 항상 같은 순서로" 원칙과 같은 이유 — 나머지 3개 사이트 팀이 이 스펙을 그대로 이식할 때 데이터 배열이 동일해야 유지보수가 쉽고, 대출모아가 배포되는 순간 4곳 모두 데이터 1줄만 바꾸면 끝난다. 지금 빼두면 4곳 모두 "대출모아 배포됨" 시점에 배열 구조 자체를 다시 손봐야 한다.

### 왜 링크로 만들 수 없는가(기술적 이유, 취향 문제 아님)
아직 URL이 없다(Vercel 미배포). 다른 "coming-soon" 계산기(`CalculatorCard.tsx`)는 내부 스텁 페이지(`/calculator/[slug]`)가 실제로 존재해서 링크가 가능하지만, 대출모아는 걸어 둘 목적지 자체가 없다 — `href="#"`류의 가짜 링크를 만들면 접근성/UX 안티패턴이 된다. 따라서 링크가 아닌 상태로 만드는 것은 판단이 아니라 사실상 유일한 선택지다.

### 시각 처리

```tsx
// 데스크톱 레일 아이템(대출모아, coming-soon 버전)
<div className="flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center opacity-70">
  <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-bg text-xs font-bold text-brand-text-secondary">
    대
  </span>
  <span className="text-[11px] font-medium leading-tight text-brand-text-disabled">대출모아</span>
  <span className="text-[9px] text-brand-text-disabled">준비 중</span>
</div>
```

- 배지 색은 §3에서 이미 정한 대로 `bg-brand-bg text-brand-text-secondary`(=`CalculatorCard.tsx`의 "준비 중" 배지와 동일 토큰).
- 라벨 색을 `text-brand-text-disabled`(Gray 300)로 낮추고 컨테이너에 `opacity-70` — 대비가 낮아지는 건 의도된 것으로, WCAG상 비활성(disabled) 컨트롤은 일반 텍스트 대비 기준 예외 대상이다.
- "준비 중" 캡션 — `CalculatorCard.tsx`가 이미 쓰는 정확히 같은 단어("준비 중")를 재사용, 새 어휘 발명 안 함.
- `aria-disabled="true"`를 컨테이너에 추가하고, 링크가 아니므로 마찬가지로 tab 순서에서 자연히 제외.
- 모바일 패널 행도 동일 원칙(배지+이름+"준비 중" 배지, `<div>`, 클릭 불가) — 코드는 §6 데스크톱 버전과 좌우 배치만 다르고 상태 처리 로직은 동일.

### 배포 후 갱신 절차(투두, 지금 하는 작업 아님)
대출모아가 배포되면 `lib/cross-site-links.ts`에서 `url: null` → 실제 URL로, `status: "coming-soon"` → `"live"`로 바꾸면 컴포넌트가 자동으로 일반 링크(§4-3/§5-4 마크업)로 렌더링하도록 조건 분기를 짜 둘 것(개발팀 구현 시 참고).

---

## 8. 광고 레일과의 충돌 검토 (판단 6)

### 결론: 충돌 없음 — 서로 다른 "영역"을 쓰기 때문

| | 위치 기준 | 점유 영역 |
|---|---|---|
| 이 위젯(크로스 사이트 레일) | **뷰포트** 우측 끝에서 `right-4` | 컨테이너(`max-w-5xl`=1024px) **바깥쪽** 거터 |
| `design-system.md` §5-3 계획된 사이드바 광고 | §4 원칙 4번: "좌측 콘텐츠(2/3) + 우측 사이드바(1/3) 2단 레이아웃" | 컨테이너(1024px) **안쪽**을 2/3+1/3로 나눈 우측 1/3 (대략 x=683~1024 구간, 컨테이너 기준 상대 좌표) |

두 영역은 물리적으로 겹치지 않는다 — 하나는 컨테이너 밖(거터), 하나는 컨테이너 안(우측 컬럼)이다. 지금은 광고 사이드바가 실제로 구현되지 않았으므로(§1-3) 현재는 자명하게 충돌이 없고, **향후 구현될 때도** 이 분리가 유지되도록 아래 제약을 남겨 둔다.

### 향후 광고 구현 시 지켜야 할 제약 (개발팀/디자인팀 다음 작업자용)
1. 사이드바 광고는 `design-system.md` 원안대로 **컨테이너 내부의 2/3+1/3 컬럼 구조**로 구현한다(`position: fixed`/`sticky`로 뷰포트에 직접 앵커링하지 않는다). 이렇게 하면 이 위젯과 자동으로 영역이 분리된다.
2. 혹시 향후 어떤 이유로 광고를 뷰포트 고정형(예: 우측 하단 플로팅 배너 등)으로 검토하게 된다면, **뷰포트 우측 96~120px 구간(오프셋 16px + 위젯 폭 80px + 최소 여백)과 하단 우측 72×72px 구간(모바일 FAB 자리)은 비워 두어야 한다** — 이 문서 §4-1/§5-2의 치수 기준.
3. `design-system.md` §5 금지사항("광고와 콘텐츠 카드의 스타일을 유사하게 만들어 구분을 어렵게 하는 디자인 금지")은 이 위젯에도 반대 방향으로 적용된다 — 향후 광고가 이 위젯과 비슷한 카드/배지 스타일(흰 배경+테두리+원형 배지)을 쓰면 사용자가 광고를 "관련 서비스 목록"으로 착각할 수 있다. 광고는 반드시 "광고" 캡션 라벨과 시각적으로 다른 배경/여백을 유지해야 한다.

### 이 위젯 자체는 광고 정책과 무관
이 위젯은 광고가 아니라 사이트 소유자 본인이 운영하는 자매 사이트로의 내부 도메인 간 이동 링크다 — 다른 사이트의 푸터/헤더에 흔히 있는 "자사 서비스 더보기" 링크와 같은 성격으로, 애드센스의 클릭 유도 금지 규정과는 관련이 없다. 다만 시각적으로 "광고처럼 보이지 않게" 하는 것은 §3~§7에서 이미 다룬 절제된 배지/카드 스타일로 충분히 담보된다.

---

## 9. 접근성

- **랜드마크**: 데스크톱 레일·모바일 FAB 패널 모두 `<nav aria-label="관련 서비스 바로가기">`로 감싼다(둘 다 DOM엔 항상 존재하고 `hidden`/`display:none`으로 전환되므로, 화면에 보이는 하나만 접근성 트리에도 노출됨 — `BlogPagination`의 기존 반응형 패턴과 동일 원리라 별도 조치 불필요).
- **포커스 링**: 데스크톱 레일 아이템 = Tier A(`FOCUS_RING_CARD`), 모바일 패널 행 = Tier B-2(`FOCUS_RING_INSET`), FAB 버튼 자체 = Tier A 계열(원형이라 `rounded-full`이 이미 있어 링이 자동으로 원형을 따라감, 별도 rounded 오버라이드 불필요) — `lib/focusRing.ts`의 기존 3티어 분류를 그대로 재적용, 새 티어 없음.
- **키보드 동작**: `<details>/<summary>`는 네이티브로 Tab 포커스 + Enter/Space 토글을 지원한다(`FaqAccordion.tsx`가 이미 검증한 패턴) — 별도 키보드 핸들러 불필요.
- **새 탭 경고**: 스크린리더 사용자가 갑작스러운 컨텍스트 전환에 놀라지 않도록, 모든 활성 링크에 `sr-only` 텍스트("새 탭에서 열림")를 포함하거나 `aria-label`에 명시(§4-3, §5-4 코드 참고).
- **현재 사이트/준비 중 상태**: 둘 다 `<a>`가 아닌 비-인터랙티브 요소로 렌더링해 불필요한 탭 정지점을 만들지 않는다. 현재 사이트는 `aria-current="page"`, 준비 중은 `aria-disabled="true"`로 상태를 명시(§6, §7).
- **탭 순서 배치(중요)**: `<CrossSiteNav>`는 `app/layout.tsx`에서 **`{children}`(본문) 이후, `<SiteFooter />` 다음**에 마운트한다(시각적으로는 `position: fixed`라 어디에 둬도 같은 자리에 뜨지만, DOM 순서 = 탭 순서이므로 위치가 중요하다). 헤더 바로 뒤에 두면 모든 페이지에서 키보드 사용자가 실제 콘텐츠(계산기 입력 등)에 도달하기 전에 위젯의 4개 항목을 먼저 지나야 해 매 페이지 탭 비용이 늘어난다 — 본문 다음에 두면 "주요 콘텐츠 우선 도달"이 보장된다.
- **색 대비**: §3에서 다룬 배지 색상은 코드베이스에 이미 있는 페어링(예: `bg-emerald-100 text-emerald-700`)과 동일한 명도 프로파일을 재사용 — AA 통과로 판단하되 빌드 후 실측 재확인 권장.
- **모션**: FAB `active:scale-95`, hide-on-focus `transition-opacity` 모두 200ms 이하의 미세 전환이라 크게 문제되지 않으나, 더 보수적으로 가려면 `@media (prefers-reduced-motion: reduce)`에서 `transition`/`transform`을 끄는 것을 선택적으로 권장(필수 아님).

---

## 10. 컴포넌트/파일 변경 요약 (계산기 허브 적용 기준)

| 파일 | 상태 | 역할 |
|---|---|---|
| `lib/cross-site-links.ts` | **신규** | `CrossSiteLink` 타입 + `CROSS_SITE_LINKS` 배열(§2) — 다른 3개 사이트도 그대로 복사해 이식 |
| `components/CrossSiteNav.tsx` | **신규** | 데스크톱 레일(§4) + 모바일 FAB(§5)를 한 컴포넌트 안에 반응형 클래스로 함께 렌더링. `currentSiteId` prop 필수 |
| `app/layout.tsx` | **수정** | `<SiteFooter />` 다음에 `<CrossSiteNav currentSiteId="calculator-hub" />` 마운트(§9 탭 순서 이유로 이 위치) |
| `app/globals.css` (또는 신규 CSS 모듈) | **수정** | §5-3의 `:has()` 기반 "입력 중 FAB 숨김" 규칙 추가 |
| `lib/focusRing.ts` | 재사용(무수정) | `FOCUS_RING_CARD`, `FOCUS_RING_INSET` |

**신규 색 토큰 없음.** violet/teal은 Tailwind 기본 팔레트 클래스를 그대로 쓴 것이라(`app/globals.css`의 `@theme inline`에 아무것도 추가하지 않음) 이 부분도 "새 토큰 발명"에 해당하지 않는다.

---

## 11. 반응형 규칙 종합

| 항목 | ~1279px (모바일+태블릿, FAB) | 1280px~(`xl`, 데스크톱 레일) |
|---|---|---|
| 형태 | 우하단 FAB(56px 원) → 탭하면 패널 펼침 | 우측 뷰포트 중앙 고정 세로 레일(80px 폭) |
| 위치 기준 | `fixed right-4 bottom-4`(+ safe-area) | `fixed right-4 top-1/2 -translate-y-1/2` |
| 항목 표시 | 배지+풀네임+설명(가로) | 배지+축약 라벨(세로 스택) |
| 상시 화면 점유 | 원 56px 1개(코너) | 80×약260px(우측 거터, 콘텐츠와 32px 이상 이격) |
| 입력 필드 겹침 대응 | §5-3 — 입력 포커스 시 자동 숨김(`:has()`) | 해당 없음(거터에 있어 콘텐츠와 물리적으로 안 겹침) |
| 터치 타겟 | 56px(FAB), 패널 행 44px 이상 | 64×64px 이상(레일 아이템) |

> 참고로 이 위젯은 사이트의 일반 브레이크포인트 체계(모바일/`sm`/`md`/`lg`/`xl` 5단계, `design-system.md` §4)를 그대로 따르지 않고 **`xl` 1곳에서만 전환되는 2단계 구조**다. 이는 관례를 깬 게 아니라, §4-1의 충돌 회피 계산이 요구하는 최소 안전 폭이 정확히 `xl`이라서 나온 결과다 — `md`/`lg` 구간에서 별도의 "중간 형태"를 만들 필요/근거가 없다(1024px에서 거터가 0이 되므로, `lg`에서 레일을 절반만 보여주는 등의 절충안 자체가 성립하지 않는다).

---

## 12. 정적 목업

`design/cross-site-nav-widget-mockup.html` — 순수 HTML/CSS(JS 없음)로 만든 단일 파일. 브라우저로 직접 열어서:
1. 가짜 헤더 + 가짜 계산기 카드(입력 2개 + 전체 폭 "계산하기" 버튼) + 필러 콘텐츠로 구성된 모의 페이지 위에 실제 위젯을 얹어 확인.
2. 브라우저 창 폭을 1280px 위/아래로 조절하면 데스크톱 레일 ↔ 모바일 FAB 전환이 실제로 일어남(§4-1 계산 검증용).
3. 모바일 폭에서 가짜 입력 필드를 클릭하면 FAB가 실제로 페이드아웃됨(§5-3 `:has()` 규칙 동작 확인용).
4. "현재 사이트"(계산기 허브, 파란 하이라이트)와 "준비 중"(대출모아, 회색 처리) 상태 모두 시각적으로 포함.

이 파일의 CSS는 Tailwind 클래스와 1:1 대응하는 raw CSS로 작성해, Tailwind를 쓰지 않는 팀도 값만 그대로 옮겨 쓸 수 있게 했다(§13 이식 가이드의 변환표와 동일 값 사용).

---

## 13. 다른 3개 사이트 팀을 위한 이식 가이드

### 13-1. 그대로 복사해도 되는 것 (범용)
- 전체 구조: 데스크톱은 "뷰포트 우측 고정 + 세로 중앙(`top:50%; transform:translateY(-50%)`) + 배지 위/라벨 아래 세로 스택 아이템", 모바일은 "코너 FAB(원형) + 탭하면 펼쳐지는 패널".
- `position: fixed` 채택 이유(§4-4) — 페이지 레이아웃 구조(1단/2단 컬럼)에 의존하지 않기 위함이므로, 어느 사이트든 동일하게 적용 가능.
- 데이터 구조(`CrossSiteLink` 인터페이스, §2)와 4개 사이트 데이터 배열 자체 — 4곳 모두 완전히 동일한 배열을 쓰고 `currentSiteId`만 자기 것으로 바꾼다. (운영 팁: 지금은 4곳에 각자 하드코딩하는 것으로 충분하다. 사이트가 늘어나거나 설명 문구를 자주 바꾸게 되면, 그때 가서 하나의 공유 소스—예: 공개 JSON을 각 사이트가 빌드 타임에 fetch—로 전환을 검토해도 늦지 않다.)
- 로고 처리 방식(이니셜 원형 배지 + 텍스트, §3) — 이미지 자산이 없는 다른 3곳도 동일한 이유(자산 없음, 이식 비용)가 그대로 적용된다.
- "4개 항목 항상 전부, 항상 같은 순서" 원칙(§6) — 순서를 자기 사이트 기준으로 바꾸지 말 것.
- 입력 필드 포커스 시 FAB 숨김(`:has()` 규칙, §5-3) — 폼이 있는 사이트(예: 청약 알림 신청 폼이 있을 청약레이더, 대출 비교 필터가 있을 대출모아)라면 특히 중요하게 적용할 것.
- 접근성 원칙(§9) 전체.

### 13-2. 반드시 자기 사이트 값으로 다시 계산해야 하는 것
1. **컨테이너 최대폭(C)** — §4-1 공식의 `C`. 자기 사이트에서 가장 넓은 페이지 컨테이너의 실제 `max-width`를 직접 확인(그리드/테이블이 있는 대시보드형 사이트라면 계산기 허브의 1024px보다 훨씬 넓을 수 있다). 다시 `V_min` 공식에 대입해 어느 브레이크포인트부터 레일을 노출할지 재계산할 것 — `xl`(1280px)을 그대로 베끼지 말 것.
2. **컨테이너 구조가 아예 없는 경우(엣지-투-엣지 레이아웃)**: `max-w` 중앙 정렬 컨테이너가 없고 콘텐츠가 뷰포트 전체 폭을 쓰는 페이지(예: 넓은 데이터 테이블 대시보드)라면, "거터에 넣기" 전략 자체가 성립하지 않는다. 이 경우 두 가지 대안: (a) 레일이 나타나는 브레이크포인트에서만 `body`/루트 레이아웃에 `padding-right`를 미리 확보해 의도적으로 여백을 만들거나, (b) 레일을 아예 그 사이트에서는 도입하지 않고 모바일과 동일하게 FAB만 전 구간에 쓴다.
3. **디자인 토큰 이름** — 이 문서의 `bg-brand-surface`/`text-brand-text-secondary`/`border-brand-border` 등은 계산기 허브의 토큰명이다. 각자 사이트의 "카드/서피스 배경색", "테두리색", "본문보조텍스트색"에 대응하는 자기 토큰으로 치환할 것. 배지에 쓰는 violet/teal 같은 raw 팔레트 색도 자기 사이트 브랜드 색과 시각적으로 부딪히지 않는지(예: 자기 사이트의 "위험/경고" 색과 겹치지 않는지, §3 계산기 허브가 amber/red를 피한 이유와 동일한 논리) 다시 점검할 것.
4. **자기 사이트 헤더가 sticky/fixed인지 여부** — §4-5에서 설명했듯 뷰포트 중앙 정렬 방식이라 원칙적으로 무관하지만, 헤더가 매우 두껍거나(예: 대시보드형 사이트의 필터바 포함 헤더) 특이한 구조라면 레일 상단 여백(`top-1/2` 대신 고정 `top` 오프셋)을 재검토할 것.
5. **z-index** — 자기 사이트에 이미 쓰고 있는 다른 `z-*` 값(모달, 토스트, 드롭다운 등)을 먼저 확인하고, 이 위젯의 `z-40`이 그것들과 충돌하지 않는지 확인할 것.
6. **Tailwind 미사용 시** — 아래 변환표로 그대로 옮길 것(값은 계산기 허브 실측 기준, mockup 파일과 동일).

### 13-3. Tailwind → raw CSS 변환표 (Tailwind 안 쓰는 팀용)

| Tailwind 클래스 | raw CSS |
|---|---|
| `right-4` / `bottom-4` | `right: 1rem;` / `bottom: 1rem;` (16px) |
| `top-1/2 -translate-y-1/2` | `top: 50%; transform: translateY(-50%);` |
| `w-20` | `width: 5rem;` (80px) |
| `w-16`(레일 아이템) | `width: 4rem;` (64px) |
| `w-64`(모바일 패널) | `width: 16rem;` (256px) |
| `h-14 w-14`(FAB) | `height: 3.5rem; width: 3.5rem;` (56px) |
| `h-8 w-8`(레일 배지) / `h-9 w-9`(패널 배지) | `2rem`(32px) / `2.25rem`(36px) |
| `rounded-2xl` | `border-radius: 1rem;` (16px) |
| `rounded-full` | `border-radius: 9999px;` |
| `gap-1` | `gap: 0.25rem;` (4px) |
| `p-2` | `padding: 0.5rem;` (8px) |
| `shadow-md` | `box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);` |
| `z-40` | `z-index: 40;` |
| `xl:` (1280px) | `@media (min-width: 1280px) { ... }` (단, §13-2-1에 따라 자기 사이트 값으로 재계산 후 다른 값일 수 있음) |

---

## 14. 마스터 확인이 필요할 수 있는 지점 (진행은 하되 이견 있으면 회수 가능하도록 기록)

아래는 큰 브랜딩 방향 변경이 아니라고 판단해 마스터 사전 확인 없이 진행했지만, 취향이 갈릴 수 있는 지점이라 명시해 둔다 — 이견 있으면 쉽게 되돌릴 수 있다.

1. **로고를 이미지가 아닌 텍스트+배지로 결정한 것(§3)** — 4개 사이트 다 로고 자산이 없다는 사실 확인에 근거한 실무적 판단이라 이 사이트 자체의 브랜딩을 바꾸는 건 아니지만, 4개 사이트 "네트워크"의 첫인상을 정하는 결정이라 마스터가 다른 방향(예: 지금 로고를 새로 제작)을 원할 수 있다.
2. **모든 링크를 새 탭(`target="_blank"`)으로 여는 것** — 이 사이트의 기존 외부 링크 관례(개인정보처리방침의 Google 링크 등)를 그대로 따른 것이지만, 자매 사이트 이동은 "완전히 다른 사이트로 나가는 것"보다는 "사이트 전환"에 가까워 같은 탭이 더 자연스럽다는 의견도 있을 수 있다. 코드 한 줄(`target="_blank"` 제거) 변경으로 되돌릴 수 있다.
3. **UTM 파라미터를 붙이지 않은 것** — 이번 스펙에는 포함하지 않았다. 크로스 사이트 유입 효과를 데이터로 보고 싶다면 각 사이트 `url`에 `?utm_source=<발신사이트id>&utm_medium=cross_site_nav`를 붙이는 것을 다음 이터레이션에서 검토할 수 있다(화면에는 영향 없는 순수 URL 변경이라 언제든 추가 가능).

---

## 다음 단계 (제안)

- 이 스펙대로 개발팀이 `components/CrossSiteNav.tsx`/`lib/cross-site-links.ts`를 구현하면, 데스크톱(1280px 이상 실제 뷰포트)과 모바일(375px 등) 양쪽에서 실제 화면을 열어 §4-1의 32px 여유, §5-3의 입력 포커스 시 FAB 숨김이 실측대로 동작하는지 검수한다(디자인팀 역할 ②).
- 대출모아가 배포되면 §8의 갱신 절차대로 데이터 1줄만 바꾸는 것을 놓치지 않도록, 배포 시점에 마스터가 4개 사이트 팀 모두에게 리마인드할 것을 제안한다.
- 다른 3개 사이트 팀은 §13을 참고해 이식하되, §13-2의 5가지 항목(컨테이너 폭, 토큰명, 헤더 구조, z-index, Tailwind 여부)은 반드시 자기 사이트 기준으로 다시 확인할 것 — 이 문서의 숫자를 그대로 베끼면 계산기 허브에서는 안전해도 다른 사이트에서는 충돌할 수 있다.
