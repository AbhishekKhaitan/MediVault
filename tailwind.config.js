/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Dark theme palette
        bg:      '#0A0B14',
        surface: '#111320',
        card:    '#181929',
        overlay: '#1E2035',
        border:  '#232538',
        // Accent
        accent:  '#818CF8',
        // Semantic
        danger:  '#F87171',
        warning: '#FBBF24',
        success: '#34D399',
        cyan:    '#22D3EE',
        // Text
        'text-primary': '#F1F1F9',
        'text-sub':     '#888899',
        'text-mute':    '#44455A',
      },
    },
  },
  plugins: [],
}
