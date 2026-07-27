# OG/Twitter 메타데이터 도입 기획안 v1 (og:image 없이 1단계)

- 문서 목적: 2026-07-27 GSC 전수 감사에서 확인된 **라이브 62개 URL 전부 `og:`/`twitter:` 태그 0개** 결함에 대한 개발 착수용 사양.
- 성격: **비가시(invisible) 작업.** 화면/레이아웃/텍스트 변경 0. `<head>` meta 태그만 추가.
- 작성자: 기획팀. 코드는 개발팀이 작성한다. 이 문서에 코드 파일 수정은 포함되지 않았다(진단·사양만).
- 전제(확정 사항 불변): 계산기 허브 컨셉 / Next.js 16 App Router / `/salary`·`/loan`·`/date`·`/life`+`/blog` 구조 그대로.

---

## 0. 확인한 사실 vs 확인하지 못한 것

### 0-1. 코드를 직접 읽고 확인한 사실 (확인됨)

| # | 항목 | 확인 내용 | 근거 파일 |
|---|---|---|---|
| 1 | 메타데이터 정의 위치 | 14곳. `app/layout.tsx`(루트, `export const metadata`) + 페이지 13개 | 아래 §1 표 |
| 2 | title/description 생성 방식 | **전부 이미 문자열로 존재.** 정적 6곳(`about/support/privacy/terms/links` + 루트), 데이터 파생 4곳(카테고리 = `categoryInfo[x].title/description`), 동적 3곳(`calculator/[slug]` = `calculator.title/shortDescription`, `blog/[slug]` = `post.title/description`, `blog` = 페이지네이션 문자열) | 각 `page.tsx` |
| 3 | 홈(`app/page.tsx`)은 title/description을 **정의하지 않음** | 의도적으로 루트 layout 값 상속(주석 명시). `alternates.canonical`만 설정 | `app/page.tsx:13-16` |
| 4 | canonical 절대 URL 생성 헬퍼 존재 | `canonicalUrl(path)` — 트레일링 슬래시 제거, 홈은 `SITE_URL` 그대로 | `lib/site.ts:9-13` |
| 5 | canonical 생성이 두 방식으로 갈려 있음 | 11곳은 `canonicalUrl()`, **`app/blog/page.tsx`와 `app/blog/[slug]/page.tsx` 2곳만** `` `${SITE_URL}/...` `` 템플릿 리터럴 직접 조립 | `app/blog/page.tsx:41`, `app/blog/[slug]/page.tsx:38` |
| 6 | `metadataBase` 미설정 | `app/layout.tsx`의 metadata에 없음. 그럼에도 canonical 62/62 정상인 이유는 **전부 절대 URL을 넣고 있어서** metadataBase가 개입할 여지가 없기 때문 | §2 |
| 7 | og:image로 전용할 만한 에셋 없음 | `public/`에 1200×630 없음. 있는 것: `hero-illustration.webp`(380×380 정사각·투명 일러스트), 카테고리 아이콘 4종(24px 용도), 특정 블로그 1편 전용 카드뉴스 PNG 8장 | `public/**` |
| 8 | 블로그 글 날짜 필드 | `publishedDate: "YYYY-MM-DD"`(필수), `updatedDate?`(선택, 없으면 published로 폴백) | `lib/blog.ts:45-47` |
| 9 | 감사 대상 62개의 구성 | sitemap 기준 정적 10 + 라이브 계산기 16 + 블로그 36 = 62. **`/links`는 sitemap에 없음**(별건, §9-2 참고) | `app/sitemap.ts` |
| 10 | 블로그 목록 페이지네이션 | `BLOG_PAGE_SIZE = 9`, 글 36편 → `?page=2~4` 존재. canonical에 쿼리 포함 | `lib/blog.ts:6347`, `app/blog/page.tsx:36-43` |
| 11 | `next.config.ts` | 옵션 없음(빈 설정). `trailingSlash` 미사용 → URL 정규화 변수 없음 | `next.config.ts` |

### 0-2. Next.js 16 문서/구현을 읽고 확인한 동작 (문서·소스 근거 있음, **빌드 실행으로 검증하지는 않음**)

| # | 동작 | 근거 |
|---|---|---|
| A | **`openGraph`에 title/description을 안 넣으면 그 페이지의 `title`/`description`을 자동 상속한다.** `postProcessMetadata` → `inheritFromMetadata(openGraph, metadata)` | `node_modules/next/dist/lib/metadata/resolve-metadata.js:603-612, 656-659` |
| B | **`openGraph`만 설정하면 `twitter:` 태그가 자동 생성된다.** twitter 블록이 없어도 `metadata.twitter`를 만들어 title/description/images를 채움 | 같은 파일 `:619-654` |
| C | **twitter 카드 타입은 이미지 유무로 자동 결정된다.** `card = images?.length ? 'summary_large_image' : 'summary'` | `resolvers/resolve-opengraph.js:175` |
| D | 메타데이터 병합은 **얕은 병합**이라, 하위 세그먼트가 `openGraph`를 정의하면 상위(layout)의 `openGraph` **전체가 교체**된다(정의 안 하면 통째로 상속) | 문서 `generate-metadata.md:1326-1358, 1390-1416` |
| E | `og:url`/`og:type`/`og:site_name`/`og:locale`은 **값이 있을 때만** 태그가 출력된다. 기본값 자동 주입 없음 (예: `type` 생략 시 `og:type` 태그 자체가 안 나감) | `lib/metadata/metadata.js:687-704, 870-1293` |
| F | 소셜 이미지에 **상대경로**를 쓰고 metadataBase가 없으면: 빌드 실패가 아니라 폴백 + 1회 경고. 폴백 순서는 `VERCEL_ENV=preview`면 `VERCEL_BRANCH_URL`/`VERCEL_URL`, 아니면 `VERCEL_PROJECT_PRODUCTION_URL`, 그것도 없으면 **`http://localhost:3000`** | `resolvers/resolve-url.js:44-69`, `resolve-opengraph.js:86-100` |
| G | 경고 문구: `metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "..."` — 단, **Vercel 시스템 환경변수(`process.env.VERCEL`)가 노출돼 있으면 경고조차 안 뜨고 조용히 폴백**한다 | `resolve-opengraph.js:76, 95-98` |
| H | 파일 규약(`opengraph-image.*`)으로 붙은 이미지는, **하위 세그먼트가 `openGraph`를 명시하면 D의 얕은 병합으로 유실될 수 있다.** 파일 이미지는 "해당 세그먼트의 `source.openGraph`에 `images` 키가 없을 때" 그 세그먼트의 target에 합쳐지는 구조 | `resolve-metadata.js:126-158` + D. **소스 독해 기반 추정, 빌드 미검증** |

### 0-3. 미확인 (단정하지 않음)

- **미확인 1 — 문서와 구현의 불일치.** 문서 `generate-metadata.md:428`은 "metadataBase 없이 상대경로를 쓰면 **빌드 에러**"라고 쓰여 있으나, 실제 배포된 구현(`resolve-url.js`, `resolve-opengraph.js`)에는 그 에러 경로가 보이지 않고 폴백+경고만 있다. 어느 쪽이 이 버전의 실제 동작인지 **`next build`를 돌려 확인하지 않았다.** 아래 사양은 **어느 쪽이든 안전하도록** 전부 절대 URL만 쓰고 metadataBase도 함께 설정하는 방식이다.
- **미확인 2 — 이 프로젝트의 `VERCEL_PROJECT_PRODUCTION_URL` 실제 값.** `SITE_URL`(`https://calculator-hub-delta.vercel.app`)과 같은지 확인하지 못했다(Vercel 대시보드 접근 안 함). F/G 폴백이 발동할 경우 canonical과 다른 호스트가 og:image에 박힐 수 있다 → metadataBase 명시로 원천 차단.
- **미확인 3 — 카카오톡/페북 실제 프리뷰 렌더링.** OG 태그가 없는 현재 상태에서 카카오톡 공유 시 어떤 카드가 뜨는지 실측하지 않았다(스크래퍼 실행 불가). §4의 판단은 OG 프로토콜/소비자 동작에 대한 일반 지식 기반이며, 확신도를 각 항목에 표기했다.
- **미확인 4 — H(파일 규약 이미지 유실)** 는 소스 독해 기반 추정. 2단계에서 이미지 도입 시 실측 필요. 본 사양은 이 리스크를 **피해 가는** 설계(§5-3)를 택했다.
- **미확인 5 — 라이브 62개 URL 목록 원본.** 마스터의 감사 결과(og 0건)를 사실로 전제했고, 기획팀이 라이브 HTML을 직접 다시 긁지는 않았다.

---

## 1. 진단 결론 (질문 1: 기존 title/description 재사용 가능한가)

**결론: 재사용 가능하다. og:title/og:description은 페이지마다 새로 쓸 필요가 없다.**

근거는 §0-2 A — Next.js가 `openGraph.title`/`openGraph.description`이 비어 있으면 그 페이지의 최종 `title`/`description`으로 자동 채운다. 즉 개발팀이 각 페이지에 넣어야 할 것은 **title/description이 아니라 `type`/`url`/`siteName`/`locale`뿐**이다.

이게 중요한 이유:
- desc≤160·title≤60은 이미 62/22 전부 통과한 상태다. og용 문구를 따로 만들면 **두 벌의 카피가 생겨 이후 수정 때 어긋난다**(실제로 07-26에 desc 8편 160자 초과를 정정한 이력이 있다 — 두 벌이었으면 8편이 아니라 16곳을 고쳤어야 했다).
- 카피 신규 작성 = 기획팀 작업 발생 = 오늘 못 끝냄. 자동 상속 = 오늘 끝남.

| 페이지 그룹 | title/description 출처 | og:title/og:description 처리 |
|---|---|---|
| 홈 `/` | 루트 layout 상속(페이지에 정의 없음) | 자동 상속(루트 값). **신규 작성 없음** |
| 카테고리 4곳 | `categoryInfo[x].title/description` | 자동 상속. 신규 없음 |
| 계산기 상세 16 | `calculator.title` + `shortDescription` | 자동 상속. 신규 없음 |
| 블로그 상세 36 | `post.title` + `post.description` | 자동 상속. 신규 없음 |
| 블로그 목록(+페이지네이션) | 생성 문자열(`블로그 (2페이지) \| 계산기 허브`) | 자동 상속. 신규 없음 |
| about/support/privacy/terms/links | 각 파일 리터럴 | 자동 상속. 신규 없음 |

→ **신규 카피 0건.** 이 작업은 순수 구조 작업이다.

---

## 2. `metadataBase` 부재의 실제 영향 (질문 2)

### 2-1. 지금 당장은 영향 없음 (확인됨)

현재 URL을 쓰는 메타데이터 필드는 `alternates.canonical` 하나뿐이고, 전 페이지가 `canonicalUrl()`/`${SITE_URL}` 로 **절대 URL**을 넘긴다. `resolveUrl()`은 `new URL(url)` 파싱에 성공하면 metadataBase를 **무시**한다(`resolve-url.js:70-77`). 마스터 감사에서 canonical 62/62가 정상이었던 게 그 증거다. 즉 **"metadataBase가 없어서 지금 뭔가 깨져 있다"는 아니다.**

### 2-2. 그래도 이번에 넣어야 하는 이유

1. **og:image 도입 시의 지뢰(§0-2 F/G).** 상대경로 이미지 + metadataBase 없음 → 로컬 빌드에서는 `http://localhost:3000/...`가 박힌 og:image가 나올 수 있고, Vercel에서는 **경고조차 없이**(G) `VERCEL_PROJECT_PRODUCTION_URL` 기준으로 결정된다. 그 값이 `SITE_URL`과 같은지 **미확인 2**. metadataBase 1줄이면 환경 무관 확정된다.
2. **문서/구현 불일치(미확인 1) 회피.** 문서대로 "빌드 에러"가 맞더라도 metadataBase가 있으면 애초에 걸리지 않는다.
3. 비용이 1줄이고 부작용이 없다. 절대 URL을 넘기는 기존 canonical 동작은 metadataBase가 있어도 **그대로 무시되어 변하지 않는다**(`resolve-url.js:70-77`) → **canonical 62/62 회귀 위험 0.**

### 2-3. 사양

`app/layout.tsx`의 `export const metadata`에 아래 1줄 추가:

```ts
metadataBase: new URL(SITE_URL),   // import { SITE_URL } from "@/lib/site";
```

- 위치: 기존 `title` 위(첫 필드). `verification` 블록은 손대지 않는다.
- **루트 layout에 `openGraph`는 넣지 않는다.** 이유는 §5-2.

---

## 3. og:image 전략 (질문 3) — 결론: **(a) 채택**

### 3-1. 선택지 비교

| | (a) 이미지 없이 나머지 OG 먼저 | (b) `opengraph-image.tsx` 코드 생성 | (c) 전부 보류 |
|---|---|---|---|
| 오늘 착수 | 가능 | **불가(아래 3-2)** | — |
| 디자인팀/사용자 승인 필요 | 불필요(에셋 0) | 필요(브랜드 시각물) | — |
| SNS 카드 | 텍스트형 소형 카드(제목·설명·도메인) | 큰 이미지 카드 | 현행 유지 |
| 검색(구글) 영향 | 사실상 0 (§4-1) | 사실상 0 | 0 |
| 되돌리기/승급 비용 | 헬퍼 1곳에 `images` 추가 = 62개 전 페이지 일괄 승급 | — | 다음 라운드에 통째로 재작업 |
| 리스크 | 낮음(§3-4) | 한글 폰트 미탑재 시 **문자 깨짐**(3-2) | 결함 방치 |

### 3-2. (b)를 오늘 못 하는 구체적 이유

- `ImageResponse`(satori)는 **시스템 폰트를 쓰지 않는다.** 폰트를 명시적으로 넘기지 않으면 기본 폰트로 그리는데, 한글 글리프가 없으면 **네모(두부) 또는 공백**으로 렌더된다. 현재 프로젝트 폰트는 `Geist`/`Geist_Mono`(라틴 서브셋, `subsets: ["latin"]`)로 **한글 글리프가 없다.** → 한국어 사이트의 OG 이미지를 코드로 생성하려면 Pretendard/Noto Sans KR 같은 **한글 폰트 바이너리(.ttf/.otf)를 레포에 추가**해야 한다. 이는 (i) 새 에셋 반입 + (ii) 폰트 라이선스 확인 + (iii) 서브셋 용량 검토가 붙는 별도 건이다.
- 코드로 만들든 파일로 만들든 **결과물은 브랜드가 노출되는 시각물**이다. "새 이미지 제작은 design팀+사용자 승인 사안"이라는 오늘의 제약을 (b)는 우회하지 못한다. 우회하는 척하는 게 더 위험하다.
- 부수 리스크: 파일 규약 이미지가 페이지별 `openGraph` 선언과 충돌해 유실될 수 있음(§0-2 H, **미확인 4**).

### 3-3. (c)를 택하지 않는 이유

(a)의 구현 비용은 헬퍼 1개 + 14파일 각 1줄이고, 나중에 이미지를 붙일 때 **버릴 코드가 하나도 없다**(헬퍼에 `images`만 추가). 보류해도 절약되는 것이 없다. 반대로 보류하면 결함이 다음 감사에도 그대로 남는다.

### 3-4. og:image 없는 OG 태그가 실제로 값이 있는가 — 근거와 확신도

**요약 판단: "검색 순위에는 거의 무의미, 공유 카드에는 소폭 유효, 2단계 승급의 전제조건으로는 확실히 유효."** 과대평가하지 않는다.

| 주장 | 확신도 | 근거 / 한계 |
|---|---|---|
| 구글 검색 **순위**에 og:title/og:description은 영향 없다 | 높음 | OG는 랭킹 시그널이 아니다. 구글은 스니펫 생성 시 meta description·본문을 쓴다. 이 사이트는 desc 62/62 정상이라 추가 이득이 없다 |
| 구글이 **제목 링크(title link)** 후보로 og:title을 참고할 수 있다 | 중간 | 구글 문서상 제목 링크 소스에 OG 계열이 포함된다고 알려져 있으나, 우리 og:title은 `<title>`과 **동일 문자열**이므로 어차피 변화 없음 → 실효 0 |
| og 태그가 없으면 카카오톡/페북/슬랙 공유 카드가 **아예** 안 뜬다 | **낮음(부정)** — 과장하지 않겠다 | 대부분의 스크래퍼는 og가 없으면 `<title>`/`<meta name="description">`으로 폴백한다. 즉 지금도 완전한 무(無)는 아닐 가능성이 높다. **미확인 3(실측 안 함)** |
| og:title/description/site_name/url을 넣으면 카드가 **결정적(deterministic)**이 된다 | 높음 | 폴백은 플랫폼마다 규칙이 달라 결과가 갈리지만, og가 있으면 모든 플랫폼이 같은 값을 쓴다. `og:site_name`으로 카드에 "계산기 허브" 브랜드 라인이 추가되는 것도 폴백으로는 안 나오는 요소 |
| `og:url`은 공유 URL 정규화에 쓰인다(추적 파라미터 붙은 링크가 공유돼도 같은 문서로 집계) | 중간~높음 | OG 프로토콜의 정의된 용도. 실측은 안 함 |
| **이미지 없는 카드의 CTR 개선폭은 작다** | 중간 | 공유 카드 클릭의 주 동인은 썸네일이다. (a)만으로 트래픽이 눈에 띄게 늘 것으로 기대하면 안 된다. 큰 이득은 2단계(이미지)에서 나온다 |
| 애드센스 승인/정책 리스크 | 없음 | OG 태그는 정책 대상이 아니며 YMYL·얇은 콘텐츠와 무관 |

**즉 (a)의 진짜 가치는 "지금 트래픽이 는다"가 아니라 ① 감사 결함 62/62 해소, ② 공유 카드 결정화·브랜드 노출, ③ 이미지가 준비되는 즉시 헬퍼 한 줄로 전 페이지 승급되는 레일 부설이다.** 이 이상으로 포장하지 말 것.

### 3-5. 2단계(이미지) 예고 — 오늘은 실행하지 않음

- 필요한 것: **1200×630 PNG/JPG 1장**(사이트 공용). 정사각형 `hero-illustration.webp`(380×630 아님, 380×380)는 **전용 금지** — 비율이 안 맞아 잘리고, 투명 배경이라 다크모드 클라이언트에서 깨져 보인다. WebP는 일부 스크래퍼 호환이 불확실하므로 **PNG/JPG 권장**.
- 도입 방식은 파일 규약(`app/opengraph-image.png`)이 아니라 **§5의 헬퍼에 `images`를 추가**하는 방식을 권장한다(§0-2 H 유실 리스크 회피 + 절대 URL·width/height 명시 가능).
- 이 건은 마스터를 통해 design팀·사용자 승인 라인으로 넘긴다. **기획팀이 단독 결정하지 않는다.**

---

## 4. `og:type` 매핑 (질문 4)

| 페이지 타입 | URL 예 | `og:type` | 근거 |
|---|---|---|---|
| 홈 | `/` | `website` | 사이트 루트 |
| 카테고리 | `/salary`, `/loan`, `/date`, `/life` | `website` | OG에는 목록/컬렉션 타입이 없다. `article`은 오표기 |
| 계산기 상세 | `/calculator/[slug]` (16개) | `website` | **기사가 아니라 도구**다. `article`을 쓰면 `article:published_time` 같은 없는 정보를 요구받고, 실제로 없는 발행일을 지어내게 된다(조작 금지 원칙 위반). JSON-LD가 이미 `WebApplication`으로 정확히 선언 중 |
| 블로그 목록 | `/blog`(+`?page=2~4`) | `website` | 목록은 기사 아님 |
| **블로그 상세** | `/blog/[slug]` (36개) | **`article`** | 유일한 진짜 기사. 발행일 데이터가 실재함 |
| 법적 고지/정보 | `/privacy`, `/terms`, `/about`, `/support`, `/links` | `website` | 법적 고지에 `article`을 붙일 이득 없음. 통일이 유지보수에 유리 |

**블로그 상세 추가 필드(`type: "article"`일 때만):**

| OG 필드 | 값 출처 | 비고 |
|---|---|---|
| `publishedTime` | `post.publishedDate` | **날짜만 있는 `YYYY-MM-DD` → `YYYY-MM-DDT00:00:00+09:00`로 변환해 넘길 것.** OG의 `article:published_time`은 ISO8601 datetime을 기대한다. (JSON-LD 쪽은 schema.org가 Date를 허용하므로 **현행 유지, 건드리지 말 것**) |
| `modifiedTime` | `post.updatedDate ?? post.publishedDate` | 기존 JSON-LD(`blog-jsonld.ts:38`)와 동일한 폴백 규칙을 그대로 재사용 |
| `authors` | **넣지 않음** | `article:author`는 프로필 URL을 기대하는 필드다. 개인 저자가 없고 JSON-LD에서 이미 Organization("계산기 허브")을 저자로 선언했다. 이름 문자열을 억지로 넣지 않는다(조작 금지 원칙) |
| `section` | (선택) `categoryInfo[post.category].title` | 실효 미미. 개발팀 재량, 넣어도 무해 |

---

## 5. twitter card (질문 5) + 구현 사양

### 5-1. twitter 결론: **별도 `twitter` 블록을 만들지 않는다**

§0-2 B/C에서 확인한 대로, `openGraph`만 설정하면 Next.js가 `twitter:card`/`twitter:title`/`twitter:description`을 **자동 생성**한다.

- 지금(이미지 없음): `twitter:card = summary` (C의 자동 분기)
- 2단계(이미지 추가 후): 헬퍼에 `images`가 생기면 **자동으로 `summary_large_image`로 승급** — 별도 수정 불필요.
- `twitter:site`/`twitter:creator`: **넣지 않는다.** 이 사이트는 운영 중인 X(트위터) 계정이 없다. 없는 핸들을 적으면 잘못된 귀속이 된다.

→ 즉 "twitter card 포함 여부"에 대한 답: **포함된다. 단 코드로 선언하지 않고 openGraph에서 파생된다.** 카드 타입은 현재 `summary`.
→ **QA 주의:** 이 자동 생성은 소스 독해(§0-2 B/C) 기반이다. 구현 후 실제 HTML에서 `twitter:card`가 나오는지 반드시 확인하고, **안 나오면** 그때 헬퍼에 `twitter: { card: "summary" }`를 명시 추가한다(폴백 플랜).

### 5-2. 루트 layout에 openGraph를 두지 않는 이유 (중요)

"루트 layout에만 openGraph를 넣고 전 페이지가 상속받게 하면 1파일 수정으로 끝나지 않나?" — 검토했고 **기각**한다.

- 장점: 1줄 변경으로 62개 페이지에 og:type/site_name/locale + (자동 상속되는) og:title/og:description이 붙는다.
- **치명적 단점 1:** `og:url`을 페이지별로 줄 수 없다. 루트에 `url`을 쓰면 **62개 전 페이지가 홈 URL을 og:url로 갖는다**(가장 나쁜 결과: 어떤 글을 공유해도 카드가 홈을 가리킬 수 있음). `url`을 생략하면 og:url 태그 자체가 없다(§0-2 E).
- **치명적 단점 2:** 블로그 상세의 `og:type=article`을 만들 수 없다(전 페이지 `website` 고정).
- **부수 위험:** `app/not-found.tsx`가 없어 기본 404가 쓰이는데, 루트에 openGraph가 있으면 **404 페이지도 홈 OG를 물려받는다.**

→ 따라서 **루트 layout에는 `metadataBase`만**, `openGraph`는 각 페이지가 헬퍼로 생성한다. 이 구조의 실패 모드는 "헬퍼를 빠뜨린 페이지에 OG 태그가 없다"(= 현재와 동일, 무해)이고, 반대 구조의 실패 모드는 "잘못된 og:url이 박힌다"(= 현재보다 나쁨)이다. **안전한 실패 쪽을 택한다.**

### 5-3. 헬퍼 사양 — 신규 파일 `lib/og.ts`

14곳 중복을 줄이는 방식으로, **인라인이 아니라 공통 헬퍼**를 만든다. 위치는 `lib/` (기존 `lib/site-jsonld.ts`, `lib/calculator-jsonld.ts`, `lib/blog-jsonld.ts`처럼 "관심사별 순수 헬퍼 1파일" 관례를 그대로 따름).

**시그니처(개발팀 참고용 형태, 최종 구현은 개발팀 재량):**

```ts
// lib/og.ts
import type { Metadata } from "next";
import { SITE_URL, canonicalUrl } from "@/lib/site";

export const SITE_NAME = "계산기 허브";

type BuildOpenGraphInput = {
  /** 페이지 경로. canonical에 넘기는 것과 "같은 문자열"을 넘긴다. 예: "/salary", "/blog?page=2" */
  path: string;
  /** 기본 "website". 블로그 상세만 "article" */
  type?: "website" | "article";
  /** type === "article"일 때만. "YYYY-MM-DD" */
  publishedDate?: string;
  /** type === "article"일 때만. 없으면 publishedDate로 폴백 */
  updatedDate?: string;
};

export function buildOpenGraph(input: BuildOpenGraphInput): Metadata["openGraph"];
```

**헬퍼가 만드는 값 / 만들지 않는 값:**

| 필드 | 값 | 출처 |
|---|---|---|
| `og:url` | `canonicalUrl(path)` | **canonical과 동일 함수로 생성** → 두 값이 구조적으로 어긋날 수 없음 |
| `og:site_name` | `"계산기 허브"` | 신규 상수 `SITE_NAME`. 값 자체는 기존 JSON-LD(`site-jsonld.ts:18`)의 리터럴과 **동일 문자열**이어야 함 |
| `og:locale` | `"ko_KR"` | 신규 리터럴. `<html lang="ko">`와 정합(OG는 `언어_지역` 형식이라 `ko`가 아니라 `ko_KR`) |
| `og:type` | `website` \| `article` | §4 표 |
| `article:published_time` | `${publishedDate}T00:00:00+09:00` | `post.publishedDate` |
| `article:modified_time` | `${updatedDate ?? publishedDate}T00:00:00+09:00` | `post.updatedDate ?? post.publishedDate` |
| `og:title` | **설정하지 않음** | 페이지 `title` 자동 상속(§0-2 A) |
| `og:description` | **설정하지 않음** | 페이지 `description` 자동 상속 |
| `og:image` | **설정하지 않음** | 1단계 범위 밖(§3). 2단계에 **이 파일 한 곳만** 수정 |
| `twitter:*` | **설정하지 않음** | openGraph에서 자동 파생(§5-1) |

- 헬퍼는 **순수 함수**(인자 → 값, 전역 상태 없음)로 만든다. 기존 jsonld 헬퍼들과 같은 규약.
- `SITE_NAME`을 `lib/og.ts`가 아니라 `lib/site.ts`에 두는 것도 가능(개발팀 재량). 다만 **기존 3개 jsonld 파일의 `"계산기 허브"` 리터럴을 이번에 리팩터링하지는 말 것** — JSON-LD 62/62가 현재 정상이므로 회귀 위험만 늘린다. 상수 통합은 별건으로 미룬다.

### 5-4. 파일별 수정 지시 (총 15파일 = 루트 1 + 페이지 13 + 신규 헬퍼 1)

**공통 규칙: 기존 `title`/`description`/`alternates`/`robots`/`verification` 라인은 한 글자도 건드리지 않는다. `openGraph:` 한 줄만 추가한다.**

| # | 파일 | 추가 내용 | 비고 |
|---|---|---|---|
| 0 | `lib/og.ts` (신규) | §5-3 헬퍼 | — |
| 1 | `app/layout.tsx` | `metadataBase: new URL(SITE_URL)` **만** | openGraph 추가 금지(§5-2). `lib/site`에서 `SITE_URL` import 필요 |
| 2 | `app/page.tsx` | `openGraph: buildOpenGraph({ path: "/" })` | `canonicalUrl("/")` → `SITE_URL`(슬래시 없음)과 동일해짐 |
| 3 | `app/salary/page.tsx` | `buildOpenGraph({ path: "/salary" })` | |
| 4 | `app/loan/page.tsx` | `buildOpenGraph({ path: "/loan" })` | |
| 5 | `app/date/page.tsx` | `buildOpenGraph({ path: "/date" })` | |
| 6 | `app/life/page.tsx` | `buildOpenGraph({ path: "/life" })` | |
| 7 | `app/calculator/[slug]/page.tsx` | `buildOpenGraph({ path: \`/calculator/${calculator.slug}\` })` | **raw slug가 아니라 조회로 확정된 `calculator.slug`** 사용(기존 canonical 주석의 규칙과 동일). `if (!calculator) return {}` 조기 반환 유지 |
| 8 | `app/blog/[slug]/page.tsx` | `buildOpenGraph({ path: \`/blog/${post.slug}\`, type: "article", publishedDate: post.publishedDate, updatedDate: post.updatedDate })` | 유일한 `article` |
| 9 | `app/blog/page.tsx` | `buildOpenGraph({ path: page > 1 ? \`/blog?page=${page}\` : "/blog" })` | canonical과 **같은 분기식**을 쓸 것. `page > totalPages`일 때 `{}` 조기 반환은 그대로 유지(OG도 안 나가야 함) |
| 10 | `app/about/page.tsx` | `buildOpenGraph({ path: "/about" })` | |
| 11 | `app/support/page.tsx` | `buildOpenGraph({ path: "/support" })` | |
| 12 | `app/privacy/page.tsx` | `buildOpenGraph({ path: "/privacy" })` | |
| 13 | `app/terms/page.tsx` | `buildOpenGraph({ path: "/terms" })` | |
| 14 | `app/links/page.tsx` | `buildOpenGraph({ path: "/links" })` | sitemap에는 없지만 페이지는 존재 → OG는 붙인다 |

**#8, #9 부가 제안(선택, 낮은 우선순위):** 이 두 파일만 canonical을 `` `${SITE_URL}/...` ``로 직접 조립하고 있다(§0-1 #5). `canonicalUrl()`로 통일하면 일관성이 오르지만, **canonical 62/62가 현재 완전 정상**이므로 이번 커밋에 섞지 말고 별건으로 분리할 것을 권한다. og:url은 헬퍼가 `canonicalUrl()`로 만들므로, 통일하지 않아도 두 값은 문자열이 일치한다(둘 다 트레일링 슬래시 없음, 같은 SITE_URL). — **단 QA에서 실제 문자열 일치를 눈으로 확인할 것.**

### 5-5. coming-soon 계산기 처리

`status === "coming-soon"`은 `robots: { index: false }`다. 이런 페이지에도 OG는 **동일하게 붙인다**(분기 없음).
- 근거: OG는 색인이 아니라 공유 프리뷰용이다. noindex 페이지도 링크로 공유될 수 있다. 분기를 넣으면 코드만 복잡해지고 이득이 없다.
- 참고: 현재 coming-soon은 0개(16개 전부 live)로 보이나, 방어 로직은 유지.

---

## 6. 완료 판정 기준 (QA 체크리스트)

빌드 후 라이브(또는 `.next` 산출 HTML) 기준으로 확인:

1. **62/62** 페이지에 `og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`, `og:locale` **6종 존재**.
2. `og:url` 문자열이 같은 페이지의 `<link rel="canonical">` **href와 완전 일치**(트레일링 슬래시·쿼리 포함 축자 비교). 불일치 1건도 허용 안 함.
3. `og:title` = 해당 페이지 `<title>` 텍스트와 일치 / `og:description` = `<meta name="description">`와 일치. (자동 상속이 실제로 동작했는지 검증 — §0-2 A는 소스 독해 기반이므로 **여기서 반드시 실측**)
4. `og:type`: 블로그 상세 36개만 `article`, 나머지 26개는 `website`. 블로그 상세에 `article:published_time`/`article:modified_time` 존재.
5. `twitter:card` = `summary`, `twitter:title`/`twitter:description` 존재(§5-1). **없으면 폴백 플랜 적용.**
6. `og:image` / `twitter:image`는 **없는 게 정상**(1단계 범위).
7. 회귀 확인: canonical 62/62 self 일치 **유지**, title≤60·desc≤160 **유지**, JSON-LD 62/62 **유지**, noindex 0 **유지**, h1 1개 **유지**.
8. 빌드 로그에 `metadataBase property in metadata export is not set...` 경고가 **없을 것**(§0-2 G — metadataBase를 넣었으므로 애초에 조건 미성립).
9. `/blog?page=2~4`의 og:url에 `?page=N`이 포함될 것. 범위 밖 페이지(`?page=99`)는 404이며 OG 태그가 없을 것.

---

## 7. 리스크 / 애드센스 관점

| 리스크 | 평가 |
|---|---|
| 애드센스 승인·정책 | **없음.** OG는 광고 정책 대상이 아니고 콘텐츠 품질(YMYL·얇은 콘텐츠) 판정과 무관 |
| 검색 순위 회귀 | 낮음. 기존 필드 무수정, 추가만 함. 단 canonical 재생성 경로를 건드리지 않는지 QA 2번으로 확인 |
| 잘못된 og:url 확산 | 설계로 차단(§5-2 루트 openGraph 금지 + 헬퍼가 canonical과 같은 함수 사용) |
| 카피 이중 관리 | 차단(og:title/description을 정의하지 않음) |
| 기대치 과대 | **주의.** (a)만으로 트래픽·CPC가 유의미하게 오르지 않는다. 성과는 2단계 이미지에서 나온다(§3-4). 마스터 보고 시 이 점을 분명히 할 것 |

---

## 8. 마스터 확인 요청 사항

1. **og:image(2단계) 진행 여부 — 기획팀 단독 결정 불가.** 1200×630 공용 OG 이미지 1장 제작을 design팀 큐에 올릴지 사용자 승인이 필요하다. 승인되면 `lib/og.ts` 한 곳 수정으로 62개 전 페이지 + twitter 카드 승급까지 자동 완료된다(§3-5, §5-1).
2. **`SITE_URL` = 실제 프로덕션 도메인 확정 여부.** 커스텀 도메인 전환 계획이 있다면 metadataBase/og:url/canonical/JSON-LD가 한꺼번에 바뀌므로, 전환 전에 이 작업을 하는 편이 낫다(어차피 `lib/site.ts` 1곳 상수).
3. **미확인 1(문서 vs 구현 불일치)** 은 개발팀이 `next build` 한 번으로 확정할 수 있다. 구현 착수 시 확인 결과를 팀로그에 남겨 달라.

---

## 9. 부록 — 이번 범위 밖이지만 읽다가 발견한 것

1. **`/links`가 `app/sitemap.ts`에 없다.** 페이지는 라이브고 noindex도 아닌데 sitemap에서 빠져 있다(정적 10개 목록에 `/about`, `/support`는 있고 `/links`만 없음). 의도된 제외인지 누락인지 확인 필요 → **별건 티켓 권장.** 이번 OG 작업과 섞지 말 것.
2. `app/not-found.tsx`가 없다(기본 404 사용). 지금은 무해하나, 향후 루트 layout에 openGraph를 넣는 변경이 생기면 404가 홈 OG를 상속하는 문제가 생긴다 — §5-2 결정이 이 문제도 함께 막아 준다.
