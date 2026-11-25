// =============================================================================
// 엑셀 연습용 미니 수식 엔진 (의존성 없음)
//
// 원조 사이트(excelexercises.com)는 입력한 수식을 "글자"로만 정답 목록과 비교한다.
// 그래서 =SUM(B2:B6)는 맞고 =SUM(B2,B3,B4,B5,B6)는 틀린 답이 된다.
// 우리는 수식을 실제로 계산해서 "결과값"으로 채점하려고 이 엔진을 둔다.
//
// 지원 범위: 컴활 2급 실기에 자주 나오는 함수 + 사칙연산·비교·& 연산.
// 날짜 함수·배열 수식·시트 참조·열 전체 참조(A:A)는 아직 지원하지 않는다.
// =============================================================================

export type ErrorCode =
  | "#DIV/0!"
  | "#VALUE!"
  | "#N/A"
  | "#NAME?"
  | "#REF!"
  | "#NUM!";

export class ExcelError {
  constructor(public readonly code: ErrorCode) {}
}

export type Scalar = number | string | boolean | ExcelError | null; // null = 빈 칸
export type RangeValue = { kind: "range"; cells: Scalar[][] }; // [행][열]
export type Value = Scalar | RangeValue;

/** 수식 문법이 틀렸을 때(괄호 안 닫힘 등) 던진다. message는 화면에 그대로 보여 줄 한국어. */
export class FormulaSyntaxError extends Error {}

// ---------------------------------------------------------------------------
// 셀 주소
// ---------------------------------------------------------------------------

export function colToIndex(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n; // A=1
}

export function indexToCol(index: number): string {
  let s = "";
  let n = index;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function parseAddress(addr: string): { col: number; row: number } {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(addr.trim());
  if (!m) throw new Error(`잘못된 셀 주소: ${addr}`);
  return { col: colToIndex(m[1]), row: Number(m[2]) };
}

export function toAddress(col: number, row: number): string {
  return `${indexToCol(col)}${row}`;
}

// ---------------------------------------------------------------------------
// 토큰
// ---------------------------------------------------------------------------

type Token =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "ref"; col: number; row: number }
  | { t: "func"; name: string }
  | { t: "op"; v: string }
  | { t: "("; }
  | { t: ")"; }
  | { t: ","; }
  | { t: ":"; };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  // 한글 자판에서 자주 섞이는 둥근 따옴표를 곧은 따옴표로 바꾼다.
  const s = src.replace(/[“”]/g, '"');
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let v = "";
      for (;;) {
        if (j >= s.length) throw new FormulaSyntaxError('따옴표(")가 닫히지 않았어요.');
        if (s[j] === '"') {
          if (s[j + 1] === '"') {
            v += '"';
            j += 2;
            continue;
          }
          break;
        }
        v += s[j];
        j++;
      }
      out.push({ t: "str", v });
      i = j + 1;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
    if (num) {
      // 바로 뒤에 글자가 붙으면(예: 1A) 숫자가 아니다.
      out.push({ t: "num", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const word = /^\$?[A-Za-z_][A-Za-z0-9_.]*\$?\d*/.exec(s.slice(i));
    if (word) {
      const w = word[0];
      const rest = s.slice(i + w.length);
      if (/^\$?[A-Za-z]{1,3}\$?\d+$/.test(w) && !/^\s*\(/.test(rest)) {
        const { col, row } = parseAddress(w);
        if (row < 1) throw new FormulaSyntaxError(`${w}는 없는 칸이에요.`);
        out.push({ t: "ref", col, row });
        i += w.length;
        continue;
      }
      if (/^\s*\(/.test(rest) && !w.includes("$")) {
        out.push({ t: "func", name: w.toUpperCase() });
        i += w.length;
        continue;
      }
      const upper = w.toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") {
        out.push({ t: "bool", v: upper === "TRUE" });
        i += w.length;
        continue;
      }
      if (/^[A-Za-z]+$/.test(w) && rest.startsWith(":")) {
        throw new FormulaSyntaxError(
          `${w}:${w}처럼 열 전체를 고르는 방식은 아직 지원하지 않아요. B2:B10처럼 칸 범위로 적어 주세요.`,
        );
      }
      throw new FormulaSyntaxError(
        `"${w}"를 알아볼 수 없어요. 글자는 "합격"처럼 큰따옴표로 감싸야 해요.`,
      );
    }
    const two = s.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") {
      out.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>%".includes(ch)) {
      out.push({ t: "op", v: ch });
      i++;
      continue;
    }
    if (ch === "(" || ch === ")" || ch === "," || ch === ":") {
      out.push({ t: ch } as Token);
      i++;
      continue;
    }
    if (ch === ";") {
      throw new FormulaSyntaxError("인수 사이는 세미콜론(;)이 아니라 쉼표(,)로 나눠요.");
    }
    const bare = /^[^\s"(),:;+\-*/^&=<>%$]+/.exec(s.slice(i));
    if (bare && /[^\x00-\x7F]/.test(bare[0])) {
      throw new FormulaSyntaxError(
        `"${bare[0]}"를 알아볼 수 없어요. 글자는 "${bare[0]}"처럼 큰따옴표로 감싸야 해요.`,
      );
    }
    throw new FormulaSyntaxError(`"${ch}" 기호는 수식에 쓸 수 없어요.`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 구문 트리
// ---------------------------------------------------------------------------

export type Node =
  | { type: "num"; v: number }
  | { type: "str"; v: string }
  | { type: "bool"; v: boolean }
  | { type: "empty" }
  | { type: "ref"; col: number; row: number }
  | { type: "range"; c1: number; r1: number; c2: number; r2: number }
  | { type: "unary"; op: "-" | "+"; e: Node }
  | { type: "percent"; e: Node }
  | { type: "bin"; op: string; l: Node; r: Node }
  | { type: "call"; name: string; args: Node[] };

class Parser {
  private p = 0;
  constructor(private readonly toks: Token[]) {}

  private peek(): Token | undefined {
    return this.toks[this.p];
  }
  private isOp(...ops: string[]): string | null {
    const t = this.peek();
    if (t && t.t === "op" && ops.includes(t.v)) return t.v;
    return null;
  }

  parseAll(): Node {
    if (this.toks.length === 0) throw new FormulaSyntaxError("= 뒤에 수식을 적어 주세요.");
    const n = this.comparison();
    const t = this.peek();
    if (t) {
      if (t.t === ")") throw new FormulaSyntaxError("닫는 괄호 ')'가 여는 괄호보다 많아요.");
      if (t.t === ",")
        throw new FormulaSyntaxError("쉼표(,)는 함수 괄호 안에서만 써요. 괄호 위치를 확인해 보세요.");
      throw new FormulaSyntaxError("수식 중간에 연산 기호가 빠진 것 같아요.");
    }
    return n;
  }

  private comparison(): Node {
    let l = this.concat();
    for (;;) {
      const op = this.isOp("=", "<>", "<", ">", "<=", ">=");
      if (!op) return l;
      this.p++;
      l = { type: "bin", op, l, r: this.concat() };
    }
  }
  private concat(): Node {
    let l = this.additive();
    while (this.isOp("&")) {
      this.p++;
      l = { type: "bin", op: "&", l, r: this.additive() };
    }
    return l;
  }
  private additive(): Node {
    let l = this.multiplicative();
    for (;;) {
      const op = this.isOp("+", "-");
      if (!op) return l;
      this.p++;
      l = { type: "bin", op, l, r: this.multiplicative() };
    }
  }
  private multiplicative(): Node {
    let l = this.exponent();
    for (;;) {
      const op = this.isOp("*", "/");
      if (!op) return l;
      this.p++;
      l = { type: "bin", op, l, r: this.exponent() };
    }
  }
  // 엑셀은 2^3^2를 왼쪽부터 계산한다(=64).
  private exponent(): Node {
    let l = this.percent();
    while (this.isOp("^")) {
      this.p++;
      l = { type: "bin", op: "^", l, r: this.percent() };
    }
    return l;
  }
  private percent(): Node {
    let e = this.unary();
    while (this.isOp("%")) {
      this.p++;
      e = { type: "percent", e };
    }
    return e;
  }
  // 엑셀은 부호(-)를 거듭제곱보다 먼저 계산한다: =-2^2 → 4
  private unary(): Node {
    const op = this.isOp("-", "+");
    if (op) {
      this.p++;
      return { type: "unary", op: op as "-" | "+", e: this.unary() };
    }
    return this.primary();
  }
  private primary(): Node {
    const t = this.peek();
    if (!t) throw new FormulaSyntaxError("수식이 중간에 끝났어요. 마지막 부분을 확인해 보세요.");
    this.p++;
    switch (t.t) {
      case "num":
        return { type: "num", v: t.v };
      case "str":
        return { type: "str", v: t.v };
      case "bool":
        return { type: "bool", v: t.v };
      case "ref": {
        if (this.peek()?.t === ":") {
          this.p++;
          const t2 = this.peek();
          if (!t2 || t2.t !== "ref")
            throw new FormulaSyntaxError("범위는 B2:B10처럼 콜론(:) 양쪽에 칸 주소를 적어요.");
          this.p++;
          return {
            type: "range",
            c1: Math.min(t.col, t2.col),
            r1: Math.min(t.row, t2.row),
            c2: Math.max(t.col, t2.col),
            r2: Math.max(t.row, t2.row),
          };
        }
        return { type: "ref", col: t.col, row: t.row };
      }
      case "func":
        return this.call(t.name);
      case "(": {
        const e = this.comparison();
        if (this.peek()?.t !== ")") throw new FormulaSyntaxError("여는 괄호 '('가 닫히지 않았어요.");
        this.p++;
        return e;
      }
      case ")":
        throw new FormulaSyntaxError("괄호 안이 비어 있거나 ')'가 너무 일찍 나왔어요.");
      case ",":
        throw new FormulaSyntaxError("쉼표(,) 앞에 값이 빠졌어요.");
      case ":":
        throw new FormulaSyntaxError("콜론(:) 앞에 시작 칸 주소가 빠졌어요.");
      case "op":
        throw new FormulaSyntaxError(`'${t.v}' 앞이나 뒤에 값이 빠졌어요.`);
    }
  }
  private call(name: string): Node {
    // func 토큰 바로 뒤는 항상 "(" (토크나이저가 보장)
    this.p++;
    const args: Node[] = [];
    if (this.peek()?.t === ")") {
      this.p++;
      return { type: "call", name, args };
    }
    for (;;) {
      const t = this.peek();
      if (t && (t.t === "," || t.t === ")")) args.push({ type: "empty" });
      else args.push(this.comparison());
      const sep = this.peek();
      if (!sep) throw new FormulaSyntaxError(`${name} 함수의 괄호 ')'가 닫히지 않았어요.`);
      if (sep.t === ",") {
        this.p++;
        continue;
      }
      if (sep.t === ")") {
        this.p++;
        return { type: "call", name, args };
      }
      throw new FormulaSyntaxError(`${name} 함수 안에서 인수 사이에 쉼표(,)가 빠진 것 같아요.`);
    }
  }
}

/** "=..." 수식(앞의 = 포함/미포함 모두 허용)을 구문 트리로 바꾼다. */
export function parseFormula(formula: string): Node {
  const body = formula.trim().replace(/^=/, "");
  return new Parser(tokenize(body)).parseAll();
}

/** 수식에 쓰인 함수 이름 목록(대문자, 중복 제거). */
export function functionsUsed(node: Node): Set<string> {
  const out = new Set<string>();
  const walk = (n: Node) => {
    if (n.type === "call") {
      out.add(n.name);
      n.args.forEach(walk);
    } else if (n.type === "bin") {
      walk(n.l);
      walk(n.r);
    } else if (n.type === "unary" || n.type === "percent") walk(n.e);
  };
  walk(node);
  return out;
}

/** 수식이 특정 칸을 (직접 또는 범위로) 참조하는지 */
export function referencesCell(node: Node, col: number, row: number): boolean {
  switch (node.type) {
    case "ref":
      return node.col === col && node.row === row;
    case "range":
      return col >= node.c1 && col <= node.c2 && row >= node.r1 && row <= node.r2;
    case "call":
      return node.args.some((a) => referencesCell(a, col, row));
    case "bin":
      return referencesCell(node.l, col, row) || referencesCell(node.r, col, row);
    case "unary":
    case "percent":
      return referencesCell(node.e, col, row);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// 시트(값 공급자)
// ---------------------------------------------------------------------------

/** 셀 원본값. "="로 시작하는 문자열은 수식. */
export type CellInput = number | string | boolean | null | undefined;

export class Sheet {
  private cache = new Map<string, Scalar>();
  private visiting = new Set<string>();
  constructor(private readonly cells: Record<string, CellInput>) {}

  raw(addr: string): CellInput {
    return this.cells[addr];
  }

  get(col: number, row: number): Scalar {
    const addr = toAddress(col, row);
    if (this.cache.has(addr)) return this.cache.get(addr)!;
    const raw = this.cells[addr];
    let v: Scalar;
    if (raw === undefined || raw === null || raw === "") v = null;
    else if (typeof raw === "string" && raw.startsWith("=")) {
      if (this.visiting.has(addr)) return new ExcelError("#REF!"); // 순환 참조
      this.visiting.add(addr);
      try {
        v = this.evaluate(raw);
      } catch {
        v = new ExcelError("#NAME?");
      }
      this.visiting.delete(addr);
    } else v = raw;
    this.cache.set(addr, v);
    return v;
  }

  /** 수식을 이 시트 위에서 계산한다. 문법 오류면 FormulaSyntaxError를 던진다. */
  evaluate(formula: string): Scalar {
    const v = evalNode(parseFormula(formula), this);
    if (isRange(v)) return implicitSingle(v);
    return v;
  }
}

// ---------------------------------------------------------------------------
// 계산
// ---------------------------------------------------------------------------

const isRange = (v: Value): v is RangeValue =>
  typeof v === "object" && v !== null && !(v instanceof ExcelError) && v.kind === "range";
const isErr = (v: unknown): v is ExcelError => v instanceof ExcelError;
const E = (c: ErrorCode) => new ExcelError(c);

function implicitSingle(r: RangeValue): Scalar {
  if (r.cells.length === 1 && r.cells[0].length === 1) return r.cells[0][0];
  return E("#VALUE!");
}

function evalNode(n: Node, sh: Sheet): Value {
  switch (n.type) {
    case "num":
      return n.v;
    case "str":
      return n.v;
    case "bool":
      return n.v;
    case "empty":
      return null;
    case "ref":
      return sh.get(n.col, n.row);
    case "range": {
      const cells: Scalar[][] = [];
      for (let r = n.r1; r <= n.r2; r++) {
        const row: Scalar[] = [];
        for (let c = n.c1; c <= n.c2; c++) row.push(sh.get(c, r));
        cells.push(row);
      }
      return { kind: "range", cells };
    }
    case "unary": {
      const v = toNumber(scalarOf(evalNode(n.e, sh)));
      if (isErr(v)) return v;
      return n.op === "-" ? -v : v;
    }
    case "percent": {
      const v = toNumber(scalarOf(evalNode(n.e, sh)));
      return isErr(v) ? v : v / 100;
    }
    case "bin":
      return evalBinary(n.op, scalarOf(evalNode(n.l, sh)), scalarOf(evalNode(n.r, sh)));
    case "call":
      return callFunction(n.name, n.args, sh);
  }
}

function scalarOf(v: Value): Scalar {
  return isRange(v) ? implicitSingle(v) : v;
}

function toNumber(v: Scalar): number | ExcelError {
  if (isErr(v)) return v;
  if (v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const t = v.trim().replace(/,/g, "");
  if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
  return E("#VALUE!");
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "#NUM!";
  if (Number.isInteger(n)) return String(n);
  // 엑셀 '일반' 서식처럼 유효숫자 15자리에서 부동소수 찌꺼기를 지운다.
  return String(Number(n.toPrecision(15)));
}

function toText(v: Scalar): string | ExcelError {
  if (isErr(v)) return v;
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return formatNumber(v);
  return v;
}

function toBool(v: Scalar): boolean | ExcelError {
  if (isErr(v)) return v;
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const u = v.trim().toUpperCase();
  if (u === "TRUE") return true;
  if (u === "FALSE") return false;
  return E("#VALUE!");
}

/** 엑셀 비교 규칙: 숫자 < 글자 < 논리값. 글자는 대소문자 무시. */
function compare(a: Scalar, b: Scalar): number {
  const rank = (v: Scalar) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2);
  // 빈 칸은 상대 쪽 타입의 "빈 값"으로 본다.
  if (a === null) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
  if (typeof a === "string" && typeof b === "string") {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x === y ? 0 : x < y ? -1 : 1;
  }
  return Number(a) - Number(b);
}

function evalBinary(op: string, a: Scalar, b: Scalar): Scalar {
  if (isErr(a)) return a;
  if (isErr(b)) return b;
  if (op === "&") {
    const x = toText(a);
    const y = toText(b);
    if (isErr(x)) return x;
    if (isErr(y)) return y;
    return x + y;
  }
  if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
    const c = compare(a, b);
    switch (op) {
      case "=":
        return c === 0;
      case "<>":
        return c !== 0;
      case "<":
        return c < 0;
      case ">":
        return c > 0;
      case "<=":
        return c <= 0;
      default:
        return c >= 0;
    }
  }
  const x = toNumber(a);
  const y = toNumber(b);
  if (isErr(x)) return x;
  if (isErr(y)) return y;
  switch (op) {
    case "+":
      return x + y;
    case "-":
      return x - y;
    case "*":
      return x * y;
    case "/":
      return y === 0 ? E("#DIV/0!") : x / y;
    case "^": {
      const r = Math.pow(x, y);
      return Number.isFinite(r) ? r : E("#NUM!");
    }
  }
  return E("#VALUE!");
}

// ---------------------------------------------------------------------------
// 함수
// ---------------------------------------------------------------------------

type Ctx = { args: Node[]; sh: Sheet; name: string };

/** 인수 개수 검사. 틀리면 화면용 문법 오류를 던진다(엑셀도 입력 자체를 막는다). */
function arity(c: Ctx, min: number, max: number) {
  const n = c.args.length;
  if (n < min || n > max) {
    const need = min === max ? `${min}개` : max === Infinity ? `${min}개 이상` : `${min}~${max}개`;
    throw new FormulaSyntaxError(`${c.name} 함수에는 인수가 ${need} 필요해요. 지금은 ${n}개예요.`);
  }
}

const arg = (c: Ctx, i: number): Value => evalNode(c.args[i], c.sh);
const argScalar = (c: Ctx, i: number): Scalar => scalarOf(arg(c, i));
const hasArg = (c: Ctx, i: number) => i < c.args.length && c.args[i].type !== "empty";

function argNumber(c: Ctx, i: number, fallback?: number): number | ExcelError {
  if (!hasArg(c, i)) {
    if (fallback !== undefined) return fallback;
    return 0;
  }
  return toNumber(argScalar(c, i));
}

function argRange(c: Ctx, i: number): RangeValue | ExcelError {
  const v = arg(c, i);
  if (isRange(v)) return v;
  if (isErr(v)) return v;
  return { kind: "range", cells: [[v]] };
}

/** SUM·AVERAGE류: 범위 안의 글자·논리값·빈 칸은 무시, 직접 넣은 값은 숫자로 바꾼다. */
function collectNumbers(c: Ctx): number[] | ExcelError {
  const out: number[] = [];
  for (let i = 0; i < c.args.length; i++) {
    if (c.args[i].type === "empty") continue;
    const v = arg(c, i);
    if (isRange(v)) {
      for (const row of v.cells)
        for (const cell of row) {
          if (isErr(cell)) return cell;
          if (typeof cell === "number") out.push(cell);
        }
    } else {
      const n = toNumber(v);
      if (isErr(n)) return n;
      out.push(n);
    }
  }
  return out;
}

function flatten(v: Value): Scalar[] {
  if (isRange(v)) return v.cells.flat();
  return [v];
}

/** 소수 15자리 반올림 후 자리 처리(엑셀식 0.5 올림 = 0에서 먼 쪽). */
function roundWith(x: number, digits: number, mode: "round" | "up" | "down"): number {
  const d = Math.trunc(digits);
  const factor = Math.pow(10, d);
  const sign = x < 0 ? -1 : 1;
  const v = Number((Math.abs(x) * factor).toPrecision(15));
  const r = mode === "round" ? Math.round(v) : mode === "up" ? Math.ceil(v) : Math.floor(v);
  return Number(((sign * r) / factor).toPrecision(15)) || 0;
}

// 조건(COUNTIF 등) ---------------------------------------------------------

type Criterion = (v: Scalar) => boolean;

function wildcardRegex(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "~" && i + 1 < pattern.length) {
      re += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    } else if (ch === "*") re += ".*";
    else if (ch === "?") re += ".";
    else re += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, "i");
}

function makeCriterion(crit: Scalar): Criterion {
  if (typeof crit === "number") return (v) => numericEquals(v, crit);
  if (typeof crit === "boolean") return (v) => v === crit;
  if (crit === null) return (v) => v === null || v === "";
  if (isErr(crit)) return () => false;
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(crit)!;
  const op = m[1] ?? "=";
  const operand = m[2];
  const asNum = operand.trim() !== "" && !Number.isNaN(Number(operand)) ? Number(operand) : null;
  const upper = operand.toUpperCase();
  const asBool = upper === "TRUE" ? true : upper === "FALSE" ? false : null;

  if (op === "=" || op === "<>") {
    let eq: Criterion;
    if (operand === "") eq = (v) => v === null || v === "";
    else if (asNum !== null) eq = (v) => numericEquals(v, asNum);
    else if (asBool !== null) eq = (v) => v === asBool;
    else {
      const re = wildcardRegex(operand);
      eq = (v) => typeof v === "string" && re.test(v);
    }
    return op === "=" ? eq : (v) => !eq(v);
  }
  const cmp = (c: number) =>
    op === "<" ? c < 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : c >= 0;
  if (asNum !== null) return (v) => typeof v === "number" && cmp(v === asNum ? 0 : v < asNum ? -1 : 1);
  return (v) => typeof v === "string" && cmp(compare(v, operand));
}

function numericEquals(v: Scalar, n: number): boolean {
  if (typeof v === "number") return v === n;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v) === n;
  return false;
}

function sameShape(a: RangeValue, b: RangeValue) {
  return a.cells.length === b.cells.length && a.cells[0].length === b.cells[0].length;
}

/** COUNTIFS/SUMIFS/AVERAGEIFS 공통: 모든 조건을 만족하는 칸 위치 마스크 */
function multiCriteriaMask(
  c: Ctx,
  pairStart: number,
  shape?: RangeValue,
): boolean[][] | ExcelError {
  let mask: boolean[][] | null = null;
  for (let i = pairStart; i + 1 < c.args.length; i += 2) {
    const r = argRange(c, i);
    if (isErr(r)) return r;
    if (shape && !sameShape(shape, r)) return E("#VALUE!");
    if (mask && (mask.length !== r.cells.length || mask[0].length !== r.cells[0].length))
      return E("#VALUE!");
    const test = makeCriterion(argScalar(c, i + 1));
    const m = r.cells.map((row) => row.map((v) => test(v)));
    mask = mask ? mask.map((row, ri) => row.map((ok, ci) => ok && m[ri][ci])) : m;
  }
  return mask ?? E("#VALUE!");
}

// 찾기 --------------------------------------------------------------------

function lookupIndex(list: Scalar[], key: Scalar, mode: number): number | ExcelError {
  if (isErr(key)) return key;
  if (mode === 0) {
    const test =
      typeof key === "string" && /[*?]/.test(key)
        ? ((re) => (v: Scalar) => typeof v === "string" && re.test(v))(wildcardRegex(key))
        : (v: Scalar) => v !== null && compare(v, key) === 0 && typeof v === typeof key;
    const idx = list.findIndex(test);
    return idx === -1 ? E("#N/A") : idx;
  }
  // 정렬된 목록에서 근사값 찾기(엑셀처럼 처음으로 넘어서는 곳에서 멈춘다).
  let found = -1;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (v === null || isErr(v)) continue;
    if (typeof v !== typeof key) continue;
    const c = compare(v, key);
    if (mode > 0) {
      if (c <= 0) found = i;
      else break;
    } else {
      if (c >= 0) found = i;
      else break;
    }
  }
  return found === -1 ? E("#N/A") : found;
}

function rangeLookupFlag(c: Ctx, i: number): boolean | ExcelError {
  if (!hasArg(c, i)) {
    // =VLOOKUP(a,b,2,) 처럼 자리만 있고 비어 있으면 엑셀은 FALSE로 본다.
    return i < c.args.length ? false : true;
  }
  return toBool(argScalar(c, i));
}

// 함수 표 ------------------------------------------------------------------

type Fn = (c: Ctx) => Value;

const FUNCTIONS: Record<string, Fn> = {
  SUM: (c) => {
    arity(c, 1, 255);
    const ns = collectNumbers(c);
    return isErr(ns) ? ns : ns.reduce((a, b) => a + b, 0);
  },
  AVERAGE: (c) => {
    arity(c, 1, 255);
    const ns = collectNumbers(c);
    if (isErr(ns)) return ns;
    return ns.length === 0 ? E("#DIV/0!") : ns.reduce((a, b) => a + b, 0) / ns.length;
  },
  MAX: (c) => {
    arity(c, 1, 255);
    const ns = collectNumbers(c);
    if (isErr(ns)) return ns;
    return ns.length ? Math.max(...ns) : 0;
  },
  MIN: (c) => {
    arity(c, 1, 255);
    const ns = collectNumbers(c);
    if (isErr(ns)) return ns;
    return ns.length ? Math.min(...ns) : 0;
  },
  COUNT: (c) => {
    arity(c, 1, 255);
    let n = 0;
    for (let i = 0; i < c.args.length; i++) {
      const v = arg(c, i);
      if (isRange(v)) n += v.cells.flat().filter((x) => typeof x === "number").length;
      else if (typeof v === "number" || (typeof v === "string" && !isErr(toNumber(v)) && v.trim() !== "")) n++;
      else if (typeof v === "boolean") n++;
    }
    return n;
  },
  COUNTA: (c) => {
    arity(c, 1, 255);
    let n = 0;
    for (let i = 0; i < c.args.length; i++) {
      if (c.args[i].type === "empty") continue;
      n += flatten(arg(c, i)).filter((x) => x !== null).length;
    }
    return n;
  },
  COUNTBLANK: (c) => {
    arity(c, 1, 1);
    const r = argRange(c, 0);
    if (isErr(r)) return r;
    return r.cells.flat().filter((x) => x === null || x === "").length;
  },
  COUNTIF: (c) => {
    arity(c, 2, 2);
    const r = argRange(c, 0);
    if (isErr(r)) return r;
    const test = makeCriterion(argScalar(c, 1));
    return r.cells.flat().filter(test).length;
  },
  COUNTIFS: (c) => {
    arity(c, 2, 254);
    if (c.args.length % 2) throw new FormulaSyntaxError("COUNTIFS는 (범위, 조건)을 짝으로 넣어요.");
    const mask = multiCriteriaMask(c, 0);
    return isErr(mask) ? mask : mask.flat().filter(Boolean).length;
  },
  SUMIF: (c) => {
    arity(c, 2, 3);
    const r = argRange(c, 0);
    if (isErr(r)) return r;
    const sumR = hasArg(c, 2) ? argRange(c, 2) : r;
    if (isErr(sumR)) return sumR;
    const test = makeCriterion(argScalar(c, 1));
    let s = 0;
    r.cells.forEach((row, ri) =>
      row.forEach((v, ci) => {
        if (!test(v)) return;
        const x = sumR.cells[ri]?.[ci];
        if (typeof x === "number") s += x;
      }),
    );
    return s;
  },
  AVERAGEIF: (c) => {
    arity(c, 2, 3);
    const r = argRange(c, 0);
    if (isErr(r)) return r;
    const avgR = hasArg(c, 2) ? argRange(c, 2) : r;
    if (isErr(avgR)) return avgR;
    const test = makeCriterion(argScalar(c, 1));
    const ns: number[] = [];
    r.cells.forEach((row, ri) =>
      row.forEach((v, ci) => {
        const x = avgR.cells[ri]?.[ci];
        if (test(v) && typeof x === "number") ns.push(x);
      }),
    );
    return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : E("#DIV/0!");
  },
  SUMIFS: (c) => {
    arity(c, 3, 255);
    if (c.args.length % 2 === 0) throw new FormulaSyntaxError("SUMIFS는 (합계 범위, 범위1, 조건1, …) 순서예요.");
    const sumR = argRange(c, 0);
    if (isErr(sumR)) return sumR;
    const mask = multiCriteriaMask(c, 1, sumR);
    if (isErr(mask)) return mask;
    let s = 0;
    sumR.cells.forEach((row, ri) =>
      row.forEach((x, ci) => {
        if (mask[ri][ci] && typeof x === "number") s += x;
      }),
    );
    return s;
  },
  AVERAGEIFS: (c) => {
    arity(c, 3, 255);
    if (c.args.length % 2 === 0) throw new FormulaSyntaxError("AVERAGEIFS는 (평균 범위, 범위1, 조건1, …) 순서예요.");
    const r = argRange(c, 0);
    if (isErr(r)) return r;
    const mask = multiCriteriaMask(c, 1, r);
    if (isErr(mask)) return mask;
    const ns: number[] = [];
    r.cells.forEach((row, ri) =>
      row.forEach((x, ci) => {
        if (mask[ri][ci] && typeof x === "number") ns.push(x);
      }),
    );
    return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : E("#DIV/0!");
  },
  ROUND: (c) => roundFn(c, "round"),
  ROUNDUP: (c) => roundFn(c, "up"),
  ROUNDDOWN: (c) => roundFn(c, "down"),
  INT: (c) => {
    arity(c, 1, 1);
    const x = argNumber(c, 0);
    return isErr(x) ? x : Math.floor(x);
  },
  TRUNC: (c) => {
    arity(c, 1, 2);
    const x = argNumber(c, 0);
    const d = argNumber(c, 1, 0);
    if (isErr(x)) return x;
    if (isErr(d)) return d;
    return roundWith(x, d, "down");
  },
  ABS: (c) => {
    arity(c, 1, 1);
    const x = argNumber(c, 0);
    return isErr(x) ? x : Math.abs(x);
  },
  MOD: (c) => {
    arity(c, 2, 2);
    const n = argNumber(c, 0);
    const d = argNumber(c, 1);
    if (isErr(n)) return n;
    if (isErr(d)) return d;
    if (d === 0) return E("#DIV/0!");
    return n - d * Math.floor(n / d);
  },
  "RANK.EQ": (c) => rankFn(c),
  RANK: (c) => rankFn(c),
  LARGE: (c) => kthFn(c, "large"),
  SMALL: (c) => kthFn(c, "small"),
  IF: (c) => {
    arity(c, 1, 3);
    const cond = toBool(argScalar(c, 0));
    if (isErr(cond)) return cond;
    if (cond) return hasArg(c, 1) ? arg(c, 1) : c.args.length > 1 ? 0 : true;
    if (c.args.length < 3) return false;
    return hasArg(c, 2) ? arg(c, 2) : 0;
  },
  IFERROR: (c) => {
    arity(c, 2, 2);
    const v = argScalar(c, 0);
    return isErr(v) ? argScalar(c, 1) : v;
  },
  AND: (c) => logicFn(c, "and"),
  OR: (c) => logicFn(c, "or"),
  NOT: (c) => {
    arity(c, 1, 1);
    const b = toBool(argScalar(c, 0));
    return isErr(b) ? b : !b;
  },
  CHOOSE: (c) => {
    arity(c, 2, 255);
    const i = argNumber(c, 0);
    if (isErr(i)) return i;
    const k = Math.trunc(i);
    if (k < 1 || k >= c.args.length) return E("#VALUE!");
    return arg(c, k);
  },
  VLOOKUP: (c) => {
    arity(c, 3, 4);
    const key = argScalar(c, 0);
    const table = argRange(c, 1);
    if (isErr(table)) return table;
    const col = argNumber(c, 2);
    if (isErr(col)) return col;
    const approx = rangeLookupFlag(c, 3);
    if (isErr(approx)) return approx;
    const k = Math.trunc(col);
    if (k < 1) return E("#VALUE!");
    if (k > table.cells[0].length) return E("#REF!");
    const idx = lookupIndex(table.cells.map((r) => r[0]), key, approx ? 1 : 0);
    return isErr(idx) ? idx : table.cells[idx][k - 1];
  },
  HLOOKUP: (c) => {
    arity(c, 3, 4);
    const key = argScalar(c, 0);
    const table = argRange(c, 1);
    if (isErr(table)) return table;
    const row = argNumber(c, 2);
    if (isErr(row)) return row;
    const approx = rangeLookupFlag(c, 3);
    if (isErr(approx)) return approx;
    const k = Math.trunc(row);
    if (k < 1) return E("#VALUE!");
    if (k > table.cells.length) return E("#REF!");
    const idx = lookupIndex(table.cells[0], key, approx ? 1 : 0);
    return isErr(idx) ? idx : table.cells[k - 1][idx];
  },
  MATCH: (c) => {
    arity(c, 2, 3);
    const key = argScalar(c, 0);
    const r = argRange(c, 1);
    if (isErr(r)) return r;
    if (r.cells.length > 1 && r.cells[0].length > 1) return E("#N/A");
    const mode = argNumber(c, 2, 1);
    if (isErr(mode)) return mode;
    const idx = lookupIndex(r.cells.flat(), key, Math.sign(mode));
    return isErr(idx) ? idx : idx + 1;
  },
  INDEX: (c) => {
    arity(c, 2, 3);
    const r = argRange(c, 0);
    if (isErr(r)) return r;
    const a = argNumber(c, 1);
    if (isErr(a)) return a;
    const b = argNumber(c, 2, 0);
    if (isErr(b)) return b;
    let row = Math.trunc(a);
    let col = Math.trunc(b);
    // 한 줄짜리 범위에 번호 하나만 주면 그 줄의 n번째로 본다.
    if (!hasArg(c, 2)) {
      if (r.cells.length === 1) {
        col = row;
        row = 1;
      } else col = 1;
    }
    if (row < 0 || col < 0) return E("#VALUE!");
    if (row === 0 || col === 0) return E("#VALUE!"); // 행·열 전체 반환은 미지원
    if (row > r.cells.length || col > r.cells[0].length) return E("#REF!");
    return r.cells[row - 1][col - 1];
  },
  LEFT: (c) => sliceFn(c, "left"),
  RIGHT: (c) => sliceFn(c, "right"),
  MID: (c) => {
    arity(c, 3, 3);
    const t = toText(argScalar(c, 0));
    const s = argNumber(c, 1);
    const n = argNumber(c, 2);
    if (isErr(t)) return t;
    if (isErr(s)) return s;
    if (isErr(n)) return n;
    if (s < 1 || n < 0) return E("#VALUE!");
    return Array.from(t).slice(Math.trunc(s) - 1, Math.trunc(s) - 1 + Math.trunc(n)).join("");
  },
  LEN: (c) => {
    arity(c, 1, 1);
    const t = toText(argScalar(c, 0));
    return isErr(t) ? t : Array.from(t).length;
  },
  UPPER: (c) => textMap(c, (s) => s.toUpperCase()),
  LOWER: (c) => textMap(c, (s) => s.toLowerCase()),
  PROPER: (c) =>
    textMap(c, (s) => s.toLowerCase().replace(/(^|[^a-zA-Z])([a-z])/g, (_, p, ch) => p + ch.toUpperCase())),
  TRIM: (c) => textMap(c, (s) => s.trim().replace(/ {2,}/g, " ")),
  CONCATENATE: (c) => {
    arity(c, 1, 255);
    let s = "";
    for (let i = 0; i < c.args.length; i++) {
      const t = toText(argScalar(c, i));
      if (isErr(t)) return t;
      s += t;
    }
    return s;
  },
  CONCAT: (c) => {
    arity(c, 1, 255);
    let s = "";
    for (let i = 0; i < c.args.length; i++) {
      for (const v of flatten(arg(c, i))) {
        const t = toText(v);
        if (isErr(t)) return t;
        s += t;
      }
    }
    return s;
  },
};

function roundFn(c: Ctx, mode: "round" | "up" | "down"): Value {
  arity(c, 2, 2);
  const x = argNumber(c, 0);
  const d = argNumber(c, 1);
  if (isErr(x)) return x;
  if (isErr(d)) return d;
  return roundWith(x, d, mode);
}

function rankFn(c: Ctx): Value {
  arity(c, 2, 3);
  const x = argNumber(c, 0);
  if (isErr(x)) return x;
  const r = argRange(c, 1);
  if (isErr(r)) return r;
  const order = argNumber(c, 2, 0);
  if (isErr(order)) return order;
  const ns = r.cells.flat().filter((v): v is number => typeof v === "number");
  if (!ns.includes(x)) return E("#N/A");
  return (order === 0 ? ns.filter((v) => v > x) : ns.filter((v) => v < x)).length + 1;
}

function kthFn(c: Ctx, which: "large" | "small"): Value {
  arity(c, 2, 2);
  const r = argRange(c, 0);
  if (isErr(r)) return r;
  const k = argNumber(c, 1);
  if (isErr(k)) return k;
  const ns = r.cells.flat().filter((v): v is number => typeof v === "number");
  ns.sort((a, b) => (which === "large" ? b - a : a - b));
  const i = Math.ceil(k);
  if (i < 1 || i > ns.length) return E("#NUM!");
  return ns[i - 1];
}

function logicFn(c: Ctx, kind: "and" | "or"): Value {
  arity(c, 1, 255);
  const vals: boolean[] = [];
  for (let i = 0; i < c.args.length; i++) {
    const v = arg(c, i);
    if (isRange(v)) {
      for (const x of v.cells.flat()) {
        if (isErr(x)) return x;
        if (typeof x === "boolean") vals.push(x);
        else if (typeof x === "number") vals.push(x !== 0);
      }
    } else {
      const b = toBool(v);
      if (isErr(b)) return b;
      vals.push(b);
    }
  }
  if (vals.length === 0) return E("#VALUE!");
  return kind === "and" ? vals.every(Boolean) : vals.some(Boolean);
}

function sliceFn(c: Ctx, side: "left" | "right"): Value {
  arity(c, 1, 2);
  const t = toText(argScalar(c, 0));
  const n = argNumber(c, 1, 1);
  if (isErr(t)) return t;
  if (isErr(n)) return n;
  if (n < 0) return E("#VALUE!");
  const chars = Array.from(t);
  const k = Math.trunc(n);
  return side === "left" ? chars.slice(0, k).join("") : chars.slice(Math.max(0, chars.length - k)).join("");
}

function textMap(c: Ctx, f: (s: string) => string): Value {
  arity(c, 1, 1);
  const t = toText(argScalar(c, 0));
  return isErr(t) ? t : f(t);
}

function callFunction(name: string, args: Node[], sh: Sheet): Value {
  const fn = FUNCTIONS[name];
  if (!fn) return E("#NAME?");
  return fn({ args, sh, name });
}

export const SUPPORTED_FUNCTIONS = Object.keys(FUNCTIONS);

/** 화면에 보여 줄 값 문자열 */
export function displayValue(v: Scalar): string {
  if (v === null) return "";
  if (isErr(v)) return v.code;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return formatNumber(v);
  return v;
}

export { isErr as isExcelError };
