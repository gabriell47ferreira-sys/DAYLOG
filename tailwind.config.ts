import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080A0B",
        graphite: "#121619",
        surface: "#191E22",
        "surface-subtle": "#161B1F",
        "surface-hover": "#21272D",
        accent: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          subtle: "rgba(245, 158, 11, 0.12)",
          glow: "rgba(245, 158, 11, 0.25)"
        },
        primary: {
          DEFAULT: "#F5F5F5",
          foreground: "#080A0B",
        },
        secondary: {
          DEFAULT: "#92999F",
          foreground: "#F5F5F5",
        },
        border: {
          DEFAULT: "#262C31",
          subtle: "#1F2428",
        },
        muted: {
          DEFAULT: "#191E22",
          foreground: "#92999F",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#F5F5F5",
        },
        success: {
          DEFAULT: "#10B981",
          foreground: "#F5F5F5",
        }
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      animation: {
        "pulse-record": "pulse-record 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ripple": "ripple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
      },
      keyframes: {
        "pulse-record": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.05)" },
        },
        "ripple": {
          "0%": { transform: "scale(0.95)", opacity: "0.8" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
