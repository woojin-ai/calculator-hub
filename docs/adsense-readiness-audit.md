# AdSense 승인 준비도 점검 (읽기 전용 감사)

> 작성: 2026-07-15 데일리 팀 스탠드업(마스터). **읽기 전용 평가** — 실제 AdSense 신청·배포·계정
> 생성은 수행하지 않았으며, 이는 사용자만 내릴 수 있는 결정입니다. 이 문서는 "지금 신청 가능한
> 상태인가?"를 근거와 함께 정리해 **사용자의 방향 결정(로드맵 확장 / 블로그 추가 / AdSense 신청
> 중 택1)을 돕기 위한 자료**입니다.
>
> **갱신 2026-07-15(같은날 GSC 감사 반영):** 최초 작성 시 미확정으로 남겼던 **§2-1 실배포 URL
> 생존**이 같은 날 daily-gsc-audit(08:00)에서 독립 확인됨 — `calculator-hub-delta.vercel.app`
> GET / → 200, sitemap 26 URL, robots 200, 신규 페이지(DSR·4대보험) index,follow, 모바일
> 375px 렌더 오버플로 0. → **AdSense 신청 전 마지막 기술 미확정 항목이 해소**되었습니다(§2-1 참고).

## 결론 한 줄

콘텐츠 볼륨·필수 정책 페이지·크롤링/색인 인프라·개인정보(광고·쿠키 고지)까지 **AdSense 신청에
필요한 기술·콘텐츠 요건은 사실상 충족**된 상태로 판단됩니다. **(1) 실배포 URL 생존은 같은날 GSC
감사(08:00)에서 200으로 확인**되어(§2-1), 남은 것은 사실상 **(2) 사용자의 신청 결정**뿐입니다.
승인 자체는 Google 심사 소관이라 보장할 수 없습니다.

---

## 1. 충족된 항목 (근거 포함)

| 항목 | 상태 | 근거 |
|---|---|---|
| 콘텐츠 볼륨 | ✅ | 라이브 계산기 **12개** + 블로그 **4편**(4카테고리 전부 커버) + 카테고리 4 + 정적 4 = 빌드 정적 페이지 **32개**. 각 계산기 상세는 해설 500~1000자 + FAQ 4~6개로 얇지 않음(`lib/calculators.ts`) |
| thin-content(빈약 페이지) | ✅ 없음 | `lib/calculators.ts`에 **coming-soon 스텁 0개** (전부 status:"live"). 얇은 "준비 중" 페이지가 색인되어 감점될 위험 없음 |
| 필수 정책 페이지 | ✅ | `/about`(운영자·목적), `/privacy`(개인정보처리방침), `/terms`(이용약관), `/support`(FAQ + 문의폼) 전부 존재 |
| 개인정보처리방침의 광고 고지 | ✅ | `app/privacy/page.tsx`에 **Google AdSense·쿠키·광고 식별자·제3자 맞춤형 광고·옵트아웃 경로**까지 명시(§4 제3자 제공/쿠키, §5 쿠키 운영·거부). AdSense 정책이 요구하는 광고·쿠키 고지 선반영됨 |
| sitemap | ✅ | `app/sitemap.ts` → 정적 10 + **라이브 계산기 12**(coming-soon 필터) + **블로그 4** = 26 URL. `changeFrequency`/`priority` 지정 |
| robots | ✅ | `app/robots.ts` → `User-agent: * / Allow: /` + `Sitemap` 선언. 전면 허용, 크롤링 차단 없음 |
| 소유권 확인 메타 | ✅ | `app/layout.tsx`에 `google-site-verification`(`_YX3kbSeZq2clAsi9usIngHj7Q...`) + `naver-site-verification` 존재 |
| 모바일/접근성 | ✅ | 뷰포트 메타 정상(과거 GSC 감사 확인), 전역 focus-visible 포커스 링 + forced-colors 대응(07-15 접근성 3종 완료) |
| 구조화 데이터(SEO) | ✅ | 12개 계산기 JSON-LD(BreadcrumbList+WebApplication+FAQPage) + 사이트 WebSite/Organization + 카테고리 CollectionPage/ItemList + 블로그 BlogPosting |
| 내부링크 | ✅ | blog↔calculator 양방향(상세·카테고리) + 계산기 세트 링크 완성 |
| 빌드 건전성 | ✅ | `npm run build` EXIT 0, 정적 32/32 (이번 실행 직접 확인) |

## 2. 신청 전 확인/보완 후보 (차단은 아님)

1. ~~**실배포 URL 생존 확인 (사용자/감사 트랙)**~~ — ✅ **해소됨(2026-07-15 GSC 감사 08:00).**
   `lib/site.ts`의 `SITE_URL` = `https://calculator-hub-delta.vercel.app`가 같은날 daily-gsc-audit
   에서 독립 확인: GET / → **200**(55KB, viewport·소유권 메타 서빙), sitemap.xml → 200(**26 URL**),
   robots.txt → 200, 신규 페이지 `/calculator/dsr-calculator`·`/calculator/four-insurance-calculator`
   → 200 + `index, follow`, 404 가드(존재하지 않는 경로 → 404+noindex), **모바일 375px 렌더
   오버플로 0**. AdSense 심사가 크롤링할 라이브 URL이 살아있음이 실측 확인됨.
   (참고: 커스텀 도메인을 붙일 계획이라면 신청 전에 연결하는 편이 유리 — 이는 선택 사항)
2. **ads.txt** — 현재 `public/`에 없음. **단, ads.txt는 승인 이후 게시자 ID(pub-xxxx)를 받아야
   작성 가능**하므로 신청 시점의 차단 요소가 아님. 승인 후 `public/ads.txt`에
   `google.com, pub-XXXX, DIRECT, f08c47fec0942fa0` 형식으로 추가하면 됨(후속 작업).
3. **AdSense 스크립트 미삽입** — 광고 슬롯/스크립트는 아직 코드에 없음(정상). 승인 후 사용자
   게시자 ID로 삽입하는 단계. 지금 넣을 수 없음(ID 미발급).
4. **콘텐츠 "동일 날짜 대량 발행" 신호** — 블로그 4편이 근접 발행됨. 추가 발행 시 발행일을
   분산하는 편이 자연스러움(품질 심화/블로그 확장 방향과 연동).

## 3. 사용자 결정이 필요한 큰 방향 (택1 권장)

세부 인프라(SEO·내부링크·접근성·구조화데이터·유지보수)는 **사실상 소진**되어, 사용자 부재 중
안전하게 진행할 순수-내부 작업이 거의 남지 않았습니다. 다음 중 하나를 골라주시면 그 방향으로
파이프라인을 재가동합니다:

- **(a) AdSense 신청 진입** — 위 1번(배포 URL 생존)이 같은날 GSC 감사로 확인됨 → **기술 선행조건은
  충족, 지금이 적기**. 승인 후 ads.txt + 광고 스크립트 삽입은 팀이 처리 가능.
- **(b) 콘텐츠/블로그 확장** — bmi·단위변환 지원 글이 아직 0편, loan 시리즈 등 추가 여지.
  발행일 분산 전제.
- **(c) 로드맵 확장(#13~)** — 신규 계산기 발굴(planning 트렌드 리서치부터).

> 위 판단은 코드/파일 근거에 기반한 읽기 전용 평가이며, 실제 신청·배포는 진행하지 않았습니다.
