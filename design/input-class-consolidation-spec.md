# 폼 필드 클래스 단일소스 추출 스펙 (`lib/inputClass.ts`)

작성: 디자인팀 / 대상: 개발팀
목표: **화면 픽셀 변화 0.** 인풋/셀렉트/텍스트에어리어 Tailwind 클래스 문자열을 `lib/inputClass.ts` 단일소스로 추출하는 순수 구조 리팩터. 시각/동작 회귀 0.

선례: `lib/focusRing.ts`(상수 4종, 07-15 06:47) — 상수끼리 템플릿리터럴로 합성하는 패턴 재사용.

---

## 1. 배경 / 왜 지금

07-15 실행에서 `outline-none` → `outline-hidden` 토큰 **하나**를 바꾸느라 13개 파일을 lockstep으로 수정했다. 그 토큰이 20곳의 base 문자열에 전부 복붙돼 있기 때문이다(드리프트 취약 클러스터 실증). 이번엔 그 공유 클러스터를 상수로 뽑아 "한 곳만 고치면 20곳 반영"되게 만든다.

**핵심 불변식**: 리팩터 후 각 스팟의 최종 유틸리티 클래스 **SET(합집합)** 이 한 글자도 달라지면 안 된다. Tailwind는 유틸 순서가 CSS 출력에 무관하므로 클래스 **순서**는 바뀌어도 되지만 **집합**은 스팟별로 동일해야 한다. 조건부 에러 델타(`${error ? "border-brand-warning" : "border-brand-border"}`)·`w-full`·`min-w-0`·`border-brand-border`·`pr-9`/`pr-12`·`disabled:*` 등 **스팟별 델타는 전부 보존**한다.

---

## 2. 실측 인벤토리 (20곳, grep + 직접 Read 확인 완료)

base 문자열은 3종의 형태로 존재한다.

### A. 표준 INPUT base 문자열 (동일 문자열, 13곳)
`h-12 rounded-lg border px-4 text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15`

- **파일 상단 const `inputBase` (9곳)**: `DsrCalculator:37`, `ElectricityBillCalculator:24`, `FourInsuranceCalculator:24`, `LoanInterestCalculator:30`, `LoanPrepaymentFeeCalculator:27`, `SalaryNetCalculator:15`, `ServicePeriodCalculator:11`, `SeverancePayCalculator:20`, `SupportInquiryForm:6`
  - 사용처에서 `${inputBase} ...델타`로 조합 (border 색·`w-full`·`pr-9`/`pr-12`·에러 조건부 등은 **사용처**에서 붙음). 예: `SalaryNet:207 = \`${inputBase} border-brand-border\``, `Dsr:386 = \`${inputBase} w-full pr-9 ${error ? ...}\``.
- **JSX 인라인 템플릿리터럴 (4곳)**: `AgeCalculator:49`, `BmiCalculator:101`, `BmiCalculator:121`, `DdayCalculator:52` — 뒤에 `${error ? "border-brand-warning" : "border-brand-border"}` 결합.

### B. INPUT base + 정적 델타 (2곳)
- `DdayCalculator:77` — 표준 INPUT base + `border-brand-border` (인라인 static 문자열, 에러 조건부 없음).
- `UnitConverter:18` const `inputBase` — 표준 INPUT base + `min-w-0` + `border-brand-border`. 즉 `h-12 min-w-0 rounded-lg border border-brand-border px-4 ...`.

### C. SELECT base 문자열 (4곳)
- **표준 SELECT const `selectBase` (3곳, `w-full` 포함)**: `ElectricityBillCalculator:27`, `FourInsuranceCalculator:27`, `SalaryNetCalculator:18`
  `h-12 w-full appearance-none rounded-lg border border-brand-border bg-white pl-4 pr-9 text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15`
  - 사용처: `Elec:335`·`FourIns:291`·`SalaryNet:229`는 `className={selectBase}` (bare), `SalaryNet:262`는 `${selectBase} disabled:...` 델타.
- **UnitConverter SELECT const `selectBase` (1곳, `min-w-0` — `w-full` 아님)**: `UnitConverter:21`
  `h-12 min-w-0 appearance-none rounded-lg border border-brand-border bg-white pl-4 pr-9 text-base ...`
  - 사용처에서 폭을 붙임: `UnitConverter:201 = \`${selectBase} w-full\``, `UnitConverter:242 = \`${selectBase} w-auto\``.

### D. TEXTAREA base 문자열 (1곳)
- `SupportInquiryForm:140` (인라인) — `min-h-[140px] rounded-lg border px-4 py-3 text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15` + `${errors.message ? "border-brand-warning" : "border-brand-border"} disabled:opacity-60`.

> 합계 = 13(A) + 2(B) + 4(C) + 1(D) = **20곳.**

### 공통 관찰 — 진짜 드리프트 에피센터
A·B·C·D **네 형태 전부**의 꼬리가 완전히 동일하다:
`... text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15`
07-15 lockstep 편집(`outline-none`→`outline-hidden`)이 건드린 것이 바로 이 꼬리다. **이 클러스터를 단일 상수로 만드는 것이 이번 작업의 1순위 목표.**

---

## 3. 제안 taxonomy — `lib/inputClass.ts`

합성 방식은 focusRing.ts와 동일하게 **상수끼리 템플릿리터럴 합성**. **base + 스팟 델타** 조합 원칙(억지 단일화 금지).

```ts
// lib/inputClass.ts
// 폼 필드(인풋/셀렉트/텍스트에어리어) 공유 Tailwind 클래스 단일소스.
// 화면 변화 0 목적의 순수 추출 — design/input-class-consolidation-spec.md 기준.

// [드리프트 에피센터] 07-15 outline-none→outline-hidden lockstep의 원인 토큰 클러스터.
// 모든 폼 필드가 공유하는 타이포/아웃라인/포커스 언어. 여기 한 곳만 고치면 20곳 반영.
export const FIELD_FOCUS =
  "text-base text-brand-text outline-hidden transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

// 플레인 텍스트 인풋 공통. border 색(에러 조건부 or border-brand-border)·폭·pr-* 는 스팟에서 부착.
export const INPUT_BASE = `h-12 rounded-lg border px-4 ${FIELD_FOCUS}`;

// 셀렉트 공통 코어 — 폭 토큰(w-full/w-auto/min-w-0)만 제외. 폭은 스팟이 결정.
export const SELECT_CORE =
  `h-12 appearance-none rounded-lg border border-brand-border bg-white pl-4 pr-9 ${FIELD_FOCUS}`;

// 표준 셀렉트(폭 100%) 드롭인 — Electricity/FourInsurance/SalaryNet.
export const SELECT_BASE = `${SELECT_CORE} w-full`;

// 텍스트에어리어(문의폼) — h-12 대신 min-h, py-3 추가.
export const TEXTAREA_BASE = `min-h-[140px] rounded-lg border px-4 py-3 ${FIELD_FOCUS}`;
```

> **참고 — `FIELD_FOCUS`에 `text-base text-brand-text`를 포함시킨 이유**: 이 두 타이포 토큰이 A·B·C·D 전 형태의 꼬리에 예외 없이 함께 붙어 있어 포함해도 SET 보존이 깨지지 않는다. 포함하면 합성 상수들이 더 짧아지고 중복 토큰이 더 줄어든다. 반대로 "FIELD_FOCUS는 포커스/아웃라인만" 이라는 의미적 순수성을 원하면 `text-base text-brand-text`를 각 base 상수로 옮겨도 되고, 그래도 SET 보존은 동일하다. **개발팀 판단으로 택1 — 어느 쪽이든 최종 SET은 불변.**

---

## 4. 스팟별 매핑표 (20곳 — 리팩터 후 조합식과 SET 보존 근거)

`= <조합식>` 은 리팩터 후 각 스팟의 className이 만들어지는 방식. **SET 보존**은 조합식의 토큰 합집합이 현재 문자열의 토큰 집합과 동일함을 뜻한다.

### 그룹 A — const `inputBase` 9곳 (import 별칭으로 diff 최소화)
각 파일 상단 `const inputBase = "..."` 를 삭제하고:
```ts
import { INPUT_BASE as inputBase } from "@/lib/inputClass";
```
로 교체. **사용처(`${inputBase} ...`)는 한 글자도 안 바뀐다.** import 문자열 == 기존 const 문자열이므로 SET 100% 동일.

| # | 스팟 | 조치 |
|---|------|------|
| 1 | `DsrCalculator:37` | const 삭제 → `import { INPUT_BASE as inputBase }` |
| 2 | `ElectricityBillCalculator:24` | 동일 |
| 3 | `FourInsuranceCalculator:24` | 동일 |
| 4 | `LoanInterestCalculator:30` | 동일 |
| 5 | `LoanPrepaymentFeeCalculator:27` | 동일 |
| 6 | `SalaryNetCalculator:15` | 동일 |
| 7 | `ServicePeriodCalculator:11` | 동일 |
| 8 | `SeverancePayCalculator:20` | 동일 |
| 9 | `SupportInquiryForm:6` | 동일 |

### 그룹 A' — 인라인 INPUT 4곳 (인라인 base 부분만 `${INPUT_BASE}`로 치환, 에러 델타 보존)
| # | 스팟 | 리팩터 후 조합식 | SET 보존 |
|---|------|------------------|----------|
| 10 | `AgeCalculator:49` | `` `${INPUT_BASE} ${error ? "border-brand-warning" : "border-brand-border"}` `` | INPUT_BASE ∪ {에러 조건부 border색}. 현재와 동일 |
| 11 | `BmiCalculator:101` | 동일 패턴 | 동일 |
| 12 | `BmiCalculator:121` | 동일 패턴 | 동일 |
| 13 | `DdayCalculator:52` | 동일 패턴 | 동일 |

`import { INPUT_BASE } from "@/lib/inputClass";` 추가.

### 그룹 B — INPUT base + 정적 델타 2곳
| # | 스팟 | 리팩터 후 조합식 | SET 보존 |
|---|------|------------------|----------|
| 14 | `DdayCalculator:77` | `` `${INPUT_BASE} border-brand-border` `` | INPUT_BASE ∪ {border-brand-border}. 현재 `border border-brand-border` == base의 `border` + 델타 |
| 15 | `UnitConverter:18` const `inputBase` | `` const inputBase = `${INPUT_BASE} min-w-0 border-brand-border` `` | INPUT_BASE ∪ {min-w-0, border-brand-border}. 사용처 무변경 |

> **UnitConverter는 로컬 const를 유지**하되 값만 `${INPUT_BASE} ...`로 합성한다(전용 문자열이라 표준과 다름 → 억지 단일화 금지 원칙). 드리프트 취약 꼬리는 INPUT_BASE 경유로 단일소스화됨.

### 그룹 C — SELECT 4곳
| # | 스팟 | 리팩터 후 조합식 | SET 보존 |
|---|------|------------------|----------|
| 16 | `ElectricityBillCalculator:27` const `selectBase` | 삭제 → `import { SELECT_BASE as selectBase }` | SELECT_BASE == 표준 select 문자열(`w-full` 포함). 사용처 `className={selectBase}` 무변경 |
| 17 | `FourInsuranceCalculator:27` | 동일 | 동일 |
| 18 | `SalaryNetCalculator:18` | 동일 | 동일 (`:262`의 `disabled:*` 델타는 사용처 유지) |
| 19 | `UnitConverter:21` const `selectBase` | `` const selectBase = `${SELECT_CORE} min-w-0` `` | SELECT_CORE ∪ {min-w-0}. 사용처 `${selectBase} w-full`/`w-auto` 무변경 → 최종 SET에 min-w-0+w-full/ w-auto 공존, 현재와 동일 |

> **폭 토큰 처리(핵심)**: 표준 select는 `w-full`을 base에 baked → `SELECT_BASE = SELECT_CORE + w-full`. UnitConverter는 `min-w-0`을 base에 두고 폭을 사용처에서 붙임 → 로컬 `selectBase = SELECT_CORE + min-w-0`. `w-full` vs `min-w-0`은 **가법 델타가 아닌 상충**이므로 하나의 SELECT 상수로 통일 불가 → 폭 없는 `SELECT_CORE`를 공유하고 폭은 스팟이 결정.

### 그룹 D — TEXTAREA 1곳
| # | 스팟 | 리팩터 후 조합식 | SET 보존 |
|---|------|------------------|----------|
| 20 | `SupportInquiryForm:140` | `` `${TEXTAREA_BASE} ${errors.message ? "border-brand-warning" : "border-brand-border"} disabled:opacity-60` `` | TEXTAREA_BASE ∪ {에러 조건부 border색, disabled:opacity-60}. 현재와 동일 |

`import { INPUT_BASE, TEXTAREA_BASE } from "@/lib/inputClass";` (Support는 인풋 const도 있으니 함께 import).

---

## 5. 중앙화 / 잔류 경계

**중앙화(→ `lib/inputClass.ts`)**: 드리프트 취약 공유 클러스터만.
- `FIELD_FOCUS` (아웃라인/포커스/타이포 꼬리 — 20곳 전부 공유, 07-15 lockstep의 원흉)
- `INPUT_BASE`, `SELECT_CORE`, `SELECT_BASE`, `TEXTAREA_BASE` (형태별 골격)

**스팟에 잔류(중앙화 금지)**: 스팟마다 값이 다르거나 상태에 의존하는 델타.
- 에러 조건부 border색 (`${error ? ... : ...}`) — 상태 의존, 컴포넌트 로직
- 폭 (`w-full` / `w-auto` / `min-w-0`) — 스팟마다 상충
- 아이콘/단위 여백 (`pr-9` / `pr-12`) — 스팟별
- `disabled:*` 계열 (`disabled:opacity-60`, `disabled:cursor-not-allowed`, `disabled:bg-brand-border/20` 등) — 스팟별 조합 상이
- `border-brand-border` 정적 부착 — 에러 없는 스팟에서만

경계 원칙: **"모든 스팟에서 동일하게 등장하고, 바뀌면 lockstep 편집을 유발하는 토큰"만 중앙화.** 스팟별로 다른 값은 남긴다.

---

## 6. 회귀 검증 방법 (개발팀 체크리스트)

1. **빌드 유지**: `next build`가 기존과 동일하게 성공, **정적 페이지 32개 그대로**(증감 없음).
2. **산출 CSS 무변경**: 빌드 산출물 CSS를 리팩터 전/후 diff. Tailwind는 사용된 유틸의 합집합으로 CSS를 생성하므로, 클래스 SET이 보존되면 **생성 CSS 파일은 바이트 동일**해야 한다. 달라지면 어딘가 SET이 깨진 것.
3. **스팟별 클래스 SET 대조**: 20곳 각각에 대해 (리팩터 후 조합식이 만드는 문자열을 공백 split → 정렬 → 집합) == (리팩터 전 문자열 집합) 인지 확인. 정렬 후 비교로 순서 차이 무시.
4. **git diff 성격 확인**: diff가 (a) `lib/inputClass.ts` 신규 + (b) 각 파일에서 const/인라인 문자열 → import·`${상수}` 치환, 두 종류뿐인지. 로직/JSX 구조 변경이 섞이면 순수 추출이 아님.
5. **런타임 스팟 점검(대표 3종)**: 인풋 에러 상태(border-brand-warning 토글), 셀렉트 포커스 링, disabled(Support 제출 중 textarea) 각각 리팩터 전과 동일하게 보이는지 dev 프리뷰로 육안 확인. **화면 변화 0가 목표이므로 어긋나면 즉시 반려.**

> 위 2·3이 핵심 게이트. 시각 회귀 테스트보다 **SET 대조 + CSS diff**가 이 작업의 정확한 안전망이다.

---

## 7. 위험 / 주의

1. **인라인 템플릿리터럴 + 조건부 에러 델타의 공백 처리**(Age·Bmi×2·Dday:52·Support:140). `${INPUT_BASE} ${error ? ...}` 처럼 **상수와 델타 사이 공백 1칸**을 반드시 넣을 것. `${INPUT_BASE}${error...}`로 붙으면 `...primary/15border-brand-border`로 토큰이 뭉개져 SET이 깨진다. 반대로 상수 끝/델타 앞에 공백이 겹쳐 이중 공백이 생기는 건 무해(Tailwind가 무시). **깨지는 건 공백 누락, 무해한 건 공백 중복.**
2. **`FIELD_FOCUS` 끝에 공백 없음**을 전제로 `INPUT_BASE` 등에서 `${FIELD_FOCUS}`를 문자열 끝에 두거나 그 뒤에 공백+토큰을 붙였다. 상수 정의 시 각 조각 사이 공백 1칸 유지.
3. **UnitConverter 로컬 const 유지**: import로 완전히 대체하지 말 것. 값이 표준과 달라(min-w-0/전용 border) `${INPUT_BASE}`·`${SELECT_CORE}` 합성으로만 처리. import 대상은 `INPUT_BASE`, `SELECT_CORE` 두 개.
4. **표준 select의 `w-full`은 base에 남아 있어야** 한다(사용처가 `className={selectBase}` bare). `SELECT_BASE = SELECT_CORE + w-full` 확인. `SELECT_CORE`를 그대로 표준 select에 쓰면 `w-full` 누락으로 폭이 줄어드는 **시각 회귀** 발생.
5. **별칭 import 이름**: 그룹 A/C는 `import { INPUT_BASE as inputBase }` / `{ SELECT_BASE as selectBase }`로 로컬 사용명을 유지해 사용처 diff를 0으로. 이름을 바꾸면 사용처까지 수정해야 해 diff가 커지고 실수 여지 증가.
6. **`SalaryNet:262` disabled 델타**·**`Dsr`/`LoanPrepay`의 `pr-9`/`pr-12` 델타**는 전부 사용처에 그대로 둔다(중앙화 대상 아님).

---

## 8. 다른 팀에 넘길 이슈 / 이견

- **이 작업은 순수 구조 리팩터라 디자인 결정 변경 없음.** 톤앤매너/브랜딩 변화 0. 마스터 승인 필요한 시각 변경 항목 없음.
- **개발팀 재량 결정 1건**: §3의 `FIELD_FOCUS` 범위(타이포 토큰 `text-base text-brand-text` 포함 여부). 어느 쪽도 SET 보존은 동일하므로 개발팀이 가독성 기준으로 택1하고 결과만 공유해 달라.
- **관측된 기존 불일치(이번 스코프 밖, 보고만)**: UnitConverter의 인풋/셀렉트 base는 다른 계산기들과 폭·border 처리 방식이 다르다(`min-w-0` + border색 baked vs. 표준의 사용처 부착). 이번엔 **현행 SET 그대로 보존**하며 손대지 않는다. 다만 향후 폼 필드 정합성을 맞추고 싶다면 별도 티켓으로 다뤄야 한다(이 경우 **시각 변화가 생기므로 디자인/마스터 승인 필요** — 이번 "픽셀 변화 0" 작업과 분리할 것).
- **후속 제안**: 이번 추출로 `lib/inputClass.ts`가 생기면, 신규 계산기 추가 시 개발팀이 base 문자열을 복붙하지 말고 이 상수를 import하도록 컨벤션화(드리프트 재발 방지). 필요하면 디자인팀이 신규 페이지 구성안에 "폼 필드는 `lib/inputClass.ts` 상수 사용" 명시를 넣겠다.
