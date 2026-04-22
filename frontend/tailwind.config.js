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
      animation: {
        'fade-up':   'fadeUp 0.3s ease-out both',
        'fade-in':   'fadeIn 0.25s ease-out both',
        'slide-in':  'slideIn 0.3s ease-out both',
        'stagger-1': 'fadeUp 0.3s 0.05s ease-out both',
        'stagger-2': 'fadeUp 0.3s 0.10s ease-out both',
        'stagger-3': 'fadeUp 0.3s 0.15s ease-out both',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
