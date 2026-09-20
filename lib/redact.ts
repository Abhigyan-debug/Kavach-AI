/**
 * Masks the digit patterns a scam message typically carries before the text
 * ever reaches the model. We keep the *shape* of each pattern (so the model can
 * still reason about "they asked for an OTP") but drop the value itself.
 *
 * Order matters: longer patterns are masked first so a 16-digit card number is
 * not chewed up by the 10-digit phone rule.
 */
const RULES: Array<{ re: RegExp; token: string }> = [
  // Card numbers: 13-16 digits, optionally grouped by spaces or hyphens.
  { re: /\b(?:\d[ -]?){12,15}\d\b/g, token: "[CARD]" },
  // Indian Aadhaar-style 12-digit IDs.
  { re: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, token: "[ID]" },
  // Bank account numbers: 9-18 consecutive digits.
  { re: /\b\d{9,18}\b/g, token: "[ACCOUNT]" },
  // Phone numbers, with or without +91 / 0 prefix.
  { re: /(?:\+91[ -]?|\b0)?[6-9]\d{9}\b/g, token: "[PHONE]" },
  // UPI handles.
  { re: /\b[\w.-]{2,}@(?:okhdfcbank|oksbi|okaxis|okicici|upi|paytm|ybl|ibl|axl)\b/gi, token: "[UPI]" },
  // Email addresses.
  { re: /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g, token: "[EMAIL]" },
  // Bare 4-8 digit OTP / PIN codes.
  { re: /\b\d{4,8}\b/g, token: "[OTP]" },
];

export function redact(input: string): string {
  let out = input;
  for (const { re, token } of RULES) {
    out = out.replace(re, token);
  }
  return out;
}

/** True when the text looks like it contains a real secret worth warning about. */
export function containsSensitiveDigits(input: string): boolean {
  return /\b\d{4,}\b/.test(input);
}
