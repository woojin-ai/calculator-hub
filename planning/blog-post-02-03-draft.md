# 블로그 글 2편 초안 (post 02 / 03) — 개발팀 붙여넣기용

작성: 기획팀 / 대상: 개발팀·QA팀
대상 파일: `lib/blog.ts`의 `blogPosts` 배열에 아래 두 객체를 그대로 추가.
원칙: `planning/blog-spec.md` IA·조작금지(YMYL) 준수. 본문 수치는 전부 `lib/calculators.ts` 실제 구현값에서만 인용(지어내기 금지). 기존 글 1편의 문체·구조(도입 질문 → 개념 → 요율/구간 → 실제예시 → CTA → FAQ → 면책 callout) 계승.

> **수치 출처 표기 규칙:** 아래 초안 곳곳의 `// 근거:` 주석은 QA 대조용이며, 개발팀은 blogPosts에 붙여넣을 때 이 주석을 제거하고 넣어도 되고 남겨도 무방(TS 주석). 문서 맨 끝 "핵심 수치 출처 요약표" 참고.

---

## 글 A — DSR (category: "loan")

- slug 제안 확정: `dsr-loan-limit-guide-2026` (task 제안 그대로 채택 — 키워드 "DSR / 대출한도 / 2026" 포함, 롱테일 적합)
- relatedCalculatorSlugs: `["dsr-calculator", "loan-interest-calculator", "loan-prepayment-fee"]`

```ts
{
  slug: "dsr-loan-limit-guide-2026",
  title: "DSR이란? 총부채원리금상환비율로 내 대출한도 계산하는 법 (2026년)",
  description:
    "DSR(총부채원리금상환비율)의 뜻과 계산 공식, 은행권 40%·제2금융권 50% 기준선, DTI와의 차이, 대출한도가 줄어드는 원리를 2026년 기준 실제 예시로 정리했습니다. DSR 계산기로 내 비율도 바로 확인해 보세요.",
  category: "loan",
  tags: ["DSR", "총부채원리금상환비율", "대출한도", "DTI 차이", "스트레스 DSR"],
  publishedDate: "2026-07-15",
  relatedCalculatorSlugs: [
    "dsr-calculator",
    "loan-interest-calculator",
    "loan-prepayment-fee",
  ],
  body: [
    {
      type: "paragraph",
      text: "\"소득도 신용도 괜찮은데 왜 원하는 만큼 대출이 안 나올까?\" 요즘 대출 한도를 좌우하는 가장 큰 변수는 DSR입니다. 집을 사거나 대출을 갈아탈 때 반드시 마주치는 단어인데, 정확히 무엇을 뜻하고 어떻게 계산되는지 모르면 내 한도가 왜 이만큼인지 이해하기 어렵습니다. 이 글에서는 2026년 기준으로 DSR의 정의와 계산 공식, 규제 기준선, DTI와의 차이, 그리고 대출 한도가 줄어드는 원리를 실제 예시와 함께 정리합니다.",
    },
    {
      type: "heading",
      text: "DSR이란 무엇인가",
    },
    {
      type: "paragraph",
      text: "DSR은 '총부채원리금상환비율(Debt Service Ratio)'의 약자로, 내가 1년 동안 갚아야 할 모든 대출의 원금과 이자 합계가 연소득에서 차지하는 비율을 뜻합니다. 비율이 낮을수록 소득 대비 상환 부담이 작다는 의미이고, 높을수록 이미 갚아야 할 빚이 많아 새 대출 여력이 적다는 의미입니다. 현재 가계대출 규제는 바로 이 DSR을 핵심 기준으로 운영됩니다.",
      // 근거: dsr-calculator FAQ "DSR과 DTI는 어떻게 다른가요" — "현재 가계대출 규제는 주로 DSR을 기준으로 운영됩니다"
    },
    {
      type: "heading",
      text: "DSR 계산 공식",
    },
    {
      type: "paragraph",
      text: "DSR은 다음 한 줄로 계산합니다. 모든 대출의 연간 원리금 상환액을 합쳐 연소득으로 나눈 뒤 100을 곱하면 됩니다.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "DSR(%) = 모든 대출의 연간 원리금 상환액 합계 ÷ 연소득 × 100",
        "신규 대출의 연 원리금: 원리금균등상환 방식으로 계산 (매달 원금+이자를 동일하게 갚는 방식)",
        "여기에 이미 있는 기존 대출의 연간 원리금 상환액을 더해 합산",
      ],
      // 근거: dsr-calculator interpretation/FAQ — 공식 및 "신규 대출의 연 원리금을 원리금균등상환 방식으로 자동 계산하고, 여기에 이미 있는 대출의 연간 원리금 상환액을 더해 연소득으로 나눈다"
    },
    {
      type: "paragraph",
      text: "여기서 핵심은 '원금과 이자를 전부' 넣는다는 점입니다. 이자만이 아니라 갚아 나가는 원금까지 모두 상환 부담으로 보기 때문에, 같은 소득이라도 대출이 많을수록 DSR이 빠르게 올라갑니다.",
    },
    {
      type: "heading",
      text: "DSR 규제 기준선 (은행권·제2금융권)",
    },
    {
      type: "paragraph",
      text: "2026년 기준으로 대출 심사에서는 일반적으로 다음 기준선이 쓰이는 경우가 많습니다.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "은행권(제1금융권): DSR 40% 기준선",
        "제2금융권: DSR 50% 기준선",
      ],
      // 근거: dsr-calculator shortDescription/interpretation/FAQ — "은행권은 DSR 40%, 제2금융권은 50%를 기준선으로 두는 경우가 많다"
    },
    {
      type: "paragraph",
      text: "여기에 더해 '스트레스 DSR'이 단계적으로 적용되고 있습니다. 스트레스 DSR은 지금 당장의 금리가 아니라 앞으로 금리가 오를 위험을 미리 반영하기 위해, 실제 금리에 일정한 가산 금리(스트레스 금리)를 더한 값으로 원리금을 다시 계산하는 방식입니다. 그 결과 심사에서 실제로 잡히는 DSR은 단순 계산값보다 높게 나올 수 있어 한도가 더 보수적으로 정해집니다. 다만 스트레스 금리의 구체적 수치와 적용 범위는 지역·시점·대출 종류에 따라 다르고 정책도 수시로 바뀌므로, 이 글에서는 개념까지만 설명합니다.",
      // 근거: dsr-calculator interpretation/FAQ — 스트레스 DSR은 "향후 금리 상승분을 더한 스트레스 금리로 원리금을 다시 계산", "적용 범위는 지역·시점에 따라 달라지고 정책도 수시로 바뀐다". (구체 가산율 수치는 코드에 없어 개념 설명으로만 처리)
    },
    {
      type: "heading",
      text: "DSR과 DTI는 무엇이 다른가",
    },
    {
      type: "paragraph",
      text: "DSR과 자주 헷갈리는 지표가 DTI(총부채상환비율)입니다. 두 지표의 결정적 차이는 '기존 대출의 원금을 넣느냐'입니다. DTI는 주택담보대출의 원리금에 더해 그 밖의 대출은 '이자만' 연소득과 비교하는 반면, DSR은 주택담보대출뿐 아니라 신용대출·기타 모든 대출의 '원금과 이자를 전부' 연소득과 비교합니다. 그래서 DSR이 갚아야 할 원금을 더 폭넓게 반영해 일반적으로 더 엄격한 지표이며, 현재 규제의 중심도 DSR입니다.",
      // 근거: dsr-calculator FAQ "DSR과 DTI는 어떻게 다른가요"
    },
    {
      type: "heading",
      text: "대출 한도가 줄어드는 원리",
    },
    {
      type: "paragraph",
      text: "DSR 규제는 사실상 '연간 원리금 상환액의 상한'을 정하는 것과 같습니다. 예를 들어 은행권 40% 기준선을 그대로 적용하면, 연소득 6,000만원인 사람은 1년에 갚는 원리금 합계가 연소득의 40%인 2,400만원을 넘지 않는 선에서 대출이 설계됩니다. 이 상한은 정해져 있는데 이미 갚고 있는 기존 대출이 있으면, 그 대출의 연간 원리금이 먼저 상한을 차지하고 남은 여유분만큼만 새 대출이 가능해집니다. 즉 기존 대출이 많을수록 신규 대출 한도가 그만큼 줄어드는 구조입니다. (여기서 2,400만원은 연소득 6,000만원에 40%를 적용한 설명용 수치이며, 실제 한도는 은행별 심사·스트레스 DSR에 따라 달라집니다.)",
      // 근거: 6,000만원 × 40% = 2,400만원은 dsr-calculator의 규제비율(40%)을 예시 연소득에 산술 적용한 설명용 값(고정 통계 아님). 연소득 6,000만원은 아래 예시와 동일 값 사용.
    },
    {
      type: "heading",
      text: "실제 예시: 연소득 6,000만원, 주택담보대출 3억원",
    },
    {
      type: "paragraph",
      text: "연소득 6,000만원인 사람이 신규 주택담보대출 3억원을 연 4.5% 금리, 360개월(30년), 원리금균등상환 조건으로 받는다고 가정해 보겠습니다. 이 대출의 월 상환액은 약 1,520,056원, 연 원리금 상환액은 약 18,240,672원입니다. 다른 기존 대출이 전혀 없다면 DSR은 약 30.4%가 됩니다.",
      // 근거: dsr-calculator interpretation 예시 — 연소득 6,000만원, 주담대 3억원(4.5%, 360개월, 원리금균등) → 월 1,520,056원, 연 18,240,672원, DSR 약 30.4%
    },
    {
      type: "paragraph",
      text: "이 30.4%는 은행권 기준선 40%를 넘지는 않지만 여유가 아주 크지는 않은 편입니다. 만약 여기에 신용대출 같은 기존 대출의 연간 원리금이 더해지면 DSR은 40%에 더 가까워지고, 그만큼 추가로 받을 수 있는 대출 여력은 줄어듭니다. 내 소득과 대출 조건을 직접 넣어 DSR을 확인하려면 아래 계산기를 이용하세요.",
    },
    {
      type: "calculatorCta",
      slug: "dsr-calculator",
    },
    {
      type: "paragraph",
      text: "DSR을 계산하려면 먼저 각 대출의 월·연 원리금 상환액을 알아야 합니다. 대출 원금과 금리, 기간을 넣어 원리금균등상환·원금균등상환별 상환액을 확인하고 싶다면 대출 이자 계산기가 도움이 됩니다. 또 기존 대출을 갚거나 갈아타 DSR을 낮추려는 경우라면, 조기 상환 시 발생할 수 있는 중도상환수수료도 함께 따져봐야 실제 이득을 알 수 있습니다.",
    },
    {
      type: "calculatorCta",
      slug: "loan-interest-calculator",
    },
    {
      type: "calculatorCta",
      slug: "loan-prepayment-fee",
    },
    {
      type: "heading",
      text: "자주 묻는 점",
    },
    {
      type: "paragraph",
      text: "DSR이 기준선(예: 40%) 밑이면 무조건 대출이 되나요? 그렇지 않습니다. 이 비율은 어디까지나 '단순 DSR'이며 실제 심사 결과가 아닙니다. 은행은 스트레스 금리를 더한 스트레스 DSR로 다시 계산하고, 소득 인정 방식·대출 종류별 원리금 산정 기준·은행별 내부 기준도 제각각이라 실제 심사 DSR은 계산값과 다를 수 있습니다. 계산 결과가 40% 미만이어도 거절될 수 있고 그 반대도 가능합니다.",
      // 근거: dsr-calculator FAQ "이 계산기 결과로 대출 승인 여부나 한도를 알 수 있나요"
    },
    {
      type: "paragraph",
      text: "소득이나 부채 정보를 입력하는 게 걱정된다면, 계산은 모두 브라우저 안에서만 이루어지고 입력값은 서버로 전송·저장되지 않습니다. 소득·부채는 민감한 정보이므로 안심하고 확인만 하는 용도로 사용할 수 있습니다.",
      // 근거: dsr-calculator FAQ "입력한 소득·대출 정보가 저장되거나 외부로 전송되나요"
    },
    {
      type: "callout",
      variant: "warning",
      text: "본 내용과 예시 수치는 2026년 기준 참고용이며 법적·재무적 효력이 없습니다. 여기서 계산하는 값은 향후 금리 상승분을 반영한 스트레스 DSR이 아닌 단순 DSR이라 실제 심사 DSR보다 낮게 나올 수 있고, DSR 규제 비율과 스트레스 DSR 적용 범위는 지역·시점·대출 종류에 따라 다르며 정책도 수시로 바뀝니다. 실제 대출 승인 여부와 한도는 반드시 금융위원회·금융감독원(금융소비자포털 파인)과 해당 금융기관에서 확인하시기 바랍니다.",
      // 근거: dsr-calculator interpretation 면책 문구 요약 인용
    },
  ],
},
```

---

## 글 B — 여름철 전기요금 누진제 (category: "life")

- slug 제안 확정: `summer-electricity-progressive-rate-2026` (task 제안 그대로 채택)
- relatedCalculatorSlugs: `["electricity-bill-calculator"]`
  - **결정:** `unit-converter`는 전기요금 누진제 주제와 관련성이 낮아 제외했습니다(task가 "관련성 낮으면 넣지 말 것"으로 허용). 내부링크 품질(AdSense 관점 관련성)을 위해 전기요금 계산기 하나만 강하게 밀어줍니다.

```ts
{
  slug: "summer-electricity-progressive-rate-2026",
  title: "여름철 전기요금 누진제, 왜 갑자기 요금이 뛰나 (2026년 주택용 저압)",
  description:
    "여름 냉방으로 전기요금이 급증하는 이유인 누진제를 2026년 주택용 저압 요금표로 정리했습니다. 3단계 누진 단가, 7·8월 하계 완화 구간, 350kWh 요금 구성 예시와 절약 팁까지. 전기요금 계산기로 내 청구액도 확인해 보세요.",
  category: "life",
  tags: ["전기요금", "누진제", "주택용 저압", "여름 전기요금", "하계 누진구간"],
  publishedDate: "2026-07-15",
  relatedCalculatorSlugs: ["electricity-bill-calculator"],
  body: [
    {
      type: "paragraph",
      text: "\"평소랑 비슷하게 쓴 것 같은데 여름만 되면 왜 전기요금이 확 뛸까?\" 에어컨을 며칠 돌렸을 뿐인데 청구서 금액이 겨울의 두 배 가까이 나와 놀라는 경우가 많습니다. 그 핵심 이유가 바로 '누진제'입니다. 이 글에서는 2026년 한국전력공사 주택용 저압 요금표를 기준으로 누진제가 무엇인지, 요금이 어떤 항목으로 구성되는지, 여름에는 왜 달라지는지를 실제 예시와 함께 정리합니다.",
    },
    {
      type: "heading",
      text: "누진제란 무엇인가",
    },
    {
      type: "paragraph",
      text: "누진제는 전기를 많이 쓸수록 더 높은 단가를 매겨 절약을 유도하는 요금 구조입니다. 주택용 전기요금은 사용량에 따라 단가가 올라가는 3단계 누진제로 되어 있어, 사용량이 특정 구간을 넘어서면 그 초과분에 더 비싼 단가가 적용됩니다. 그래서 사용량이 조금만 늘어도 상위 구간에 진입하면 요금이 가파르게 오르는 것입니다.",
      // 근거: electricity-bill-calculator interpretation/FAQ — 주택용 저압 3단계 누진제
    },
    {
      type: "heading",
      text: "전기요금은 어떤 항목으로 구성되나",
    },
    {
      type: "paragraph",
      text: "주택용 전기요금은 여러 항목을 더한 뒤 세금·기금을 붙여 최종 청구액이 됩니다. 구성은 다음과 같습니다.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "기본요금: 도달한 최종 누진 단계의 금액이 한 번 부과",
        "전력량요금: 각 구간 사용량 × 구간별 단가(누진 3단계)를 합산",
        "기후환경요금: 사용량 kWh당 9원",
        "연료비조정요금: 사용량 kWh당 5원",
        "위 네 항목을 더한 '전기요금계'에 부가가치세 10%와 전력산업기반기금 2.7%를 더해 최종 청구요금 산출",
      ],
      // 근거: electricity-bill-calculator interpretation/FAQ — 기본요금(최종 단계 1회), 전력량요금(구간별 단가 합산), 기후환경요금 9원/kWh, 연료비조정요금 5원/kWh, 부가세 10%, 전력산업기반기금 2.7%
    },
    {
      type: "heading",
      text: "3단계 누진 구간과 단가 (기타계절 기준)",
    },
    {
      type: "paragraph",
      text: "여름(7·8월)을 제외한 기타계절의 전력량요금 누진 구간과 단가는 다음과 같습니다. 각 구간에 해당하는 사용량에만 그 구간 단가가 적용되어 합산되는 방식입니다.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "1단계 (200kWh 이하): kWh당 120원",
        "2단계 (200kWh 초과 400kWh 이하): kWh당 214.6원",
        "3단계 (400kWh 초과): kWh당 307.3원",
      ],
      // 근거: electricity-bill-calculator interpretation/FAQ — 1단계 120원, 2단계 214.6원, 3단계 307.3원 / 기타계절 구간 경계 200·400kWh
    },
    {
      type: "heading",
      text: "여름(7·8월)에는 왜 달라지나 — 하계 누진구간 완화",
    },
    {
      type: "paragraph",
      text: "냉방 사용이 급증하는 7월과 8월(하계)에는 냉방 부담을 줄이기 위해 누진 구간의 경계가 넓어집니다. 구체적으로 1·2단계 경계는 200kWh에서 300kWh로, 2·3단계 경계는 400kWh에서 450kWh로 완화됩니다. 즉 여름에는 같은 사용량이라도 낮은 단가 구간에 더 오래 머물게 되어, 겨울·봄·가을보다 상위 구간으로 덜 넘어가고 요금이 상대적으로 덜 오릅니다. 단가 자체는 동일하고 '구간 경계'만 여름에 넓어진다고 이해하면 됩니다.",
      // 근거: electricity-bill-calculator interpretation/FAQ — "7·8월(하계)에는 누진구간 경계가 200·400kWh에서 300·450kWh로 완화"
    },
    {
      type: "heading",
      text: "실제 예시: 월 350kWh 사용 시 요금 구성 (기타계절)",
    },
    {
      type: "paragraph",
      text: "기타계절에 월 350kWh를 사용한 경우를 항목별로 뜯어보면 다음과 같습니다. 사용량이 200kWh를 넘어 초과분에 2단계 단가가 적용된 사례입니다.",
      // 근거: electricity-bill-calculator interpretation 예시 — 350kWh(기타계절), 200kWh 초과로 2단계 적용
    },
    {
      type: "list",
      ordered: false,
      items: [
        "기본요금: 1,600원 (도달한 최종 단계인 2단계 기본요금 1회)",
        "전력량요금: 56,190원 (1단계 200kWh × 120원 + 2단계 150kWh × 214.6원)",
        "기후환경요금: 3,150원 (350kWh × 9원)",
        "연료비조정요금: 1,750원 (350kWh × 5원)",
        "전기요금계: 62,690원 (위 네 항목 합계)",
        "부가가치세: 6,269원 (전기요금계의 10%)",
        "전력산업기반기금: 1,690원 (전기요금계의 2.7%)",
        "최종 청구요금: 약 70,640원",
      ],
      // 근거: electricity-bill-calculator interpretation 예시 전체 — 기본요금 1,600 / 전력량요금 56,190 / 기후환경 3,150 / 연료비조정 1,750 / 전기요금계 62,690 / 부가세 6,269 / 전력기금 1,690 / 최종 약 70,640
    },
    {
      type: "paragraph",
      text: "여기서 눈여겨볼 점은, 사용량이 400kWh를 넘어 3단계(kWh당 307.3원)에 들어가면 초과분 단가가 2단계보다 크게 뛴다는 것입니다. 그래서 누진 단계 경계 근처에서 사용량을 조금만 줄여도 요금 상승을 눈에 띄게 억제할 수 있습니다.",
    },
    {
      type: "heading",
      text: "전기요금 절약 팁",
    },
    {
      type: "paragraph",
      text: "누진제의 특성상 절약은 '단계 경계 관리'가 핵심입니다.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "내 사용량이 어느 누진 단계에 있는지부터 확인: 기타계절 200·400kWh, 여름(7·8월) 300·450kWh 경계를 기준으로 삼기",
        "경계를 살짝 넘긴 상태라면 초과분에 상위 단가가 붙으므로, 그 며칠분 사용량만 줄여도 요금 상승 폭이 큼",
        "여름에는 완화된 하계 구간(300·450kWh)을 기준으로 냉방 사용량을 가늠하면 급격한 요금 상승을 피하기 쉬움",
        "대가족·출산가구·사회적 배려계층 등은 별도 복지·대가족 할인 대상일 수 있으니 한전에서 확인",
      ],
      // 근거: electricity-bill-calculator interpretation(경계 근처 관리) + FAQ(대가족·복지 할인은 한전 확인)
    },
    {
      type: "paragraph",
      text: "내 이번 달 사용량으로 기본요금·누진 전력량요금·기후환경요금·부가세까지 반영한 예상 청구액이 궁금하다면 아래 전기요금 계산기로 바로 확인해 보세요. 여름철 하계 완화 구간도 반영해 계산합니다.",
    },
    {
      type: "calculatorCta",
      slug: "electricity-bill-calculator",
    },
    {
      type: "heading",
      text: "자주 묻는 점",
    },
    {
      type: "paragraph",
      text: "아파트에 사는데 관리비에 찍힌 전기요금과 계산 결과가 왜 다른가요? 이 글과 계산기는 단독주택·다세대 등에서 많이 쓰는 '주택용 저압' 요금표를 기준으로 합니다. 아파트 단지가 한전과 '고압'으로 일괄계약한 경우에는 단가 자체가 다르고, 세대별 사용량을 관리사무소가 다시 나누는 방식이라 관리비 고지서 금액과 차이가 날 수 있습니다.",
      // 근거: electricity-bill-calculator FAQ "아파트에 사는데 이 계산기 결과가 관리비 전기요금과 다른 이유"
    },
    {
      type: "paragraph",
      text: "계산 결과가 실제 청구서와 다를 수도 있나요? 네. 실제 청구서는 달력상 한 달이 아니라 검침일 기준으로 계산되고, 각종 할인·미납·TV수신료 등이 함께 반영됩니다. 또 기후환경요금·연료비조정요금과 전력산업기반기금 요율은 분기 또는 연 단위로 개정되므로 계산 시점과 청구 시점의 단가가 다를 수 있습니다.",
      // 근거: electricity-bill-calculator FAQ "계산 결과가 실제 청구서와 다를 수 있나요"
    },
    {
      type: "callout",
      variant: "warning",
      text: "본 내용과 예시 수치는 2026년 주택용 저압 요금표 기준 참고용이며, 정확한 요금·최신 단가와 다를 수 있습니다. 요금표와 기후환경요금·연료비조정요금·전력산업기반기금 요율은 분기 또는 연 단위로 개정되고, 대가족·복지 할인이나 아파트 일괄계약(고압), 검침 주기 등에 따라 실제 청구액과 차이가 납니다. 정확한 금액과 최신 단가는 한국전력공사 사이버지점(cyber.kepco.co.kr)에서 확인하시기 바랍니다.",
      // 근거: electricity-bill-calculator interpretation 면책 문구 요약 인용
    },
  ],
},
```

---

## 핵심 수치 출처 요약표 (QA 대조용)

### 글 A — DSR

| 글에 쓴 수치/문구 | 값 | 출처 (lib/calculators.ts) |
| --- | --- | --- |
| DSR 공식 | 연간 원리금상환액 합계 ÷ 연소득 × 100 | `dsr-calculator` interpretation / FAQ |
| 신규 대출 원리금 산정 | 원리금균등상환 방식 | `dsr-calculator` interpretation |
| 은행권 기준선 | DSR 40% | `dsr-calculator` shortDescription·interpretation·FAQ |
| 제2금융권 기준선 | DSR 50% | `dsr-calculator` shortDescription·interpretation·FAQ |
| 스트레스 DSR | 향후 금리 상승분(스트레스 금리)을 더해 원리금 재계산 (개념만, 수치 없음) | `dsr-calculator` interpretation·FAQ |
| DTI 차이 | DTI=주담대 원리금+기타대출 이자 / DSR=모든 대출 원금+이자 | `dsr-calculator` FAQ |
| 예시 연소득 | 6,000만원 | `dsr-calculator` interpretation |
| 예시 신규 주담대 | 3억원, 연 4.5%, 360개월, 원리금균등 | `dsr-calculator` interpretation |
| 예시 월 상환액 | 약 1,520,056원 | `dsr-calculator` interpretation |
| 예시 연 원리금 | 약 18,240,672원 | `dsr-calculator` interpretation |
| 예시 DSR | 약 30.4% | `dsr-calculator` interpretation |
| 한도 설명용 2,400만원 | 6,000만 × 40% (규제비율 산술 적용, 고정 통계 아님) | 40%는 `dsr-calculator`, 산술은 설명용 |

### 글 B — 전기요금 누진제

| 글에 쓴 수치/문구 | 값 | 출처 (lib/calculators.ts) |
| --- | --- | --- |
| 요금표 종류 | 한전 주택용 저압 | `electricity-bill-calculator` interpretation |
| 누진 단계 | 3단계 | `electricity-bill-calculator` interpretation·FAQ |
| 1단계 단가 | kWh당 120원 | `electricity-bill-calculator` interpretation·FAQ |
| 2단계 단가 | kWh당 214.6원 | `electricity-bill-calculator` interpretation·FAQ |
| 3단계 단가 | kWh당 307.3원 | `electricity-bill-calculator` interpretation·FAQ |
| 기타계절 구간 경계 | 200 / 400kWh | `electricity-bill-calculator` interpretation·FAQ |
| 하계(7·8월) 완화 경계 | 300 / 450kWh | `electricity-bill-calculator` interpretation·FAQ |
| 기본요금 | 최종 도달 단계 금액 1회 부과 | `electricity-bill-calculator` interpretation·FAQ |
| 기후환경요금 | kWh당 9원 | `electricity-bill-calculator` interpretation |
| 연료비조정요금 | kWh당 5원 | `electricity-bill-calculator` interpretation |
| 부가가치세 | 전기요금계 10% | `electricity-bill-calculator` interpretation·FAQ |
| 전력산업기반기금 | 전기요금계 2.7% | `electricity-bill-calculator` interpretation·FAQ |
| 예시 350kWh 기본요금 | 1,600원 | `electricity-bill-calculator` interpretation |
| 예시 전력량요금 | 56,190원 (200×120 + 150×214.6) | `electricity-bill-calculator` interpretation |
| 예시 기후환경요금 | 3,150원 (350×9) | `electricity-bill-calculator` interpretation |
| 예시 연료비조정요금 | 1,750원 (350×5) | `electricity-bill-calculator` interpretation |
| 예시 전기요금계 | 62,690원 | `electricity-bill-calculator` interpretation |
| 예시 부가세 | 6,269원 | `electricity-bill-calculator` interpretation |
| 예시 전력기금 | 1,690원 | `electricity-bill-calculator` interpretation |
| 예시 최종 청구요금 | 약 70,640원 | `electricity-bill-calculator` interpretation |

> **주의(QA):** 위 표의 값이 계산기 결과와 하나라도 어긋나면 반드시 계산기 구현값을 정답으로 삼고 본문을 수정할 것. 특히 글 B의 350kWh 예시는 각 항목이 계산기 interpretation의 예시 숫자와 100% 일치해야 함(200×120=24,000, 150×214.6=32,190, 합 56,190 검산 완료).

---

## 이슈 제기 (다른 팀 전달용)

1. **(개발팀) `list`의 항목 내 소계/괄호 표기 렌더 확인 필요** — 글 B의 350kWh 예시를 `list`로 넣었는데, "56,190원 (1단계 200kWh × 120원 + 2단계 150kWh × 214.6원)"처럼 한 항목이 깁니다. 현재 렌더는 플레인 텍스트 `<li>`라 기능상 문제는 없으나, 모바일에서 줄바꿈이 지저분해질 수 있음. 표(table) 섹션 타입이 없어 `list`로 대체한 것이므로, 향후 `{ type: "table" }` 섹션 추가를 **디자인/개발 공동 검토 과제**로 제안(지금 구현 범위는 넘지 않음 — blog-spec §1 확장 보류 원칙 유지).

2. **(개발팀) 한 글에 `calculatorCta` 3개 연속 배치 시 버튼 간격 스타일 확인** — 글 A 후반부에 dsr→loan-interest→loan-prepayment CTA가 근접 배치됩니다(기존 글 1편도 severance+service 2개 연속 사례 있음). 버튼이 세로로 붙었을 때 시각적 구분이 되는지 디자인 확인 요청.

3. **(기획 내부/마스터 확인) YMYL 강도** — 두 글 모두 금융·요금 정보라 YMYL 성격이 있어 `warning` callout을 필수로 넣고 수치를 전부 계산기 구현값으로 한정했습니다. 다만 DSR 글은 "대출한도"라는 민감 키워드를 다루므로, AdSense 심사 관점에서 문제 소지가 보이면 제목·description에서 "대출한도" 표현을 완화하는 방안을 마스터 확인 후 조정 가능(현재는 정보성·중립 톤 유지 판단).

4. **(개발팀 참고) relatedCalculatorSlugs에서 unit-converter 제외** — 글 B는 task 후보였던 `unit-converter`를 관련성 낮음으로 제외하고 `electricity-bill-calculator` 단일 링크로 확정. 링크 품질(관련성) 우선 결정이며, 필요 시 재검토 가능.
```
