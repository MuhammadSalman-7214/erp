/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        mobileL: "425px",
        tab: "768px",
        laptop: "1024px",
        laptopL: "1440px",
        laptop4k: "2560px",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"], // Enables both themes
  },
};
