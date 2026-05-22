import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'forge-black': '#0a0a0b',
        stone: '#1c1b19',
        iron: '#2e2d2a',
        'iron-light': '#3a3833',
        bronze: '#8b6f3f',
        'bronze-dark': '#5a4827',
        blood: '#8b0000',
        ember: '#c9410b',
        bone: '#e8e2d5',
        ash: '#8a8680',
        'ash-dark': '#5a5852',
        gold: '#c9a24b',
        marcus: '#6b8a8a',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
