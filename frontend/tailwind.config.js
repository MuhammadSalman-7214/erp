/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#f0fdfa", // very light cyan-teal
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6", // base teal
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a", // darkest teal
          950: "#042f2e", // near-black teal
        },
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      // Add custom keyframes and animations here
      keyframes: {
        breath: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.03)" },
        },
        fadeInUp: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        drawerIn: {
          "0%": { opacity: "0", transform: "translateX(26px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        glow: {
          "0%, 100%": {
            textShadow: "0 0 5px #6d1010, 0 0 10px #6d1010, 0 0 15px #6d1010",
          },
          "50%": {
            textShadow: "0 0 10px #8a2f2f, 0 0 20px #8a2f2f, 0 0 30px #8a2f2f",
          },
        },
      },
      animation: {
        "breath-slow": "breath 2s ease-in-out infinite",
        "glow-slow": "glow 2s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.5s ease-out both",
        "drawer-in": "drawerIn 0.26s ease-out both",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"], // Enables both themes
  },
};
