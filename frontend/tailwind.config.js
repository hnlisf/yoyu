/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        water: {
          50: '#EAF6FA',
          100: '#CFEAF2',
          200: '#A9D7E6',
          300: '#7FC0D5',
          400: '#5BA9C7',  // primary
          500: '#3F8DAD',
          600: '#2F6F8A',
        },
        sand: {
          50: '#FBF6EC',
          100: '#F4E4C1',  // secondary
          200: '#EAD09A',
        },
        coral: {
          400: '#FFA078',
          500: '#FF7F50',  // accent
          600: '#E45F30',
        },
      },
      fontFamily: {
        zh: ['"Source Han Sans CN"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        en: ['Inter', 'system-ui', 'sans-serif'],
        ja: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'water-gradient': 'linear-gradient(180deg, #EAF6FA 0%, #CFEAF2 50%, #A9D7E6 100%)',
        'fishbowl': 'radial-gradient(ellipse at center top, rgba(255,255,255,0.5) 0%, rgba(91,169,199,0.4) 70%, rgba(63,141,173,0.6) 100%)',
      },
      animation: {
        swim: 'swim 8s ease-in-out infinite',
        'swim-slow': 'swim 14s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        bubble: 'bubble 6s linear infinite',
      },
      keyframes: {
        swim: {
          '0%, 100%': { transform: 'translateX(0) translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateX(20px) translateY(-15px) rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        bubble: {
          '0%': { transform: 'translateY(0) scale(0.5)', opacity: '0.7' },
          '100%': { transform: 'translateY(-200px) scale(1)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
