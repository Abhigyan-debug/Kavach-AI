import type { CheckResult, Lang } from "./schema";

/**
 * Keyword-and-pattern verdict used when the model call fails or times out.
 *
 * Deliberately crude: its job is to keep the demo honest and useful, not to
 * match the model. Two design notes:
 *
 *  - Patterns cover both English and Devanagari, because English-only regexes
 *    silently score every Hindi scam as SAFE - the worst possible failure.
 *  - COUNTER_SIGNALS carry negative weight. A real bank SMS says "do not share
 *    this OTP", which contains every keyword a scam does; without a counter
 *    signal the fallback flags genuine bank messages and teaches distrust of
 *    the wrong things.
 */

type Tactic = CheckResult["tactics"][number];
type Reason = Record<Lang, string>;
type Signal = { re: RegExp; weight: number; tactic: Tactic; reason: Reason };

const SIGNALS: Signal[] = [
  {
    // The lookarounds stop this matching our own redaction placeholders:
    // redact() turns "Rs 3000" into "[OTP]", which must not read as a scam signal.
    re: /(?<!\[)\b(otp|one[- ]time password|verification code|cvv|pin)\b(?!\])|\b\d\s*[- ]?digit code\b|code (you |just )?received|ओटीपी|सीवीवी|पिन\b/i,
    weight: 35,
    tactic: "Dishonesty",
    reason: {
      en: "Asks for an OTP, PIN or CVV",
      hi: "OTP, PIN या CVV माँगता है",
    },
  },
  {
    // Allows words between the verb and the noun ("tell me the 6 digit code").
    re: /\b(tell|share|send|give)\b[^.]{0,24}?(?<!\[)\b(otp|code|pin|password)\b(?!\])|साझा कर|बता(एं|इए|ना)/i,
    weight: 30,
    tactic: "Dishonesty",
    reason: {
      en: "Asks you to hand over a secret code",
      hi: "गुप्त कोड बताने को कहता है",
    },
  },
  {
    re: /\b(block(ed|ing)?|suspend(ed)?|deactivat(e|ed)|disconnect(ed|ion)?|freeze|expire[sd]?)\b|बंद (हो|कर)|कट जाएगा|समाप्त हो/i,
    weight: 25,
    tactic: "Fear",
    reason: {
      en: "Threatens to block or cut off your account or service",
      hi: "खाता या सेवा बंद करने की धमकी देता है",
    },
  },
  {
    re: /\b(urgent(ly)?|immediately|within \d+ (hour|minute)|last warning|right now|hurry|today only)\b|तुरंत|अभी|घंटे में|आज ही|जल्दी/i,
    weight: 20,
    tactic: "Time pressure",
    reason: {
      en: "Pushes you to act immediately",
      hi: "तुरंत कार्रवाई करने का दबाव डालता है",
    },
  },
  {
    re: /\b(kyc|re[- ]?verify|update your (details|account)|aadhaar|pan card)\b|केवाईसी|आधार/i,
    weight: 22,
    tactic: "Authority",
    reason: {
      en: "Demands KYC or document re-verification",
      hi: "KYC या दस्तावेज़ सत्यापन की माँग करता है",
    },
  },
  {
    re: /\b(won|winner|lottery|prize|lucky draw|cashback|reward)\b|इनाम|जीता|लॉटरी|बधाई हो|पुरस्कार/i,
    weight: 30,
    tactic: "Need and Greed",
    reason: {
      en: "Promises a prize you never entered for",
      hi: "ऐसा इनाम बताता है जिसके लिए आपने आवेदन नहीं किया",
    },
  },
  {
    re: /\b(processing fee|clearance (fee|charge)|refundable.*fee|pending (fee|charge))\b|प्रोसेसिंग शुल्क|शुल्क.*(भेज|भुगतान)|बकाया शुल्क/i,
    weight: 30,
    tactic: "Dishonesty",
    reason: {
      en: "Demands a fee before you get anything",
      hi: "कुछ मिलने से पहले ही शुल्क माँगता है",
    },
  },
  {
    re: /\b(bit\.ly|tinyurl|t\.co|rb\.gy|cutt\.ly|is\.gd|shorturl)\b/i,
    weight: 30,
    tactic: "Distraction",
    reason: {
      en: "Uses a shortened link that hides where it really goes",
      hi: "छोटा किया गया लिंक असली पता छिपाता है",
    },
  },
  {
    re: /\b(customs|parcel|courier|delivery|shipment)\b|पार्सल|कूरियर|डिलीवरी/i,
    weight: 18,
    tactic: "Dishonesty",
    reason: {
      en: "Claims a parcel needs money before delivery",
      hi: "पार्सल के लिए पहले पैसे माँगता है",
    },
  },
  {
    re: /\b(police|cbi|income tax|court|arrest|legal action|fir|inspector)\b|पुलिस|गिरफ़्तार|मामला दर्ज|अदालत/i,
    weight: 30,
    tactic: "Authority",
    reason: {
      en: "Pretends to be police or a government officer",
      hi: "पुलिस या सरकारी अधिकारी होने का दिखावा करता है",
    },
  },
  {
    re: /\b(do not tell|don'?t tell|keep (this|it) secret|do not (inform|disconnect))\b|किसी को न बताएं|गुप्त रखें|न बताना/i,
    weight: 25,
    tactic: "Distraction",
    reason: {
      en: "Tells you to keep it secret from your family",
      hi: "परिवार से छिपाने को कहता है",
    },
  },
  {
    re: /\b(our officer|our executive|our agent|verification account)\b|हमारे अधिकारी|हमारे कर्मचारी/i,
    weight: 20,
    tactic: "Authority",
    reason: {
      en: "Points you to their own 'officer' instead of an official number",
      hi: "आधिकारिक नंबर के बजाय अपने 'अधिकारी' के पास भेजता है",
    },
  },
  {
    re: /\b(pre[- ]?approved|0% interest|zero interest|limited time offer|work from home|earn rs)\b|पहले से स्वीकृत|शून्य ब्याज|घर बैठे कमा/i,
    weight: 28,
    tactic: "Need and Greed",
    reason: {
      en: "Offers easy money or a loan you never asked for",
      hi: "बिना माँगे आसान पैसा या लोन देने का वादा करता है",
    },
  },
  {
    re: /\b(unusual login|suspicious (login|activity)|verify here|verify your account|was not you)\b|असामान्य लॉगिन|सत्यापित करें/i,
    weight: 28,
    tactic: "Fear",
    reason: {
      en: "Uses a scary account warning to make you click",
      hi: "डराने वाली चेतावनी देकर क्लिक कराता है",
    },
  },
  {
    re: /\b(send|transfer|pay)\b[^.]{0,40}\b(to this|to the)\b[^.]{0,20}\b(upi|account|number)\b|इस (यूपीआई|खाते) में भेज/i,
    weight: 25,
    tactic: "Need and Greed",
    reason: {
      en: "Asks you to send money to an account you do not know",
      hi: "अनजान खाते में पैसे भेजने को कहता है",
    },
  },
  {
    re: /\b(click|tap) (here|this link|below)\b|लिंक पर (जाकर|क्लिक)|क्लिक करें/i,
    weight: 15,
    tactic: "Distraction",
    reason: {
      en: "Pushes you to click a link",
      hi: "लिंक पर क्लिक करने को कहता है",
    },
  },
];

/**
 * Phrases a genuine institution uses and a scammer almost never does. These
 * pull the score back down so real bank advisories are not flagged.
 */
const COUNTER_SIGNALS: { re: RegExp; weight: number }[] = [
  {
    re: /\b(do not|don'?t|never) share\b|किसी को न बताएं|साझा न करें/i,
    weight: -40,
  },
  {
    re: /\bno action is (needed|required)\b|call the number (printed )?on your card|कोई कार्रवाई आवश्यक नहीं/i,
    weight: -30,
  },
];

const DO_NOW: Record<Lang, string[]> = {
  en: [
    "Do not click any link in the message",
    "Never share your OTP, PIN or CVV with anyone",
    "Call your bank on the number printed on your card",
    "Report it on cybercrime.gov.in or call 1930",
  ],
  hi: [
    "संदेश में दिए किसी भी लिंक पर क्लिक न करें",
    "अपना OTP, PIN या CVV किसी को न बताएं",
    "अपने कार्ड पर छपे नंबर पर ही बैंक को कॉल करें",
    "cybercrime.gov.in पर या 1930 पर शिकायत करें",
  ],
};

const SAFE_REASON: Record<Lang, string> = {
  en: "No common scam signals found, but stay careful",
  hi: "कोई सामान्य धोखाधड़ी संकेत नहीं मिला, फिर भी सावधान रहें",
};

export function rulesVerdict(text: string, lang: Lang = "en"): CheckResult {
  const hits = SIGNALS.filter((s) => s.re.test(text));
  const positive = hits.reduce((sum, h) => sum + h.weight, 0);
  const negative = COUNTER_SIGNALS.filter((c) => c.re.test(text)).reduce(
    (sum, c) => sum + c.weight,
    0,
  );

  const score = Math.max(0, Math.min(100, positive + negative));

  const verdict: CheckResult["verdict"] =
    score >= 60 ? "SCAM" : score >= 25 ? "SUSPICIOUS" : "SAFE";

  // Highest-weight signals first, so the three reasons shown are the strongest.
  const ranked = [...hits].sort((a, b) => b.weight - a.weight);
  const tactics = [...new Set(ranked.map((h) => h.tactic))].slice(0, 4) as Tactic[];
  const reasons = verdict === "SAFE" ? [] : ranked.slice(0, 3).map((h) => h.reason[lang]);

  return {
    verdict,
    risk_score: score,
    tactics: verdict === "SAFE" ? [] : tactics,
    reasons: reasons.length ? reasons : [SAFE_REASON[lang]],
    do_now: verdict === "SAFE" ? DO_NOW[lang].slice(1, 3) : DO_NOW[lang].slice(0, 4),
    family_alert_recommended: verdict === "SCAM" || score >= 45,
  };
}
