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
          black: '#020617',
          dark: '#0f172a',
          card: 'rgba(15, 23, 42, 0.65)',
          cyan: '#00f0ff',
          green: '#39ff14',
          purple: '#bd00ff',
          blue: '#0EA5E9',
          text: '#f8fafc',
          muted: '#94a3b8',
          border: 'rgba(51, 65, 85, 0.5)',
          'border-neon': 'rgba(0, 240, 255, 0.3)',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'grid-slide': 'grid-slide 30s linear infinite',
      },
      keyframes: {
        'grid-slide': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(80px)' },
        }
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(0, 240, 255, 0.25)',
        'green-glow': '0 0 15px rgba(57, 255, 20, 0.25)',
        'purple-glow': '0 0 15px rgba(189, 0, 255, 0.25)',
        'cyan-glow-lg': '0 0 30px rgba(0, 240, 255, 0.45)',
        'green-glow-lg': '0 0 30px rgba(57, 255, 20, 0.45)',
      }
    },
  },
  plugins: [],
}
