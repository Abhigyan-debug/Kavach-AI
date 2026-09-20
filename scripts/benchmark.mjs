/**
 * Measures Kavach's real scam-detection accuracy by running the labelled test
 * set through the live /api/check endpoint.
 *
 *   npm run dev          # in one terminal
 *   npm run benchmark    # in another
 *
 * It goes through the HTTP endpoint on purpose, not straight to the model, so
 * the number reflects the whole pipeline the user actually gets: redaction,
 * the real prompt, schema validation, and the fallback if the model fails.
 *
 * Writes public/benchmark.json, which /benchmark renders.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = process.env.BENCHMARK_URL ?? "http://localhost:3000";
const CASES = JSON.parse(readFileSync("tests/scam-set.json", "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function check(text, lang, attempt = 0) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  });

  // The per-IP rate limit is there to protect a public demo; a local benchmark
  // legitimately trips it, so back off rather than recording a false miss.
  if (res.status === 429 && attempt < 6) {
    const wait = Number(res.headers.get("Retry-After") ?? 10);
    process.stdout.write(` (rate limited, waiting ${wait}s) `);
    await sleep((wait + 1) * 1000);
    return check(text, lang, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { ...(await res.json()), ms: Date.now() - started };
}

console.log(`Benchmarking ${BASE} against ${CASES.length} labelled messages\n`);

const results = [];
for (const c of CASES) {
  process.stdout.write(`  #${String(c.id).padStart(2)} ${c.lang} ${c.label.padEnd(10)}`);
  try {
    const r = await check(c.text, c.lang);
    const hit = r.verdict === c.label;
    results.push({
      id: c.id,
      lang: c.lang,
      expected: c.label,
      got: r.verdict,
      risk: r.risk_score,
      source: r.source,
      ms: r.ms,
      correct: hit,
      tactics: r.tactics,
    });
    console.log(`-> ${r.verdict.padEnd(10)} ${hit ? "OK" : "MISS"}  ${r.risk_score}/100  ${r.ms}ms  [${r.source}]`);
  } catch (err) {
    console.log(`-> ERROR ${err.message}`);
    results.push({ id: c.id, lang: c.lang, expected: c.label, got: "ERROR", correct: false, ms: 0, source: "error" });
  }
}

/* ---------------------------------------------------------------- */

const total = results.length;
const correct = results.filter((r) => r.correct).length;
const aiRun = results.filter((r) => r.source === "ai");

// The cost of each mistake is not symmetric: calling a scam SAFE can lose
// someone their savings, while calling a safe message SUSPICIOUS only costs
// them a moment. We report those separately rather than hiding both in one
// accuracy figure.
const scams = results.filter((r) => r.expected === "SCAM");
const safes = results.filter((r) => r.expected === "SAFE");
const missedScams = scams.filter((r) => r.got === "SAFE");
const caughtScams = scams.filter((r) => r.got === "SCAM" || r.got === "SUSPICIOUS");
const falseAlarms = safes.filter((r) => r.got === "SCAM");

const byLang = {};
for (const lang of ["en", "hi"]) {
  const rows = results.filter((r) => r.lang === lang);
  byLang[lang] = {
    total: rows.length,
    correct: rows.filter((r) => r.correct).length,
  };
}

const matrix = {};
for (const e of ["SCAM", "SUSPICIOUS", "SAFE"]) {
  matrix[e] = { SCAM: 0, SUSPICIOUS: 0, SAFE: 0, ERROR: 0 };
  for (const r of results.filter((x) => x.expected === e)) matrix[e][r.got] += 1;
}

const times = aiRun.map((r) => r.ms).sort((a, b) => a - b);
const pct = (n) => (times.length ? times[Math.min(times.length - 1, Math.floor(times.length * n))] : 0);

const report = {
  generatedAt: new Date().toISOString(),
  setSize: total,
  accuracy: Math.round((correct / total) * 100),
  correct,
  // Headline safety numbers.
  scamRecall: Math.round((caughtScams.length / scams.length) * 100),
  missedScams: missedScams.map((r) => r.id),
  falseAlarms: falseAlarms.map((r) => r.id),
  byLang,
  matrix,
  latency: { p50: pct(0.5), p90: pct(0.9), max: times[times.length - 1] ?? 0 },
  aiCoverage: Math.round((aiRun.length / total) * 100),
  results,
};

writeFileSync("public/benchmark.json", JSON.stringify(report, null, 2) + "\n");

console.log(`
──────────────────────────────────────────────
  Accuracy            ${report.accuracy}%  (${correct}/${total})
  Scams flagged       ${report.scamRecall}%  (SCAM or SUSPICIOUS, never SAFE)
  Scams called SAFE   ${missedScams.length}   ${missedScams.length ? "<- the dangerous failure" : "<- none"}
  Safe called SCAM    ${falseAlarms.length}
  English             ${byLang.en.correct}/${byLang.en.total}
  Hindi               ${byLang.hi.correct}/${byLang.hi.total}
  Latency p50/p90     ${report.latency.p50}ms / ${report.latency.p90}ms
  Answered by AI      ${report.aiCoverage}%
──────────────────────────────────────────────
Written to public/benchmark.json - view it at ${BASE}/benchmark
`);
