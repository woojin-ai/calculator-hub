# BMI 계산기 — UI 구성안 (v1.0, 2026-07-10)

> 대상: `lib/calculators.ts`의 `bmi-calculator` (category: `life`, 현재 `status: "coming-soon"`)
> 실 라우팅은 기존 구조(`app/calculator/[slug]/page.tsx`)를 그대로 따른다 → 실 URL은
> `/calculator/bmi-calculator` 이다. (요청서의 "/life/bmi"는 카테고리/슬러그를 개념적으로
> 표기한 것으로 보이며, 만 나이·D-Day 계산기와 동일하게 카테고리 접두어가 붙는 별도 라우트가
> 아니다. `design/dday-calculator-ui-spec.md` 6장에서 이미 같은 혼동이 지적된 바 있음 — 계속
> 기존 라우팅 구조를 유지한다고 가정하고 작성함. URL 구조 자체를 바꿀 계획이 있다면 정보구조
> 변경이므로 기획팀+개발팀 협의 후 마스터 팀장 확인 필요.)

본 문서는 `design/design-system.md`를 그대로 따르며, 기존 라이브 컴포넌트
`components/AgeCalculator.tsx`의 마크업/톤을 최대한 재사용한다. 코드는 작성하지 않으며
개발팀이 본 문서를 참고해 `components/BmiCalculator.tsx`(신규)를 구현한다.

---

## 0. 전제 — 공통 계산기 템플릿 재사용

`app/calculator/[slug]/page.tsx`의 기존 골격을 그대로 따른다. 신규 설계가 필요한 부분은
"2. 입력/결과 영역"뿐이다.

```
[Breadcrumb: 홈 / 생활 계산기]
[H1] BMI 계산기
[본문 요약 1줄]
──────────────────────────────
[계산기 카드]  ← 이번 스펙의 핵심
  - 키(cm) / 몸무게(kg) 입력 (2개, 나란히 배치 — 3장 참고)
  - 계산 버튼
  - 결과 표시 영역 (BMI 수치 + 체중 상태 라벨)
──────────────────────────────
[결과 해석]         ← ResultInterpretation 재사용 (카피는 기획팀, YMYL 면책 문구 필수)
[본문 중간 광고 여백]  ← design-system.md 5번 가이드 준수
[FAQ 아코디언]        ← FaqAccordion 재사용
[관련 계산기]         ← RelatedCalculators 재사용
[하단 광고]           ← design-system.md 5번 가이드 준수
```

데스크톱 `lg` 이상에서도 사이드바 도입 없이 `max-w-3xl` 단일 컬럼 유지 (만 나이/D-Day 페이지와
통일 — 사이드바 도입은 페이지 공통 이슈이므로 이 문서 범위 밖).

---

## 1. 입력 필드 설계

design-system.md 3-1 스타일을 그대로 따르되, 필드 2개를 **좌우 나란히** 배치한다
(AgeCalculator·DdayCalculator는 필드가 1개라 세로 배치였던 것과 차이 — 사유는 4장 참고).

| 필드 | id | 라벨 | type | 비고 |
|---|---|---|---|---|
| 키 | `height` | "키 (cm)" | `number` | placeholder 예: `170` |
| 몸무게 | `weight` | "몸무게 (kg)" | `number` | placeholder 예: `65` |

- 배치: `grid grid-cols-2 gap-3 sm:gap-4` — 모바일 포함 전 브레이크포인트에서 2열 고정.
- 입력 박스: `h-12`(48px), `rounded-lg`(8px), `border border-brand-border`,
  포커스 시 `focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15`,
  내부 `px-4`, `text-base`.
- 라벨: `text-sm font-medium text-brand-text-secondary`, 입력 위 `mb-1.5`(6px).
- 에러 상태(값 미입력/0 이하 등 — 검증 로직 자체는 개발팀): 테두리 `border-brand-warning` +
  하단 `text-xs text-brand-warning` 에러 메시지, `role="alert"` (AgeCalculator 패턴 그대로).
- 계산 버튼 "BMI 계산하기": `w-full h-12 rounded-lg bg-brand-primary text-white font-semibold`,
  hover `bg-brand-primary-hover`. 폭 2열 그리드 아래 전체 너비.

---

## 2. 결과 카드 설계 (핵심 — BMI 전용 요소)

공통 골격: `rounded-xl border-l-4 p-4 sm:p-6`, 폼과 `mt-6`(24px) 간격. **상태(저체중/정상/
과체중/비만)에 따라 강조선·배경 틴트·숫자색·뱃지색만 스위칭**하고 구조는 고정한다.

### 2-1. 상태별 색상 매핑

| 상태 | 강조선/숫자 컬러 | 배경 틴트(카드) | 뱃지 배경 | 뱃지 텍스트 |
|---|---|---|---|---|
| 저체중 | Warning `#F59E0B` (`border-brand-warning` / `text-brand-warning`) | `bg-amber-50` | `bg-amber-100` | `text-amber-700` |
| 정상 | Accent `#10B981` (`border-brand-accent` / `text-brand-accent`) | `bg-emerald-50` | `bg-emerald-100` | `text-emerald-700` |
| 과체중 | Warning `#F59E0B` (저체중과 동일 컬러, 뱃지 문구로만 구분) | `bg-amber-50` | `bg-amber-100` | `text-amber-700` |
| 비만 | **Danger `#EF4444` (신규 제안 — 5장 "마스터 확인 필요" 참고)** | `bg-red-50` | `bg-red-100` | `text-red-700` |

> BMI 수치 구간(예: 18.5 / 23 / 25 미만·이상)은 design-system.md에 정의되어 있지 않은 콘텐츠
> 성격의 정보이며, 본 문서는 **4단계 라벨과 색상 매핑만** 정의한다. 실제 컷오프 수치는
> 기획팀이 결과 해석 텍스트·FAQ와 반드시 일치시켜 확정해야 하며, 디자인팀이 임의로 확정하지
> 않는다 (계산 로직은 디자인팀 범위 밖).

### 2-2. 카드 내부 레이아웃 (위 → 아래)

1. 라벨: `text-sm font-medium text-brand-text-secondary` — 예: "회원님의 BMI 지수"
2. 숫자 + 단위 줄 (`mt-1`, `flex items-baseline gap-2`, `tabular-nums`)
   - 숫자: **Result 스케일 준수** — `text-4xl font-bold sm:text-[2.5rem]` (36~40px, 모바일도
     축소 금지), 색상은 위 표의 상태별 컬러
   - 단위 "kg/m²": `text-base font-medium text-brand-text-secondary`
3. 상태 뱃지 (`mt-3`): `inline-block rounded-full px-3 py-1 text-sm font-semibold`,
   배경/텍스트는 위 표. 표기 예: "정상 체중" / "저체중" / "과체중" / "비만"
4. 보조 설명 1줄 (`mt-2`, `text-sm text-brand-text-secondary`) — 문구는 기획팀 카피
   (자리만 지정, 예: "표준 체중 범위는 OO~OOkg 입니다" 류의 1줄)
5. 갱신 트랜지션: design-system.md 3-2 그대로 — 결과 갱신 시 배경 fade 또는 미세 scale
   (0.15~0.2s) 적용 (CSS transition 범위, 기능 로직 아님)

---

## 3. 모바일(375px) 무스크롤 검증

목표: iPhone SE급(375×667) 뷰포트에서 "입력 → 결과"가 스크롤 없이 한 화면에 들어오는 것
(design-system.md 4번 원칙 1). 계산 전 상태(입력 폼만) 기준으로 아래와 같이 예상 높이를
산정했다 (실 구현 전이라 브라우저 실측 대신 Tailwind 클래스 기반 추정치임을 명시).

| 영역 | 예상 높이 |
|---|---|
| 헤더(SiteHeader, `h-16`) | 64px |
| Breadcrumb + H1 + 요약문 + 카드 전 여백(`mt-6`) | 약 174px |
| 계산기 카드 상단 padding(`p-4`) | 16px |
| 입력 2개(2열 배치, 라벨+`h-12`) | 약 76px |
| gap-4 | 16px |
| 계산 버튼(`h-12`) | 48px |
| 결과 카드 전 여백(`mt-6`) | 24px |
| 결과 카드(라벨+숫자+뱃지+보조설명, padding 포함) | 약 164px |
| 계산기 카드 하단 padding(`p-4`) | 16px |
| **합계** | **약 598px** |

→ 667px 안에 약 70px 여유를 두고 들어온다. iPhone 12/13/14급(390×844, 브라우저 UI 제외 실사용
높이 약 700~750px)에서는 훨씬 여유롭다.

**결론 및 지침:**
- 입력 2개를 좌우 나란히(`grid-cols-2`) 배치하는 것이 이 무스크롤 목표 달성의 핵심 전제다.
  AgeCalculator/DdayCalculator처럼 세로로 쌓으면(+약 74px) 합계가 672px를 넘어 iPhone SE급에서
  스크롤이 발생할 수 있으므로 **개발팀은 이 페이지에 한해 2열 배치를 그대로 따를 것을 권장**한다.
- 여유가 70px 수준으로 넉넉하지 않으므로, **상단 배너 광고(5장 참고)는 이 페이지 모바일
  뷰에서는 넣지 않거나 `md` 이상에서만 노출**할 것을 권장한다. 넣을 경우 무스크롤 목표가
  깨질 가능성이 높다.
- 터치 타겟: 입력 2개·버튼 모두 `h-12`(48px)로 44px 기준 충족.

---

## 4. 데스크톱 레이아웃

- 컨테이너: 기존 계산기 페이지와 동일 `mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12`.
- 입력 2열 배치는 데스크톱에서도 동일 유지(모바일 전용 규칙이 아님) — `sm:gap-4`로 간격만 소폭 확대.
- 계산기 카드 자체를 좌/우로 나누는 2단 구성은 하지 않는다(design-system.md 4번 "고려 가능"
  수준이며, 만 나이/D-Day 페이지가 단일 컬럼이므로 통일 유지). 사이드바 광고는 `lg` 이상에서
  페이지 레벨로 별도 배치(5장 참고), 계산기 카드 폭에는 영향 없음.

---

## 5. 광고 배치

design-system.md 5번 가이드 그대로 적용. BMI 페이지 전용 주의사항만 아래에 명시.

- **상단 배너**: 3장 무스크롤 예산이 빠듯하므로 모바일에서는 생략 권장, 넣더라도 `md` 이상에서만.
- **본문 중간**: 결과 해석 텍스트와 FAQ 섹션 사이(margin 24px 이상), "광고" 캡션 라벨 표기.
- **사이드바**(`lg` 이상): sticky 1개, 화면 30% 이하.
- **하단**: 관련 계산기 카드 다음, 푸터 위.
- 결과 카드 바로 위/아래, 계산 버튼 30px 이내 배치 금지(기존 규칙 동일). 특히 이 페이지는 결과
  카드에 상태별 색상(빨강 포함)이 들어가므로, 광고 소재가 우연히 유사한 색/카드 형태일 경우
  "결과처럼 보이는 광고"로 오인될 위험이 있다 — 결과 카드와 광고 사이 여백·테두리 스타일 차이를
  더 명확히 두도록 개발팀에 특별히 당부.

---

## 6. 컴포넌트/데이터 매핑 (개발팀 참고)

| 항목 | 내용 |
|---|---|
| 신규 컴포넌트 | `components/BmiCalculator.tsx` — `AgeCalculator.tsx` 패턴(useState, form onSubmit, 에러 처리) 재사용/변형 권장 |
| 라우팅 매핑 | `app/calculator/[slug]/page.tsx`의 `CALCULATOR_COMPONENTS`에 `"bmi-calculator": BmiCalculator` 추가 |
| 데이터 | `lib/calculators.ts`의 `bmi-calculator` 항목: 콘텐츠(500~1000자 해석 텍스트, FAQ 3~5개) 확보 후 `status: "live"`로 전환. 콘텐츠 작성은 기획팀 담당, 본 문서 범위 아님 |
| 계산 유틸 | `lib/bmi.ts` 신설 권장 (`lib/age.ts`, `lib/dday.ts` 패턴 참고) — 계산 로직은 개발팀 |
| 관련 계산기 | `getRelatedCalculators`는 `status: "live"`인 항목만 노출한다. 현재 라이브는 age-calculator·dday-calculator(둘 다 `date` 카테고리)뿐이라, BMI 라이브 전환 직후에는 관련 계산기 카드에 `life` 카테고리 내 항목이 없어 두 `date` 계산기만 뜬다. 레이아웃(3열 그리드)은 문제 없으나, "같은 카테고리 2개+다른 카테고리 1개" 원칙(`planning/calculator-lineup.md` 3-3)을 채우려면 `life` 카테고리 계산기가 더 라이브화되어야 한다 — 로드맵 진행에 따라 자연 해결될 사안이므로 지금 조치 불필요, 참고만 |

---

## 7. 다른 팀 전달 사항

**기획팀 확인 요청**
- 2-1 표의 BMI 구간 컷오프(저체중/정상/과체중/비만)를 결과 해석 텍스트·FAQ와 동일한 수치로
  확정해 전달 필요. 디자인팀은 라벨 4종과 색상만 정의했다.
- 결과 카드 4번 항목(보조 설명 1줄)의 실제 문구 작성 필요.
- YMYL(건강) 면책 문구는 `planning/calculator-lineup.md`에 명시된 대로 필수 — "의료적 진단이
  아니며 참고 지표"라는 점, 과체중/비만 결과에는 "의료진 상담 권장" 문구 포함.

**개발팀 전달 사항**
- `components/BmiCalculator.tsx` 신규 구현 (1~2장 스펙 참고)
- `CALCULATOR_COMPONENTS` 매핑 추가, `lib/calculators.ts` 콘텐츠 확보 후 `status: "live"` 전환
- 375×667 뷰포트에서 입력 2열 배치가 실제로 무스크롤 목표를 충족하는지 QA 확인 필요 (3장은
  추정치이며, 실 구현 후 디자인팀이 재검수 예정)

---

## 8. 마스터 팀장 확인 필요 사항

- **색상 팔레트 확장(Red/Danger 계열 공식 추가)**: `design-system.md`에는 Primary/Accent/Warning까지만
  정식 팔레트로 정의되어 있고, Red 500(`#EF4444`)은 3-1 "입력 에러 상태"에서 대체색으로만
  언급됐을 뿐 결과/상태 표시용 정식 색상은 아니다. BMI "비만" 상태를 Warning(Amber)과
  시각적으로 구분하려면 별도의 위험색이 필요하다고 판단해 `#EF4444`(Tailwind Red 500)를
  `brand-danger`로 신규 제안한다. 팔레트 확장 여부는 마스터 팀장 확인 후 `design-system.md`
  1장에 공식 반영 여부를 결정해달라. (확인 전까지는 이 문서의 제안 단계로만 취급)
