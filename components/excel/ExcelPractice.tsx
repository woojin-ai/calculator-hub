"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sheet,
  colToIndex,
  displayValue,
  formatNumber,
  indexToCol,
  parseAddress,
  toAddress,
  type Scalar,
} from "@/lib/excel/formula";
import { gradeAnswer, gridSize, type ExcelProblem, type GradeResult } from "@/lib/excel/grade";
import { markSolved, useSolvedIds } from "@/lib/excel/progress";

type Pos = { col: number; row: number };

type Props = {
  problems: ExcelProblem[];
  nextLesson?: { slug: string; title: string };
};

/** 이 글자 바로 뒤에서는 칸을 클릭하면 주소가 들어간다(엑셀의 '참조 모드'). */
const INSERT_AFTER = new Set(["=", "(", ",", "+", "-", "*", "/", "^", "&", "<", ">", ":"]);

function canInsertRef(text: string, caret: number): boolean {
  if (!text.startsWith("=")) return false;
  const before = text.slice(0, caret).trimEnd();
  return before.length > 0 && INSERT_AFTER.has(before[before.length - 1]);
}

/** 입력 중인 수식이 가리키는 칸들(화면에서 파랗게 칠한다) */
function referencedCells(text: string): Set<string> {
  const out = new Set<string>();
  if (!text.startsWith("=")) return out;
  const body = text.replace(/"[^"]*"?/g, (m) => " ".repeat(m.length));
  const re = /(^|[^A-Za-z0-9_.$])\$?([A-Za-z]{1,3})\$?(\d+)(?:\s*:\s*\$?([A-Za-z]{1,3})\$?(\d+))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (body.slice(re.lastIndex).trimStart().startsWith("(")) continue; // 함수 이름(LOG10 등)
    const c1 = colToIndex(m[2]);
    const r1 = Number(m[3]);
    const c2 = m[4] ? colToIndex(m[4]) : c1;
    const r2 = m[5] ? Number(m[5]) : r1;
    let count = 0;
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2) && count < 400; r++)
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2) && count < 400; c++, count++)
        out.add(toAddress(c, r));
  }
  return out;
}

function textWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  return w;
}

function showValue(v: Scalar, col: number, commaCols: Set<string>): string {
  if (typeof v === "number" && commaCols.has(indexToCol(col)))
    return v.toLocaleString("ko-KR", { maximumFractionDigits: 10 });
  return displayValue(v);
}

const HELPER_KEYS =["=", "(", ")", ",", ":", '"', ">=", "$"];

export default function ExcelPractice({ problems, nextLesson }: Props) {
  const solved = useSolvedIds();
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const autoIdx = useMemo(() => {
    const i = problems.findIndex((p) => !solved.has(p.id));
    return i === -1 ? 0 : i;
  }, [problems, solved]);
  const idx = pinnedIdx ?? autoIdx;
  const problem = problems[idx];

  const target = useMemo(() => parseAddress(problem.target), [problem.target]);
  const { cols, rows } = useMemo(() => gridSize(problem), [problem]);

  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedState, setSelected] = useState<Pos | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [committed, setCommitted] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const selected = selectedState ?? target;
  const isTarget = (p: Pos) => p.col === target.col && p.row === target.row;

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const pointRef = useRef<{ start: number; len: number; anchor: Pos } | null>(null);
  const dragging = useRef(false);

  // 편집 시작 시 입력칸에 포커스, 주소를 끼워 넣은 뒤에는 커서를 그 뒤로
  useEffect(() => {
    const el = inputRef.current;
    if (!editing || !el) return;
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    if (pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [editing, input]);

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const sheet = useMemo(
    () => new Sheet(committed ? { ...problem.cells, [problem.target]: committed } : problem.cells),
    [problem, committed],
  );
  const highlighted = useMemo(() => (editing ? referencedCells(input) : new Set<string>()), [editing, input]);
  const commaCols = useMemo(() => new Set(problem.commaCols ?? []), [problem.commaCols]);

  const show = (v: Scalar, col: number) => showValue(v, col, commaCols);

  const colWidths = useMemo(() => {
    const widths: number[] = [];
    for (let c = 1; c <= cols; c++) {
      let w = 1;
      for (let r = 1; r <= rows; r++) w = Math.max(w, textWidth(showValue(sheet.get(c, r), c, commaCols)));
      widths.push(Math.min(200, Math.max(76, w * 8 + 22)));
    }
    return widths;
  }, [sheet, cols, rows, commaCols]);

  function goTo(i: number) {
    setPinnedIdx(i);
    setInput("");
    setEditing(false);
    setSelected(null);
    setResult(null);
    setCommitted(null);
    setAttempts(0);
    setShowHint(false);
    setShowSolution(false);
    pointRef.current = null;
    // 사용자가 직접 문제를 고른 경우라 바로 답 칸 입력 상태로 연다.
    // (빈 시트에 포커스만 주면 붙여넣기·음성 입력·한글 IME 첫 글자가 사라진다)
    setEditing(true);
  }

  function startEdit(initial?: string) {
    if (committed) return;
    setSelected(null);
    if (initial !== undefined) {
      setInput(initial);
      pendingCaret.current = initial.length;
      pointRef.current = null;
    }
    setEditing(true);
  }

  function submit() {
    if (committed) return;
    if (pinnedIdx === null) setPinnedIdx(idx);
    const r = gradeAnswer(problem, input);
    setResult(r);
    if (r.ok) {
      setCommitted(input.trim());
      setEditing(false);
      markSolved(problem.id);
      requestAnimationFrame(() => document.getElementById("excel-next")?.focus({ preventScroll: true }));
    } else if (r.reason !== "empty") {
      setAttempts((a) => a + 1);
      setEditing(true);
    }
  }

  function insertAtCaret(text: string) {
    if (committed) return;
    if (!editing) {
      startEdit(input + text);
      return;
    }
    const el = inputRef.current;
    const s = el?.selectionStart ?? input.length;
    const e = el?.selectionEnd ?? input.length;
    pendingCaret.current = s + text.length;
    pointRef.current = null;
    setInput(input.slice(0, s) + text + input.slice(e));
  }

  function placeRef(pos: Pos, start: number, end: number, anchor: Pos) {
    const c1 = Math.min(anchor.col, pos.col);
    const c2 = Math.max(anchor.col, pos.col);
    const r1 = Math.min(anchor.row, pos.row);
    const r2 = Math.max(anchor.row, pos.row);
    const ref = c1 === c2 && r1 === r2 ? toAddress(c1, r1) : `${toAddress(c1, r1)}:${toAddress(c2, r2)}`;
    pointRef.current = { start, len: ref.length, anchor };
    pendingCaret.current = start + ref.length;
    setInput(input.slice(0, start) + ref + input.slice(end));
  }

  function onCellMouseDown(e: React.MouseEvent, pos: Pos) {
    if (editing) {
      if (isTarget(pos)) return; // 입력칸 안 클릭
      const caret = inputRef.current?.selectionStart ?? input.length;
      const p = pointRef.current;
      e.preventDefault(); // 입력칸 포커스 유지
      if (p && caret === p.start + p.len) {
        dragging.current = true;
        placeRef(pos, p.start, p.start + p.len, pos);
      } else if (canInsertRef(input, caret)) {
        dragging.current = true;
        placeRef(pos, caret, caret, pos);
      }
      return;
    }
    setSelected(pos);
    if (isTarget(pos) && !committed) {
      e.preventDefault();
      startEdit();
    }
  }

  function onCellMouseEnter(pos: Pos) {
    const p = pointRef.current;
    if (!dragging.current || !editing || !p) return;
    placeRef(pos, p.start, p.start + p.len, p.anchor);
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    if (editing) return;
    const k = e.key;
    const move: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    if (move[k]) {
      e.preventDefault();
      const [dc, dr] = move[k];
      setSelected({
        col: Math.min(cols, Math.max(1, selected.col + dc)),
        row: Math.min(rows, Math.max(1, selected.row + dr)),
      });
      return;
    }
    if (committed) return;
    if (k === "Enter" || k === "F2") {
      e.preventDefault();
      startEdit();
      return;
    }
    if ((k === "Backspace" || k === "Delete") && isTarget(selected)) {
      e.preventDefault();
      startEdit("");
      return;
    }
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      startEdit(k);
    } else if (k === "Process" || k === "Unidentified") {
      // 한글 IME 등: 글자를 가로채지 않고 입력칸을 열어 이어서 치게 한다.
      startEdit();
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
      gridRef.current?.focus({ preventScroll: true });
    }
  }

  const selectedAddr = toAddress(selected.col, selected.row);
  const barText = isTarget(selected)
    ? committed ?? input
    : (() => {
        const raw = problem.cells[selectedAddr];
        if (raw === undefined || raw === null) return "";
        return typeof raw === "number" ? formatNumber(raw) : String(raw);
      })();

  const isLast = idx === problems.length - 1;
  const allSolved = problems.every((p) => solved.has(p.id));

  return (
    <section aria-labelledby="excel-problem-heading" className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
      {/* 문제 번호 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-brand-text-secondary">
          문제 {idx + 1} / {problems.length}
        </span>
        <div className="ml-auto flex gap-1.5" role="list" aria-label="문제 목록">
          {problems.map((p, i) => {
            const done = solved.has(p.id);
            const current = i === idx;
            return (
              <button
                key={p.id}
                type="button"
                role="listitem"
                onClick={() => goTo(i)}
                aria-current={current ? "step" : undefined}
                aria-label={`문제 ${i + 1}${done ? " (풀었음)" : ""}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                  current
                    ? "border-brand-primary bg-brand-primary text-white"
                    : done
                      ? "border-brand-accent bg-emerald-50 text-emerald-700"
                      : "border-brand-border bg-white text-brand-text-secondary hover:border-brand-primary"
                }`}
              >
                {done && !current ? "✓" : i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <h2 id="excel-problem-heading" className="mt-3 text-base font-semibold leading-relaxed text-brand-text sm:text-lg">
        {problem.prompt}
      </h2>
      {solved.has(problem.id) && !committed && (
        <p className="mt-1 text-xs text-emerald-700">이미 푼 문제예요. 한 번 더 쳐 보면 손에 더 익어요.</p>
      )}

      {/* 수식 입력줄 */}
      <div className="mt-4 flex items-stretch overflow-hidden rounded-t-md border border-b-0 border-gray-300 bg-white text-sm">
        <div className="flex w-14 shrink-0 items-center justify-center border-r border-gray-300 bg-gray-50 font-mono text-xs text-brand-text-secondary">
          {selectedAddr}
        </div>
        <div className="flex items-center border-r border-gray-300 px-2 font-serif italic text-gray-400" aria-hidden>
          fx
        </div>
        <div className="min-h-8 flex-1 truncate px-2 py-1.5 font-mono text-brand-text" aria-label="수식 입력줄">
          {barText}
        </div>
      </div>

      {/* 시트 */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onGridKeyDown}
        role="group"
        aria-label={`연습용 시트. 초록 칸 ${problem.target}에 수식을 입력하세요.`}
        className="overflow-x-auto rounded-b-md border border-gray-300 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <table className="border-collapse select-none text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-10 min-w-10 border-b border-r border-gray-300 bg-gray-100" />
              {Array.from({ length: cols }, (_, ci) => {
                const c = ci + 1;
                return (
                  <th
                    key={c}
                    scope="col"
                    style={{ minWidth: colWidths[ci] }}
                    className={`h-7 border-b border-r border-gray-300 text-xs font-medium ${
                      selected.col === c ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {indexToCol(c)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, ri) => {
              const r = ri + 1;
              return (
                <tr key={r}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 h-8 border-b border-r border-gray-300 text-xs font-medium ${
                      selected.row === r ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r}
                  </th>
                  {Array.from({ length: cols }, (_, ci) => {
                    const c = ci + 1;
                    const pos = { col: c, row: r };
                    const addr = toAddress(c, r);
                    const tgt = isTarget(pos);
                    const sel = selected.col === c && selected.row === r;
                    const value = sheet.get(c, r);
                    const text = show(value, c);
                    const numeric = typeof value === "number";
                    const isHeader = r === 1 && typeof value === "string";
                    return (
                      <td
                        key={c}
                        onMouseDown={(e) => onCellMouseDown(e, pos)}
                        onMouseEnter={() => onCellMouseEnter(pos)}
                        aria-selected={sel}
                        className={`relative h-8 cursor-cell whitespace-nowrap border-b border-r border-gray-200 px-2 ${
                          numeric ? "text-right tabular-nums" : "text-left"
                        } ${isHeader ? "bg-slate-50 font-semibold text-brand-text" : "text-brand-text"} ${
                          tgt && !committed ? "bg-emerald-50" : ""
                        } ${tgt && committed ? "bg-emerald-100 font-semibold text-emerald-900" : ""} ${
                          highlighted.has(addr) ? "bg-blue-100" : ""
                        }`}
                      >
                        {tgt && editing ? (
                          <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => {
                              pointRef.current = null;
                              setInput(e.target.value);
                            }}
                            onKeyDown={onInputKeyDown}
                            aria-label={`${problem.target} 칸 수식 입력`}
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="done"
                            className="absolute inset-0 z-30 h-full min-w-full border-2 border-brand-primary bg-white px-1.5 font-mono text-sm text-brand-text outline-none"
                            style={{ width: `max(100%, ${Math.max(10, input.length + 2)}ch)` }}
                          />
                        ) : tgt && !committed ? (
                          <span className={input ? "font-mono text-gray-500" : "text-xs text-emerald-700"}>
                            {input || "여기에 입력"}
                          </span>
                        ) : (
                          text
                        )}
                        {(sel || (tgt && !committed && !editing)) && !(tgt && editing) && (
                          <span
                            aria-hidden
                            className={`pointer-events-none absolute inset-0 border-2 ${
                              sel ? "border-brand-primary" : "border-dashed border-brand-accent"
                            }`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 입력 도우미(휴대폰 자판에서 찾기 어려운 기호) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {HELPER_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={!!committed}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertAtCaret(k)}
            className="h-9 min-w-9 rounded-md border border-brand-border bg-white px-2 font-mono text-sm text-brand-text hover:border-brand-primary disabled:opacity-40"
            aria-label={`${k} 입력`}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          disabled={!!committed}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (editing || input ? submit() : startEdit())}
          className="ml-auto h-9 rounded-md bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          채점하기
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-brand-text-secondary">
        초록 칸을 누르거나 바로 <kbd className="rounded border px-1 font-mono">=</kbd>부터 입력하세요. 수식을 쓰는 중에 다른 칸을 누르거나 끌면 주소가 들어가요.{" "}
        <kbd className="rounded border px-1 font-mono">Enter</kbd>로 채점, <kbd className="rounded border px-1 font-mono">Esc</kbd>로 입력 취소.
      </p>

      {/* 결과 */}
      <div aria-live="polite" className="mt-4 space-y-3">
        {result?.ok && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-800">
              정답이에요! 결과: <span className="font-mono">{result.value}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-emerald-900">{problem.explain}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!isLast ? (
                <button
                  id="excel-next"
                  type="button"
                  onClick={() => goTo(idx + 1)}
                  className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  다음 문제 →
                </button>
              ) : (
                <>
                  <p className="w-full text-sm font-medium text-emerald-900">
                    {allSolved ? "이 레슨 문제를 모두 풀었어요." : "마지막 문제예요. 위 번호에서 못 푼 문제를 마저 풀어 보세요."}
                  </p>
                  {nextLesson ? (
                    <Link
                      id="excel-next"
                      href={`/excel/${nextLesson.slug}`}
                      className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                    >
                      다음 레슨: {nextLesson.title} →
                    </Link>
                  ) : (
                    <Link
                      id="excel-next"
                      href="/excel"
                      className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                    >
                      레슨 목록으로 →
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {result && !result.ok && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">{result.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!showHint && (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
                >
                  힌트 보기
                </button>
              )}
              {attempts >= 2 && !showSolution && (
                <button
                  type="button"
                  onClick={() => setShowSolution(true)}
                  className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
                >
                  정답 보기
                </button>
              )}
            </div>
          </div>
        )}

        {showHint && !result?.ok && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-brand-text">💡 {problem.hint}</p>
        )}
        {showSolution && !result?.ok && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-brand-text">
            정답 예시: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{problem.solution}</code>
            <span className="mt-1 block text-xs text-brand-text-secondary">보고 그대로 직접 쳐 보세요. 손으로 쳐야 기억에 남아요.</span>
          </p>
        )}
      </div>
    </section>
  );
}
