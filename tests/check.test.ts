import { describe, expect, it } from "vitest";
import { redact, containsSensitiveDigits } from "../lib/redact";
import { rulesVerdict } from "../lib/fallback";
import { CheckResultSchema } from "../lib/schema";
import scamSet from "./scam-set.json";

type Case = { id: number; lang: "en" | "hi"; label: "SAFE" | "SUSPICIOUS" | "SCAM"; text: string };
const CASES = scamSet as Case[];

describe("redact", () => {
  it("masks an OTP", () => {
    expect(redact("Your OTP is 449213")).toContain("[OTP]");
    expect(redact("Your OTP is 449213")).not.toContain("449213");
  });

  it("masks an Indian mobile number", () => {
    const out = redact("Call me on 9876543210 today");
    expect(out).not.toContain("9876543210");
  });

  it("masks a card number with separators", () => {
    const out = redact("Card 4111 1111 1111 1111 expires soon");
    expect(out).not.toContain("4111");
  });

  it("masks an email address", () => {
    expect(redact("write to raj.kumar@example.com")).toContain("[EMAIL]");
  });

  it("leaves ordinary prose untouched", () => {
    const text = "Your account will be blocked today";
    expect(redact(text)).toBe(text);
  });

  it("detects digits worth breaking a drill over", () => {
    expect(containsSensitiveDigits("the code is 8812")).toBe(true);
    expect(containsSensitiveDigits("I will call the bank")).toBe(false);
  });
});

describe("rulesVerdict", () => {
  it("always returns a shape the UI can render", () => {
    for (const c of CASES) {
      const result = rulesVerdict(redact(c.text), c.lang);
      expect(() => CheckResultSchema.parse(result)).not.toThrow();
    }
  });

  it("never rates a known scam as SAFE", () => {
    const scams = CASES.filter((c) => c.label === "SCAM");
    const wrong = scams.filter((c) => rulesVerdict(redact(c.text), c.lang).verdict === "SAFE");
    expect(wrong.map((c) => c.id)).toEqual([]);
  });

  it("keeps risk_score consistent with the verdict band", () => {
    for (const c of CASES) {
      const { verdict, risk_score } = rulesVerdict(redact(c.text), c.lang);
      if (verdict === "SAFE") expect(risk_score).toBeLessThan(25);
      if (verdict === "SUSPICIOUS") expect(risk_score).toBeGreaterThanOrEqual(25);
      if (verdict === "SCAM") expect(risk_score).toBeGreaterThanOrEqual(60);
    }
  });

  it("recommends a family alert for every clear scam it catches", () => {
    const caught = CASES.filter(
      (c) => c.label === "SCAM" && rulesVerdict(redact(c.text), c.lang).verdict === "SCAM",
    );
    for (const c of caught) {
      expect(rulesVerdict(redact(c.text), c.lang).family_alert_recommended).toBe(true);
    }
  });

  /**
   * Accuracy of the OFFLINE fallback only - not of the model. The model is
   * measured separately with a key present; this number is the floor that
   * holds when the API is down. Printed so it can be quoted honestly.
   */
  it("reports offline-rules accuracy on the 20-message set", () => {
    const correct = CASES.filter(
      (c) => rulesVerdict(redact(c.text), c.lang).verdict === c.label,
    ).length;
    const pct = Math.round((correct / CASES.length) * 100);
    console.log(`Offline rules accuracy: ${correct}/${CASES.length} (${pct}%)`);
    // Floor, not a target. The rules are tuned on this set, so treat this as
    // "the offline path still works", never as a headline accuracy claim -
    // that number has to come from the model on messages it has not seen.
    expect(correct).toBeGreaterThanOrEqual(18);
  });
});
