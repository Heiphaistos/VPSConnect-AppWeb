import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#060a12',
          900: '#0d1117',
          800: '#161b24',
          700: '#1e2533',
          600: '#27303f',
          500: '#3a4357',
        },
        border: '#1e2d40',
        cyan: {
          400: '#22d9f0',
          500: '#06b6d4',
          600: '#0891b2',
        },
        mint: '#00e898',
        crimson: '#ff3a5c',
        amber: '#ffb800',
        muted: '#4a5568',
        'text-primary': '#e2e8f0',
        'text-secondary': '#8892a4',
        'text-dim': '#4a5568',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      animation: {
        pulse2: 'pulse2 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.35s ease forwards',
        scanline: 'scanline 8s linear infinite',
      },
      keyframes: {
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scanline: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)',
        'glow-cyan': 'radial-gradient(ellipse at center, rgba(6,182,212,0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(6,182,212,0.25)',
        'glow-mint': '0 0 20px rgba(0,232,152,0.25)',
        'glow-red': '0 0 20px rgba(255,58,92,0.25)',
        card: '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(30,45,64,0.8)',
      },
    },
  },
  plugins: [],
}

export default config
