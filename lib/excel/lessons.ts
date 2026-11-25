// =============================================================================
// 엑셀 연습 문제 데이터 (MVP: 레슨 5개 × 문제 4개 = 20문제)
//
// 채점 기준값은 여기 적힌 숫자가 아니라 solution 수식을 엔진으로 계산해서 얻는다.
// 그래서 문제를 고칠 때 "정답 숫자"를 따로 맞출 필요가 없다.
// 회귀 테스트: scripts/regression/excel.test.ts (모범 답안·대체 정답·오답 판정 잠금)
// =============================================================================

import type { ExcelProblem } from "./grade";

export type ExcelFunctionDoc = {
  name: string;
  syntax: string;
  desc: string;
  example: string;
};

export type ExcelLesson = {
  slug: string;
  order: number;
  title: string;
  /** 목록 카드·메타 설명용 한 줄 */
  summary: string;
  /** 연습 화면 아래 설명 문단 */
  intro: string;
  functions: ExcelFunctionDoc[];
  problems: ExcelProblem[];
};

export const excelLessons: ExcelLesson[] = [
  {
    slug: "sum-average",
    order: 1,
    title: "SUM·AVERAGE·MAX·MIN 함수",
    summary: "합계, 평균, 가장 큰 값, 가장 작은 값을 구하는 가장 기본 함수 4개를 직접 쳐 봅니다.",
    intro:
      "엑셀 함수의 출발점입니다. 네 함수 모두 괄호 안에 범위(예: B2:B6)를 넣으면 그 안의 숫자만 골라 계산하고, 글자나 빈 칸은 알아서 건너뜁니다.",
    functions: [
      { name: "SUM", syntax: "=SUM(범위)", desc: "범위 안 숫자를 모두 더합니다.", example: "=SUM(B2:B6)" },
      { name: "AVERAGE", syntax: "=AVERAGE(범위)", desc: "범위 안 숫자의 평균을 구합니다. 빈 칸은 개수에서 빠집니다.", example: "=AVERAGE(B2:B6)" },
      { name: "MAX", syntax: "=MAX(범위)", desc: "가장 큰 숫자를 돌려줍니다.", example: "=MAX(B2:B6)" },
      { name: "MIN", syntax: "=MIN(범위)", desc: "가장 작은 숫자를 돌려줍니다.", example: "=MIN(B2:B6)" },
    ],
    problems: [
      {
        id: "sum-1",
        prompt: "B7 칸에 과일 판매량(B2:B6)의 합계를 SUM 함수로 구하세요.",
        cells: {
          A1: "상품", B1: "판매량",
          A2: "사과", B2: 120,
          A3: "배", B3: 85,
          A4: "귤", B4: 230,
          A5: "포도", B5: 64,
          A6: "딸기", B6: 158,
          A7: "합계",
        },
        target: "B7",
        solution: "=SUM(B2:B6)",
        required: ["SUM"],
        hint: "=SUM( 을 쓰고, B2부터 B6까지를 콜론(:)으로 이어 범위로 적은 뒤 괄호를 닫아요.",
        explain: "B2:B6은 'B2부터 B6까지'라는 뜻입니다. 칸을 하나씩 더하는 =B2+B3+… 보다 짧고, 중간에 행을 넣어도 범위가 따라 늘어납니다.",
      },
      {
        id: "sum-2",
        prompt: "B7 칸에 학생 5명의 점수(B2:B6) 평균을 AVERAGE 함수로 구하세요.",
        cells: {
          A1: "이름", B1: "점수",
          A2: "김민준", B2: 88,
          A3: "이서연", B3: 92,
          A4: "박지호", B4: 75,
          A5: "최유나", B5: 81,
          A6: "정하준", B6: 94,
          A7: "평균",
        },
        target: "B7",
        solution: "=AVERAGE(B2:B6)",
        required: ["AVERAGE"],
        hint: "SUM과 쓰는 법이 같아요. 함수 이름만 AVERAGE로 바꿔 보세요.",
        explain: "AVERAGE는 '합계 ÷ 숫자 칸 개수'입니다. 빈 칸은 개수에 넣지 않지만, 0이 적힌 칸은 넣는다는 점을 기억하세요.",
      },
      {
        id: "sum-3",
        prompt: "B7 칸에 지점 매출(B2:B6) 중 가장 높은 값을 MAX 함수로 구하세요.",
        cells: {
          A1: "지점", B1: "매출(만 원)",
          A2: "강남", B2: 1250,
          A3: "홍대", B3: 980,
          A4: "잠실", B4: 1430,
          A5: "신촌", B5: 760,
          A6: "판교", B6: 1120,
          A7: "최고 매출",
        },
        target: "B7",
        solution: "=MAX(B2:B6)",
        required: ["MAX"],
        hint: "=MAX(B2:B6) 형태예요. 머리글(B1)은 범위에 넣지 않아요.",
        explain: "MAX는 숫자만 비교합니다. 머리글처럼 글자가 섞여 있어도 오류는 나지 않지만, 범위는 데이터 칸만 잡는 습관을 들이세요.",
        commaCols: ["B"],
      },
      {
        id: "sum-4",
        prompt: "B7 칸에 주유소 휘발유 가격(B2:B6) 중 가장 싼 값을 MIN 함수로 구하세요.",
        cells: {
          A1: "주유소", B1: "가격(원/L)",
          A2: "가", B2: 1689,
          A3: "나", B3: 1712,
          A4: "다", B4: 1654,
          A5: "라", B5: 1698,
          A6: "마", B6: 1671,
          A7: "최저가",
        },
        target: "B7",
        solution: "=MIN(B2:B6)",
        required: ["MIN"],
        hint: "MAX의 반대예요. =MIN( 범위 ) 로 적어 보세요.",
        explain: "MIN과 MAX를 같이 쓰면 =MAX(B2:B6)-MIN(B2:B6)처럼 가격 차이도 바로 구할 수 있습니다.",
        commaCols: ["B"],
      },
    ],
  },
  {
    slug: "count",
    order: 2,
    title: "COUNT·COUNTA·COUNTIF 함수",
    summary: "숫자 칸 개수, 비어 있지 않은 칸 개수, 조건에 맞는 칸 개수를 세는 법을 익힙니다.",
    intro:
      "세는 함수는 이름이 비슷해서 헷갈리기 쉽습니다. COUNT는 숫자만, COUNTA는 비어 있지 않은 칸 전부, COUNTIF는 조건에 맞는 칸만 셉니다.",
    functions: [
      { name: "COUNT", syntax: "=COUNT(범위)", desc: "숫자가 들어 있는 칸만 셉니다.", example: "=COUNT(B2:B7)" },
      { name: "COUNTA", syntax: "=COUNTA(범위)", desc: "비어 있지 않은 칸을 모두 셉니다(글자 포함).", example: "=COUNTA(A2:A8)" },
      { name: "COUNTIF", syntax: "=COUNTIF(범위, 조건)", desc: "조건에 맞는 칸만 셉니다. 조건은 \"영업\", \">=80\"처럼 큰따옴표로 감쌉니다.", example: "=COUNTIF(B2:B8,\">=80\")" },
    ],
    problems: [
      {
        id: "count-1",
        prompt: "B9 칸에 실제로 시험을 본 인원(점수가 숫자로 적힌 칸)을 COUNT 함수로 세세요.",
        cells: {
          A1: "이름", B1: "점수",
          A2: "강도현", B2: 78,
          A3: "윤채원", B3: "결석",
          A4: "임재윤", B4: 91,
          A5: "한소희", B5: 85,
          A6: "오지훈", B6: "결석",
          A7: "서예린", B7: 66,
          A9: "응시 인원",
        },
        target: "B9",
        solution: "=COUNT(B2:B7)",
        required: ["COUNT"],
        hint: "'결석'은 글자라서 COUNT가 세지 않아요. 범위는 B2:B7이에요.",
        explain: "COUNT는 숫자 칸만 셉니다. 그래서 '결석'처럼 글자가 섞인 명단에서 응시 인원을 셀 때 딱 맞습니다.",
      },
      {
        id: "count-2",
        prompt: "C2 칸에 봉사활동 신청자 수(A2:A8 중 이름이 적힌 칸)를 COUNTA 함수로 세세요.",
        cells: {
          A1: "신청자", C1: "신청 인원",
          A2: "김도윤",
          A4: "이수아",
          A5: "박서준",
          A7: "한지민",
          A8: "오세훈",
        },
        target: "C2",
        solution: "=COUNTA(A2:A8)",
        required: ["COUNTA"],
        hint: "이름은 글자라서 COUNT로는 0이 나와요. 비어 있지 않은 칸을 세는 COUNTA를 써 보세요.",
        explain: "COUNTA의 A는 All(전부)라고 기억하면 쉽습니다. 빈 칸만 빼고 다 셉니다.",
      },
      {
        id: "count-3",
        prompt: "E2 칸에 D2 칸에 적힌 부서(영업)에 속한 사람 수를 COUNTIF 함수로 세세요.",
        cells: {
          A1: "이름", B1: "부서", D1: "부서", E1: "인원",
          A2: "정우성", B2: "영업", D2: "영업",
          A3: "문가영", B3: "인사",
          A4: "배수지", B4: "영업",
          A5: "남궁민", B5: "개발",
          A6: "고윤정", B6: "영업",
          A7: "김태리", B7: "개발",
          A8: "류준열", B8: "인사",
        },
        target: "E2",
        solution: "=COUNTIF(B2:B8,D2)",
        required: ["COUNTIF"],
        hint: "=COUNTIF(부서가 적힌 범위, 찾을 부서) 순서예요. 찾을 부서는 D2 칸을 가리키면 돼요.",
        explain: "조건 자리에 칸 주소(D2)를 넣으면, D2만 '인사'로 바꿔도 수식을 고치지 않고 인사팀 인원이 나옵니다.",
      },
      {
        id: "count-4",
        prompt: "B10 칸에 80점 이상인 학생 수를 COUNTIF 함수로 세세요.",
        cells: {
          A1: "이름", B1: "점수",
          A2: "신유진", B2: 72,
          A3: "조민호", B3: 85,
          A4: "황보람", B4: 91,
          A5: "백승우", B5: 64,
          A6: "노하은", B6: 80,
          A7: "송지안", B7: 77,
          A8: "권시우", B8: 88,
          A10: "80점 이상",
        },
        target: "B10",
        solution: '=COUNTIF(B2:B8,">=80")',
        required: ["COUNTIF"],
        hint: '조건은 ">=80" 처럼 비교 기호와 숫자를 함께 큰따옴표로 감싸요.',
        explain: '">=80"은 80 이상, ">80"은 80 초과입니다. 80점인 노하은 학생이 들어가는지가 둘의 차이예요.',
      },
    ],
  },
  {
    slug: "round-rank",
    order: 3,
    title: "ROUND·ROUNDUP·ROUNDDOWN·RANK.EQ 함수",
    summary: "자릿수 맞춰 반올림·올림·내림하고, 순위를 매기는 함수를 연습합니다.",
    intro:
      "반올림 함수 셋은 모두 (숫자, 자릿수) 순서로 씁니다. 자릿수 1은 소수 첫째 자리까지, 0은 정수, -3은 천 단위까지 남긴다는 뜻입니다.",
    functions: [
      { name: "ROUND", syntax: "=ROUND(숫자, 자릿수)", desc: "지정한 자릿수로 반올림합니다.", example: "=ROUND(85.666,1) → 85.7" },
      { name: "ROUNDUP", syntax: "=ROUNDUP(숫자, 자릿수)", desc: "무조건 올립니다.", example: "=ROUNDUP(10.2,0) → 11" },
      { name: "ROUNDDOWN", syntax: "=ROUNDDOWN(숫자, 자릿수)", desc: "무조건 버립니다.", example: "=ROUNDDOWN(47860,-3) → 47000" },
      { name: "RANK.EQ", syntax: "=RANK.EQ(값, 범위, [순서])", desc: "범위 안에서 값의 순위를 구합니다. 순서를 비우거나 0이면 큰 값이 1등입니다.", example: "=RANK.EQ(B2,$B$2:$B$7)" },
    ],
    problems: [
      {
        id: "round-1",
        prompt: "E2 칸에 세 과목(B2:D2) 평균을 소수 첫째 자리까지 반올림해서 구하세요. ROUND와 AVERAGE를 함께 씁니다.",
        cells: {
          A1: "이름", B1: "국어", C1: "영어", D1: "수학", E1: "평균",
          A2: "김하늘", B2: 87, C2: 92, D2: 78,
        },
        target: "E2",
        solution: "=ROUND(AVERAGE(B2:D2),1)",
        required: ["ROUND", "AVERAGE"],
        hint: "함수 안에 함수를 넣을 수 있어요. =ROUND( AVERAGE(...) , 1) 모양이에요.",
        explain: "안쪽 AVERAGE가 먼저 85.666…을 계산하고, 바깥 ROUND가 소수 첫째 자리로 다듬어 85.7을 만듭니다.",
      },
      {
        id: "round-2",
        prompt: "B2 칸에 결제 금액(B1)의 천 원 미만을 버린 금액을 ROUNDDOWN 함수로 구하세요.",
        cells: {
          A1: "결제 금액", B1: 47860,
          A2: "천 원 미만 버림",
        },
        target: "B2",
        solution: "=ROUNDDOWN(B1,-3)",
        required: ["ROUNDDOWN"],
        hint: "천 원 단위까지 남기려면 자릿수에 음수 -3을 넣어요.",
        explain: "자릿수 -1은 십 원, -2는 백 원, -3은 천 원 단위입니다. 마이너스는 소수점 왼쪽으로 간다고 기억하세요.",
        commaCols: ["B"],
      },
      {
        id: "round-3",
        prompt: "B3 칸에 물건을 모두 담는 데 필요한 상자 수를 ROUNDUP 함수로 구하세요(물건 수 ÷ 한 상자 개수, 남으면 한 상자 더).",
        cells: {
          A1: "보낼 물건 수", B1: 125,
          A2: "한 상자에 담는 개수", B2: 12,
          A3: "필요한 상자 수",
        },
        target: "B3",
        solution: "=ROUNDUP(B1/B2,0)",
        required: ["ROUNDUP"],
        hint: "먼저 B1/B2로 나눈 다음, 그 결과를 ROUNDUP( … , 0)으로 감싸요.",
        explain: "125 ÷ 12 = 10.4…이지만 남은 물건도 담아야 하니 11상자가 필요합니다. '모자라면 안 되는' 계산에는 ROUNDUP을 씁니다.",
      },
      {
        id: "round-4",
        prompt: "C2 칸에 첫 번째 사원(B2)의 실적 순위를 RANK.EQ 함수로 구하세요(실적이 높을수록 1등).",
        cells: {
          A1: "사원", B1: "실적", C1: "순위",
          A2: "김선우", B2: 340,
          A3: "이다인", B3: 515,
          A4: "박태오", B4: 280,
          A5: "최나래", B5: 470,
          A6: "정이안", B6: 395,
          A7: "한도경", B7: 610,
        },
        target: "C2",
        solution: "=RANK.EQ(B2,$B$2:$B$7)",
        required: ["RANK.EQ|RANK"],
        hint: "=RANK.EQ(순위를 알고 싶은 값, 전체 실적 범위) 예요. 범위는 B2:B7이에요.",
        explain: "범위에 $를 붙인 $B$2:$B$7은 아래로 복사해도 범위가 움직이지 않게 고정합니다. 순위 열을 채울 때 꼭 필요한 습관이에요.",
      },
    ],
  },
  {
    slug: "if",
    order: 4,
    title: "IF·AND·SUMIF 함수",
    summary: "조건에 따라 다른 값을 넣는 IF, 조건 두 개를 묶는 AND, 조건에 맞는 것만 더하는 SUMIF를 연습합니다.",
    intro:
      "IF는 (조건, 맞을 때, 틀릴 때) 세 칸짜리 함수입니다. 결과로 글자를 넣을 때는 \"합격\"처럼 큰따옴표로 감싸야 합니다.",
    functions: [
      { name: "IF", syntax: "=IF(조건, 참일 때, 거짓일 때)", desc: "조건이 맞으면 두 번째, 아니면 세 번째 값을 돌려줍니다.", example: "=IF(B2>=60,\"합격\",\"불합격\")" },
      { name: "AND", syntax: "=AND(조건1, 조건2, …)", desc: "모든 조건이 맞을 때만 TRUE입니다. 하나만 맞아도 되면 OR을 씁니다.", example: "=AND(B2>=70,C2>=70)" },
      { name: "SUMIF", syntax: "=SUMIF(조건 범위, 조건, 더할 범위)", desc: "조건에 맞는 행의 값만 더합니다.", example: "=SUMIF(B2:B7,\"식비\",C2:C7)" },
    ],
    problems: [
      {
        id: "if-1",
        prompt: "C2 칸에 점수(B2)가 60 이상이면 \"합격\", 아니면 \"불합격\"이 나오게 IF 함수를 쓰세요.",
        cells: {
          A1: "이름", B1: "점수", C1: "결과",
          A2: "김지우", B2: 58,
        },
        target: "C2",
        solution: '=IF(B2>=60,"합격","불합격")',
        required: ["IF"],
        hint: '=IF(B2>=60, "합격", "불합격") 순서예요. 글자는 큰따옴표로 감싸요.',
        explain: "58점은 60 미만이라 세 번째 칸의 \"불합격\"이 나옵니다. 조건을 B2<60으로 뒤집고 결과 순서를 바꿔도 같은 답이에요.",
      },
      {
        id: "if-2",
        prompt: "C2 칸에 점수(B2)가 90 이상이면 \"A\", 80 이상이면 \"B\", 나머지는 \"C\"가 나오게 IF를 겹쳐 쓰세요.",
        cells: {
          A1: "이름", B1: "점수", C1: "등급",
          A2: "이준호", B2: 84,
        },
        target: "C2",
        solution: '=IF(B2>=90,"A",IF(B2>=80,"B","C"))',
        required: ["IF"],
        hint: '첫 IF의 "거짓일 때" 자리에 IF를 하나 더 넣어요: =IF(B2>=90,"A",IF(…))',
        explain: "엑셀은 위에서부터 조건을 확인합니다. 90 이상을 먼저 걸러야 84점이 'B'로 정확히 떨어집니다.",
      },
      {
        id: "if-3",
        prompt: "D2 칸에 국어(B2)와 영어(C2)가 모두 70 이상이면 \"통과\", 아니면 \"재시험\"이 나오게 IF와 AND를 함께 쓰세요.",
        cells: {
          A1: "이름", B1: "국어", C1: "영어", D1: "판정",
          A2: "박서윤", B2: 75, C2: 68,
        },
        target: "D2",
        solution: '=IF(AND(B2>=70,C2>=70),"통과","재시험")',
        required: ["IF", "AND"],
        hint: "IF의 조건 자리에 AND(B2>=70, C2>=70)를 통째로 넣어요.",
        explain: "영어가 68점이라 AND가 FALSE가 되고, 그래서 \"재시험\"이 나옵니다. 하나만 넘어도 통과라면 AND 대신 OR을 씁니다.",
      },
      {
        id: "if-4",
        prompt: "F2 칸에 분류가 E2(식비)인 지출 금액의 합계를 SUMIF 함수로 구하세요.",
        cells: {
          A1: "항목", B1: "분류", C1: "금액", E1: "분류", F1: "합계",
          A2: "점심", B2: "식비", C2: 9000, E2: "식비",
          A3: "커피", B3: "카페", C3: 4500,
          A4: "택시", B4: "교통", C4: 12800,
          A5: "저녁", B5: "식비", C5: 15000,
          A6: "지하철", B6: "교통", C6: 1500,
          A7: "디저트", B7: "카페", C7: 6200,
        },
        target: "F2",
        solution: "=SUMIF(B2:B7,E2,C2:C7)",
        required: ["SUMIF"],
        hint: "=SUMIF(분류 범위, 찾을 분류, 금액 범위) 순서예요.",
        explain: "SUMIF는 B열에서 '식비'인 행을 찾고, 같은 행의 C열 금액만 더합니다. 조건 범위와 더할 범위의 행 수를 맞춰야 해요.",
        commaCols: ["C", "F"],
      },
    ],
  },
  {
    slug: "vlookup-text",
    order: 5,
    title: "VLOOKUP·LEFT·MID 함수",
    summary: "표에서 값을 찾아오는 VLOOKUP과, 글자 일부를 잘라내는 LEFT·MID를 연습합니다.",
    intro:
      "VLOOKUP은 표의 첫 열에서 값을 찾아 같은 행의 다른 열 값을 가져옵니다. 마지막 인수가 FALSE(또는 0)면 정확히 같은 값만, TRUE면 구간(근사값)으로 찾습니다.",
    functions: [
      { name: "VLOOKUP", syntax: "=VLOOKUP(찾을 값, 표 범위, 열 번호, [찾는 방법])", desc: "표 첫 열에서 찾을 값을 찾아 지정한 열의 값을 가져옵니다.", example: "=VLOOKUP(E2,A2:C6,3,FALSE)" },
      { name: "LEFT", syntax: "=LEFT(글자, [개수])", desc: "왼쪽에서부터 글자를 잘라냅니다.", example: "=LEFT(A2,2)" },
      { name: "MID", syntax: "=MID(글자, 시작 위치, 개수)", desc: "중간에서 원하는 만큼 잘라냅니다.", example: "=MID(A2,3,4)" },
    ],
    problems: [
      {
        id: "vlookup-1",
        prompt: "F2 칸에 상품 코드(E2)의 가격을 VLOOKUP 함수로 찾아오세요(정확히 일치).",
        cells: {
          A1: "코드", B1: "상품명", C1: "가격", E1: "코드", F1: "가격",
          A2: "P101", B2: "무선 마우스", C2: 25000, E2: "P103",
          A3: "P102", B3: "키보드", C3: 48000,
          A4: "P103", B4: "모니터", C4: 219000,
          A5: "P104", B5: "USB 허브", C5: 15900,
          A6: "P105", B6: "웹캠", C6: 39000,
        },
        target: "F2",
        solution: "=VLOOKUP(E2,A2:C6,3,FALSE)",
        required: ["VLOOKUP"],
        hint: "=VLOOKUP(E2, A2:C6, 3, FALSE) — 가격은 표의 3번째 열이에요.",
        explain: "열 번호는 시트의 열 이름(C)이 아니라 '표 범위 안에서 몇 번째 열인지'입니다. A2:C6에서 가격은 3번째예요.",
        commaCols: ["C", "F"],
      },
      {
        id: "vlookup-2",
        prompt: "C2 칸에 점수(B2)에 맞는 등급을 오른쪽 기준표(E2:F5)에서 VLOOKUP으로 찾아오세요(구간 찾기).",
        cells: {
          A1: "이름", B1: "점수", C1: "등급", E1: "기준 점수", F1: "등급",
          A2: "김서진", B2: 83, E2: 0, F2: "D",
          E3: 70, F3: "C",
          E4: 80, F4: "B",
          E5: 90, F5: "A",
        },
        target: "C2",
        solution: "=VLOOKUP(B2,$E$2:$F$5,2,TRUE)",
        required: ["VLOOKUP"],
        hint: "구간으로 찾을 때는 마지막 인수를 TRUE로 하거나 비워요. 기준표는 작은 값부터 정렬돼 있어야 해요.",
        explain: "83은 기준표에 없지만, TRUE 모드는 '83을 넘지 않는 가장 큰 기준'인 80을 찾아 'B'를 가져옵니다. IF를 여러 번 겹치는 것보다 간단해요.",
      },
      {
        id: "vlookup-3",
        prompt: "B2 칸에 사번(A2)의 앞 2글자(부서 코드)를 LEFT 함수로 잘라내세요.",
        cells: {
          A1: "사번", B1: "부서 코드",
          A2: "MK2019034",
        },
        target: "B2",
        solution: "=LEFT(A2,2)",
        required: ["LEFT"],
        hint: "=LEFT(A2, 2) — 왼쪽에서 2글자예요.",
        explain: "LEFT의 개수를 비우면 1글자만 잘라냅니다. 오른쪽에서 자를 때는 RIGHT를 씁니다.",
      },
      {
        id: "vlookup-4",
        prompt: "C2 칸에 사번(A2)의 3번째 글자부터 4글자(입사 연도)를 MID 함수로 잘라내세요.",
        cells: {
          A1: "사번", B1: "부서 코드", C1: "입사 연도",
          A2: "MK2019034", B2: "MK",
        },
        target: "C2",
        solution: "=MID(A2,3,4)",
        required: ["MID"],
        hint: "=MID(A2, 시작 위치, 개수) — 'MK' 다음인 3번째 글자부터 4글자예요.",
        explain: "MID로 잘라낸 '2019'는 숫자가 아니라 글자입니다. 계산에 쓰려면 =MID(A2,3,4)*1 처럼 숫자로 바꿔 줘야 해요.",
      },
    ],
  },
];

export function getExcelLesson(slug: string): ExcelLesson | undefined {
  return excelLessons.find((l) => l.slug === slug);
}

export function getAdjacentLessons(slug: string): { prev?: ExcelLesson; next?: ExcelLesson } {
  const i = excelLessons.findIndex((l) => l.slug === slug);
  return { prev: excelLessons[i - 1], next: excelLessons[i + 1] };
}

export const EXCEL_TOTAL_PROBLEMS = excelLessons.reduce((n, l) => n + l.problems.length, 0);
