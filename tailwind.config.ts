import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12082B",
        base: "#1B0E49",
        raised: "#261364",
        edge: "#3A2088",
        lime: "#BFFF3C",
        limeDim: "#8FCC1F",
        amber: "#FFC53D",
        danger: "#FF4D6D",
        muted: "#B9AEE8",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
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
