/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef2f7",
          100: "#d7e0ec",
          500: "#2c4a6e",
          700: "#1c3350",
          900: "#101f33",
        },
        teal: {
          400: "#3fb6a8",
          500: "#2b9c8f",
        },
        amber: {
          400: "#e8a838",
        },
      },
    },
  },
  plugins: [],
};
