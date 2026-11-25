// =============================================================================
// 엑셀 연습 채점기
//
// 1) 문법 검사 → 2) 함수 이름 검사 → 3) 꼭 써야 하는 함수 검사
// → 4) 원래 표에서 결과값 비교
// → 5) 표의 숫자를 바꾼 "변형 표" 2개에서도 모범 답안과 결과가 같은지 비교.
// 5번 덕분에 =450 처럼 답을 직접 적거나, 범위를 우연히 맞게 잡은 경우를 걸러낸다.
// =============================================================================

import {
  type CellInput,
  type Node,
  type Scalar,
  ExcelError,
  FormulaSyntaxError,
  SUPPORTED_FUNCTIONS,
  Sheet,
  displayValue,
  functionsUsed,
  parseAddress,
  parseFormula,
  referencesCell,
  toAddress,
} from "./formula";

export type ExcelProblem = {
  id: string;
  /** 화면에 보여 줄 문제 문장 */
  prompt: string;
  /** 표 데이터. "="로 시작하면 수식 칸 */
  cells: Record<string, CellInput>;
  /** 답을 적을 칸 */
  target: string;
  /** 모범 답안(채점 기준값을 이 수식으로 계산한다) */
  solution: string;
  /** 꼭 써야 하는 함수. "RANK.EQ|RANK"처럼 |로 대체 이름 허용 */
  required: string[];
  hint: string;
  /** 풀고 나서 보여 줄 한 줄 설명 */
  explain: string;
  /** 숫자를 바꾼 표로도 검사할지(기본 true) */
  perturb?: boolean;
  /** 천 단위 쉼표로 보여 줄 열(표시만 바뀜) */
  commaCols?: string[];
};

export type GradeFailReason =
  | "empty"
  | "not-formula"
  | "syntax"
  | "unknown-function"
  | "missing-function"
  | "error-value"
  | "wrong-value"
  | "fragile";

export type GradeResult =
  | { ok: true; value: string }
  | { ok: false; reason: GradeFailReason; message: string; value?: string };

const KNOWN = new Set(SUPPORTED_FUNCTIONS);

const ERROR_HELP: Record<string, string> = {
  "#DIV/0!": "0으로 나누고 있어요. 나누는 칸이 비어 있지 않은지 보세요.",
  "#VALUE!": "숫자가 와야 할 자리에 글자가 들어갔거나, 범위를 한 칸처럼 썼어요.",
  "#N/A": "찾는 값을 표에서 못 찾았어요. 찾을 범위와 마지막 인수(FALSE/0)를 확인해 보세요.",
  "#NAME?": "함수 이름이 틀렸거나 아직 지원하지 않는 함수예요.",
  "#REF!": "몇 번째 열·행을 가져올지 적은 숫자가 표 크기보다 커요.",
  "#NUM!": "계산할 수 없는 숫자가 나왔어요(예: 순위 k가 개수보다 큼).",
};

/** 숫자 칸만 순서를 유지한 채 바꾼 표(정렬된 기준표도 그대로 정렬 유지) */
export function perturbCells(cells: Record<string, CellInput>, k: number): Record<string, CellInput> {
  const out: Record<string, CellInput> = {};
  for (const [addr, v] of Object.entries(cells)) {
    out[addr] = typeof v === "number" ? v * (k + 1) + k * 3 + 1 : v;
  }
  return out;
}

/**
 * 검사용 변형 표 목록.
 * - 순서 유지 변형 2개: 답 숫자를 직접 적은 경우를 잡는다.
 * - 숫자 칸 하나씩 아주 크게/아주 작게 바꾼 변형: 범위에서 칸 하나를 빠뜨렸는데
 *   하필 그 칸이 결과에 영향이 없어서 우연히 맞은 경우(예: MIN 범위에서 최솟값이 아닌 칸 누락)와
 *   IF의 다른 갈래를 잡는다. 모든 값은 정수를 유지한다(">79"와 ">=80"이 같은 답이 되도록).
 */
export function checkVariants(cells: Record<string, CellInput>, solution: string): Record<string, CellInput>[] {
  const variants = [perturbCells(cells, 1), perturbCells(cells, 2)];

  const nums = Object.values(cells).filter((v): v is number => typeof v === "number");
  if (nums.length > 0) {
    const max = Math.max(...nums);
    const min = Math.min(...nums);
    const big = Math.round(Math.abs(max) * 10 + 7);
    const small = Math.round(min - Math.abs(max) - 7);
    for (const [addr, v] of Object.entries(cells)) {
      if (typeof v !== "number") continue;
      variants.push({ ...cells, [addr]: big }, { ...cells, [addr]: small });
    }
  }

  // 모범 답안이 쓰는 범위 안에서 행을 돌린 표: 어떤 행이든 범위 끝으로 가 보게 해서
  // 학습자 범위가 한 행이라도 모자라면 결과가 달라지게 만든다(글자 데이터·찾기 표 포함).
  const groups = new Map<string, { r1: number; r2: number; cols: Set<number> }>();
  for (const r of rangesIn(parseFormula(solution))) {
    const key = `${r.r1}-${r.r2}`;
    const g = groups.get(key) ?? { r1: r.r1, r2: r.r2, cols: new Set<number>() };
    for (let c = r.c1; c <= r.c2; c++) g.cols.add(c);
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    const n = g.r2 - g.r1 + 1;
    for (let k = 1; k < n; k++) {
      const next: Record<string, CellInput> = { ...cells };
      for (const c of g.cols) {
        for (let r = g.r1; r <= g.r2; r++) {
          const from = toAddress(c, r);
          const to = toAddress(c, g.r1 + ((r - g.r1 + k) % n));
          if (cells[from] === undefined) delete next[to];
          else next[to] = cells[from];
        }
      }
      variants.push(next);
    }
  }
  return variants;
}

function rangesIn(node: Node): Extract<Node, { type: "range" }>[] {
  switch (node.type) {
    case "range":
      return [node];
    case "call":
      return node.args.flatMap(rangesIn);
    case "bin":
      return [...rangesIn(node.l), ...rangesIn(node.r)];
    case "unary":
    case "percent":
      return rangesIn(node.e);
    default:
      return [];
  }
}

export function sameValue(a: Scalar, b: Scalar): boolean {
  if (a instanceof ExcelError || b instanceof ExcelError)
    return a instanceof ExcelError && b instanceof ExcelError && a.code === b.code;
  if (typeof a === "number" && typeof b === "number")
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  // 빈 문자열과 빈 칸은 같은 결과로 본다.
  if ((a === null || a === "") && (b === null || b === "")) return true;
  return a === b;
}

/** 수식을 표 위에서 계산. 인수 개수 오류 등은 FormulaSyntaxError로 던진다. */
export function evaluateOn(cells: Record<string, CellInput>, formula: string): Scalar {
  return new Sheet(cells).evaluate(formula);
}

function missingRequired(used: Set<string>, required: string[]): string | null {
  for (const req of required) {
    const names = req.split("|");
    if (!names.some((n) => used.has(n))) return names[0];
  }
  return null;
}

export function gradeAnswer(problem: ExcelProblem, rawInput: string): GradeResult {
  const input = rawInput.trim().replace(/^＝/, "=");
  if (input === "")
    return { ok: false, reason: "empty", message: "칸이 비어 있어요. =로 시작하는 수식을 적어 주세요." };
  if (!input.startsWith("=")) {
    return {
      ok: false,
      reason: "not-formula",
      message: "수식은 항상 = 기호로 시작해요. 앞에 =를 붙여 보세요.",
    };
  }

  let ast: Node;
  try {
    ast = parseFormula(input);
  } catch (e) {
    const msg = e instanceof FormulaSyntaxError ? e.message : "수식을 읽을 수 없어요.";
    return { ok: false, reason: "syntax", message: msg };
  }

  const used = functionsUsed(ast);
  const unknown = [...used].filter((n) => !KNOWN.has(n));
  if (unknown.length) {
    return {
      ok: false,
      reason: "unknown-function",
      message: `${unknown[0]}라는 함수는 없거나 아직 지원하지 않아요. 철자를 확인해 보세요.`,
    };
  }

  const self = parseAddress(problem.target);
  if (referencesCell(ast, self.col, self.row)) {
    return {
      ok: false,
      reason: "syntax",
      message: `답을 적는 칸(${problem.target}) 자신을 수식에 넣으면 순환 참조가 돼요.`,
    };
  }

  let mine: Scalar;
  try {
    mine = evaluateOn(problem.cells, input);
  } catch (e) {
    const msg = e instanceof FormulaSyntaxError ? e.message : "수식을 계산할 수 없어요.";
    return { ok: false, reason: "syntax", message: msg };
  }

  const missing = missingRequired(used, problem.required);
  if (missing) {
    return {
      ok: false,
      reason: "missing-function",
      message: `이 문제는 ${missing} 함수를 써서 풀어 보세요.`,
      value: displayValue(mine),
    };
  }

  const expected = evaluateOn(problem.cells, problem.solution);
  if (mine instanceof ExcelError && !(expected instanceof ExcelError)) {
    return {
      ok: false,
      reason: "error-value",
      message: `결과가 ${mine.code} 오류예요. ${ERROR_HELP[mine.code] ?? ""}`.trim(),
      value: mine.code,
    };
  }
  if (!sameValue(mine, expected)) {
    return {
      ok: false,
      reason: "wrong-value",
      message: `결과가 ${displayValue(mine) || "(빈 값)"}(으)로 나왔는데, 정답과 달라요. 범위와 조건을 다시 확인해 보세요.`,
      value: displayValue(mine),
    };
  }

  if (problem.perturb !== false) {
    for (const cells of checkVariants(problem.cells, problem.solution)) {
      if (!sameValue(evaluateOn(cells, input), evaluateOn(cells, problem.solution))) {
        return {
          ok: false,
          reason: "fragile",
          message:
            "지금 숫자로는 결과가 맞지만, 표의 숫자가 바뀌면 틀려져요. 값을 직접 적지 말고 칸을 참조했는지, 범위가 정확한지 확인해 보세요.",
          value: displayValue(mine),
        };
      }
    }
  }

  return { ok: true, value: displayValue(mine) };
}

/** 표 크기(문제 데이터 + 답 칸이 들어갈 만큼, 오른쪽·아래로 한 칸 여유) */
export function gridSize(problem: ExcelProblem): { cols: number; rows: number } {
  let cols = 1;
  let rows = 1;
  for (const addr of [...Object.keys(problem.cells), problem.target]) {
    const { col, row } = parseAddress(addr);
    cols = Math.max(cols, col);
    rows = Math.max(rows, row);
  }
  return { cols: Math.max(cols + 1, 4), rows: Math.max(rows + 1, 5) };
}
