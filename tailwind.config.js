/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette de marque : navy profond (structure), bleu (action), ambre (attention/alerte)
        navy: {
          950: "#0F1F3D",
          900: "#14264A",
          800: "#1F3864",
          700: "#2E5395",
        },
        brand: {
          50: "#EEF2FB",
          100: "#D9E2F3",
          500: "#2E5395",
          600: "#1F3864",
        },
        amber: {
          500: "#BF9000",
        },
        success: "#1E7B34",
        danger: "#C00000",
        warning: "#C55A11",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 31, 61, 0.06), 0 1px 3px 0 rgba(15, 31, 61, 0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};
