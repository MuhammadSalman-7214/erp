/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Add custom keyframes and animations here
      keyframes: {
        breath: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.03)" },
        },
        glow: {
          "0%, 100%": {
            textShadow: "0 0 5px #00bfa5, 0 0 10px #00bfa5, 0 0 15px #00bfa5",
          },
          "50%": {
            textShadow: "0 0 10px #00fff0, 0 0 20px #00fff0, 0 0 30px #00fff0",
          },
        },
      },
      animation: {
        "breath-slow": "breath 2s ease-in-out infinite",
        "glow-slow": "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"], // Enables both themes
  },
};
