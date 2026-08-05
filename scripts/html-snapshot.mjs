// =============================================================================
// 렌더 HTML 동일성 확인 도구 (값 무변경 리팩터 전용 수용 기준)
//
// 왜 필요한가: 하드코딩을 상수 참조로 바꾸는 리팩터의 수용 기준은 "빌드가 통과했다"가
// 아니라 "렌더 결과가 안 바뀌었다"이다(표준 ㋛ — 그럴듯한 출력이 아니라 구조적 불변량).
//
//   node scripts/html-snapshot.mjs snapshot <dir>
//   node scripts/html-snapshot.mjs compare  <dir>
//
// ── 빌드 산출물에 섞이는 잡음 2종 (2026-08-06 티켓 #40에서 실측·규명) ──────────
// (1) BUILD_ID: 소스를 한 글자도 안 고치고 두 번 빌드해도 64개 HTML이 **전부** 다르다.
//     매 빌드 새로 생성되는 21자 `.next/BUILD_ID`가 RSC 페이로드(`"b":"<id>"`)에 박힌다.
//     정규화 후 실측 64/64 동일 → 잡음 확정. 정규화 없이 쓰면 항상 FAIL이고 그 FAIL은
//     아무 의미가 없다.
// (2) 청크 파일명: `/_next/static/chunks/<contenthash>.js`. `lib/blog.ts` 등이
//     클라이언트 번들에 포함되므로(components/BlogListWithSearch.tsx가 import)
//     방출 코드가 바뀌면 콘텐츠 해시가 바뀌고 그 파일명이 계산기 HTML에 박힌다.
//     **문자열 리터럴 → 런타임 조립** 리팩터에서는 렌더 텍스트가 같아도 이건 반드시 바뀐다.
//
// ⚠️ (2)를 그냥 정규식으로 싹 치환해 버리면 "청크명만 다르다"는 주장을 **검증 없이 믿는**
//    것이 된다. 그래서 이 도구는 치환 대신 **위치 봉쇄(confinement)** 를 확인한다:
//    파일 길이가 같고, 서로 다른 모든 바이트가 청크 토큰 span 안에 들어갈 때만 허용한다.
//    한 바이트라도 토큰 밖이면 FAIL이다. 정규화보다 강한 기준이다.
//
// ── 커버리지 한계 (이 도구의 PASS가 증명하지 **못하는** 것) ──────────────────
// 이 도구는 `.next/server/app/**/*.html`만 본다. 따라서 아래는 검증 범위 밖이다:
//   - **동적 라우트**: `/blog` 목록처럼 ƒ(Dynamic)로 잡힌 페이지는 HTML 산출물이
//     없어 비교 대상 자체가 없다.
//   - **청크 *내용***: `.js` 청크는 파일명만 보고 내용은 안 본다. 그래서 HTML에
//     실리지 않는 데이터(예: 블로그 `tags` → 클라이언트 검색 인덱스)의 변경은
//     이 도구로 원리적으로 검증할 수 없다. 그런 변경은 별도 대조가 필요하다.
//   - `.rsc` / `.segments` / `sitemap.xml.body` / `robots.txt.body` 등 비HTML 산출물.
// PASS를 "아무것도 안 바뀌었다"로 읽지 말고 "정적 HTML 렌더가 안 바뀌었다"로 읽을 것.
// =============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync, readdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const SRC = ".next/server/app";
// ⚠️ `.js`로 끝나는 것만 봉쇄 예외로 인정한다. Next 16은 스타일시트도
// `/_next/static/chunks/<hash>.css`로 내보내는데, 확장자를 안 가리면 **CSS 내용이
// 바뀌어 해시가 달라진 것**까지 "청크 파일명만 상이(허용)"로 통과시켜서 디자인 회귀를
// 조용히 삼킨다(QA 티켓 #40 지적). CSS 참조가 바뀌면 실제 차이로 잡혀야 한다.
const CHUNK_RE = /\/_next\/static\/chunks\/[A-Za-z0-9_.-]+\.js/g;

const [, , mode, dir] = process.argv;
if (!mode || !dir) {
  console.error("usage: node scripts/html-snapshot.mjs {snapshot|compare} <dir>");
  process.exit(2);
}
if (!existsSync(SRC)) {
  console.error(`FAIL: ${SRC} 없음 — npm run build 먼저 실행`);
  process.exit(2);
}

/** <root> 아래 *.html 상대경로 전부 (정렬) */
function htmlFiles(root) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".html")) out.push(relative(root, p).split("\\").join("/"));
    }
  })(root);
  return out.sort();
}

/** BUILD_ID만 치환한 바이트 (청크명은 손대지 않는다 — 봉쇄 검사 대상이므로) */
function normalized(path, buildId) {
  return Buffer.from(
    readFileSync(path).toString("latin1").split(buildId).join("__BUILD_ID__"),
    "latin1"
  );
}

/** a·b의 차이가 전부 청크 파일명 토큰 안에 갇혀 있는가 */
function diffConfinedToChunkNames(a, b) {
  if (a.length !== b.length) return { confined: false, why: "파일 길이가 다름" };
  const spans = [];
  for (const s of [a, b]) {
    const text = s.toString("latin1");
    for (const m of text.matchAll(CHUNK_RE)) spans.push([m.index, m.index + m[0].length]);
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i] && !spans.some(([s, e]) => i >= s && i < e)) {
      return { confined: false, why: `바이트 ${i}가 청크 토큰 밖에서 다름` };
    }
  }
  return { confined: true };
}

if (mode === "snapshot") {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const f of htmlFiles(SRC)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(join(SRC, f), join(dir, f));
  }
  const id = readFileSync(".next/BUILD_ID", "utf8").trim();
  writeFileSync(join(dir, ".build-id"), id);
  console.log(`snapshot: ${htmlFiles(dir).length}개 -> ${dir} (buildId=${id})`);
  process.exit(0);
}

if (mode !== "compare") {
  console.error("usage: node scripts/html-snapshot.mjs {snapshot|compare} <dir>");
  process.exit(2);
}

if (!existsSync(join(dir, ".build-id"))) {
  console.error(`FAIL: ${dir}/.build-id 없음 — snapshot 모드로 다시 뜨세요(정규화 불가)`);
  process.exit(2);
}
const oldId = readFileSync(join(dir, ".build-id"), "utf8").trim();
const newId = readFileSync(".next/BUILD_ID", "utf8").trim();

const baseList = htmlFiles(dir);
const curList = htmlFiles(SRC);
if (baseList.join("\n") !== curList.join("\n")) {
  console.log(`FAIL: 파일 목록 불일치 base=${baseList.length} cur=${curList.length}`);
  for (const f of baseList.filter((f) => !curList.includes(f))) console.log(`  - 사라짐: ${f}`);
  for (const f of curList.filter((f) => !baseList.includes(f))) console.log(`  + 새로 생김: ${f}`);
  process.exit(1);
}

const identical = [];
const chunkOnly = [];
const real = [];
for (const f of baseList) {
  const a = normalized(join(dir, f), oldId);
  const b = normalized(join(SRC, f), newId);
  if (a.equals(b)) {
    identical.push(f);
    continue;
  }
  const v = diffConfinedToChunkNames(a, b);
  if (v.confined) chunkOnly.push(f);
  else real.push({ f, why: v.why });
}

console.log(`총 ${baseList.length}개`);
console.log(`  바이트 동일          : ${identical.length}개`);
console.log(`  청크 파일명만 상이(허용): ${chunkOnly.length}개`);
console.log(`  실제 렌더 차이        : ${real.length}개`);
for (const { f, why } of real) console.log(`  DIFF: ${f} — ${why}`);
if (real.length === 0) {
  console.log("PASS: 렌더 결과 변화 없음");
  process.exit(0);
}
console.log("FAIL: 렌더 결과가 바뀐 파일이 있습니다");
process.exit(1);
