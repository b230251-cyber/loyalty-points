/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#bfa094',
          600: '#a18072',
          700: '#846358',
          800: '#63483e',
          900: '#43281c',
          950: '#2b1810',
        },
        bronze: {
          DEFAULT: '#CD7F32',
          light: '#df9f64',
          dark: '#8C4B14',
        },
        silver: {
          DEFAULT: '#C0C0C0',
          light: '#E8E8E8',
          dark: '#7A8B99',
        },
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFE55C',
          dark: '#B8860B',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 20px -3px rgba(255, 215, 0, 0.4)',
        'glow-silver': '0 0 20px -3px rgba(192, 192, 192, 0.4)',
        'glow-bronze': '0 0 20px -3px rgba(205, 127, 50, 0.4)',
      }
    },
  },
  plugins: [],
}
