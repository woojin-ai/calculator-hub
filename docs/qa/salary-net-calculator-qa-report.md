# 연봉 실수령액 계산기 — QA 독립 검증 보고서

- 검증일: 2026-07-14
- 검증자: QA팀 (독립 검증, 구현 미관여)
- 대상: `/calculator/salary-net-calculator`
  - 검증 대상 1: H-1 (커밋 `76c5bc3`, 이미 반영됨)
  - 검증 대상 2: CS 문안 개선 5건 (working tree, 미커밋 — `components/SalaryNetCalculator.tsx`, `lib/calculators.ts`)
- 참고한 원본 스펙: `planning/salary-net-calculator-content.md`, `design/salary-net-calculator-ui-spec.md`, `cs/salary-calculator-review.md`
- 원칙: 코드 미수정(검증만 수행), 배포 없음, 애매한 항목은 FAIL로 처리.

## 총평

검증 대상 1(H-1 수치 정정)과 검증 대상 2의 6개 항목 중 5개는 PASS. 다만 **용어 일관성 항목에서 FAIL 1건**(신규 도입된 미설명 전문용어 "기준소득월액")을 발견했고, 요청 범위 밖이지만 **사이트 전역에 영향을 주는 렌더링 결함 1건**(결과해석 5단락 구조가 실제 화면에서는 한 문단으로 붙어 렌더링됨)을 추가로 발견해 보고한다. 개인정보 항목은 라이브 코드 기준으로는 PASS이나, 커밋되지 않은 내부 문서 파일에 평문 이메일이 남아있어 커밋 전 조치가 필요하다는 점을 별도로 플래그한다.

---

## 검증 대상 1: H-1 (커밋 76c5bc3) — interpretation 1문단 개별 수치 재검산

### 방법
마스터의 기존 tsx 확인과 별개로, `lib/salary.ts`를 격리된 스크래치 디렉터리에 복사 후 `tsc`로 독립 컴파일 → `node`로 직접 실행. 추가로 동일 STEP1~11 알고리즘을 손으로도 재계산해 엔진 출력과 대조(2개 입력 조합).

### 결과: PASS

**입력 1 (interpretation 예시 그대로): 연봉 40,000,000 / 월비과세 200,000 / 부양가족 1 / 자녀 0**

독립 실행 결과(`node`로 직접 실행):
```
nationalPension: 148817, healthInsurance: 112643, longTermCare: 14582,
employmentInsurance: 28199, insuranceTotal: 304241,
incomeTax: 105888, localIncomeTax: 10588,
monthlyNet: 2912616, annualNet: 34951392
```

`lib/calculators.ts` interpretation 1문단 표기치와 1:1 대조:

| 항목 | interpretation 표기 | 독립 실행 결과 | 손 계산(§1-3 STEP1~11 재현) | 일치 |
|---|---|---|---|---|
| 국민연금 | 148,817 | 148,817 | floor(3,133,000×4.75%)=148,817.5→148,817 | 일치 |
| 건강보험 | 112,643 | 112,643 | floor(3,133,333×3.595%)=112,643.32→112,643 | 일치 |
| 장기요양 | 14,582 | 14,582 | floor(112,643×12.9457%)=14,582.42→14,582 | 일치 |
| 고용보험 | 28,199 | 28,199 | floor(3,133,333×0.9%)=28,199.997→28,199 | 일치 |
| 4대보험 합 | 304,241 | 304,241 | 148,817+112,643+14,582+28,199=304,241 | 일치 |
| 근로소득세 | 105,888 | 105,888 | floor(1,270,666.2÷12)=105,888.85→105,888 | 일치 |
| 지방소득세 | 10,588 | 10,588 | floor(105,888×10%)=10,588.8→10,588 | 일치 |
| 월 실수령액(약 291만원) | 약 291만원 | 2,912,616 → 291만(반올림) | 3,333,333−304,241−116,476=2,912,616 | 일치 |
| 연 환산(약 3,495만원) | 약 3,495만원 | 34,951,392 → 3,495만(반올림) | 2,912,616×12=34,951,392 | 일치 |

손 계산 세부(STEP2~11, 검증용): LD=10,890,000 → EI=26,710,000 → DED(인적1,500,000+연금1,785,804+특별1,865,088)=5,150,892 → TB=21,559,108 → CT=1,973,866.2 → WTC=min(917,159.86, cap 703,200)=703,200 → CTC=0 → DT=1,270,666.2 → 월세=105,888.85→105,888. 코드의 STEP4 특별소득공제 계산(`insuranceTotal×12 − pension×12`)과 완전히 동일한 경로로 손 계산해도 같은 값이 나옴을 확인.

**입력 2 (회귀 확인용 추가 조합): 연봉 60,000,000 / 월비과세 200,000 / 부양가족 2 / 자녀 1**

엔진 출력(`nationalPension 228000, healthInsurance 172560, longTermCare 22339, employmentInsurance 43200, incomeTax 273876, localIncomeTax 27387, monthlyNet 4232638`)을 동일 알고리즘으로 손 계산 → 전 항목 정확히 일치(자녀세액공제 250,000·근로소득세액공제 한도 660,000 분기 등 조건부 로직까지 정상 확인).

**결론**: interpretation의 7개 개별 수치·2개 반올림 요약 모두 실제 엔진 출력과 정확히 일치. CS 리뷰(H-1)가 지적한 "해설 예시 ≠ 엔진 출력" 문제는 완전히 해소됨.

---

## 검증 대상 2: CS 문안 개선 5건 (미커밋)

### 1. 빌드 검증 — PASS

```
npm run build
...
✓ Compiled successfully in 2.5s
  Running TypeScript ...
  Finished TypeScript in 2.8s ...
✓ Generating static pages using 7 workers (21/21) in 549ms
```
종료 코드 확인: `echo EXIT_CODE=$?` → `EXIT_CODE=0`. `/calculator/salary-net-calculator` 정적 경로 정상 포함, 타입에러 0.
추가로 `npx eslint components/SalaryNetCalculator.tsx lib/calculators.ts` 실행 결과 출력 없음(경고·에러 0건).

### 2. 용어 일관성 — 부분 FAIL

**PASS 부분**: "실수령액"(전 페이지, 전 사이트 공통으로 "실 수령액" 등 띄어쓰기 변형 없음 확인 — `실\s?수령액` 정규식 grep), "비과세", "부양가족", "간이세액표"(모두 붙여쓰기로 통일, 사이트 전역 grep 결과 변형 표기 없음), "8~20세" 표기 일관(물결표 통일). 다른 라이브 계산기(만나이/D-Day/대출/BMI)는 이 용어들을 쓰지 않아 직접 충돌은 없음.

**FAIL: 신규 도입 전문용어 "기준소득월액"이 사용자 노출 텍스트에 무설명으로 유입됨**

- 위치: `lib/calculators.ts` interpretation 5문단(면책), 오늘 diff로 추가된 문장: "...4대 보험료도 회사의 신고·산정 방식이나 **기준소득월액** 적용 시점에 따라 실제 공제액과 소액의 차이가 날 수 있습니다."
- 근거(재현):
  - `grep -n "기준소득월액" lib/calculators.ts` → interpretation 필드(라이브 사용자 노출 텍스트)에서 매치.
  - `cs/salary-calculator-review.md` 총평(4행): "'기준소득월액','특별소득공제'는 사용자 노출 텍스트엔 없음(**재발 아님**)" — 즉 이 리뷰 시점엔 사용자 텍스트에 없는 것이 정상 상태로 확인되어 있었는데, 오늘 M-4 반영으로 그 상태가 깨져 **재발**했다.
  - 사이트 자체 선례와 불일치: 동일 diff에서 "간이세액표"에는 "(회사가 매달 월급에서 세금을 뗄 때 쓰는 기준표)"라는 괄호 풀이를 새로 추가했고, 대출 계산기 FAQ("...DSR(총부채원리금상환비율) 등...")도 약어를 항상 괄호로 풀어준다. 즉 이 사이트는 전문용어·약어를 최초 노출 시 괄호로 설명하는 관행이 이미 있는데, "기준소득월액"만 그 관행에서 예외로 남아 **같은 커밋 안에서 기준이 스스로 어긋난다.**
  - 실제 렌더링(`next start` 후 curl)에서도 해당 문장이 그대로 노출됨을 확인(`grep "기준소득월액 적용 시점에 따라" salary-page.html` 매치).
- 판단: 계산 오류나 사실관계 오류는 아니나("기준소득월액에 따라 4대보험이 소액 다를 수 있다"는 사실 자체는 정확함, planning §7-2 근거), **일반 사용자가 이해할 수 없는 용어를 설명 없이 노출**했고 이는 사이트가 오늘 다른 용어(간이세액표)에는 적용한 것과 동일한 기준을 적용하지 않은 **일관성 결함**이다.
- 이관 제안: 기획팀(문안) — "기준소득월액(4대 보험료 산정 기준이 되는 월 소득액)" 식의 짧은 괄호 풀이 추가, 혹은 "회사가 신고하는 소득 기준액"처럼 쉬운 말로 대체 검토.

**참고(낮음, 블로킹 아님): M-1 문구와 FAQ 6번 문구의 표현 차이**
- 계산 버튼 하단(오늘 커밋 76c5bc3, M-1): "입력하신 연봉·비과세액 등은 브라우저 **안**에서만 계산되며 서버**에 저장·전송**되지 않습니다."
- 같은 페이지 FAQ 6번(및 나머지 3개 계산기 FAQ와 동일 패턴): "...브라우저 **내**에서만 계산에 사용되며 서버**로 전송되거나 저장**되지** 않습니다."
- 의미 모순은 없음(둘 다 "저장/전송 안 함"을 말함)이나, 같은 페이지·같은 주제 문장이 사이트 표준 문구와 어순·조사가 다르게 두 벌 존재. FAIL로 처리하지 않으나 기획팀 참고용으로 남김.

### 3. 계산 정확성 회귀 없음 — PASS

```
git diff -- lib/salary.ts        → 출력 없음 (working tree 변경 없음)
git log --oneline -- lib/salary.ts → f84c1b4 (최초 생성) 1건만 존재
```
`lib/salary.ts`는 오늘 커밋(76c5bc3)에도, 현재 working tree에도 전혀 포함되지 않음. `git show --stat 76c5bc3` 결과에서도 변경 파일 목록(`components/SalaryNetCalculator.tsx`, `cs/salary-calculator-review.md`, `lib/calculators.ts`, `marketing/promo-drafts.md`)에 `lib/salary.ts`가 없음을 재확인. 계산 로직은 손대지 않았고 텍스트만 변경됐다는 커밋 메시지 진술과 일치.

### 4. 엣지케이스 입력 — PASS

`calculateSalary`를 독립 실행 + 컴포넌트의 `formatAmountInput`/`handleSubmit` 로직을 그대로 재현한 시뮬레이션 스크립트로 "사용자가 실제 입력창에 타이핑했을 때" 관점까지 재현.

| 입력 | 화면 동작 | 비고 |
|---|---|---|
| 연봉 0 | `annualNum<=0` 체크에서 즉시 차단, "연봉을 올바르게 입력해주세요." 에러 표시. `calculateSalary` 호출조차 안 됨 | PASS |
| 연봉 10억(매우 큰 값) | 정상 계산: 월 실수령 46,706,836원. 국민연금 상한 캡 정상 작동(313,025원 = 6,590,000×4.75%, planning §1-2가 명시한 상한 캡 값과 정확히 일치) | PASS |
| 연봉에 "-40000000" 타이핑(음수 시도) | `formatAmountInput`이 숫자 이외 문자를 모두 제거해 "-"가 지워지고 "40,000,000"(양수)으로 표시됨. 크래시·NaN 없음 | PASS(단, "부호가 조용히 사라짐"은 예상 동작이나 사용자에게 별도 안내는 없음 — 대출 계산기(`LoanInterestCalculator.tsx`)와 완전히 동일한 기존 패턴이라 오늘 변경으로 인한 회귀 아님) |
| 연봉에 "40000000.5" 타이핑(소수점 시도) | 마침표도 숫자가 아니므로 제거되어 "400000005"(4억, 10배 부풀려진 값)로 표시·계산됨. 크래시는 없으나 사용자의 원래 의도와 다른 큰 값이 조용히 계산됨 | PASS(크래시 없음 기준)이나 관찰사항으로 기록. 동일하게 `LoanInterestCalculator.tsx`도 같은 정규식(`replace(/[^\d]/g, "")`)을 쓰는 기존 공통 패턴이라 오늘 변경 범위 밖 |
| 빈 값 / "abc" | 위 "연봉 0"과 동일하게 사전 차단, 에러 메시지 표시 | PASS |
| (엔진 레벨 추가) dependents=0, taxFreeMonthly<0, children<0, annualSalary<0, Infinity | 모두 `calculateSalary`가 `null` 반환(방어 로직 정상). UI라면 "입력값을 다시 확인해주세요." 표시 | PASS |
| (엔진 레벨 추가) annualSalary=1e12 | 오버플로/NaN 없이 유한한 수치로 정상 계산 | PASS |

결론: 계산기는 요청된 4가지 엣지케이스(0/큰 값/음수/소수점) 모두 에러 없이 합리적으로 처리한다. 음수·소수점 문자 제거는 오늘 수정 대상(H-1, CS 5건)과 무관한 기존 공통 입력 처리 패턴이며 대출 계산기와 동일하다.

### 5. 개인정보 노출 재확인 — PASS(라이브 코드 기준) + 별도 위험 1건 발견

**라이브/커밋된 코드 기준: PASS**
- `rg sss159228` (전체 저장소, node_modules 제외) → **매치 1개 파일**: `docs\team-log\2026-07-14.md` (아래 참고). `app/`, `components/`, `lib/`, `public/` 등 실제 서비스되는 코드에는 전혀 없음.
- `app/api/contact/route.ts` 확인 결과 이메일은 `process.env.CONTACT_TO_EMAIL`(환경변수)로만 참조, 하드코딩 없음.
- `components/SupportInquiryForm.tsx`는 `fetch("/api/contact", ...)`만 호출, mailto·이메일 문자열 없음.
- `next start` 프로덕션 서버 기동 후 `curl`로 받은 실제 렌더링 HTML(`/calculator/salary-net-calculator`, `/support`, `/privacy` 등)에 `sss159228`/`gmail` 문자열 0건(`grep` 결과 no matches).
- `/privacy`, `/support` 페이지는 이메일 주소 대신 "고객센터 문의하기(/support#ask)" 링크·문구로만 안내해 다른 계산기 페이지와 모순 없음.

**추가 발견(중요, 조치 권고): 미커밋 내부 문서에 평문 이메일 잔존**
- `docs/team-log/2026-07-14.md`(현재 `git status` 상 **untracked**)에 개인 이메일 주소가 2회 그대로 노출(과거 mailto 연동 상태를 기록한 서술). [편집: 마스터가 이후 마스킹 처리함]
- Bash `grep -rn`(gitignore 미고려)로 재확인 시 `.env.local`의 `CONTACT_TO_EMAIL` 값도 검출되나, `git check-ignore -v .env.local` 결과 `.gitignore`(`.env*` 패턴)에 걸려 커밋 대상이 아님을 확인(`git ls-files | grep -i "\.env"` 결과 없음) → 이쪽은 정상(서버 전용 시크릿). **[마스터 주: 이 QA 보고서 초안 자체도 검증 과정에서 `.env.local`의 실제 이메일 값을 그대로 인용하고 있었음을 발견 — 원본 시크릿을 커밋 대상 문서에 재인용하는 것 자체가 불필요한 노출이라 판단해 이 보고서에서도 마스킹 처리함. 향후 QA/감사 보고서는 시크릿 파일의 "존재·설정 여부"만 확인하고 실제 값은 인용하지 않을 것.]**
- 반면 `docs/team-log/2026-07-14.md`는 커밋 이력이 없는(`git log --all -- docs/team-log/` 결과 없음) **완전히 새 파일**이며, 같은 날짜의 자매 파일(`cs/salary-calculator-review.md`)은 이미 오늘 커밋(76c5bc3)됐다. `MEMORY`에 "auto-push authorized" 워크플로가 명시돼 있어, 이 팀로그가 향후 그대로 커밋·푸시되면 원격 저장소(`https://github.com/woojin-ai/calculator-hub.git`)에 개인 이메일이 영구적으로 남을 위험이 있다.
- 이관 제안: 마스터/운영 — 해당 로그 파일 커밋 전 이메일 부분을 마스킹(일반화된 표현으로 대체)하거나, 최소한 커밋 시 재확인 절차를 거칠 것을 권고. (QA는 문서를 직접 수정하지 않음 — 마스터가 대신 마스킹 완료.)

### 6. 링크/오탈자 — PASS

- 오늘 5건의 텍스트 교체 어디에도 신규 링크(`<a href>`)는 추가되지 않음(diff 확인) → 새로 깨진 링크 위험 없음.
- `next start` 후 실제 페이지에 존재하는 모든 링크를 curl로 상태코드 확인(전부 200): `/`, `/salary`, `/loan`, `/date`, `/life`, `/blog`, `/support`, `/support#ask`, `/privacy`, `/terms`, `/about`, `/calculator/age-calculator`, `/calculator/dday-calculator`, `/calculator/loan-interest-calculator`, `/calculator/bmi-calculator`.
- 관련 계산기 노출 순서(만 나이 → D-Day → 대출이자)도 `planning/salary-net-calculator-content.md` §5의 예측과 정확히 일치.
- 오탈자: 5건 텍스트를 전수 육안 검토 + 자동 스캔(이중 공백/이중 구두점/단어 반복 정규식) 실시, 모두 이상 없음(`doubleSpace/doublePunct/repeatedWord` 전부 false). "8~20세 자녀 수"(입력 라벨)와 "만 8세 이상 20세 이하 자녀"(신규 FAQ 문구) 표현은 다르지만 의미 일치, 모순 아님.
- interpretation 총 길이 965자로 기획 기준(500~1000자) 충족, 5단 구조 유지(`\n\n` 기준 5개 문단 확인).

---

## 요청 범위 밖 추가 발견 (중요 — 사이트 전역 영향, 오늘 변경이 원인 아님)

### 결과해석(interpretation) 5단락 구조가 실제 화면에서는 한 문단으로 붙어 렌더링됨

- **재현 방법**: `next start`로 프로덕션 서버 기동 → `curl http://localhost:3411/calculator/salary-net-calculator` → 받은 HTML에서 interpretation 문단 경계 지점(`...연 환산 약 3,495만원입니다.` 뒤)의 원문 바이트를 직접 검사.
  ```
  "연 환산 약 3,495만원입니다.\n\n실수령액은 세전 급여(연봉)에서 4대 보험료..."
  ```
  즉 실제 서버 렌더링 HTML의 `<p>` 텍스트 노드 안에 리터럴 개행문자(`\n\n`)가 그대로 들어있다.
- **원인**: `components/ResultInterpretation.tsx`가 `interpretation` 문자열 전체를 개행 보존 클래스(`whitespace-pre-line`/`pre-wrap`) 없이 단일 `<p className="text-pretty text-sm leading-relaxed ...">{text}</p>`로만 렌더링한다. HTML/CSS 기본값(`white-space: normal`)에서는 연속 개행이 공백 1칸으로 축약되므로, 브라우저에서는 5개 문단이 **줄바꿈 없이 이어진 하나의 문단**으로 보인다.
- **검증(오탐 배제)**: Tailwind `preflight.css`에 `white-space` 규칙 없음(`grep` 결과 0건), 실제 빌드된 CSS 청크(`.next/static/chunks/*.css`)에도 `white-space:nowrap` 외 다른 값 없음(`pre-line`/`pre-wrap` 0건) → 이 컴포넌트의 개행 미보존을 상쇄할 CSS가 프로젝트 어디에도 없음을 확인.
- **범위**: 이 컴포넌트는 5개 라이브 계산기가 공용으로 쓴다. `lib/calculators.ts`의 interpretation 문단 수를 코드로 세어보면 만나이 1(영향없음)·D-Day 5·**연봉 5**·대출이자 5·BMI 4 — **연봉을 포함해 4개 계산기의 결과해석이 전부 이 문제의 영향을 받는다.**
- **오늘 변경과의 관계**: `git log --oneline -- components/ResultInterpretation.tsx` → `f2432c9`(최초 커밋), `29d6a6c`(어제, "orphan card/text widow" 수정 — `text-pretty` 클래스만 추가, 개행 처리와는 무관)만 존재. **오늘의 H-1·CS 5건 커밋은 이 컴포넌트를 건드리지 않았으므로 오늘 변경이 만든 회귀는 아니다.** 다만 오늘 M-4로 5번째 문단(면책)의 길이가 늘어나 이미 붙어버린 "벽문단"이 조금 더 길어지는 효과는 있다.
- **판단**: 계산기 자체의 계산 정확성과는 무관하지만, 기획팀이 §2에서 설계한 "5단 구조"(①결과요약→②계산기준→③실생활팁→④출처→⑤면책)가 사용자에게 실제로는 구분 없이 전달되고 있어 콘텐츠 가독성·YMYL 신뢰도 측면에서 영향이 크다고 판단해 별도로 보고한다. 오늘 배정된 두 changeset의 범위는 아니므로 PASS/FAIL 판정에는 포함하지 않되, 개발팀 백로그로 이관 권고(예: `whitespace-pre-line` 클래스 추가 또는 `text.split("\n\n")`를 개별 `<p>`로 매핑).

---

## 종합 결론

| 검증 항목 | 판정 |
|---|---|
| 검증 대상 1: H-1 수치 재검산 | **PASS** |
| 대상2-1: 빌드/타입 검증 | **PASS** |
| 대상2-2: 용어 일관성 | **부분 FAIL** ("기준소득월액" 무설명 신규 노출) |
| 대상2-3: 계산 정확성 회귀 없음 | **PASS** |
| 대상2-4: 엣지케이스 | **PASS** |
| 대상2-5: 개인정보 노출(라이브 코드) | **PASS** (단, 미커밋 문서 위험 별도 발견 — 조치 권고) |
| 대상2-6: 링크/오탈자 | **PASS** |
| (범위 밖) 결과해석 개행 렌더링 | **결함 발견** (사이트 전역, 오늘 변경 무관, 개발팀 백로그 권고) |

### 이관 제안 (마스터 경유)
1. **기획팀**: interpretation 5문단 면책의 "기준소득월액"에 짧은 괄호 풀이 추가 또는 쉬운 표현으로 교체.
2. **마스터/운영**: `docs/team-log/2026-07-14.md`(미커밋) 내 평문 이메일 2건, 커밋 전 마스킹 검토.
3. **개발팀(백로그, 오늘 변경과 무관한 기존 결함)**: `components/ResultInterpretation.tsx`가 `\n\n` 문단 구분을 시각적으로 보존하지 않는 문제 — 연봉·D-Day·대출이자·BMI 4개 계산기 결과해석에 공통 영향.
4. (참고, 낮음) 기획팀: M-1 개인정보 안내 문구와 FAQ 6번 문구의 표현 통일 검토.

QA는 위 사항을 직접 수정하지 않았습니다. 각 이관 대상 팀의 반영 후 재검증이 필요합니다.
