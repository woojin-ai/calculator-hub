# 홈페이지 "지금 사용 가능한 계산기" 그리드 + 텍스트 고아 줄 수정 스펙

- 작성일: 2026-07-13
- 작성: 디자인팀
- 계기: 마스터가 실제 배포 사이트(https://calculator-hub-delta.vercel.app/)를 확인 후 지적한 2건, 빠른 결정 우선
- 대상 파일: `app/page.tsx`, `components/CalculatorCard.tsx`
- 참고: `planning/calculator-lineup.md` — 라이브 계산기가 4개(현재) → 12개(로드맵)까지 순차 증가 예정. **개수가 바뀔 때마다 재수정이 필요없는 구조로 설계함.**

---

## 문제 1: 라이브 계산기 그리드 — 마지막 줄 불균형

### 원인
현재 `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` 구조는 항목 개수가 열 개수(3)의 배수가 아닐 때마다 마지막 줄이 왼쪽 정렬된 채 빈 공간이 남는다. 지금은 4개라서 3+1로 깨지지만, "열 개수를 4로 바꾸는" 식으로 고치면 다음 계산기가 라이브되어 5개가 되는 순간 다시 3+2 혹은 4+1로 깨진다. **CSS 그리드(grid-template-columns)는 구조적으로 이 문제를 해결할 수 없음** — 그리드 자체를 flexbox로 교체한다.

### 결정: Flexbox + `flex-wrap` + `justify-center` + 퍼센트 기반 width
그리드를 flex로 바꾸고, 각 카드에 반응형 breakpoint별 고정 width(%)를 줘서 줄바꿈되게 한 뒤, `justify-center`로 마지막 줄이 몇 개가 남든 항상 가운데 정렬되게 한다. 항목 개수와 무관하게 동작하므로 4개든 12개든 로드맵 변경 시 이 컴포넌트를 다시 만질 필요가 없다.

**`app/page.tsx` 수정 (해당 섹션만):**

```tsx
{liveCalculators.length > 0 && (
  <section className="mt-10">
    <h2 className="mb-4 text-xl font-bold text-brand-text">
      지금 사용 가능한 계산기
    </h2>
    <div className="flex flex-wrap justify-center gap-4">
      {liveCalculators.map((calculator) => (
        <div
          key={calculator.slug}
          className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6667rem)]"
        >
          <CalculatorCard calculator={calculator} />
        </div>
      ))}
    </div>
  </section>
)}
```

### 왜 이 값인가 (개발팀 참고용 계산 근거)
- `gap-4` = 1rem 유지 (기존 그리드와 동일한 간격, 시각적 변화 없음)
- sm(2열): `(100% - gap 1개분 1rem) / 2` = `calc(50% - 0.5rem)`
- lg(3열): `(100% - gap 2개분 2rem) / 3` = `calc(33.333% - 0.6667rem)`
- 이 계산식은 열 개수가 바뀌지 않는 한(2열/3열 유지) 카드 개수와 무관하게 항상 성립. 열 개수 자체를 바꾸고 싶으면(예: 4열로) 이 두 calc 값만 재계산하면 되고, `justify-center` 로직은 그대로 재사용된다.

### 동작 확인 시나리오 (개발팀 구현 후 디자인팀이 재검수할 항목)
| 라이브 개수 | lg(3열) 결과 |
|---|---|
| 4개 (현재) | 1행 3개 + 2행 1개, 2행 카드가 **가운데 정렬**되어 덩그러니 왼쪽에 남지 않음 |
| 5개 | 1행 3개 + 2행 2개(가운데 정렬) |
| 6개 | 2행 모두 3개씩 꽉 참 (기존과 동일) |
| 12개 (로드맵 최종) | 4행 모두 3개씩 꽉 참 |

- 모바일(375px, `w-full`): 무조건 1열 세로 스택이라 flex든 grid든 시각 차이 없음 — 순서/정렬 문제 자체가 발생하지 않는 구간이므로 별도 처리 불필요. 다만 아래 문제 2(텍스트 고아 줄)는 모바일 폭이 좁아 더 두드러질 수 있으니 반드시 375px에서 재확인.
- **CalculatorCard 컴포넌트 자체는 수정 없음** — 폭 제어는 상위 wrapper `div`에서만 처리하고 카드 내부 로직/스타일은 그대로 유지.

### 기각한 대안과 이유
- **열 개수를 4로 변경**: "지금 4개"에만 맞는 임시방편, 5개가 되는 순간 재발 → 기각.
- **빈 카드(placeholder)로 마지막 줄 채우기**: 실체 없는 콘텐츠를 시각적으로 끼워 넣는 방식이라 지양(요청사항에도 명시됨) → 기각.
- **`grid-cols-[repeat(auto-fit,minmax(...))]`**: auto-fit/auto-fill은 트랙 폭을 채우려 카드가 늘어나거나(auto-fit) 빈 트랙이 남는(auto-fill) 방식이라 "마지막 줄 가운데 정렬"이 보장되지 않음 → 기각. flex + justify-center가 유일하게 "몇 개가 남든 중앙 정렬"을 CSS만으로 보장하는 방식.

---

## 문제 2: 카드 설명 텍스트 고아 줄(widow line)

### 결정: `text-pretty` 적용 (Tailwind v4 코어 유틸리티, 별도 설정/플러그인 불필요 — `tailwindcss: ^4` 확인됨)
`text-pretty`는 `text-wrap: pretty`를 적용해 마지막 줄에 단어 하나만 남는 상황을 브라우저가 자동으로 재분배하도록 한다. 순수 CSS 해결책이라 기능 로직 변경 없음.

### 적용 대상 (전부 `leading-relaxed` 문단에 클래스 한 줄 추가)

| 파일 | 대상 | 비고 |
|---|---|---|
| `components/CalculatorCard.tsx` | `shortDescription` `<p>` | 이번 지적의 직접 원인, 최우선 적용 |
| `app/page.tsx` | 카테고리 카드 `description` `<p>` (105~107줄) | 그리드는 대상 아니지만 동일한 텍스트 줄바꿈 패턴이라 함께 적용 — 비용 없는 일관성 확보 |
| `components/ResultInterpretation.tsx` | "결과 해석" 본문 `<p>` | 500~1000자 장문이라 고아 줄 발생 가능성 더 높음 |
| `components/FaqAccordion.tsx` | FAQ `answer` `<p>` | 동일 사유 |

**공통 수정 패턴** (예: CalculatorCard):
```tsx
<p className="text-pretty text-xs leading-relaxed text-brand-text-secondary">
  {calculator.shortDescription}
</p>
```
나머지 3개 파일도 같은 방식으로 기존 클래스 문자열 맨 앞(또는 아무 위치)에 `text-pretty` 한 클래스만 추가하면 된다.

### 이번 범위에서 제외한 곳
- `components/LegalPageLayout.tsx` (`/privacy`, `/terms`): 이번 지적 대상(계산기 페이지)과 무관 — 이번 티켓 범위 밖으로 제외. 다만 동일 패턴(`leading-relaxed` 장문 `<p>`)이라 추후 여유 있을 때 같은 방식으로 `text-pretty` 추가를 권장(별도 작업으로 처리, 지금 묶어서 처리하지 않음).
- 제목(`h1`/`h2`/`h3`)류: 대부분 한 줄 또는 짧은 두 줄이라 고아 줄 리스크 낮음, `text-balance` 적용은 이번 스펙에서 필수 아님(문제 재현 시 후속 검토).

### 모바일(375px) 확인 사항
- `text-pretty`는 브라우저 네이티브 텍스트 재분배 로직이라 뷰포트 폭과 무관하게 동일하게 동작 — 별도 반응형 분기 불필요.
- 다만 모바일은 카드 폭이 좁아 원래도 고아 줄이 더 자주 발생하는 조건이므로, 구현 후 검수 시 **375px 뷰포트에서 CalculatorCard 4개 전부(만나이/D-Day/대출이자/BMI) 실제 텍스트로 확인** 필수(디자인팀이 검수 단계에서 확인 예정).
- 브라우저 미지원 시(구형 Safari 등) `text-pretty`는 조용히 무시되고 기존 일반 줄바꿈으로 폴백되므로 레이아웃 깨짐 리스크 없음.

---

## 개발팀 구현 체크리스트
1. `app/page.tsx` 라이브 계산기 섹션: `grid` → `flex flex-wrap justify-center` 구조로 교체 (위 코드 스니펫 그대로)
2. `CalculatorCard.tsx`, 카테고리 카드 `<p>`, `ResultInterpretation.tsx`, `FaqAccordion.tsx` 4곳에 `text-pretty` 클래스 추가
3. 구현 후 디자인팀에 알리면 데스크톱(1280px 기준 lg 3열) + 모바일(375px) 두 뷰포트에서 재검수 진행
