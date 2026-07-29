import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060914",
          900: "#0A0F1F",
          850: "#0D1427",
          800: "#111A30"
        },
        iris: {
          300: "#A7A5FF",
          400: "#8582FF",
          500: "#6964F5",
          600: "#554EE8"
        },
        credential: "#D4B56A"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.28)",
        soft: "0 16px 50px rgba(15, 23, 42, 0.08)"
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)"
      },
      fontFamily: {
        sans: [
          "\"Vazirmatn Variable\"",
          "Vazirmatn",
          "Tahoma",
          "sans-serif"
        ],
        latin: [
          "\"Inter Variable\"",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
