import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Robotics palette: graphite steel structure, lime as the "power on" signal.
        ink: "#05080D",
        base: "#0A1018",
        raised: "#111A26",
        edge: "#22324A",
        lime: "#BFFF3C",
        limeDim: "#8FCC1F",
        amber: "#FFC53D",
        danger: "#FF4D6D",
        muted: "#9DB0C8",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        // Labels and readouts only - never body text.
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Accessibility floor: body never below 18px (blueprint NFR).
        base: ["1.125rem", { lineHeight: "1.65" }],
        lg: ["1.25rem", { lineHeight: "1.6" }],
        xl: ["1.5rem", { lineHeight: "1.45" }],
      },
      borderRadius: { pill: "999px" },
      boxShadow: {
        glow: "0 0 0 1px rgba(191,255,60,0.35), 0 8px 40px -12px rgba(191,255,60,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
