/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0EA5E9',
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#22C55E',
      },
    },
  },
  plugins: [],
}
