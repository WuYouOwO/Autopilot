/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        brand: {
          blue: '#0051c3',
          'blue-hover': '#003e98',
          'blue-light': '#eff6ff',
          sky: '#0284c7',
          'sky-light': '#f0f9ff',
          green: '#059669',
          'green-light': '#ecfdf5',
        },
        focus: {
          red: '#ef4444',
          'red-dark': '#dc2626',
          'red-light': '#fef2f2',
          orange: '#f97316',
          'orange-dark': '#ea580c',
          'orange-light': '#fff7ed',
          amber: '#f59e0b',
          'amber-light': '#fffbeb',
        },
        dash: {
          'light-bg': '#f8fafc',
          'light-card': '#ffffff',
          'light-border': '#e2e8f0',
          'dark-bg': '#0f172a',
          'dark-card': '#1e293b',
          'dark-border': '#334155',
        },
      },
    },
  },
  plugins: [],
}
