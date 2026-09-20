// Verifies your Gemini key, confirms the configured model exists and is
// reachable on your tier, and runs one real scam check end to end.
//
//   node scripts/verify-ai.mjs
//
// Run this once after adding GEMINI_API_KEY, before relying on it in a demo.
import { readFileSync, existsSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

// Minimal env loader so this works without `next` around it.
// Same precedence Next.js uses: .env.local wins over .env.
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set. Add it to .env first.");
  console.error("Get a free key at https://aistudio.google.com/apikey");
  process.exit(1);
}

const chain = (v, fb) => {
  const p = (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return p.length ? p : fb;
};
// Must mirror lib/llm.ts.
const ANALYSIS = chain(process.env.GEMINI_ANALYSIS_MODEL, [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
]);
const CHAT = chain(process.env.GEMINI_CHAT_MODEL, [
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
]);

const ai = new GoogleGenAI({ apiKey });

console.log("Configured model chains (first that answers wins):");
console.log("  analysis:", ANALYSIS.join(" -> "));
console.log("  chat:    ", CHAT.join(" -> "));
console.log();

// 1. List what this key can actually reach.
let available = [];
try {
  const pager = await ai.models.list();
  for await (const m of pager) available.push(m.name?.replace(/^models\//, "") ?? "");
  console.log(`Models visible to this key: ${available.length}`);
  const flash = available.filter((n) => n.includes("flash")).slice(0, 12);
  if (flash.length) console.log("  flash variants:", flash.join(", "));
} catch (err) {
  console.warn("Could not list models:", err.message);
}

// Each chain is a list, so check every entry rather than the joined string.
for (const [label, ids] of [
  ["analysis", ANALYSIS],
  ["chat", CHAT],
]) {
  for (const id of ids) {
    if (available.length && !available.includes(id)) {
      console.error(`\n  ${id} (${label}) is NOT visible to this key.`);
      console.error(`   Pick one from the list and set GEMINI_${label.toUpperCase()}_MODEL.`);
    }
  }
}

// 2. One real structured call, matching what /api/check does.
console.log("\nRunning a live scam check...");
const schema = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["SAFE", "SUSPICIOUS", "SCAM"] },
    risk_score: { type: "integer", minimum: 0, maximum: 100 },
    reasons: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: ["verdict", "risk_score", "reasons"],
  additionalProperties: false,
};

async function probe(model) {
  const started = Date.now();
  const res = await ai.models.generateContent({
    model,
    contents:
      "Analyse this message.\n\n<message>\nYour bank KYC has expired. Account blocked in 2 hours. Share the OTP now at http://bit.ly/x\n</message>",
    config: {
      systemInstruction:
        "You are a scam analyst. Classify as SAFE, SUSPICIOUS or SCAM with a 0-100 risk score and up to 3 short reasons.",
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      maxOutputTokens: 800,
      temperature: 0.3,
    },
  });

  const ms = Date.now() - started;
  const parsed = JSON.parse(res.text);
  return { ms, ...parsed };
}

let anyWorked = false;
const results = {};

for (const [label, ids] of [
  ["analysis", ANALYSIS],
  ["chat", CHAT],
]) {
  console.log(`
${label} chain:`);
  let firstOk = null;
  for (const model of ids) {
    try {
      const r = await probe(model);
      anyWorked = true;
      firstOk = firstOk ?? { model, ...r };
      const flag = r.verdict === "SAFE" ? "  <- WRONG, that is a clear scam" : "";
      console.log(`  OK   ${model.padEnd(26)} ${String(r.ms).padStart(6)}ms  ${r.verdict} ${r.risk_score}/100${flag}`);
    } catch (err) {
      const msg = String(err.message).replace(/\s+/g, " ").slice(0, 80);
      console.log(`  FAIL ${model.padEnd(26)} ${msg}`);
    }
  }
  results[label] = firstOk;
  if (!firstOk) {
    console.error(`  Every model in the ${label} chain failed.`);
  }
}

console.log();
if (!anyWorked) {
  console.error("No model responded. Kavach will run on offline rules only (Fire Drill disabled).");
  process.exit(1);
}

const a = results.analysis;
const c = results.chat;
if (a) console.log(`Analysis will use ${a.model} (${a.ms}ms).`);
if (c) console.log(`Drill turns will use ${c.model} (${c.ms}ms).`);
if (c && c.ms > 4000) {
  console.warn(`Warning: ${c.ms}ms per drill turn feels sluggish in a live demo.`);
}
if (!a || !c) {
  console.warn("A chain is fully down - that half falls back to rules/canned content.");
  process.exit(1);
}
console.log("\nGemini is working. Kavach will use AI verdicts.");
