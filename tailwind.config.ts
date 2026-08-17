import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f9f9f9",
        surface: {
          DEFAULT: "#f9f9f9",
          bright: "#f9f9f9",
          dim: "#dadada",
          variant: "#e2e2e2",
          container: {
            DEFAULT: "#eeeeee",
            low: "#f3f3f4",
            high: "#e8e8e8",
            highest: "#e2e2e2",
            lowest: "#ffffff",
          },
        },
        "on-surface": "#1a1c1c",
        "on-surface-variant": "#464554",
        "on-background": "#1a1c1c",
        "inverse-surface": "#2f3131",
        "inverse-on-surface": "#f0f1f1",
        "outline-variant": "#c7c4d7",
        outline: "#777586",
        primary: {
          DEFAULT: "#4441cc",
          container: "#5e5ce6",
          foreground: "#ffffff",
          fixed: "#e2dfff",
          "fixed-dim": "#c2c1ff",
        },
        "on-primary": "#ffffff",
        "on-primary-container": "#f4f1ff",
        secondary: {
          DEFAULT: "#9026c3",
          container: "#cb66fe",
          fixed: "#f6d9ff",
          "fixed-dim": "#e9b3ff",
        },
        "on-secondary": "#ffffff",
        "on-secondary-container": "#4a006b",
        tertiary: {
          DEFAULT: "#0055a9",
          container: "#006dd6",
          fixed: "#d6e3ff",
          "fixed-dim": "#aac7ff",
        },
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#f0f3ff",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
      },
      fontFamily: {
        geist: ["Geist", "sans-serif"],
        sans: ["Geist", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "2rem",
        full: "9999px",
      },
      spacing: {
        "margin-desktop": "80px",
        "margin-mobile": "24px",
        gutter: "32px",
        unit: "8px",
        "container-max": "1440px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
