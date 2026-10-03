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
        cf: {
          orange: '#f38020',
          'orange-hover': '#e55b00',
          'orange-light': '#fff4ec',
          'orange-dark': '#3a1f0a',
          blue: '#0051c3',
          'blue-light': '#ebf3ff',
          gray: '#6b7280',
          border: '#e5e7eb',
          'dark-bg': '#101216',
          'dark-card': '#191c22',
          'dark-border': '#282b34',
        },
      },
    },
  },
  plugins: [],
}
