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

        // ── P5 PR-A/B/C: v3 类别名（一周期弃用窗口）──
        // 旧 v3 鱼缸蓝色阶 → v4 accent 阶
        water: {
          50:  'rgba(125,211,252,0.08)',   // → accent/5
          300: 'rgba(125,211,252,0.40)',   // → accent/40
          400: 'rgba(125,211,252,0.65)',   // → accent/65
          500: 'rgba(125,211,252,0.85)',   // → accent/85
          600: '#7dd3fc',                  // → accent
          700: '#5fa9d3',                  // → accent-dim（按需）
          900: '#0f2a3d',                  // → card
        },
        sand: {
          400: 'rgba(253,230,138,0.65)',   // → accent-gold/65
          500: '#fde68a',                  // → accent-gold
        },
        coral: {
          500: '#fb923c',                  // → accent-orange
        },
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
  plugins: [
  // P5 PR-B/C：v3 组件类别名（一周期弃用窗口）
  // —— 所有 v3 .card / .btn-* / .badge-* 都映射到 v4 token
  // —— 老代码继续能渲染（不破坏视觉），新代码用 v4 组件
  // —— 后续 P5+ 后会移除此 plugin
  ({ addComponents }) => {
    addComponents({
      // === .card 别名 → GlassCard 视觉 ===
      '.card': {
        background: 'rgba(255,255,255,0.04)',
        'border-radius': '1rem',
        padding: '1rem',
        border: '1px solid rgba(255,255,255,0.06)',
      },
      '.card:hover': {
        'border-color': 'rgba(255,255,255,0.12)',
      },

      // === .label 别名 → Tag 视觉 ===
      '.label': {
        display: 'inline-block',
        padding: '0.125rem 0.5rem',
        'border-radius': '0.375rem',
        'font-size': '0.75rem',
      },

      // === .btn-* 别名 → Button 组件视觉 ===
      '.btn-primary': {
        background: '#7dd3fc',
        color: '#0a1f2e',
        padding: '0.5rem 1rem',
        'border-radius': '0.5rem',
        'font-weight': '500',
      },
      '.btn-secondary': {
        background: 'rgba(255,255,255,0.06)',
        color: '#e0f2fe',
        padding: '0.5rem 1rem',
        'border-radius': '0.5rem',
        'border': '1px solid rgba(255,255,255,0.10)',
      },

      // === .badge-* 别名 → Tag 组件视觉 ===
      '.badge-ideal': {
        background: 'rgba(74,222,128,0.15)',
        color: '#4ade80',
        padding: '0.125rem 0.5rem',
        'border-radius': '0.375rem',
        'font-size': '0.75rem',
      },
      '.badge-ok': {
        background: 'rgba(251,191,36,0.15)',
        color: '#fbbf24',
        padding: '0.125rem 0.5rem',
        'border-radius': '0.375rem',
        'font-size': '0.75rem',
      },
      '.badge-poor': {
        background: 'rgba(251,146,60,0.15)',
        color: '#fb923c',
        padding: '0.125rem 0.5rem',
        'border-radius': '0.375rem',
        'font-size': '0.75rem',
      },
    });
  },
],
};
