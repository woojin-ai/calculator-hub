# /about 페이지 — UI 구성안 (v1.0, 2026-07-10)

> 대상: 신규 정적 페이지 `/about` (`cs/static-pages-checklist.md`의 "사이트 소개" 항목)
> 현재 `app/about` 라우트는 존재하지 않는다(확인 완료) → 개발팀이 아직 화면을 만들지 않은
> 상태에서 디자인팀이 먼저 구성안을 작성하는 정상 순서다.

본 문서는 `design/design-system.md`를 그대로 따르며, 코드는 작성하지 않는다. 개발팀이 본
문서를 참고해 `app/about/page.tsx`(신규)를 구현한다.

---

## 0. 현황 확인 (설계 전제)

- `components/SiteHeader.tsx`의 `NAV_ITEMS`에는 카테고리 4개 + 블로그만 있고 `/about` 링크 없음.
- `components/SiteFooter.tsx`는 카피라이트 문구 1줄뿐이며 어떤 페이지로도 링크가 없음.
- `/privacy`, `/terms`, `/contact` 역시 아직 미구현(`cs/static-pages-checklist.md` 참고).
  이 문서는 `/about`의 화면만 다루되, "문의 페이지 링크"가 스펙에 포함되어 있으므로 `/contact`가
  존재한다는 전제로 작성한다(문의 페이지 자체의 화면 구성안은 이 문서 범위 밖).

---

## 1. 페이지 레이아웃 구조 (와이어프레임 순서)

```
[히어로 섹션] 사이트 소개 제목 + 리드 문단
──────────────────────────────
[제공 계산기 카테고리 요약] 4개 카테고리 카드 그리드
──────────────────────────────
[문의 안내 블록] 안내문 + "문의하기" 버튼(→ /contact)
──────────────────────────────
[선택: 하단 광고 1개]
```

---

## 2. 히어로 섹션

- 컨테이너: `mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14` (기존 홈페이지와 동일 컨테이너 폭
  유지 — 페이지마다 폭이 달라지면 전체 사이트 톤이 흔들리므로).
- 제목/리드 텍스트 블록만 `max-w-2xl`로 좁혀 가독성 확보(긴 문단이 전체 폭으로 퍼지지 않도록).
- H1: "계산기 허브 소개" — `text-2xl font-bold sm:text-[2rem] text-brand-text`
  (기존 페이지들과 동일한 Display 스케일 처리 패턴)
- 리드 문단: `mt-2 text-sm text-brand-text-secondary sm:text-base leading-relaxed`,
  1~2문장 tagline (카피는 콘텐츠팀/기획팀 담당, 예: "계산기 허브는 만 나이, 연봉 실수령액,
  대출 이자 등 실생활에 자주 필요한 계산을 누구나 무료로, 빠르게 이용할 수 있도록 만든
  사이트입니다.")
- 정렬: 홈페이지 히어로와 동일하게 `text-center sm:text-left` 패턴 유지(사이트 전체 통일성).
- 배경: 별도 이미지/그라디언트 배너 없음 — 기본 `bg-brand-bg` 유지. 이미지 히어로는 로딩속도
  우선 원칙(애드센스 승인 조건: 빠른 로딩)에 배치되므로 넣지 않는다. 톤앤매너를 바꾸는 결정이
  아니라 "안 넣는" 쪽이므로 별도 마스터 확인 불필요.

---

## 3. 제공 계산기 카테고리 요약

### 3-1. 기존 컴포넌트 재사용 가능 여부 검토

| 컴포넌트 | 재사용 가능? | 사유 |
|---|---|---|
| `CategoryPage.tsx` | 불가 | "카테고리 1개 상세" 전용(특정 `category` prop 하나의 계산기 목록을 그림). about은 4개 카테고리를 "요약"해야 하므로 목적이 다름 |
| `CalculatorCard.tsx` | 불가(단위 부적합) | 개별 계산기 1개 링크 카드. about에서 쓰기엔 단위가 너무 세분화됨(계산기 12개 전부 나열은 부적절) |
| `app/page.tsx`(홈)의 "카테고리" 섹션 인라인 마크업 | **가능(권장)** | 카테고리 4개를 요약 카드로 보여주는 목적이 정확히 일치. 다만 현재 별도 컴포넌트로 추출되어 있지 않고 홈페이지 파일 안에 인라인으로 작성되어 있음 |

**제안:** 홈페이지의 해당 마크업을 `components/CategoryCard.tsx`로 추출해 홈페이지와 about
페이지가 함께 재사용하도록 리팩터링할 것을 권장한다. 이는 기능 변경이 아니라 기존 스타일을
그대로 유지한 채 구조만 재사용 가능하게 만드는 것이므로 디자인 톤 변경에 해당하지 않는다.
채택 여부(리팩터링 vs about 페이지에 동일 마크업 복제)는 개발팀 판단에 맡긴다.

### 3-2. 카드 스펙 (기존 그대로)

- 카드: `flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-surface p-5`,
  hover 시 `hover:border-brand-primary hover:shadow-md`, 전체가 `Link`(→ `/{category}`)
- 제목: `text-base font-semibold text-brand-text`
- 설명: `text-xs leading-relaxed text-brand-text-secondary`
- 하단 캡션: "라이브 계산기 n개" 또는 "준비 중" — `text-xs text-brand-text-secondary`
- 그리드: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4` (홈페이지와 동일 — 카테고리가
  4개 고정이므로 `lg`에서 4열이 자연스럽게 꽉 참)
- 섹션 제목: "제공 중인 계산기 카테고리" — `text-xl font-bold text-brand-text mb-4` (Heading 1
  스케일, 다른 섹션 제목과 동일 톤)

---

## 4. 문의 안내 블록

- 위치: 카테고리 섹션 다음, `mt-10`(40px) 간격.
- 구성: 좌측(또는 위) 안내 문구 + 우측(또는 아래) "문의하기" 버튼.
  - 모바일(`grid-cols-1` 취급): 세로 스택, 버튼 `w-full`
  - `sm` 이상: `flex items-center justify-between gap-4` 가로 배치
- 컨테이너: `rounded-xl border border-brand-border bg-brand-surface p-5 sm:p-6` (다른 섹션과
  달리 하나의 카드로 감싸 "안내 블록"임을 시각적으로 구분)
- 안내 문구: `text-sm text-brand-text-secondary` — 예: "찾으시는 계산기가 없거나 계산 결과에
  오류를 발견하셨나요?" (카피는 기획팀)
- 버튼 "문의하기" (→ `/contact`): **아웃라인 스타일**로 제안 —
  `h-11 rounded-lg border border-brand-primary px-5 text-sm font-semibold text-brand-primary
  transition-colors hover:bg-blue-50`
  - 계산기 페이지의 "계산하기" 버튼(solid `bg-brand-primary`)과 위계를 구분하기 위한 의도적
    선택: about은 콘텐츠/탐색 페이지이므로 solid Primary 버튼은 실제 계산 액션용으로 예약해
    두고, 여기서는 outline 버튼을 사용해 "보조 액션"임을 시각적으로 알린다.

---

## 5. 반응형 요약

| 브레이크포인트 | 히어로 정렬 | 카테고리 그리드 | 문의 블록 |
|---|---|---|---|
| 기본(모바일) | 중앙(`text-center`) | 1열 | 세로 스택, 버튼 전체 폭 |
| `sm`(640px~) | 좌측(`sm:text-left`) | 2열 | 가로 배치 시작 |
| `lg`(1024px~) | 좌측 | 4열 | 가로 배치 유지 |

---

## 6. 광고 배치

`/about`은 저트래픽·정보성 정적 페이지로 애드센스 수익 기여도가 낮고, 반대로 "얇은 콘텐츠로
오인되지 않게 정보성 콘텐츠를 유지"하는 것이 더 중요한 페이지다. 따라서:

- 광고 배치 **우선순위 낮음** — 넣지 않아도 무방.
- 넣는다면 문의 안내 블록과 푸터 사이, **1개만**, `text-xs text-brand-text-secondary`로
  "광고" 캡션 라벨 표기, 문의 버튼과 30px 이상 이격(design-system.md 5번 "버튼 근처 30px
  이내 광고 금지" 원칙 적용 — about 페이지의 CTA 버튼도 동일 기준 적용).
- 카테고리 카드 그리드 내부/사이에는 광고 삽입 금지 (계산기 카드와 혼동 위험).

---

## 7. 내비게이션 보강 제안 (참고 — 톤앤매너 변경 아님, 구조 제안)

`/about` 페이지가 만들어져도 헤더·푸터 어디에도 링크가 없으면 사용자가 우연히 URL을 알지
못하는 한 도달할 방법이 없다. 다음을 제안한다.

- **헤더에는 추가하지 않는다.** `SiteHeader`의 `NAV_ITEMS`는 핵심 기능(카테고리) 탐색에
  집중된 상태를 유지하는 것이 좋고, 정적/정책 페이지를 카테고리와 나란히 두면 내비게이션
  우선순위가 흐려진다.
- **`SiteFooter.tsx`에 링크 행을 추가**할 것을 제안한다 (일반적인 사이트 구조 관례이며,
  `/privacy` `/terms` `/contact`가 함께 생기는 시점에 한 번에 반영하는 것을 권장):
  - 배치: 기존 카피라이트 문구 위에 `flex flex-wrap gap-4 text-sm text-brand-text-secondary`
    링크 행 추가, 각 링크 `hover:text-brand-primary`, 터치 영역 확보를 위해 `py-2` 정도의
    세로 padding.
  - 링크 구성: "사이트 소개"(`/about`) · "문의하기"(`/contact`) · "개인정보처리방침"(`/privacy`) ·
    "이용약관"(`/terms`)
  - **주의**: `/privacy`, `/terms`, `/contact`는 아직 미구현이므로, 이 링크 행은 해당 페이지가
    실제로 만들어지는 시점에 함께 추가해야 한다(404 방지). `/about`만 먼저 완성된다면 우선
    "사이트 소개" 링크 1개만 추가하는 것도 가능.

이 변경은 큰 톤앤매너 변경이 아니라(색상/타이포/레이아웃 톤 유지) 누락된 내비게이션 구조를
채우는 것이므로 마스터 팀장 사전 확인 필수 항목은 아니라고 판단한다. 다만 실제 반영 여부는
개발팀·마스터 판단에 맡긴다.

---

## 8. 다른 팀 전달 사항

**개발팀 전달 사항**
- `app/about/page.tsx` 신규 구현 (1~4장 스펙 참고), 메타데이터는 기존 페이지 패턴
  (`export const metadata`)과 동일하게 title/description 설정
- 카테고리 요약 섹션: 홈페이지 인라인 마크업 재사용 또는 `components/CategoryCard.tsx` 추출
  (3-1 참고, 판단은 개발팀 재량)
- 문의 버튼은 `/contact` 라우트가 실제 존재해야 정상 작동 — `/contact` 페이지 착수 시점과
  조율 필요 (`docs/team-log/2026-07-09.md`에 "`/contact`는 실제 문의 채널 미연동" 이슈가
  이미 기록되어 있음, 이 문서 범위 밖이나 참고)

**기획팀 확인 요청**
- 히어로 리드 문단, 카테고리 섹션 소개 문구, 문의 안내 문구 등 실제 카피 작성 필요 (본
  문서는 자리와 톤만 지정)

**마스터 팀장 참고 (확인 필수 아님, 공유 목적)**
- 7장 "SiteFooter 링크 추가" 제안은 `/privacy` `/terms` `/contact` 착수 여부와 맞물려 있어
  전체 정적 페이지 일정과 함께 조율되면 좋겠다는 의견.
