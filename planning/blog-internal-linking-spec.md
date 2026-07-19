# 블로그 상세 페이지 — 형제 글 내부링크 기획안

- 작성: 기획팀 / 2026-07-19
- 대상: `app/blog/[slug]/page.tsx`, `lib/blog.ts`(셀렉터 추가), `components/RelatedBlogPosts.tsx`(prop 1개 추가)
- 상태: 개발팀 착수 가능 (blocker 0)

---

## 0. 배경과 갭

블로그 28편(salary 8 · loan 8 · date 5 · life 7)의 상세 페이지는 현재 본문 뒤에 `RelatedCalculators`(계산기 링크)만 렌더한다. **형제 블로그 글로 가는 링크가 0건**이라, 블로그 상세는 "블로그 → 계산기" 단방향 종착지다. 독자가 글을 다 읽으면 선택지가 계산기 3개 또는 이탈뿐이다.

이 문서는 그 갭을 메우는 "함께 읽으면 좋은 글" 섹션의 **선정 알고리즘 · 노출 수 · 헤딩 문구 · 섹션 순서**를 확정한다.

기대 효과: 세션당 페이지뷰 증가 → 애드센스 노출 증가, 그리고 상세 페이지 간 내부링크 그래프 형성(크롤 깊이 개선).

---

## 1. 선정 알고리즘 (확정)

### 1-1. 용어

- `post` = 현재 보고 있는 글
- `primary(p)` = `p.relatedCalculatorSlugs[0]` — 그 글이 **주로 지지하는 계산기**. 데이터를 전수 확인한 결과, 28편 모두 0번 슬롯이 그 글의 주력 계산기이고 1~2번 슬롯은 보조/장식성 링크다(예: life 카테고리 글 다수가 3번 슬롯에 `dday-calculator`를 관성적으로 달고 있다). 따라서 "겹침"을 단순 교집합으로 잡으면 노이즈가 크다 — 아래 티어 설계는 이 관찰에 기반한다.
- `overlap(a, b)` = `|a.relatedCalculatorSlugs ∩ b.relatedCalculatorSlugs|`

### 1-2. 티어 (위에서부터 순서대로 채운다, 총 4편)

> **[2026-07-19 마스터 확정] 노출 편수 6 → 4로 변경.** 이 문서 초안의 "6편"은 `lg:grid-cols-3` 3열 그리드에서 정확히 2행이 된다는 전제로 잡은 값이었다. 이후 `design/blog-related-posts-section-spec.md`가 상세 페이지를 **2열**로 확정(§7-4, §8-2)하면서 그 전제가 무효화됐고, 2열에서는 4편이 2×2로 정확히 떨어진다. 구현(`POST_RELATED_BLOG_LIMIT = 4`)이 정답이며 아래 본문의 "6편" 서술은 초안 근거로만 읽을 것.

| 티어 | 조건 | 정렬 키 | 캡 |
|---|---|---|---|
| **T1** 같은 주력 계산기 | `primary(cand) === primary(post)` | 발행일 desc → slug asc | 없음(실측 최대 2) |
| **T2a** 강한 계산기 겹침 | `overlap ≥ 2` | overlap desc → 발행일 desc → slug asc | 없음 |
| **T3** 같은 카테고리 | `cand.category === post.category` | 발행일 desc → slug asc | 없음 |
| **T2b** 약한 계산기 겹침 | `overlap === 1` **이고** (`primary(post) ∈ cand.calcs` **또는** `primary(cand) ∈ post.calcs`) | 발행일 desc → slug asc | 없음 |
| **T4** 태그 겹침 | 태그 문자열 완전일치 1개 이상 | 태그겹침수 desc → 발행일 desc → slug asc | 없음 |

- **총 노출: 4편** (`POST_RELATED_BLOG_LIMIT = 4`). 4편에 도달하면 이후 티어는 평가하지 않는다. (초안값 6 → 확정값 4, 위 박스 참조)
- **자기 자신 제외**: 모든 티어에서 `cand.slug !== post.slug` 필수.
- **중복 제거**: 이미 선택된 slug 집합(`Set<string>`)에 있으면 하위 티어에서 스킵. 한 글은 절대 두 번 나오지 않는다.
- `relatedCalculatorSlugs`가 빈 배열인 글은 `primary`가 `undefined`이므로 T1/T2a/T2b를 건너뛴다(현재 데이터엔 없지만 방어).

### 1-3. 왜 이 순서인가

**T1이 최상위인 이유** — 이 사이트의 핵심 콘텐츠 패턴은 "개념글 + 조견표글" 쌍이다. 이 쌍은 `primary`가 같다는 사실로 정확히 식별된다. 실측 결과 16개 계산기 중 10개가 쌍/삼중을 이룬다:

| primary 계산기 | 묶이는 글 |
|---|---|
| salary-net-calculator | salary-net-income-guide-2026 ↔ salary-net-by-bracket-2026 |
| dsr-calculator | dsr-loan-limit-guide-2026 ↔ dsr-by-income-rate-2026 |
| electricity-bill-calculator | summer-electricity-progressive-rate-2026 ↔ electricity-seasonal-progressive-2026 |
| **age-calculator** | **age-korean-age-law-2026 ↔ age-by-birth-year-2026** |
| weekly-holiday-allowance-calculator | weekly-holiday-allowance-guide-2026 ↔ weekly-holiday-allowance-eligibility-2026 |
| savings-interest-calculator | savings-interest-guide-2026 ↔ savings-interest-tax-guide-2026 |
| car-tax-calculator | car-tax-guide-2026 ↔ car-tax-prepay-relief-2026 |
| bmi-calculator | bmi-guide-2026 ↔ bmi-normal-weight-by-height-2026 |
| four-insurance-calculator | four-insurance-guide-2026 ↔ four-insurance-by-income-2026 |
| loan-interest-calculator | loan-repayment-type-comparison-2026 / loan-rate-term-impact-2026 / loan-prepayment-break-even-2026 (3편) |
| **service-period-calculator** | **service-period-guide-2026 ↔ service-period-milestone-2026** |

→ **요청받은 검증 2건 통과**: age 2편(4번·27번)은 둘 다 `primary = age-calculator`, service-period 2편(19번·28번)은 둘 다 `primary = service-period-calculator`. T1은 primary 동등성이라 **대칭**이므로 두 쌍 모두 **서로를 1번 슬롯에 무조건 노출**한다. 조건부가 아니라 구조적 보장이다.

T1이 비는 글은 5편뿐이다(annual-leave-allowance-guide, severance-pay-guide, loan-prepayment-fee-guide, dday-counting-guide, area-pyeong-sqm-conversion — 아직 2편째가 없는 계산기들). 나머지 23편은 항상 1번 슬롯에 최강 연관 글이 온다.

**T2a(overlap≥2)를 카테고리보다 위에 둔 이유** — 계산기를 2개 이상 공유하면 카테고리가 달라도 실제로 같은 문제를 다루는 글이다. 특히 date 카테고리의 근속/나이 글과 salary 카테고리의 퇴직금/연차 글을 잇는 **카테고리 간 다리**가 여기서 생긴다(카테고리 축만으로는 절대 생기지 않는 링크다).

**T3(카테고리)를 T2b보다 위에 둔 이유** — overlap이 1뿐인 겹침은 위에서 말한 "장식성 3번 슬롯" 때문에 생기는 경우가 많다(life 글들의 `dday-calculator`). 같은 카테고리 형제가 그보다 독자에게 유의미하다. 그래서 약한 겹침은 카테고리를 다 쓰고 난 뒤의 **패딩**으로만 쓴다. T2b에 primary 앵커 조건(`primary(post) ∈ cand.calcs` 또는 그 역)을 건 것도 같은 이유 — 이 조건이 없으면 만 나이 글이 자동차세 연납 글을 끌어온다(둘 다 3번 슬롯에 dday를 달고 있어서). 실측으로 확인한 실제 노이즈이며, 앵커 조건으로 제거된다(§3 예시 A 참조).

**T4(태그)를 최하위에 둔 이유** — 태그는 완전일치만 인정하는데 실측상 매우 희소하다. 겹치는 경우가 대부분 이미 T1에 잡히는 쌍이다(예: bmi-guide ↔ bmi-normal-weight-by-height는 "정상 체중 범위"·"대한비만학회 기준" 2개 일치, savings 2편은 "이자소득세 15.4%" 일치, car-tax 2편은 "자동차세 연납 할인" 일치). 즉 T4는 상위 티어의 부분집합에 가깝다. 안전망으로만 남긴다. **현재 데이터에서 T4가 실제로 발동해 카드를 채우는 케이스는 0건이다** — 삭제해도 되지만, 글이 늘면 값을 하므로 유지 권장(개발팀 판단으로 1차에서 생략해도 무방, 그 경우 §2 결론은 바뀌지 않음).

### 1-4. 결정성 (SSG)

모든 티어의 정렬 키는 마지막이 **`slug` 오름차순**이고, slug는 전역 유니크(라우트 키)이므로 **모든 비교가 완전순서(total order)**다. 동점으로 순서가 흔들릴 여지가 없다.

기존 셀렉터와 동일한 비교식을 그대로 답습한다:

```
b.publishedDate.localeCompare(a.publishedDate) || a.slug.localeCompare(b.slug)
```

overlap/태그겹침수 축이 붙는 티어는 그 앞에 숫자 비교를 얹는다(`bOverlap - aOverlap || 위 식`). 티어 자체가 순서를 갖고, 티어 간에는 정렬을 섞지 않으므로 `Array.prototype.sort`의 안정성에도 의존하지 않는다.

### 1-5. 노출 수를 6으로 정한 근거

- 기존 상수와의 정합: `getBlogPostsByCategory` = 6. 상세 페이지도 6으로 맞추면 "관련 글 그리드는 최대 6"이라는 규칙이 사이트 전체에서 일관된다.
- 그리드가 `lg:grid-cols-3`이므로 6 = 정확히 2행(모바일 1열 6행, sm 2열 3행 — 어디서도 어중간한 빈칸이 안 생긴다).
- 3편(계산기 쪽 규칙)은 상세 페이지 최하단 이탈 방지용으로는 약하다. 체류시간이 목표인 위치이므로 6이 낫다.

---

## 2. 후보 0편 케이스 — 실측 결과 **존재하지 않음**

`lib/blog.ts` 전수 확인 결과:

- T3(같은 카테고리)만으로도 최소 후보 수가 보장된다: date 5편 → 자기 제외 4편, life 7편 → 6편, salary/loan 8편 → 7편.
- 따라서 **28편 전부 최소 4편의 후보를 갖는다. 후보 0편인 글은 단 1편도 없다.**
- 실측 최소치는 **age-korean-age-law-2026 등 date 카테고리 글의 4편**(§3 예시 A). 나머지 카테고리는 전부 6편이 찬다.
  - **[07-19 QA 실측 정정]** LIMIT=6 가정 시 실제로 4편에서 멈추는 글은 date 5편 중 **2편**(`age-korean-age-law-2026`, `age-by-birth-year-2026`)뿐이다. 나머지 3편은 T2a가 salary 쪽으로 다리를 놓아 6편이 찼다. 확정값 LIMIT=4에서는 **28편 전부 4편이 채워지고 부족 채움·빈 배열이 0건**이므로 아래 "부족 채움 UI" 논의는 현재 데이터에서 실효 없음.

**판단**: 그래도 `RelatedBlogPosts`의 `posts.length === 0 → return null` 가드는 **그대로 유지**한다. 지금은 도달 불가능한 분기지만, (a) 신규 카테고리가 생겨 첫 글이 단독으로 존재하는 순간 바로 필요해지고, (b) 빈 `<h2>관련 글</h2>`만 남은 섹션은 얇은 콘텐츠 신호라 애드센스 관점에서도 피해야 한다. 컴포넌트를 고칠 이유가 없다.

**부족 채움(4편)일 때 UI**: 억지로 6을 채우지 않는다. 무관한 글을 끼워 넣는 것보다 4장 그리드(lg에서 3+1)가 낫다. 디자인팀 확인 사항으로 §5에 올린다.

---

## 3. 실측 검증 예시 3건

> 아래는 전부 `lib/blog.ts`의 실제 `slug` / `publishedDate` / `category` / `relatedCalculatorSlugs`로 손계산한 결과다. 추정치 없음.

### 예시 A — `age-korean-age-law-2026` (date, 2026-07-15, calcs `[age, dday, service-period]`)

**부족 채움(4편) 케이스 · T2b 노이즈 제거 검증**

| 슬롯 | 노출 글 | 티어 | 근거 |
|---|---|---|---|
| 1 | `age-by-birth-year-2026` (date, 07-18) | T1 | primary 둘 다 `age-calculator` — **요청된 age 쌍 상호노출 확인** |
| 2 | `service-period-milestone-2026` (date, 07-19) | T2a | overlap 3 (`service-period·dday·age`), 동점 중 최신 |
| 3 | `dday-counting-guide-2026` (date, 07-18) | T2a | overlap 3, 발행일 desc로 2위 |
| 4 | `service-period-guide-2026` (date, 07-17) | T3 | 남은 유일한 date 형제 |

→ 여기서 date 4편이 모두 소진돼 **4장에서 멈춘다**. T2b는 primary 앵커 조건 때문에 **한 편도 통과하지 못한다**: `car-tax-prepay-relief-2026` / `electricity-seasonal-progressive-2026` / `car-tax-guide-2026`은 `dday-calculator`를 공유하지만 현재 글의 primary는 `age-calculator`이고, 그들의 primary(`car-tax`/`electricity-bill`)도 현재 글의 계산기 목록에 없다 → 전원 탈락. **의도대로 노이즈가 잘렸다.** T4도 0건(현재 글 태그 중 date 외 글과 완전일치하는 것 없음).

### 예시 B — `salary-net-income-guide-2026` (salary, 2026-07-15, calcs `[salary-net, severance-pay, service-period]`)

**티어가 4개까지 다 동원되는 풀 케이스 · 카테고리 간 다리 검증**

| 슬롯 | 노출 글 | 티어 | 근거 |
|---|---|---|---|
| 1 | `salary-net-by-bracket-2026` (salary, 07-17) | T1 | primary 둘 다 `salary-net-calculator` (개념글↔조견표 쌍) |
| 2 | `severance-pay-guide-2026` (salary, 07-17) | T2a | overlap **3** — 계산기 3개 완전일치 |
| 3 | `four-insurance-by-income-2026` (salary, 07-17) | T2a | overlap 2, 07-17 동점 → slug asc 1위(`four-insurance-b…`) |
| 4 | `four-insurance-guide-2026` (salary, 07-17) | T2a | overlap 2, slug asc 2위(`four-insurance-g…`) |
| 5 | `service-period-guide-2026` (**date**, 07-17) | T2a | overlap 2 — **salary 글에서 date 글로 가는 다리. 카테고리 축만으론 안 생기는 링크** |
| 6 | `weekly-holiday-allowance-eligibility-2026` (salary, 07-17) | T3 | 남은 salary 형제 중 최신 |

→ 슬롯 3·4의 순서가 **동일 발행일(07-17) 동일 overlap(2)** 상황이며, slug 오름차순 tie-break가 실제로 결과를 가르는 지점이다. `four-insurance-by-income-2026` < `four-insurance-guide-2026` < `service-period-guide-2026`(< `severance-pay-guide-2026`: `ser` < `sev`). 이 tie-break가 없으면 빌드마다 순서가 흔들릴 수 있는 실제 케이스다.

### 예시 C — `area-pyeong-sqm-conversion-2026` (life, 2026-07-18, calcs `[unit-converter, electricity-bill, car-tax]`)

**T1이 비는(2편째가 아직 없는 계산기) 폴백 케이스**

| 슬롯 | 노출 글 | 티어 | 근거 |
|---|---|---|---|
| — | (T1 없음) | | `unit-converter`를 primary로 쓰는 다른 글이 없다. bmi 2편이 `unit-converter`를 갖고 있으나 그들의 primary는 `bmi-calculator` |
| 1 | `car-tax-prepay-relief-2026` (life, 07-17) | T2a | overlap 2(`car-tax·electricity-bill`), 07-17 동점 slug asc 1위 |
| 2 | `electricity-seasonal-progressive-2026` (life, 07-17) | T2a | overlap 2, slug asc 2위 |
| 3 | `car-tax-guide-2026` (life, 07-16) | T2a | overlap 2, 발행일 3위 |
| 4 | `bmi-normal-weight-by-height-2026` (life, 07-17) | T3 | 남은 life 형제 최신 |
| 5 | `bmi-guide-2026` (life, 07-16) | T3 | |
| 6 | `summer-electricity-progressive-rate-2026` (life, 07-15) | T3 | |

→ T1이 비어도 6편이 정상적으로 찬다. life 7편 중 자기 제외 6편이 전부 노출되는 셈이라, 이 카테고리는 사실상 완전 연결 그래프가 된다. (`summer-electricity-progressive-rate-2026`은 계산기가 `[electricity-bill]` 하나뿐이라 overlap 1 → T2a 탈락, T3에서 회수된다. 계산기 링크가 빈약한 글이 누락되지 않는 것을 확인.)

---

## 4. 헤딩 문구와 섹션 순서

### 4-1. 헤딩: `함께 읽으면 좋은 글` (파라미터화 제안)

현재 상세 페이지의 헤딩 구조는 h1(제목) → 본문 h2 다수(`renderSection`의 `heading`이 h2) → h2 "관련 계산기"다. 새 섹션도 h2가 맞다(위계 위반 없음, `RelatedBlogPosts` 내부 카드는 이미 h3라 h2 아래로 정확히 들어간다).

문구는 기존 "관련 글"을 **그대로 쓰지 않기를 권한다**:

- 카테고리 페이지에서는 "관련 글"에 경쟁 섹션이 없어 문제없다.
- 상세 페이지에서는 "관련 계산기"와 **바로 위아래로 붙고, 같은 h2 · 같은 폰트 · 같은 3열 그리드**다. "관련 X" 두 개가 연달아 오면 시각적으로 한 덩어리로 읽혀 스캔 시 구분이 안 된다.
- "함께 읽으면 좋은 글"은 (a) '계산기'와 '글'의 대비가 문구 자체에서 드러나고, (b) 행동 유도형이라 클릭률에 유리하며, (c) 체류시간 목적에 맞는 톤이다.

**구현 제안**: `RelatedBlogPosts`에 `title?: string` prop 추가, 기본값 `"관련 글"`.
- 카테고리 페이지: 호출부 **수정 없음**(기본값 유지 → 회귀 위험 0).
- 블로그 상세: `title="함께 읽으면 좋은 글"` 전달.

최종 문구 확정은 디자인팀과의 조율 사항이므로 **마스터 팀장 경유로 확인 요청**한다(§5).

### 4-2. 순서: 본문 → **관련 계산기** → **함께 읽으면 좋은 글** → "블로그 목록으로"

즉 기존 `RelatedCalculators`(page.tsx 187행) **뒤에** 새 섹션을 삽입한다.

근거:

1. **전환은 가까이, 체류는 멀리.** 계산기는 이 사이트의 전환 목표(도구 사용 = 고체류 + 고단가 지면)다. 본문을 다 읽은 직후, 문제의식이 가장 뜨거운 지점에 놓아야 한다. 글 링크를 먼저 끼우면 계산기 CTA가 한 화면 아래로 밀려 노출이 깎인다.
2. **글 카드는 "이탈 직전 마지막 접점"으로 쓸 때 가치가 가장 크다.** 계산기 3장을 보고도 클릭하지 않은 독자에게 6장의 다음 읽을거리를 제시하는 구성이, 그 반대보다 세션 길이를 늘린다.
3. **본문에 이미 계산기 CTA가 인라인으로 들어가 있다**(`calculatorCta` 블록). 계산기 도달 경로는 본문 중간 + 하단으로 이중화되어 있으므로, 하단에서 계산기가 글보다 뒤로 밀리면 손해가 크다.
4. **기존 마크업 변경 최소화** — 187행 뒤 한 줄 삽입으로 끝난다. 순서를 뒤집으면 diff가 커지고 카테고리 페이지와의 관습(관련 글이 페이지 말미)도 어긋난다.

"← 블로그 목록으로" 링크는 **새 섹션 뒤에 그대로 유지**한다. 6장의 글 카드를 본 뒤 목록으로 가는 흐름이 자연스럽다.

**애드센스 관련 메모(승인 후 작업)**: 승인 이후 본문 하단 광고 유닛을 넣게 되면, 유력 슬롯은 `</article>` 직후(본문 끝 ↔ 관련 계산기 사이)다. 관련 계산기와 관련 글 **사이**에 광고를 끼우면 유사한 카드 그리드 2개 사이에 광고가 들어가 정책상 "콘텐츠와 광고 혼동" 리스크가 있으므로 **권장하지 않는다**. 이 판단은 광고 배치 기획 때 재확인한다.

---

## 5. 다른 팀에 넘길 이슈

**개발 blocker: 0.** 신규 데이터 필드 없이 기존 `blogPosts` 배열만으로 전부 계산 가능하다.

넘길 사항(전부 blocker 아님, 확인/조율 건):

1. **디자인팀 — 헤딩 문구 최종 확정.** "함께 읽으면 좋은 글"(기획팀 권장) vs "관련 글"(기존 문구 재사용). 마스터 팀장 경유 확인 요청.
2. **디자인팀 — 4장 그리드 확인.** date 카테고리 글은 4장만 노출된다(§3 예시 A). `lg:grid-cols-3`에서 3+1 배치가 되는데 그대로 둘지, 4장일 때 `lg:grid-cols-2`로 떨어뜨릴지. 기획팀 의견은 "그대로 둔다"(예외 분기 추가는 비용 대비 이득이 적다).
3. **개발팀 — 셀렉터 위치/네이밍 제안.** `lib/blog.ts`에 `getRelatedBlogPosts(post: BlogPost): BlogPost[]`, 상수 `POST_RELATED_BLOG_LIMIT = 4`(초안 6에서 확정, §1-2 박스 참조). 기존 `getBlogPostsForCalculator`/`getBlogPostsByCategory` 바로 아래에 두면 정렬 규칙 3형제가 한자리에 모인다.
4. **개발팀 — `RelatedBlogPosts`에 `title?: string` prop 추가(기본값 `"관련 글"`).** 카테고리 페이지 호출부는 건드리지 않는 하위호환 방식.
5. **기획팀 후속(우리 몫) — 링크 in-degree 감사.** 이 알고리즘 적용 시 "어느 글에서도 참조되지 않는 글"이 생기는지는 28×6 전수 계산이 필요해 이번 문서에서 확정하지 않았다. 예시 3건 범위에서는 고립 징후가 없었다(life는 사실상 완전 연결, date 4편 상호 참조 확인). 개발팀이 구현 후 생성 결과를 덤프해주면 기획팀이 감사해 다음 글 주제 선정(어느 계산기에 2편째가 필요한지)에 반영한다. T1이 비어 있는 5편 — `annual-leave-allowance-guide-2026`, `severance-pay-guide-2026`, `loan-prepayment-fee-guide-2026`, `dday-counting-guide-2026`, `area-pyeong-sqm-conversion-2026` — 이 그 우선 후보다.
