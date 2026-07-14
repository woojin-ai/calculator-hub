# 계산기 상세 → 관련 블로그 글 (역방향 내부링크) IA/콘텐츠 스펙

작성: 기획팀 · 2026-07-15
대상 독자: 개발팀(구현), 디자인팀(헤딩/카드 레이아웃)
상태: 기획 초안 — 마스터 검토 후 개발팀 전달

---

## 0. 목적 / 범위

블로그 글 → 계산기 내부링크(`relatedCalculatorSlugs` + 본문 `calculatorCta`)는 이미 존재한다.
반대 방향인 **계산기 상세 페이지 → 그 계산기를 참조하는 블로그 글** 링크가 없어, 계산기로 진입한
사용자를 블로그(체류시간·PV·애드센스 노출 지면)로 순환시키지 못한다. 이 스펙은 계산기 상세 페이지
(`app/calculator/[slug]/page.tsx`) 하단에 **"관련 글"** 블록을 신설하는 IA/콘텐츠 규격을 정의한다.

- 이 작업은 **순수 내부링크 재배치**다. 신규 카피(설명글/FAQ)를 생성하지 않는다. → §7 리스크 참조.
- 코드는 개발팀 몫. 이 문서는 규칙·배치·문구·역매핑 표·핸드오프 이슈까지만 다룬다.
- 기존 확정 사항(계산기 허브 컨셉, Next.js 스택, 4개 카테고리, `BlogPost`/`CalculatorMeta`
  데이터모델)은 그대로 두고 그 위에서 확장한다. 데이터모델 변경 없음.

---

## 1. 역매핑 규칙 (결정 1)

### 1.1 매핑 정의
계산기 slug `X`에 대한 "관련 글" 집합 =
`blogPosts` 중 `relatedCalculatorSlugs`가 `X`를 **포함하는** 모든 글.

- 방향: blog이 진실의 원천(single source of truth). 계산기 쪽에 별도 필드를 새로 만들지 않고
  기존 `relatedCalculatorSlugs`를 역인덱싱만 한다. → 데이터 이중관리·불일치 위험 없음.
- 개발 참고(구현은 개발팀 판단): `getRelatedBlogPosts(slug)` 같은 헬퍼 1개를 `lib/blog.ts`에
  추가해 `blogPosts.filter(p => p.relatedCalculatorSlugs.includes(slug))` 형태로 파생.
  `calculators.ts`가 `blog.ts`를 import하지 않도록 방향(계산기→블로그 단방향 의존)을 유지할 것.

### 1.2 정렬 (권장: 발행일 내림차순 + tie-breaker)
1차 키: `publishedDate` **내림차순**(최신 글 먼저) — 기존 `getAllBlogPosts()`와 동일 정책이라 일관.
- **주의(실측):** 현재 4편이 **모두 `publishedDate: "2026-07-15"`로 동일**하다. 발행일만으로는
  정렬이 결정되지 않으므로 **2차 tie-breaker가 반드시 필요**하다.
- 2차 키 권장: **`slug` 오름차순**(안정적·결정적 정렬 → SSG 빌드 산출물이 재현 가능). `localeCompare`
  기반. 향후 글이 늘어 발행일이 갈리면 자연히 1차 키가 지배하고, tie일 때만 slug로 갈린다.
- (대안으로 `blogPosts` 배열 등장 순서를 tie-breaker로 쓸 수도 있으나, 배열 순서는 편집 시 흔들려
  의도치 않게 노출 순서가 바뀌므로 slug 오름차순을 권장.)

### 1.3 개수 상한 (권장: 상한 3)
- 상한 **3편** 권장. 근거:
  - 하단 `RelatedCalculators`가 이미 최대 3개(`getRelatedCalculators(slug, limit=3)`)라 시각적
    리듬이 맞고, 3열 그리드(§5.3 재사용) 한 줄에 정확히 들어간다.
  - 현재 어떤 계산기도 매칭 3편을 넘지 않아(최대 2편, §4 표) **당장은 컷오프가 발생하지 않는다**.
    상한은 향후 블로그가 늘어날 때를 위한 안전장치.
- 상한 적용은 정렬(§1.2) **후** `slice(0, 3)`.

---

## 2. 배치 위치 (결정 2)

페이지 하단 렌더 순서 권장(위 → 아래):

```
[계산기 UI]
[ResultInterpretation]           (결과 해석)
[FaqAccordion]                    (FAQ)
[RelatedCalculators]  ← 기존, 관련 계산기 (같은 도구 계열로 횡이동)
[RelatedBlogPosts]    ← 신규, 관련 글    (읽을거리로 심화)   ★여기
```

**권장: 관련 계산기(RelatedCalculators) 블록 아래에 관련 글 블록을 둔다.**

이유:
1. **사용자 의도 계단(intent ladder):** 계산기 페이지 방문자의 1차 니즈는 "계산"이다. 계산 직후
   가장 가까운 다음 행동은 (a) 다른 계산기로 횡이동 → (b) 개념을 더 읽는 글 소비 순으로 자연스럽다.
   도구를 먼저, 읽을거리를 나중에 두는 것이 이탈 없이 순환을 늘린다.
2. **애드센스 지면:** 페이지가 아래로 길어지며 스크롤 심도가 늘어 하단 광고 노출·뷰어빌리티에 유리.
   단 두 블록 사이/아래 광고 슬롯 배치는 광고팀·개발팀 협의 사항(이 스펙 범위 밖).
3. **일관성:** 두 블록 모두 "더 볼 것" 추천 성격이라 하단에 나란히 두면 정보 구조가 예측 가능.

> 대안(관련 글을 위로)은 권장하지 않음: 계산기→계산기 횡이동이 이 사이트의 핵심 세트 전략
> (`relatedSlugs` override로 세트 파트너를 의도적으로 연결)이라, 그 흐름을 글보다 뒤로 밀면
> 세트 순환이 약해진다.

---

## 3. 빈 상태 / 가시성 게이팅 (결정 3, 4)

### 3.1 빈 상태 (결정 3) — 확인
- 매칭 글이 **0편인 계산기는 블록 자체를 렌더하지 않는다.** 빈 헤딩("관련 글"만 덩그러니)이나
  빈 그리드를 남기지 않는다.
- 기존 `RelatedCalculators`가 `if (calculators.length === 0) return null;`로 처리하는 패턴과
  **동일하게** 신규 컴포넌트도 `posts.length === 0`이면 `null` 반환.
- 실측상 0편 계산기: `bmi-calculator`, `unit-converter`, `four-insurance-calculator` (§4 표).
  → 이 3개 페이지에서는 관련 글 블록이 아예 나타나지 않아야 한다.

### 3.2 가시성 게이팅 (결정 4) — 확인
- **live 계산기에서만 노출.** `coming-soon` 스텁 페이지에는 렌더하지 않는다.
- `RelatedCalculators`와 동일 게이팅: 페이지에서 `calculator.status === "live"` 조건 하에서만
  렌더(현재 `page.tsx` L130 패턴 재사용). 참고로 현재 12개 계산기가 전부 `live`라 실질 차이는
  없으나, 향후 `coming-soon` 스텁 추가 시 자동으로 숨겨지도록 게이팅을 명시해 둔다.
- 참고: 블로그 글은 게시된 것만 `blogPosts`에 존재하므로 draft 게이팅은 불필요(별도 status 필드 없음).

---

## 4. 역매핑 결과 표 (현재 4편 기준, 12개 계산기 전부 live)

블로그 4편의 `relatedCalculatorSlugs`(실측):
- `salary-net-income-guide-2026` (salary) → salary-net-calculator, severance-pay-calculator, service-period-calculator
- `dsr-loan-limit-guide-2026` (loan) → dsr-calculator, loan-interest-calculator, loan-prepayment-fee
- `summer-electricity-progressive-rate-2026` (life) → electricity-bill-calculator
- `age-korean-age-law-2026` (date) → age-calculator, dday-calculator, service-period-calculator

| 계산기 slug | 카테고리 | status | 매칭 편수 | 매칭되는 글 |
|---|---|---|---|---|
| salary-net-calculator | salary | live | 1 | 연봉 실수령액 가이드 |
| severance-pay-calculator | salary | live | 1 | 연봉 실수령액 가이드 |
| four-insurance-calculator | salary | live | **0** | (없음) — §6 콘텐츠 갭 |
| service-period-calculator | date | live | **2** | 연봉 실수령액 가이드 + 만 나이 통일법 |
| loan-interest-calculator | loan | live | 1 | DSR/대출한도 가이드 |
| loan-prepayment-fee | loan | live | 1 | DSR/대출한도 가이드 |
| dsr-calculator | loan | live | 1 | DSR/대출한도 가이드 |
| age-calculator | date | live | 1 | 만 나이 통일법 |
| dday-calculator | date | live | 1 | 만 나이 통일법 |
| electricity-bill-calculator | life | live | 1 | 여름 전기요금 누진제 |
| bmi-calculator | life | live | **0** | (없음) — 지원 글 미제작 |
| unit-converter | life | live | **0** | (없음) — 지원 글 미제작 |

- 최대 매칭 편수 = 2 (`service-period-calculator`). → 현재 §1.3 상한 3에 걸리는 계산기 없음.
- 블록이 렌더되는 계산기: 9개. 렌더되지 않는(0편) 계산기: 3개.

---

## 5. 헤딩 / 문구 / 접근성 (결정 5)

### 5.1 섹션 제목 문구
- 권장: **"관련 글"** (기존 "관련 계산기"와 대구를 이뤄 예측 가능·간결).
  - 대안: "이 계산기와 함께 읽으면 좋은 글", "관련 콘텐츠" — 더 길지만 클릭 유인이 약간 높을 수
    있음. 1차는 "관련 글"로 통일하고, 후속 A/B는 마케팅팀과 별도 논의.

### 5.2 heading 레벨 권장
- 페이지 h1은 계산기 제목 1개(`page.tsx` L106). 유지.
- 관련 계산기 섹션 제목이 `<h2>`(`RelatedCalculators` L13). 관련 글 섹션 제목도 **동일 레벨 `<h2>`**
  로 둔다(형제 섹션이므로 같은 위계가 맞고, 문서 아웃라인이 h1 → h2(관련 계산기) → h2(관련 글)로
  평탄해 SEO/스크린리더에 자연스럽다).

### 5.3 컴포넌트 재사용
- 카드: 기존 **`BlogPostCard`** 재사용(블로그 목록/상세에서 이미 사용 중). 신규 카드 디자인 불필요.
- 래퍼: `RelatedCalculators`와 동형의 얇은 신규 섹션 컴포넌트(예: `RelatedBlogPosts`)를 두고,
  내부 그리드는 동일 클래스(`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`) 재사용 권장
  → 관련 계산기와 시각적 리듬 일치.

### 5.4 ★개발/디자인 핸드오프 이슈 — 중복 h2 관찰 (반드시 검토)
- **관찰:** `BlogPostCard`는 카드 **제목(글 제목)을 내부적으로 `<h2>`로 렌더**한다
  (`components/BlogPostCard.tsx` L24: `<h2 className="line-clamp-2 ...">{post.title}</h2>`).
- **결과적 문제:** 관련 글 섹션 헤딩을 `<h2>`(§5.2)로 두면, 그 아래 카드마다 또 `<h2>`가 생겨
  **같은 레벨 h2가 섹션 제목 + 카드 N개로 중첩·남발**된다. 문서 아웃라인상 "관련 글"(h2)과
  각 글 제목(h2)이 형제로 잡혀 위계가 뭉개진다. (이 h2는 카드가 `<a>` 링크 내부에 있어 랜드마크
  성격이라 치명적이진 않으나, 아웃라인/접근성 관점에서 개선 여지가 있다.)
- **참고:** 블로그 **목록 페이지**에서도 `BlogPostCard`가 쓰이므로 동일한 h2 남발이 이미 존재할
  가능성이 있다. 즉 이번 신규 블록만의 문제가 아니라 **`BlogPostCard`의 heading 레벨 정책** 문제다.
- **기획팀 제안(택1, 결정은 개발/디자인팀):**
  1. `BlogPostCard`의 제목 태그를 `<h2>` → 시맨틱상 더 낮은 레벨(`<h3>`)이나 비제목 태그
     (`<p>`/`<span>` + 적절한 폰트 클래스)로 조정. 목록 페이지 영향 회귀 확인 필요.
  2. `BlogPostCard`가 heading 레벨을 prop으로 받도록(예: `as`/`headingLevel`) 유연화해,
     문맥별로 h2/h3를 주입. 리팩터링 범위가 조금 더 큼.
  3. (최소 변경) 카드 제목을 h3로 낮추고 섹션 제목을 h2로 유지 → h1 > h2(섹션) > h3(카드 제목)로
    아웃라인 정상화. **가장 무난, 1차 권장.**
- 이 이슈는 **개발팀(태그 변경 범위·회귀)과 디자인팀(시각 위계 유지 여부)** 공동 판단 대상.
  이 스펙에서는 "관련 글 섹션 제목 h2 유지 + 카드 제목 h3" 조합을 기본안으로 넘긴다.

---

## 6. 부수 발견: 콘텐츠 갭 (참고 — 이번 구현 범위 밖)

역매핑을 만들며 드러난 갭. 이번 내부링크 작업으로 해결되지 않으며, 별도 블로그 기획 건으로 다룬다.

- **`four-insurance-calculator`(4대보험료 계산기)가 0편.** 그런데 기존
  `salary-net-income-guide-2026` 글은 본문에서 4대보험 요율을 상세히 다룬다. 즉 주제상으론 맞는
  글이 있는데 그 글의 `relatedCalculatorSlugs`에 `four-insurance-calculator`가 빠져 있어 역매핑에서
  누락됐다. → **가장 저비용 개선**: 해당 글 데이터의 `relatedCalculatorSlugs`에
  `four-insurance-calculator` 추가를 검토(개발팀/기획 협의). 단, 그 글 본문 `calculatorCta`는
  실수령/퇴직/근속 3개를 밀고 있어 편집 의도와의 정합은 확인 필요.
- **`bmi-calculator`, `unit-converter`가 0편.** life 카테고리에서 이 두 계산기를 밀어줄 글이
  아직 없음. 향후 블로그 주제 후보(예: "BMI 정상범위·한국 기준 vs WHO", "평↔㎡·인치↔cm 실생활
  단위 변환 가이드")로 백로그에 올려 두면 역매핑이 자동 채워진다.

---

## 7. YMYL / 콘텐츠 리스크 (결정 6) — 확인: 낮음

- 이 작업은 **기존에 이미 게시된 글로의 내부링크만 추가**한다. 신규 본문·설명·FAQ 카피를 생성하지
  않으므로 "얇은 콘텐츠(thin content)"를 새로 만들지 않는다. 애드센스 승인/정책 리스크 **낮음**.
- 오히려 순환 링크로 페이지 상호 연결성·크롤링 경로가 좋아져 SEO에 우호적.
- 링크 대상 글(연봉/DSR/전기요금)은 YMYL 주제지만, 각 글은 이미 면책 `callout`(warning)을 포함해
  게시된 상태다. 이번 작업이 그 리스크를 **추가로 늘리지 않는다**(새 주장·수치 도입 없음).
- 유일한 유지보수 주의: 글을 비공개/삭제하거나 `relatedCalculatorSlugs`를 수정하면 역매핑이 자동
  반영되어 계산기 페이지의 관련 글도 함께 바뀐다. 이는 정상 동작이며 별도 동기화 작업이 필요 없다는
  점을 개발팀에 명시.

---

## 8. 개발팀 전달 요약 (Acceptance 기준)

1. `lib/blog.ts`에 역인덱싱 헬퍼 추가(계산기→블로그 단방향 의존 유지). 정렬 = 발행일 내림차순,
   tie-breaker = slug 오름차순, `slice(0, 3)`.
2. 신규 `RelatedBlogPosts` 섹션 컴포넌트: 0편이면 `null`, `BlogPostCard`·3열 그리드 재사용,
   섹션 제목 `<h2>` "관련 글".
3. `app/calculator/[slug]/page.tsx`: `status === "live"` 게이팅 하에, `RelatedCalculators`
   **아래**에 `RelatedBlogPosts` 렌더.
4. §5.4 heading 중복 이슈: 카드 제목 h3로 낮추는 기본안 반영(또는 디자인팀과 대안 확정).
5. 회귀 확인: 블로그 목록 페이지의 `BlogPostCard` heading 변경 영향.
6. 스모크 체크: `service-period-calculator`=2편 노출, `bmi-calculator`/`unit-converter`/
   `four-insurance-calculator`=블록 미노출.

> 큰 방향 전환(데이터모델 변경, 새 필드 도입, four-insurance 글 재매핑 등)이 필요하면 개발팀이
> 임의 결정하지 말고 마스터를 통해 기획팀에 되돌릴 것(핑퐁).
