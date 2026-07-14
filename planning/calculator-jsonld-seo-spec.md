# 계산기 상세 페이지 구조화 데이터(JSON-LD) 도입 기획안 v1

- 문서 목적: `app/calculator/[slug]/page.tsx` 각 계산기 상세 페이지에 구조화 데이터(JSON-LD)를 추가하기 위한 개발 착수용 스펙.
- 전제: **비가시(invisible) SEO 작업.** 화면(레이아웃/텍스트/스타일) 변경 0. `<head>`(정확히는 body 내 `<script type="application/ld+json">`)에 기계 판독용 데이터만 주입한다.
- 범위 제어: v1은 **계산기 상세 페이지의 `@graph`에만** 집중. 루트(홈)의 `WebSite`/`Organization`은 §6 "다음 단계"로 분리해 이번 범위에서 제외.
- 작성자: 기획팀. 코드는 개발팀이 작성한다. 아래 필드 매핑/의사결정을 그대로 구현 가능하도록 명세.

---

## 0. 현황 요약 (읽고 확인한 사실)

| 항목 | 확인 내용 |
|---|---|
| 상세 페이지 파일 | `app/calculator/[slug]/page.tsx` — SSG(`generateStaticParams`), `generateMetadata`로 title/description/robots만 설정. **JSON-LD 없음.** |
| 화면 breadcrumb | `nav`에 `홈` / `categoryInfo[category].title` **2단계만** 노출. 계산기명은 `h1`(3번째 계층 역할). |
| 상세 URL 패턴 | `${SITE_URL}/calculator/${slug}` (단수 `calculator`). sitemap.ts에서 확인. |
| 카테고리 URL | `${SITE_URL}/${category}` (예: `/salary`, `/loan`, `/date`, `/life`). |
| 데이터 소스 | `lib/calculators.ts`의 `CalculatorMeta`(slug/title/category/shortDescription/status/interpretation?/faq?/relatedSlugs?) + `categoryInfo` + `lib/site.ts`의 `SITE_URL`. |
| 계산기 현황 | 12개 전부 `status: "live"`, 12개 전부 `faq` 보유. coming-soon 0개(단, 방어 로직 필요). |
| noindex 로직 | `status === "coming-soon"`이면 `robots: { index:false }`. |
| html lang | `app/layout.tsx`에서 `lang="ko"`. |

---

## 1. 스키마 타입 결정과 근거

각 live 계산기 상세 페이지에 **하나의 `<script type="application/ld+json">`** 를 넣고, 내부는 `@context: "https://schema.org"` + `@graph` 배열로 아래 노드를 묶는다. (여러 script로 쪼개지 말고 단일 graph 권장 — QA가 "script 1개" 기준으로 판정하기 쉽고, 노드 간 `@id` 참조도 깔끔.)

### 1-1. BreadcrumbList (항상 포함)

- 근거: 화면 상단 breadcrumb를 검색 결과 빵부스러기로 노출 → CTR/맥락 개선. Google이 여전히 정식 지원하는 몇 안 되는 리치결과.
- **3단계**로 구성한다. 화면 nav는 2단계(홈/카테고리)만 보이지만, 계산기 상세는 실제로 3번째 계층이고 그 이름은 `h1`(calculator.title)로 화면에 존재하므로 "현재 화면과 불일치"가 아니다. Google 가이드도 마지막 항목=현재 페이지를 허용/권장한다.
  - 개발 메모: 화면 nav에 3번째 크럼(계산기명)을 그리지 않는 현재 UI는 그대로 둔다(디자인 변경 0). BreadcrumbList의 3번째 노드는 데이터로만 존재.

| position | name | item (URL) |
|---|---|---|
| 1 | `홈` | `${SITE_URL}` |
| 2 | `categoryInfo[calculator.category].title` (예: "급여 계산기") | `${SITE_URL}/${calculator.category}` |
| 3 | `calculator.title` (예: "연봉 실수령액 계산기") | `${SITE_URL}/calculator/${calculator.slug}` |

- `itemListElement`는 `{ "@type": "ListItem", "position": n, "name": ..., "item": ... }` 형태.
- 마지막(현재 페이지) 항목도 `item`(절대 URL)을 넣는 방식으로 통일 권장(스키마상 허용, 검증 단순).

### 1-2. WebApplication (항상 포함) — SoftwareApplication 아님

- **결정: `WebApplication`.** 근거:
  - 계산기는 설치 없이 브라우저 안에서 즉시 실행되는 무료 웹 도구다. `WebApplication`은 `SoftwareApplication`의 하위 타입으로 "웹에서 동작하는 앱"을 더 정확히 표현한다. Google의 SoftwareApplication 리치결과 파서는 하위 타입(WebApplication 포함)도 인식하므로 정밀도를 잃지 않는다.
  - `SoftwareApplication`(범용)보다 의미가 구체적이라 다운사이드 없음.
- 주의(기대치 관리): SoftwareApplication 계열 리치결과(별점 스니펫)는 보통 `aggregateRating`/`review`가 있어야 시각적으로 노출된다. 우리는 평점 데이터가 없으므로 **리치결과 별점은 안 뜬다.** 그래도 엔티티/무료 도구 신호로서 유효하고 비용이 0에 가까워 포함 권장. (별점을 지어내지 말 것 — 정책 위반/신뢰 리스크.)

| 필드 | 값 |
|---|---|
| `@type` | `"WebApplication"` |
| `name` | `calculator.title` |
| `description` | `calculator.shortDescription` |
| `url` | `${SITE_URL}/calculator/${calculator.slug}` |
| `applicationCategory` | 카테고리 매핑(아래) |
| `operatingSystem` | `"Any"` (브라우저 무관) |
| `browserRequirements` | `"Requires JavaScript. Requires HTML5."` (선택, 권장) |
| `inLanguage` | `"ko"` (layout의 html lang과 일치) |
| `isAccessibleForFree` | `true` (선택, 무료 도구 신호) |
| `offers` | `{ "@type": "Offer", "price": "0", "priceCurrency": "KRW" }` — 무료를 명시 |

- `applicationCategory` 매핑(하드코딩 최소화, category 기반 파생):
  - `salary`, `loan` → `"FinanceApplication"`
  - `date`, `life` → `"UtilitiesApplication"`
  - 구현 방식: 소스에 새 필드 추가 없이 `page.tsx`(또는 헬퍼)에서 `category → applicationCategory` 상수 맵으로 파생. (권장안. 만약 팀이 단순화를 원하면 전 계산기 `"UtilitiesApplication"` 통일도 허용 — 근거: 값이 리치결과 노출을 좌우하지 않음. 단 재무 계산기의 의미 정합상 위 2분류를 1순위 추천.)

### 1-3. FAQPage (faq 있는 계산기만 — 현재 12개 전부)

- 근거: FAQ를 구조화해 검색엔진이 Q/A 페어를 명확히 이해. 단, **중요한 기대치 관리** 아래 참조.
- 매핑:
  - `mainEntity`: `calculator.faq.map(...)`
  - 각 항목: `{ "@type": "Question", "name": faq[i].question, "acceptedAnswer": { "@type": "Answer", "text": faq[i].answer } }`
  - 답변 텍스트는 **원문 그대로** 사용 가능(§2에서 검토 완료 — 손볼 필요 없음). 단 JSON 안전 처리는 §4 참조.

- **FAQ 리치결과 정책(반드시 인지):** Google은 2023년 8월부터 FAQ 리치결과를 "잘 알려진 정부·보건 당국 사이트"로만 제한했다. 즉 우리 사이트의 FAQPage는 유효하고 기계 판독은 되지만 **검색결과에 아코디언 리치결과로 노출될 가능성은 낮다.** 그럼에도 (a) 비용 0에 가깝고 (b) 정책이 다시 완화될 수 있으며 (c) 시맨틱/향후 대비 가치가 있어 **포함 권장.** 다만 마스터/마케팅에는 "FAQ 별도 리치결과 노출 기대 금지"로 공유할 것.
  - 이 정책은 역으로 **YMYL 리스크를 낮추는 요인**이기도 하다(§2 참조): 노출 자체가 제한되므로 대출/의료 FAQ가 리치결과로 오인 소지 있게 퍼질 위험이 구조적으로 작다.

### 1-4. graph 노드 간 연결(선택, 권장)

- 각 노드에 `@id`를 부여해 그래프 정합을 높이면 좋다(필수 아님):
  - WebApplication: `"@id": "${url}#webapp"`
  - BreadcrumbList: `"@id": "${url}#breadcrumb"`
  - FAQPage: `"@id": "${url}#faq"`
- v1에서는 과설계 피하려면 생략 가능. 추가해도 화면/검증 영향 없음.

---

## 2. YMYL 리스크 검토 (faq 답변 실 점검)

대출이자·중도상환·4대보험·DSR·연봉·BMI 등 YMYL 계산기의 faq 배열을 전수로 훑음. **결론: 리스크 낮음. 답변 원문 수정 없이 그대로 JSON-LD화 가능.**

근거 — 문제 소지 문구(대출 승인·한도 확답, 투자 권유, 의료 진단 단정)가 오히려 이미 방어적으로 부정되어 있음:

- 대출이자 계산기 faq "이 계산기로 대출 한도나 승인 가능 여부도 알 수 있나요?" → **"아니요. …실제 대출 심사·한도·승인 가능 여부를 알려주지 않습니다."** (승인/한도 확답 회피 명시)
- DSR 계산기 faq "이 계산기 결과로 대출 승인 여부나 한도를 알 수 있나요?" → **"아니요. …단순 DSR을 계산하는 참고 도구일 뿐, 실제 대출 심사 결과가 아닙니다."** + "40% 미만이어도 거절될 수 있고 반대도 가능" 명시.
- 중도상환수수료 faq → 요율은 "본인 약정서·은행 확인값 입력", "실제 청구액과 차이 가능" 반복.
- 4대보험료 faq → "실제 급여명세서·고지서와 다를 수 있음", 요율/정산 변수 명시.
- 연봉 실수령액 faq → "실제 급여명세서와 다를 수 있음", "연말정산으로 최종 확정" 명시.
- BMI 계산기 faq → **"의료적 진단이 아니며 참고용 지표"**, "청소년·임산부·근육형은 전문의 상담" 명시. 진단·처방 단정 없음.
- 전 계산기 공통 "입력값 브라우저 내 처리·미저장" 문구로 개인정보 오인 소지도 차단.

즉 faq 답변은 **투자 권유/의료 진단/승인 확약이 없고, 모두 참고용+전문가·공식기관 확인 안내로 마감**되어 있어 FAQ 스키마로 노출돼도 오인 유발 문구가 없다.

- 조치: **v1에서 faq 답변 문구 수정 불필요.** (만약 후속으로 리치결과 정책이 완화되어 대출/DSR FAQ가 실제 노출되면, 그때 dev/planning이 재점검 — 현재는 불필요.)
- 참고 리스크(스키마 무관, 기존과 동일): 요율·법령 수치(2026년 4대보험 요율, DSR 40/50% 등)는 시점 의존적. JSON-LD가 이 수치를 "고정 사실"로 박제하지 않도록, WebApplication `description`에는 **shortDescription만** 쓰고 interpretation의 구체 수치는 넣지 않는다(아래 §3에서 description 소스를 shortDescription으로 고정한 이유).

---

## 3. 필드값 소스 매핑 표 (1:1, 하드코딩 최소화)

원칙: 기존 `CalculatorMeta`/`categoryInfo`/`SITE_URL` 재사용 우선. 신규 필드 추가 없음. 리터럴은 스키마 고정 상수(@type 등)와 파생 상수 맵만 허용.

| 스키마 노드 | 필드 | 소스 |
|---|---|---|
| (공통) | `@context` | 리터럴 `"https://schema.org"` |
| BreadcrumbList | `@type` | 리터럴 |
| BreadcrumbList | item1 name | 리터럴 `"홈"` |
| BreadcrumbList | item1 item | `SITE_URL` (site.ts) |
| BreadcrumbList | item2 name | `categoryInfo[calculator.category].title` |
| BreadcrumbList | item2 item | `` `${SITE_URL}/${calculator.category}` `` |
| BreadcrumbList | item3 name | `calculator.title` |
| BreadcrumbList | item3 item | `` `${SITE_URL}/calculator/${calculator.slug}` `` |
| WebApplication | `name` | `calculator.title` |
| WebApplication | `description` | `calculator.shortDescription` |
| WebApplication | `url` | `` `${SITE_URL}/calculator/${calculator.slug}` `` |
| WebApplication | `applicationCategory` | `calculator.category` → 파생 맵(§1-2) |
| WebApplication | `operatingSystem` | 리터럴 `"Any"` |
| WebApplication | `browserRequirements` | 리터럴(선택) |
| WebApplication | `inLanguage` | 리터럴 `"ko"` (layout html lang과 일치) |
| WebApplication | `isAccessibleForFree` | 리터럴 `true`(선택) |
| WebApplication | `offers.price` | 리터럴 `"0"` |
| WebApplication | `offers.priceCurrency` | 리터럴 `"KRW"` |
| FAQPage | `@type` | 리터럴 |
| FAQPage | `mainEntity[i].name` | `calculator.faq[i].question` |
| FAQPage | `mainEntity[i].acceptedAnswer.text` | `calculator.faq[i].answer` |

- 신규로 필요한 상수(코드 상수, 데이터 아님): `category → applicationCategory` 맵 1개. 그 외 전부 기존 데이터 재사용.
- 구현 위치 제안: `page.tsx` 안에 인라인하지 말고 `lib/`에 순수 함수 `buildCalculatorJsonLd(calculator)` 헬퍼를 두고(테스트/QA 용이), page에서 결과를 `<script>`로 직렬화. (권장. 개발팀 재량.)

---

## 4. 엣지 케이스 / 제약

1. **coming-soon 방어 (현재 0개지만 필수):** `status !== "live"`이면 **JSON-LD를 전혀 출력하지 않는다.**
   - 근거: coming-soon은 `robots noindex`(기존 로직) + sitemap 제외 + 실제 콘텐츠 없음. 여기에 구조화 데이터를 붙이면 noindex와 신호가 상충하고, faq/interpretation도 없어 FAQPage/WebApplication description 근거가 빈약. noindex 페이지엔 스키마 미부착이 정합적.
   - 구현: `if (calculator.status !== "live") → script 미렌더`.
2. **faq 없는 계산기:** `calculator.faq`가 없거나 빈 배열이면 **FAQPage 노드를 graph에서 생략**(BreadcrumbList + WebApplication만). 현재 12개 전부 faq 보유라 실제로는 안 걸리지만 방어 필수.
3. **interpretation 미사용:** WebApplication `description`에 interpretation을 넣지 않는다(길고 시점 의존 수치 포함, §2). shortDescription만 사용.
4. **JSON 안전성 / HTML 이스케이프:**
   - 직렬화는 `JSON.stringify(graph)` 사용(따옴표·백슬래시·`÷×%^` 등 특수문자 자동 이스케이프). faq 답변에 들어있는 `'D-n'`, `'현재 연도 - 출생 연도'` 같은 작은따옴표/기호는 JSON.stringify로 안전 처리됨.
   - **`</script>` 브레이크아웃 방지 필수:** 직렬화 결과 문자열에서 `<`를 `<`로 치환한 뒤 주입.
     예: `JSON.stringify(graph).replace(/</g, "\\u003c")`.
   - React 주입은 `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />` 방식(문자열 그대로 출력, JSX 이스케이프 회피). `<script>{JSON.stringify(...)}</script>`처럼 자식 텍스트로 넣지 말 것(React가 `<`,`>`를 이스케이프해 무효 JSON 될 수 있음).
   - 참고: dday 계산기 `interpretation`에는 이스케이프된 `\"D-132\"`가 있으나 **interpretation은 어떤 스키마에도 안 들어가므로** 무관. faq 답변에는 이중따옴표 리터럴 없음(작은따옴표만) — 문제없음.
5. **noindex 정합:** live=index=스키마 O / coming-soon=noindex=스키마 X. (위 1번과 일치.)
6. **단일 script 보장:** 페이지당 `<script type="application/ld+json">`는 정확히 1개(내부 @graph에 2~3노드). QA 판정 기준과 정합.
7. **URL 트레일링 슬래시:** 전 URL에서 `SITE_URL` + 경로를 그대로 조합, 트레일링 슬래시 추가하지 않음(sitemap.ts와 동일 규칙 유지 → canonical/sitemap과 URL 문자열 일치).

---

## 5. 검증 기준 (QA·마스터 통과 판정)

빌드/배포 전 아래 전부 충족해야 PASS:

1. **빌드 무회귀:** `next build` 성공, 기존 라우트/정적 생성 개수 변화 없음, 타입 에러 0.
2. **script 존재/개수:** 각 **live** 계산기 상세의 정적 HTML에 `script[type="application/ld+json"]`가 **정확히 1개**. coming-soon(있다면)엔 **0개**.
3. **JSON 파싱:** 해당 script 내용이 `JSON.parse` 성공(브레이크아웃/이스케이프 오류 없음). `@context`/`@graph` 존재.
4. **노드 구성:** graph에 항상 `BreadcrumbList` + `WebApplication`. faq 보유 페이지(현재 전부)엔 `FAQPage`도 포함. faq 없으면 FAQPage 없음.
5. **필드 정합 스팟체크(계산기 2~3개 샘플):**
   - BreadcrumbList 3항목의 name/item이 §3 표와 일치(특히 item2가 `/{category}`, item3가 `/calculator/{slug}`).
   - WebApplication `name==title`, `description==shortDescription`, `offers.price=="0"`, `priceCurrency=="KRW"`.
   - FAQPage `mainEntity` 개수 == 해당 계산기 faq 배열 길이, 각 name/answer 원문 일치.
6. **Google Rich Results Test / Schema Validator:** 대표 URL(예: `/calculator/salary-net-calculator`, `/calculator/loan-interest-calculator`)에서
   - BreadcrumbList: 유효(오류 0). Breadcrumb 리치결과 "적격" 확인.
   - FAQPage: 구문 유효(오류 0). (리치결과 미노출은 §1-3 정책상 정상 — 경고 수준 허용.)
   - WebApplication: 구문 유효. 별점 리치결과 미노출은 정상(평점 없음).
   - **필수필드 충족:** BreadcrumbList(각 ListItem의 position+name+item), Offer(price+priceCurrency), Question(name+acceptedAnswer.text).
7. **시각 변화 0:** 배포 전/후 상세 페이지 스크린샷 diff 없음(스키마는 비가시). 레이아웃/텍스트/CLS 변화 없음.
8. **CI/린트:** 기존 lint 통과.

---

## 6. 다음 단계 제안 (이번 v1 범위 밖 — 마스터 판단용)

v1 승인·배포 후 별도 티켓으로 검토 권장. 이번엔 착수하지 않음(범위 제어).

- **루트 `WebSite` + `Organization`(또는 사이트 전역 `WebPage`):** `app/layout.tsx`에 사이트 단위 스키마. `WebSite`에 `name`/`url`/`inLanguage`, 향후 사이트 검색 노출용 `potentialAction`(SearchAction)도 검토(단 실제 검색 엔드포인트 존재 시에만 — 없으면 넣지 말 것). `Organization`에 `name`/`url`/`logo`. → 사이트 엔티티/브랜드 신호 강화.
- **카테고리 페이지(`/salary` 등) `CollectionPage` + `ItemList`:** 카테고리 하위 계산기 목록을 ItemList로. 상세와 별개 티켓.
- **평점 도입 시 `aggregateRating`:** 실제 사용자 평가 수집 체계가 생기면 WebApplication에 추가 → SoftwareApplication 별점 리치결과 적격. (조작 금지, 실제 데이터 전제.)
- **BreadcrumbList 화면 3단계 노출(디자인팀):** 현재 nav 2단계 → 계산기명 크럼 추가하면 화면/스키마 완전 일치. 단 이는 **가시적 디자인 변경**이라 v1(비가시) 범위 밖 → 디자인팀 협의 후 별도 진행.

---

## 7. 개발팀 인계 요약 (한 장)

- `app/calculator/[slug]/page.tsx`(또는 `lib/` 헬퍼 `buildCalculatorJsonLd`)에서 live 계산기에 한해 단일 `@graph` JSON-LD 생성.
- 노드: `BreadcrumbList`(3단계) + `WebApplication`(offers 무료) + (faq 있으면)`FAQPage`.
- 값은 전부 기존 `calculator`/`categoryInfo`/`SITE_URL`에서 파생. 신규 상수는 `category→applicationCategory` 맵 1개뿐.
- 주입: `<script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(graph).replace(/</g,"\\u003c")}} />`.
- coming-soon/ faq 없음 등 방어 분기(§4) 준수. 화면 변경 0.
- 판정: §5 체크리스트. Rich Results Test로 대표 2개 URL 검증.
