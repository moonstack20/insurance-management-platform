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
    },
  },
  plugins: [],
};
