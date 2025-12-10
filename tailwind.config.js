/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <--- 這行最重要，沒寫它就不會掃描你的程式碼
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}