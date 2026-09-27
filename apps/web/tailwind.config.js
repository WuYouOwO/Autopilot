/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#070a0f',
          900: '#0b111e',
          800: '#111c30',
          700: '#1b2b48',
          600: '#263d66',
          cyan: '#00f2fe',
          blue: '#4facfe',
          ice: '#38bdf8',
          accent: '#06b6d4',
          danger: '#f43f5e',
          warning: '#f59e0b',
          success: '#10b981'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
