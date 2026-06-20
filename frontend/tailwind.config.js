/** @type {import('tailwindcss').Config} */
// YoYu v4 Design System — Deep Sea + Liquid Glass
// Source: architecture v3 (Tomas, 2026-06-20)
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        deep: '#0a1f2e',
        card: '#0f2a3d',
        // Glass
        glass: 'rgba(255,255,255,0.08)',
        'glass-border': 'rgba(255,255,255,0.15)',
        // Brand
        'brand-primary': '#7dd3fc',
        'brand-accent': '#38bdf8',
        // Accents
        accent: '#7dd3fc',
        'accent-aux': '#38bdf8',
        'accent-orange': '#fb923c',
        'accent-gold': '#fde68a',
        // Text
        'text-primary': '#e0f2fe',
        'text-secondary': '#94a3b8',
        // States
        warning: '#fbbf24',
        success: '#4ade80',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'Inter',
          '"PingFang SC"',
          '"Noto Sans SC"',
          '"Noto Sans JP"',
          'system-ui',
          'sans-serif',
        ],
      },
      fontWeight: {
        light: '300',
        regular: '400',
      },
      backgroundImage: {
        'deep-sea': 'radial-gradient(ellipse at top, #0f2a3d, #0a1f2e 70%)',
        'deep-sea-soft': 'linear-gradient(180deg, #0f2a3d 0%, #0a1f2e 100%)',
      },
      boxShadow: {
        'glow-accent': '0 0 6px rgba(125,211,252,0.5)',
        'glow-success': '0 0 8px rgba(74,222,128,0.5)',
        'glow-orange': '0 0 8px rgba(251,146,60,0.5)',
        'glow-gold': '0 0 8px rgba(253,230,138,0.5)',
      },
      animation: {
        swim: 'swim 10s ease-in-out infinite',
        'swim-fast': 'swim 6s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        bubble: 'bubble 6s linear infinite',
      },
      keyframes: {
        swim: {
          '0%, 100%': { transform: 'translateX(0) translateY(0) rotate(-2deg)' },
          '25%': { transform: 'translateX(15px) translateY(-8px) rotate(1deg)' },
          '50%': { transform: 'translateX(8px) translateY(-12px) rotate(-1deg)' },
          '75%': { transform: 'translateX(-5px) translateY(-6px) rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        bubble: {
          '0%': { transform: 'translateY(0) scale(0.5)', opacity: '0.7' },
          '100%': { transform: 'translateY(-150px) scale(1)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
