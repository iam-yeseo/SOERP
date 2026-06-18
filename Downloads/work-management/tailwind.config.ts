import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 딥그린 포인트 컬러
        brand: {
          50: "#eef6f2",
          100: "#d8ebe2",
          200: "#b3d7c7",
          300: "#86bda6",
          400: "#569e83",
          500: "#358066",
          600: "#1f6650",
          700: "#1a5343",
          800: "#174337",
          900: "#13372e",
        },
        surface: "#f6f7f8",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 20, 0.04), 0 2px 8px rgba(16, 24, 20, 0.06)",
        cardHover: "0 2px 4px rgba(16, 24, 20, 0.06), 0 6px 16px rgba(16, 24, 20, 0.10)",
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
