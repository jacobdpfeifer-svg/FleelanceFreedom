import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          olive: "#5D5949",
          taupe: "#C7C1B4",
          cream: "#E5E1CD",
          ivory: "#F1E9E0",
        },
        brand: {
          DEFAULT: "#5D5949",
          dark: "#484438",
          light: "#C7C1B4",
        },
      },
    },
  },
  plugins: [],
};

export default config;
