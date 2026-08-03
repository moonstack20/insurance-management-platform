/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#F8FFFC",
          100: "#D8F3DC",
          500: "#2D6A4F",
          700: "#1B4332",
          900: "#12291F",
        },
        teal: {
          400: "#40916C",
          500: "#2D6A4F",
        },
        amber: {
          400: "#E9C46A",
        },
        mint: {
          400: "#95D5B2",
          100: "#D8F3DC",
        },
      },
      keyframes: {
        fadein: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideup: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadein: "fadein 0.6s ease-out",
        slideup: "slideup 0.5s ease-out",
      },
    },
  },
  plugins: [],
};
