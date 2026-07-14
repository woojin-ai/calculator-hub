# 계산기 허브 — focus-visible(키보드 포커스) 링 일관화 UI 스펙 (v1.0, 2026-07-15)

> 디자인팀 작성. 실제 코드는 개발팀이 이 스펙 그대로 구현한다. 본 문서는 코드가 아니다.
> 대상: **기존 인터랙티브 요소의 키보드 포커스 표시 일관화** (신규 화면 아님).
> 기준: 라이트 단일 테마. 스택: **Next 16.2 + Tailwind v4**(`@import "tailwindcss"` / `@theme`).
> 근거 기준: WCAG 2.1 **2.4.7 Focus Visible (AA)**.

---

## 0. 문제 요약

현재 모든 네비/카드/토글 인터랙티브 요소(`<a>`=`<Link>`, `<summary>`)에 **포커스 스타일이 전무**하다.
키보드(Tab) 사용자는 브라우저 기본(UA) 아웃라인에만 의존하는데, 요소마다 `rounded-xl`/`rounded-md`·배경색이 달라 기본 아웃라인이 잘리거나 잘 안 보인다. WCAG 2.4.7 갭이다.

반면 **폼 인풋은 사이트 전역이 동일한 포커스 언어**를 이미 쓴다(예: `SalaryNetCalculator.tsx`, `DsrCalculator.tsx`, `UnitConverter.tsx` 등 전부):

```
outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15
```

즉 **브랜드 컬러 border 색전환 + 4px 링 @ 15% 투명도**가 사이트의 포커스 언어다.
이번 작업은 이 언어를 링크/토글류로 **요소 형태에 맞게** 확장하는 것이다. 새 색·값을 발명하지 않는다.

---

## 1. 결정 ① `focus:` 가 아니라 `focus-visible:` 를 쓴다 (링크·토글류)

- **인풋은 기존대로 `focus:` 유지.** 인풋은 클릭·터치로 진입해도 캐럿이 들어오면 링이 뜨는 게 자연스럽다(입력 위치 신호).
- **네비/카드/토글 링크류는 `focus-visible:` 를 쓴다.** 이유:
  - 마우스 클릭·터치 탭으로 링크를 누르면 그 요소가 `:focus` 상태가 되는데, 여기에 `focus:` 링을 달면 **클릭할 때마다 파란 링이 남아** 거슬리고 "왜 눌린 채 남지?"라는 오해를 준다.
  - `:focus-visible` 는 브라우저 휴리스틱상 **키보드 이동(Tab) 등 "포커스 표시가 필요한" 경우에만** 매칭된다. 마우스 클릭/터치로는 매칭되지 않는다. → 키보드 사용자에겐 명확한 링, 포인터 사용자에겐 잔상 없음. 이것이 링크류 접근성 베스트프랙티스다.
- Tailwind v4는 `focus-visible:` variant를 정식 지원한다.

---

## 2. 결정 ② 요소 형태별 최종 클래스 (2-티어 시스템)

인풋 포커스 언어는 **두 신호의 합**이다: ① `border-brand-primary`(테두리 색을 브랜드블루로 = 강한 대비 신호) + ② `ring-brand-primary/15`(부드러운 브랜드 글로우). 15% 링만으로는 대비가 약해 단독 지표로는 부족하고, **강한 신호는 border 색전환이 담당**한다.

따라서 대상 요소를 **테두리 유무**로 나눠 두 티어로 처리한다.

### 티어 A — "테두리 있는 카드" (인풋 언어를 그대로 복제)
카드는 이미 `border border-brand-border` 를 갖고 있으므로 인풋과 **완전히 동일한** 포커스 언어를 쓴다. border 색전환이 강한 신호, /15 링이 글로우.

```
focus-visible:outline-hidden focus-visible:border-brand-primary focus-visible:ring-4 focus-visible:ring-brand-primary/15
```

- 대상: `CalculatorCard.tsx`, `BlogPostCard.tsx`
- **ring-offset 안 씀.** 인풋이 offset 없이 border에 링을 붙이는 언어라, 카드에 offset을 주면 인풋과 어긋난다. 카드는 인풋과 시각적으로 이어지는 게 우선 → **offset 미사용 확정**. (참고: offset 링도 레이아웃은 밀지 않지만, 여기선 미관·일관성 이유로 배제.)

### 티어 B — "테두리 없는 인라인/알약/토글" (링이 유일한 지표)
헤더 nav, 푸터 링크, summary는 자기 테두리가 없어 border 색전환 신호를 쓸 수 없다. 이때는 **링 자체가 지표**여야 하므로 15% 투명 링(대비 부족)이 아니라 **동일 브랜드 색의 solid 2px 링**을 쓴다. 색 토큰은 그대로 `brand-primary`, 형태만 요소에 맞게 solid·thin으로 조정한다("요소별 형태에 맞게").

**B-1. 여백 있는 요소(헤더 nav 알약 / 푸터 링크): outset 링**
```
focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary
```
- 헤더 nav 알약(`rounded-md`)·푸터 링크 둘 다 주변 여백(헤더 `gap-1~2`, 푸터 `gap-4`)이 충분해 바깥으로 뻗는 2px 링이 잘리지 않는다. 알약은 `rounded-md`를 따라 링이 둥글게 그려진다.

**B-2. 촘촘한 컨테이너 안의 행(FAQ summary): inset 링**
```
focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset focus-visible:rounded-md
```
- `FaqAccordion`의 `summary`는 `divide-y`로 나뉜 bordered 컨테이너 내부의 **full-width 행**이라, 바깥으로 뻗는 링을 쓰면 구분선(divider)·컨테이너 border와 겹쳐 지저분하다. → **`ring-inset` 으로 링을 행 안쪽에 그린다.**
- summary는 자체 radius가 없어 링이 직각이 되므로 `focus-visible:rounded-md`(포커스 시에만 모서리 둥글게, 레이아웃 무영향)를 더해 카드 언어와 톤을 맞춘다.

### 요소별 최종 클래스 표

| # | 파일 | 요소 | 티어 | 붙일 focus-visible 클래스(추가분) |
|---|---|---|---|---|
| 1 | `components/CalculatorCard.tsx` | 카드 `<Link>` (`rounded-xl border`) | A | `focus-visible:outline-hidden focus-visible:border-brand-primary focus-visible:ring-4 focus-visible:ring-brand-primary/15` |
| 2 | `components/BlogPostCard.tsx` | 카드 `<Link>` (`rounded-xl border`) | A | `focus-visible:outline-hidden focus-visible:border-brand-primary focus-visible:ring-4 focus-visible:ring-brand-primary/15` |
| 3a | `components/SiteHeader.tsx` | 로고 `<Link>` (인라인 텍스트, 배경 없음) | B-1 | `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:rounded-md` |
| 3b | `components/SiteHeader.tsx` | nav `<Link>` 알약 (`rounded-md`) | B-1 | `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary` |
| 4 | `components/SiteFooter.tsx` | 푸터 `<Link>` (인라인 텍스트) | B-1 | `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:rounded-md` |
| 5 | `components/FaqAccordion.tsx` | `<summary>` (full-width 토글 행) | B-2 | `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset focus-visible:rounded-md` |

> 3a 로고와 4 푸터 링크는 자체 radius가 없어 `rounded-md`를 함께 넣어 링 모서리를 둥글게 한다(포커스 시에만 적용, 레이아웃 무영향). 3b nav 알약은 이미 `rounded-md`라 불필요.

---

## 3. 결정 ③ `outline-hidden` 을 쓰고 `outline-none` 은 쓰지 않는다 (Tailwind v4 주의)

**언제 UA 아웃라인을 끄나:** 위 표처럼 **커스텀 링(그리고 카드는 border 색전환)을 직접 넣는 경우에만** UA 아웃라인을 끈다. 커스텀 지표를 안 넣는 요소에서 기본 아웃라인을 제거하는 것은 접근성 후퇴이므로 **절대 금지**. 이번 대상은 전부 커스텀 지표를 넣으므로 전부 아웃라인 억제 대상이다.

**중요 — v4에서 `outline-none` 의미가 바뀌었다:**
- Tailwind v4의 `outline-none` = `outline-style: none` (완전 제거). forced-colors(Windows 고대비) 모드 대비책 없음.
- Tailwind v4의 `outline-hidden` = 평상시엔 투명 아웃라인, **forced-colors 모드에선 아웃라인이 강제로 보임**. ← 이게 v3 시절 `outline-none`의 접근성 보존 동작이다.

box-shadow 기반인 `ring` 은 **forced-colors 모드에서 브라우저가 제거**해 버린다. 그러면 `outline-none`을 쓴 요소는 고대비 모드에서 포커스 지표가 **아예 사라진다.** 따라서 접근성 작업인 본 스펙은 **`outline-hidden` 을 표준으로** 삼는다(고대비 모드에서 아웃라인 폴백 유지).

> 참고: 기존 인풋들은 `outline-none`(v4)을 쓰고 있어 forced-colors 모드에서 포커스가 사라지는 잠재 이슈가 있다. 본 작업 범위 밖이라 건드리지 않고, "핸드오프/이슈"에 후속 항목으로 남긴다.

---

## 4. 결정 ④ 스코프: **(B) 전역 5개 일관 적용을 권장** (대안: A 카드 2개만)

- 백로그 원문은 "카드 2개"지만 실제 갭은 헤더·푸터·summary까지 **전역**이다.
- **권장 = (B) 전역**: 헤더/푸터/FAQ를 빼면 그 경로의 키보드 사용자는 여전히 무지표 상태로 남고, "카드만 링 뜨고 메뉴는 안 뜬다"는 **부분 적용 자체가 더 혼란**스럽다. 접근성은 경로 전체가 일관돼야 의미가 있다.
- 회귀 위험: **낮음.** `ring`/`outline`은 box-shadow·outline이라 **레이아웃을 밀지 않고**(카드 폭/높이 불변), 전부 `focus-visible:` 상태 전용이라 기본(무포커스)·hover·클릭 표시는 그대로다. diff도 5개 파일 클래스 추가로 작다.
- **대안 = (A) 카드 2개만**: 최소 diff로 먼저 내보내고 싶을 때. 단 헤더/푸터/summary 갭은 남으며, 후속 PR 필요. → 디자인팀은 A를 권하지 않고 **B(전역)를 권장.** 최종 결정은 마스터.

---

## 5. 결정 ⑤ 재사용 형태: **공용 상수 1곳으로 중앙화 권장**

- 사이트 관행은 인풋 클래스를 각 파일 상단 `const` 로 두는 것인데, 그 결과 **동일 문자열이 12개+ 파일에 중복**되어 있다(드리프트 위험 있는 스멜).
- 포커스 링은 문자열이 3종뿐이고 5개 파일이 공유하므로, 같은 중복을 반복하지 말고 **단일 소스로 중앙화**를 권장한다.

권장: `lib/focusRing.ts`
```ts
// 키보드(focus-visible) 포커스 링 — design/focus-visible-ring-ui-spec.md 기준
// 티어 A: 테두리 있는 카드 (인풋 포커스 언어 복제)
export const FOCUS_RING_CARD =
  "focus-visible:outline-hidden focus-visible:border-brand-primary focus-visible:ring-4 focus-visible:ring-brand-primary/15";

// 티어 B-1: 테두리 없는 알약/인라인 링크 (여백 있음, outset)
export const FOCUS_RING_LINK =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary";

// 티어 B-1 인라인 텍스트(로고·푸터): 링 모서리 둥글게
export const FOCUS_RING_LINK_ROUNDED = `${FOCUS_RING_LINK} focus-visible:rounded-md`;

// 티어 B-2: 촘촘한 컨테이너 내부 행(summary), inset
export const FOCUS_RING_INSET =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset focus-visible:rounded-md";
```

- **Tailwind v4 감지 확인:** v4는 프로젝트 소스를 자동 스캔하므로 `lib/focusRing.ts` 안의 **문자열 리터럴 형태로 존재하는 클래스**는 정상 감지·생성된다. (동적 문자열 조합·조각내기 금지 — 위처럼 **완결된 클래스 문자열**로 둘 것. `FOCUS_RING_LINK_ROUNDED`처럼 상수를 이어 붙이는 건 각 조각이 이미 완결 클래스라 안전.)
- 적용 예(카드): `className={\`group flex flex-col ... hover:shadow-md ${FOCUS_RING_CARD}\`}`
- **대안**: 마스터가 기존 관행(파일 상단 per-file const)을 유지하고 싶다면 각 파일 상단에 동일 상수를 두는 방식도 가능. 단 5곳 드리프트 위험이 생기므로 디자인팀은 중앙화를 권장.

---

## 6. 결정 ⑥ 모바일/터치: focus-visible 미표시가 정상 (문제 아님)

- 터치 탭·마우스 클릭으로 링크/summary를 누르면 `:focus-visible` 는 매칭되지 않아 **링이 뜨지 않는다. 이는 의도된 정상 동작**이다(포인터 사용자에게 잔상 없음).
- 모바일에서 외장 키보드 등으로 Tab 이동하는 경우엔 정상적으로 링이 뜬다(그게 목적).
- 즉 "모바일에서 링 안 보임 = 버그" 아님. QA 체크 시 **키보드 Tab으로 검증**할 것(마우스 클릭으로 검증하면 안 뜨는 게 맞음).

---

## 7. 결정 ⑥ 회귀 안전(레이아웃/hover 불변) 명시

- **레이아웃 0 변화:** `ring-*`은 `box-shadow`, `outline-*`은 `outline`으로 그려져 **박스 모델(폭/높이/위치)에 영향 없음.** 카드 폭·그리드·행 높이 그대로. `ring-inset`도 박스 안쪽 그림자라 마찬가지로 레이아웃 불변.
- **hover 불변:** 기존 `hover:` 클래스는 **손대지 않는다.** `focus-visible:` variant만 추가하므로 hover 표시·전환은 100% 그대로.
- **border 관련(티어 A):** 카드는 이미 `border border-brand-border`(1px)를 갖고 있어, `focus-visible:border-brand-primary`는 **테두리 색만 바꾼다(두께 변화 없음)** → 레이아웃 무영향. hover와 focus가 동시라도 둘 다 같은 `brand-primary`라 충돌 없음.
- **기본 상태 불변:** 무포커스 상태의 화면은 완전히 동일. 변화는 오직 "키보드 포커스가 놓였을 때"만.

---

## 8. 개발팀 체크리스트 (구현 시 그대로)

1. `lib/focusRing.ts` 생성(§5) — 상수 4종, 문자열 완결 형태 유지.
2. 표(§2)대로 5개 컴포넌트의 인터랙티브 요소 `className`에 상수 append.
   - `CalculatorCard` `<Link>` → `FOCUS_RING_CARD`
   - `BlogPostCard` `<Link>` → `FOCUS_RING_CARD`
   - `SiteHeader` 로고 `<Link>` → `FOCUS_RING_LINK_ROUNDED`
   - `SiteHeader` nav `<Link>` → `FOCUS_RING_LINK`
   - `SiteFooter` `<Link>` → `FOCUS_RING_LINK_ROUNDED`
   - `FaqAccordion` `<summary>` → `FOCUS_RING_INSET`
3. **`outline-none` 금지, `outline-hidden` 사용**(§3, v4 의미 변경 주의).
4. 기존 `hover:`·기본 클래스는 삭제·수정 금지, focus-visible만 추가.
5. 검증은 **키보드 Tab** 으로(마우스 클릭 아님, §6). 데스크톱+모바일 뷰포트 프리뷰로 디자인팀 사후 검수 예정.

---

## 9. 핸드오프 / 이슈 (다른 팀에게)

- **[마스터 결정 필요] 스코프 A vs B (§4).** 디자인팀 권장은 **B(전역 5개)**. A(카드 2개만)로 축소하려면 헤더/푸터/summary 갭은 후속 PR로 남는다는 점 확인 필요.
- **[마스터 결정 필요] 재사용 형태 (§5).** 디자인팀 권장은 `lib/focusRing.ts` 중앙화. 기존 per-file const 관행 유지를 원하면 알려주면 스펙 반영.
- **[개발팀 확인] Tailwind v4 클래스 감지.** 상수는 반드시 **완결된 클래스 문자열**로 둘 것(조각내서 런타임 결합 시 v4가 못 만듦). 빌드 후 실제로 링이 생성되는지 dev 프리뷰로 확인 요청.
- **[후속 이슈 · 본 작업 범위 밖] 인풋의 forced-colors 갭.** 전역 인풋들이 `outline-none`(v4=완전 제거) + box-shadow `ring`을 쓰는데, Windows 고대비/forced-colors 모드에서는 ring이 제거돼 **인풋 포커스 지표가 사라진다.** 이번 링크류는 `outline-hidden`으로 안전하지만, 인풋도 `outline-none`→`outline-hidden`으로 정렬하는 별도 개선을 제안. 12개+ 파일에 걸쳐 있어 별도 백로그로 분리 권장. (마스터/개발팀 판단)
- **[기획팀 참고]** 이 변경은 순수 접근성/무포커스 화면 불변이라 콘텐츠·SEO·광고 배치에 영향 없음. 별도 조치 불필요.
