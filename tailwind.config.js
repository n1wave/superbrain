/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          bordeaux: "#4C0302",
          orange: "#D35F18",
          sea: "#00668E",
          navy: "#003662",
          midnight: "#0A2138",
          turquoise: "#00C8DF",
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
