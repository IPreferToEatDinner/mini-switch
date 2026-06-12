/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          '"SF Mono"',
          '"Fira Code"',
          '"Fira Mono"',
          "ui-monospace",
          "monospace",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        bg: "#0d1117",
        "bg-secondary": "#161b22",
        border: "#30363d",
        muted: "#8b949e",
        accent: "#58a6ff",
      },
    },
  },
  plugins: [],
};
