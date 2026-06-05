import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#0A0F0D",
        card: "#111A16",
        raised: "#1A2820",
        border: "#1E3028",
        "text-primary": "#C8E8DF",
        "text-muted": "#4A6E60",
        accent: "#2EB896",
        "accent-press": "#1A7A5E",
        warn: "#C87A50",
        "warn-press": "#8B4A28",
        danger: "#C85050",
        success: "#2EB896",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-1)",
        lift: "var(--shadow-2)",
        lip: "var(--shadow-lip)",
        "lip-press": "var(--shadow-lip-press)",
      },
      transitionTimingFunction: {
        bounce: "var(--ease-bounce)",
        smooth: "var(--ease-out)",
      },
      keyframes: {
        stampIn: {
          "0%":   { opacity: "0", transform: "scale(.85)" },
          "70%":  { transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        popIn: {
          "0%":   { opacity: "0", transform: "scale(.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scanSweep: {
          "0%":   { backgroundPosition: "0% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fillPulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: ".55" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "stamp-in":  "stampIn var(--dur-celebrate) var(--ease-bounce) both",
        "pop-in":    "popIn var(--dur-fast) var(--ease-out) both",
        "slide-up":  "slideUp var(--dur-base) var(--ease-out) both",
        "scan-sweep":"scanSweep var(--dur-slow) linear infinite",
        "fill-pulse":"fillPulse var(--dur-slow) ease-in-out infinite",
        shimmer:     "shimmer var(--dur-slow) linear infinite",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
