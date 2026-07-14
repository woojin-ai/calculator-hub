# 인풋/셀렉트/텍스트에어리어 `outline-none` → `outline-hidden` 정렬 스펙 (v1.0, 2026-07-15)

> 디자인팀 작성. 실제 코드는 개발팀이 구현한다. 본 문서는 코드가 아니다.
> 후속 근거: `design/focus-visible-ring-ui-spec.md` §9 "[후속 이슈 · 본 작업 범위 밖] 인풋의 forced-colors 갭".
> 스택: Next 16.2 + Tailwind v4. 근거: WCAG 2.1 **2.4.7 Focus Visible (AA)** + forced-colors(Windows 고대비) 대응.

---

## 0. 문제 (재확인)

폼 인풋/셀렉트/텍스트에어리어 전역이 아래 패턴을 쓴다:
```
outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15
```
Tailwind v4에서 `outline-none` = `outline-style: none`(아웃라인 완전 제거). 포커스 지표를 `ring`(box-shadow)에만 의존하는데, forced-colors 모드에서 브라우저가 box-shadow `ring`을 **제거**하므로 고대비 모드에서 인풋 포커스 지표가 **완전히 사라진다.** `outline-hidden`(= `outline: 2px solid transparent`)으로 바꾸면 forced-colors 모드에서 OS가 이 투명 아웃라인을 시스템 색 가시 아웃라인으로 대체 → 폴백 확보.

---

## 1. 교체 규칙 — 단순 토큰 치환이 맞다 (확정)

- **`outline-none` → `outline-hidden` 단일 토큰 치환만.** 추가로 손볼 것 없음.
- **같은 문자열의 나머지는 한 글자도 변경 금지.** `transition-colors`, `focus:border-brand-primary`, `focus:ring-4`, `focus:ring-brand-primary/15`, hover/기본 클래스(`h-12`, `rounded-lg`, `border`, `appearance-none`, `bg-white`, `min-w-0`, `min-h-[140px]`, `pl-4 pr-9`, `text-brand-text` 등) 전부 그대로.
- 근거: `outline-hidden`은 v3 시절 `outline-none`의 접근성 보존 동작을 그대로 재현하는 토큰이다. 기존 링 언어(border 색전환 + /15 링)는 정상 동작하는 커스텀 지표이므로 유지하면 되고, 부족한 건 forced-colors 폴백뿐 → 아웃라인 토큰 한 개만 교정하면 완결된다.
- 셀렉트(`appearance-none`)·텍스트에어리어(`min-h-[140px]`)도 동일 토큰이라 **같은 치환 규칙이 그대로 적용**된다. 요소 타입별 예외 없음.

---

## 2. `focus:` 를 `focus-visible:` 로 바꾸지 않는다 (확정 — 요청 판단에 동의)

- **바꾸지 않는다.** 인풋류는 `focus:` 유지가 맞다.
- 근거: 인풋은 클릭·터치로 진입해도 **캐럿(입력 위치) 신호로 포커스 지표가 떠야** 사용자가 "지금 여기에 입력된다"를 안다. 이건 06:47 스펙에서 링크/카드/토글에 `focus-visible:`를 쓴 이유(포인터 클릭 시 잔상 제거)와 **정반대 요구**다. 인풋에 `focus-visible:`를 쓰면 마우스로 클릭했을 때 링이 안 떠서 오히려 입력 위치 신호가 사라진다 → 후퇴.
- 06:47 스펙 §1도 "인풋은 기존대로 `focus:` 유지"를 명시했다. 본 건은 그 결정과 일관.
- 즉 이번 작업은 **포커스 트리거(focus)는 그대로 두고, 아웃라인 폴백 토큰만 교정**하는 순수 forced-colors 보강이다.

---

## 3. 시각 회귀 — 일반(비 forced-colors) 모드 변화 0 (확정)

- `outline-hidden`이 만드는 `outline: 2px solid transparent`는 **투명**이라 일반 모니터/브라우저에서 눈에 보이지 않는다. 기존 `outline-none`(아무것도 안 그림)과 **화면상 결과 동일.**
- `outline-hidden`은 `outline-offset: 2px`도 함께 붙지만, 아웃라인 자체가 투명이라 오프셋도 무의미(보이지 않음). 레이아웃 영향 없음(아웃라인은 박스 모델 밖에 그려짐 → 폭/높이/그리드 불변).
- 기존 포커스 표시(border 색전환 + /15 링)는 그대로 뜬다. 즉 일반 사용자 눈에는 **before/after 완전 동일.** 변화는 오직 forced-colors 모드에서만 나타난다(그게 목적).
- 결론: 일반 모드 시각 회귀 위험 = 사실상 0.

---

## 4. 중앙 상수화 여부 — 이번 건은 최소 diff(토큰만 치환) (확정 — 요청 권장에 동의)

- **이번 PR은 리팩터하지 않는다. `outline-none`→`outline-hidden` 토큰 치환만.**
- 근거:
  - 본 건은 회귀를 부를 이유가 전혀 없는 안전한 접근성 교정이다. 여기에 중앙 상수화(입력 클래스 문자열 통합 리팩터)를 얹으면 20곳의 큰 문자열을 건드리게 되어 **불필요한 diff·회귀 리스크만 커진다.** 접근성 교정과 구조 리팩터를 한 PR에 섞지 않는다.
  - 20곳 중 일부는 파일 상단 `const`, 일부는 JSX 인라인 template literal이라 통합 상수로 묶으려면 시그니처·조합 방식까지 손봐야 함 → 별개 작업 규모.
- **단, 인풋 클래스 문자열이 12개+ 파일에 중복된 드리프트 스멜은 실재한다**(06:47 스펙 §5에서도 지적). 이건 별도 백로그로 남긴다(아래 마스터에게).

---

## 5. 적용 대상 (grep 재확인 — 20곳, 13파일)

전부 동일 `outline-none` 토큰. 파일 상단 `const`형 12곳 + JSX 인라인 template literal형 8곳.

| 파일 | 위치(라인) | 형태 |
|---|---|---|
| `components/AgeCalculator.tsx` | 49 | 인라인 |
| `components/BmiCalculator.tsx` | 101, 121 | 인라인 |
| `components/DdayCalculator.tsx` | 52, 77 | 인라인 |
| `components/DsrCalculator.tsx` | 37 | const |
| `components/ElectricityBillCalculator.tsx` | 24, 27 | const(input+select) |
| `components/FourInsuranceCalculator.tsx` | 24, 27 | const(input+select) |
| `components/LoanInterestCalculator.tsx` | 30 | const |
| `components/LoanPrepaymentFeeCalculator.tsx` | 27 | const |
| `components/SalaryNetCalculator.tsx` | 15, 18 | const(input+select) |
| `components/SeverancePayCalculator.tsx` | 20 | const |
| `components/UnitConverter.tsx` | 18, 21 | const(input+select) |
| `components/ServicePeriodCalculator.tsx` | 11 | const |
| `components/SupportInquiryForm.tsx` | 6, 140 | const(6) + 인라인 textarea(140) |

> 인라인/const 형태와 무관하게 **각 문자열 안의 `outline-none` 토큰 하나만** `outline-hidden`으로 바꾼다. 파일당 여러 곳이면 각 곳 모두.

---

## 6. 개발팀 체크리스트

1. 위 표 20곳 각각의 `outline-none` → `outline-hidden`. **그 외 토큰·순서·문자열 일절 변경 금지.**
2. `focus:` → `focus-visible:` **전환 금지**(§2). 인풋은 `focus:` 유지.
3. 리팩터·상수 통합 **하지 않음**(§4). 순수 토큰 치환.
4. 검증: 일반 모드에선 before/after 화면 동일해야 정상(§3). forced-colors 검증은 Windows "고대비 모드" ON 상태에서 Tab/클릭으로 인풋 포커스 시 시스템 색 아웃라인이 뜨는지 확인. (dev팀 환경이 Windows라 확인 가능)
5. `outline-hidden`이 v4에서 생성되는지 빌드 후 확인(v4 표준 유틸리티라 문제없을 것).

---

## 7. 모바일 뷰포트

- 본 건은 일반 모드 시각변화 0이라 모바일 레이아웃 검수 불필요(요청과 동일 판단).
- 우려 지점 없음: 아웃라인은 박스 모델 밖에 그려져 좁은 뷰포트에서도 폭/줄바꿈에 영향 없고, forced-colors 폴백 아웃라인도 포커스 시에만 요소 테두리 바깥 2px에 그려질 뿐 리플로우를 만들지 않는다.

---

## 마스터에게

- **[개발팀 핸드오프]** 20곳 토큰 치환 안전 건. 회귀 위험 낮음, 일반 모드 화면 변화 0. dev팀이 Windows 고대비 모드 ON으로 실제 폴백 아웃라인 뜨는지 확인 후 QA→push 권장. 이걸로 06:47 스펙 §9의 인풋 forced-colors 갭이 닫힌다.
- **[별도 백로그 제안 · 이번 건과 분리]** 인풋 클래스 문자열이 12개+ 파일에 중복돼 있다(드리프트 스멜, 06:47 §5에서도 지적). 이번 PR에는 **일부러 섞지 않았다**(접근성 교정에 리팩터 리스크를 얹지 않으려고). 나중에 `lib/inputClass.ts`류 단일 소스로 통합하는 리팩터를 별도 티켓으로 잡을지 결정 요망. 06:47에 만든 `lib/focusRing.ts`(중앙화 채택 시)와 톤을 맞추면 좋음.
- **[QA팀 참고]** 이 건의 PASS 기준은 "일반 모드 화면 무변화 + 고대비 모드에서 인풋 포커스 시 아웃라인 출현" 두 가지. 일반 모드에서 아무 변화 없다고 "적용 안 된 것 아니냐"고 반려하지 말 것 — 무변화가 정상(§3).
