/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        accent: "#10B981",
        background: "#0F172A",
        card: "#1E293B",
      }
    },
  },
  plugins: [],
}
