/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#f9f0f0",
          100: "#f3e0e0",
          200: "#e8c1c1",
          300: "#d79a9a",
          400: "#bf6a6a",
          500: "#8a2f2f",
          600: "#6d1010",
          700: "#4d0000",
          800: "#3b0000",
          900: "#2a0000",
          950: "#160000",
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
