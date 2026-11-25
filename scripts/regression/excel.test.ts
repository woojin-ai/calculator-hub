// =============================================================================
// 엑셀 연습 회귀 테스트 (제로 의존성 · npx tsx 실행)
//
// 실행: npx tsx scripts/regression/excel.test.ts
// 1) 수식 엔진이 실제 엑셀과 같은 값을 내는지(기준값은 엑셀 동작 규칙 기준)
// 2) 20문제 모두 모범 답안이 정답 처리되는지
// 3) 다르게 써도 맞는 답은 통과, 틀린 답은 걸러지는지
// =============================================================================

import assert from "node:assert/strict";
import { Sheet, ExcelError, displayValue, FormulaSyntaxError } from "../../lib/excel/formula";
import { gradeAnswer, evaluateOn } from "../../lib/excel/grade";
import { excelLessons, EXCEL_TOTAL_PROBLEMS } from "../../lib/excel/lessons";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`✗ ${name}\n   ${(e as Error).message}`);
  }
}

const sheet = new Sheet({
  A1: 10, A2: 20, A3: 30, A4: "글자", A5: null,
  B1: "사과", B2: "배", B3: "사과", B4: "Apple", B5: "",
  C1: 1.005, C2: -2.5, C3: 2.5, C4: 47860,
  D1: 0, D2: 70, D3: 80, D4: 90,
  E1: "D", E2: "C", E3: "B", E4: "A",
  F1: "=A1+A2", F2: "=F1*2",
});
const v = (f: string) => displayValue(sheet.evaluate(f));

// --- 1. 연산 규칙 ----------------------------------------------------------
test("우선순위: 곱셈 먼저", () => assert.equal(v("=1+2*3"), "7"));
test("엑셀식 부호: -2^2 = 4", () => assert.equal(v("=-2^2"), "4"));
test("엑셀식 거듭제곱 왼쪽부터: 2^3^2 = 64", () => assert.equal(v("=2^3^2"), "64"));
test("퍼센트", () => assert.equal(v("=50%"), "0.5"));
test("부동소수 찌꺼기 제거", () => assert.equal(v("=0.1+0.2"), "0.3"));
test("& 연결", () => assert.equal(v('=B1&"-"&A1'), "사과-10"));
test("비교: 글자 대소문자 무시", () => assert.equal(v('="apple"=B4'), "TRUE"));
test("비교: 숫자 < 글자", () => assert.equal(v('=1<"a"'), "TRUE"));
test("0으로 나누기", () => assert.equal(v("=A1/D1"), "#DIV/0!"));
test("글자 더하기 → #VALUE!", () => assert.equal(v("=A4+1"), "#VALUE!"));
test("수식 칸 연쇄 계산", () => assert.equal(v("=F2"), "60"));
test("모르는 함수 → #NAME?", () => assert.equal(v("=SUMM(A1:A3)"), "#NAME?"));
test("소문자 함수·주소 허용", () => assert.equal(v("=sum(a1:a3)"), "60"));
test("$ 절대참조", () => assert.equal(v("=SUM($A$1:A$3)"), "60"));
test("둥근 따옴표 허용", () => assert.equal(v("=COUNTIF(B1:B5,“사과”)"), "2"));

// --- 2. 함수 --------------------------------------------------------------
test("SUM 범위 안 글자·빈 칸 무시", () => assert.equal(v("=SUM(A1:A5)"), "60"));
test("AVERAGE", () => assert.equal(v("=AVERAGE(A1:A5)"), "20"));
test("COUNT / COUNTA", () => {
  assert.equal(v("=COUNT(A1:A5)"), "3");
  assert.equal(v("=COUNTA(A1:A5)"), "4");
});
test("COUNTIF 비교·와일드카드·부정", () => {
  assert.equal(v('=COUNTIF(A1:A3,">=20")'), "2");
  assert.equal(v('=COUNTIF(B1:B4,"*과")'), "2");
  assert.equal(v('=COUNTIF(B1:B4,"<>사과")'), "2");
  assert.equal(v("=COUNTIF(A1:A3,20)"), "1");
});
test("SUMIF / AVERAGEIF / SUMIFS / COUNTIFS", () => {
  assert.equal(v('=SUMIF(B1:B3,"사과",A1:A3)'), "40");
  assert.equal(v('=AVERAGEIF(B1:B3,"사과",A1:A3)'), "20");
  assert.equal(v('=SUMIFS(A1:A3,B1:B3,"사과",A1:A3,">10")'), "30");
  assert.equal(v('=COUNTIFS(B1:B3,"사과",A1:A3,">10")'), "1");
});
test("ROUND는 0.5에서 0과 먼 쪽", () => {
  assert.equal(v("=ROUND(C3,0)"), "3");
  assert.equal(v("=ROUND(C2,0)"), "-3");
  assert.equal(v("=ROUND(C1,2)"), "1.01");
});
test("ROUNDUP / ROUNDDOWN / 음수 자릿수", () => {
  assert.equal(v("=ROUNDUP(10.01,0)"), "11");
  assert.equal(v("=ROUNDDOWN(C4,-3)"), "47000");
  assert.equal(v("=ROUNDUP(-1.1,0)"), "-2");
});
test("INT / MOD / ABS", () => {
  assert.equal(v("=INT(-1.5)"), "-2");
  assert.equal(v("=MOD(-3,2)"), "1");
  assert.equal(v("=ABS(-4)"), "4");
});
test("RANK.EQ 내림·오름·동점", () => {
  assert.equal(v("=RANK.EQ(A1,A1:A3)"), "3");
  assert.equal(v("=RANK(A1,A1:A3,1)"), "1");
  assert.equal(v("=RANK.EQ(99,A1:A3)"), "#N/A");
});
test("LARGE / SMALL", () => {
  assert.equal(v("=LARGE(A1:A3,1)"), "30");
  assert.equal(v("=SMALL(A1:A3,2)"), "20");
  assert.equal(v("=LARGE(A1:A3,4)"), "#NUM!");
});
test("IF: 세 번째 인수 생략 시 FALSE", () => assert.equal(v("=IF(A1>100,1)"), "FALSE"));
test("IF 중첩 + AND/OR/NOT", () => {
  assert.equal(v('=IF(AND(A1>5,A2>5),"둘다","아님")'), "둘다");
  assert.equal(v("=OR(A1>50,A2>15)"), "TRUE");
  assert.equal(v("=NOT(A1>5)"), "FALSE");
});
test("IFERROR", () => assert.equal(v('=IFERROR(A1/D1,"없음")'), "없음"));
test("VLOOKUP 정확히 / 근사값 / 없음 / 열 초과", () => {
  assert.equal(v("=VLOOKUP(83,D1:E4,2,TRUE)"), "B");
  assert.equal(v("=VLOOKUP(83,D1:E4,2)"), "B");
  assert.equal(v("=VLOOKUP(80,D1:E4,2,FALSE)"), "B");
  assert.equal(v("=VLOOKUP(80,D1:E4,2,0)"), "B");
  assert.equal(v("=VLOOKUP(83,D1:E4,2,FALSE)"), "#N/A");
  assert.equal(v("=VLOOKUP(80,D1:E4,3,FALSE)"), "#REF!");
});
test("HLOOKUP", () => assert.equal(v('=HLOOKUP("사과",A1:C2,2,FALSE)'), "배"));
test("INDEX / MATCH", () => {
  assert.equal(v("=MATCH(80,D1:D4,0)"), "3");
  assert.equal(v("=INDEX(E1:E4,MATCH(85,D1:D4,1))"), "B");
  assert.equal(v("=INDEX(D1:E4,4,2)"), "A");
});
test("CHOOSE", () => assert.equal(v('=CHOOSE(2,"가","나","다")'), "나"));
test("LEFT / RIGHT / MID / LEN (한글 글자 단위)", () => {
  assert.equal(v('=LEFT("MK2019034",2)'), "MK");
  assert.equal(v('=LEFT("가나다")'), "가");
  assert.equal(v('=RIGHT("가나다",2)'), "나다");
  assert.equal(v('=MID("MK2019034",3,4)'), "2019");
  assert.equal(v('=LEN("가나다")'), "3");
});
test("CONCAT / CONCATENATE / TRIM / UPPER", () => {
  assert.equal(v("=CONCAT(B1:B2)"), "사과배");
  assert.equal(v('=CONCATENATE(B1,"/",A1)'), "사과/10");
  assert.equal(v('=TRIM("  a   b ")'), "a b");
  assert.equal(v('=UPPER("abc")'), "ABC");
});

// --- 3. 문법 오류 메시지 ---------------------------------------------------
const syntaxMessage = (f: string) => {
  try {
    sheet.evaluate(f);
  } catch (e) {
    if (e instanceof FormulaSyntaxError) return e.message;
  }
  return null;
};
test("괄호 안 닫힘", () => assert.match(syntaxMessage("=SUM(A1:A3") ?? "", /닫히지 않았/));
test("세미콜론 구분자 안내", () => assert.match(syntaxMessage("=SUM(A1;A2)") ?? "", /쉼표/));
test("따옴표 없는 글자 안내", () => assert.match(syntaxMessage("=IF(A1>1,합격,불합격)") ?? "", /큰따옴표/));
test("인수 개수 안내", () => assert.match(syntaxMessage("=ROUND(A1)") ?? "", /2개/));
test("열 전체 참조 안내", () => assert.match(syntaxMessage("=SUM(A:A)") ?? "", /열 전체/));

// --- 4. 문제 데이터 --------------------------------------------------------
test("문제 수 20개, id 중복 없음", () => {
  assert.equal(EXCEL_TOTAL_PROBLEMS, 20);
  const ids = excelLessons.flatMap((l) => l.problems.map((p) => p.id));
  assert.equal(new Set(ids).size, ids.length);
});

for (const lesson of excelLessons) {
  for (const p of lesson.problems) {
    test(`[${p.id}] 모범 답안이 정답 처리되고 오류값이 아님`, () => {
      const r = gradeAnswer(p, p.solution);
      assert.equal(r.ok, true, JSON.stringify(r));
      assert.ok(!(evaluateOn(p.cells, p.solution) instanceof ExcelError));
    });
    test(`[${p.id}] 답 칸이 비어 있음`, () => assert.equal(p.cells[p.target], undefined));
    test(`[${p.id}] = 없이 쓰면 안내`, () => {
      const r = gradeAnswer(p, p.solution.slice(1));
      assert.equal(r.ok, false);
      assert.equal(!r.ok && r.reason, "not-formula");
    });
    test(`[${p.id}] 결과값만 직접 적으면 통과 못 함`, () => {
      const value = displayValue(evaluateOn(p.cells, p.solution));
      const literal = /^-?[\d.]+$/.test(value) ? `=${value}` : `="${value}"`;
      assert.equal(gradeAnswer(p, literal).ok, false);
    });
  }
}

// 다르게 써도 맞는 답(원조 사이트는 글자 비교라 이런 답을 틀렸다고 한다)
const ALTERNATIVES: Record<string, string[]> = {
  "sum-1": ["=SUM(B2,B3,B4,B5,B6)", "=sum(b2:b6)", "= SUM( B2 : B6 )", "=SUM($B$2:$B$6)", "=SUM(B6:B2)"],
  "sum-2": ["=AVERAGE(B2,B3,B4,B5,B6)"],
  "count-3": ['=COUNTIF(B2:B8,"영업")', "=COUNTIF($B$2:$B$8,$D$2)"],
  "count-4": ['=COUNTIF(B2:B8,">79")', '=COUNTIF(B2:B8,">="&80)'],
  "round-1": ["=ROUND(AVERAGE(B2,C2,D2),1)", "=ROUND(AVERAGE(B2:D2),1)"],
  "round-3": ["=ROUNDUP(B1/B2,0)", "=ROUNDUP(B1/B2, 0)"],
  "round-4": ["=RANK(B2,B2:B7)", "=RANK.EQ(B2,B2:B7,0)"],
  "if-1": ['=IF(B2<60,"불합격","합격")', "=IF(B2>=60,“합격”,“불합격”)"],
  "if-2": ['=IF(B2<80,"C",IF(B2<90,"B","A"))'],
  "if-3": ['=IF(AND(B2>69,C2>69),"통과","재시험")', '=IF(AND(C2>=70,B2>=70),"통과","재시험")'],
  "if-4": ['=SUMIF(B2:B7,"식비",C2:C7)'],
  "vlookup-1": ["=VLOOKUP(E2,A2:C6,3,0)", "=VLOOKUP(E2,$A$2:$C$6,3,FALSE)", '=VLOOKUP("P103",A2:C6,3,FALSE)'],
  "sum-3": ["=MAX(B1:B6)", "=MAX(B2:B3,B4:B6)"],
  "count-1": ["=COUNT(B2,B3,B4,B5,B6,B7)", "=COUNT(B1:B8)"],
  "vlookup-2": ["=VLOOKUP(B2,E2:F5,2)", "=VLOOKUP(B2,E2:F5,2,1)"],
  "vlookup-4": ["=MID(A2,3,4)"],
};

// 틀린 답과 기대 사유
const WRONG: Record<string, [string, string][]> = {
  "sum-1": [["=SUM(B2:B5)", "wrong-value"], ["=B2+B3+B4+B5+B6", "missing-function"], ["=SUM(B2:B6", "syntax"], ["=SUMM(B2:B6)", "unknown-function"], ["=SUM(B2:B7)", "syntax"]],
  "sum-2": [["=SUM(B2:B6)/5", "missing-function"]],
  // 범위에서 칸 하나를 빠뜨렸는데 결과가 우연히 같은 경우(브라우저 검증에서 발견)
  "sum-3": [["=MAX(B2:B5)", "fragile"], ["=MAX(B3:B6)", "fragile"]],
  "sum-4": [["=MIN(B2:B5)", "fragile"], ["=MIN(B3:B6)", "fragile"]],
  "round-4": [["=RANK.EQ(B2,B2:B7,1)", "wrong-value"], ["=RANK.EQ(B2,B2:B6)", "wrong-value"]],
  "count-3": [["=COUNTIF(B2:B7,D2)", "fragile"], ["=COUNTIF(B3:B8,D2)", "wrong-value"]],
  "count-1": [["=COUNTA(B2:B7)", "missing-function"], ["=COUNT(B2:B6)", "wrong-value"]],
  "count-4": [['=COUNTIF(B2:B8,">80")', "wrong-value"], ["=COUNTIF(B2:B8,>=80)", "syntax"]],
  "round-1": [
    ["=ROUND(AVERAGE(B2:D2),0)", "wrong-value"],
    ["=AVERAGE(B2:D2)", "missing-function"],
    ["=ROUND((B2+C2+D2)/3,1)", "missing-function"],
  ],
  "round-2": [["=ROUNDDOWN(B1,3)", "wrong-value"], ["=ROUNDDOWN(B1)", "syntax"]],
  "if-1": [["=IF(B2>=60,합격,불합격)", "syntax"], ['=IF(B2>=50,"합격","불합격")', "wrong-value"]],
  "if-2": [['=IF(B2>=80,"B","C")', "fragile"]],
  "if-4": [["=SUMIF(B2:B7,E2)", "wrong-value"]],
  "vlookup-1": [
    ["=VLOOKUP(E2,A2:C6,4,FALSE)", "error-value"],
    ["=VLOOKUP(E2,B2:C6,2,FALSE)", "error-value"],
    ["=VLOOKUP(E2,A2:C5,3,FALSE)", "fragile"],
  ],
  "vlookup-2": [["=VLOOKUP(B2,E3:F5,2,TRUE)", "fragile"]],
  "count-2": [["=COUNT(A2:A8)", "missing-function"], ["=COUNTA(A2:A6)", "wrong-value"], ["=COUNTA(A2:A7)", "wrong-value"]],
  "vlookup-3": [["=RIGHT(A2,2)", "missing-function"], ['="MK"', "missing-function"]],
};

const byId = new Map(excelLessons.flatMap((l) => l.problems.map((p) => [p.id, p] as const)));
for (const [id, answers] of Object.entries(ALTERNATIVES)) {
  for (const a of answers) {
    test(`[${id}] 대체 정답 통과: ${a}`, () => {
      const r = gradeAnswer(byId.get(id)!, a);
      assert.equal(r.ok, true, JSON.stringify(r));
    });
  }
}
for (const [id, cases] of Object.entries(WRONG)) {
  for (const [a, reason] of cases) {
    test(`[${id}] 오답 걸러냄(${reason}): ${a}`, () => {
      const r = gradeAnswer(byId.get(id)!, a);
      assert.equal(r.ok, false, `정답 처리됨: ${a}`);
      assert.equal(!r.ok && r.reason, reason, JSON.stringify(r));
    });
  }
}

console.log(`\n엑셀 연습 회귀: ${passed}개 통과, ${failed}개 실패`);
if (failed) process.exit(1);
