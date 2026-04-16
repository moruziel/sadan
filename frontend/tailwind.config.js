/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      colors: {
        demo: {
          bg:       '#0c1117',
          surface:  '#111827',
          card:     '#1f2937',
          border:   '#374151',
          gold:     '#c6953b',
          'gold-light': '#d4a84b',
          panel:    '#ffffff',
          success:  '#22c55e',
          danger:   '#ef4444',
          warning:  '#f59e0b',
          info:     '#3b82f6',
        },
      },
    },
  },
  plugins: [],
}
