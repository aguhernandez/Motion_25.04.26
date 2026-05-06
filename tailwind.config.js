/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#fdda36',
          50: '#fffde7',
          100: '#fff9c4',
          200: '#fff59d',
          300: '#fff176',
          400: '#ffee58',
          500: '#fdda36',
          600: '#f9c900',
          700: '#f9a825',
          800: '#f57f17',
          900: '#e65100',
        },
        secondary: {
          DEFAULT: '#514163',
          50: '#f3f0f7',
          100: '#e4dded',
          200: '#c9bbdb',
          300: '#a892c0',
          400: '#8a6ea4',
          500: '#6f5289',
          600: '#5c4275',
          700: '#514163',
          800: '#3d3050',
          900: '#2a2038',
        },
      },
      fontFamily: {
        heading: ['"Krona One"', 'sans-serif'],
        body: ['Jost', 'sans-serif'],
        sans: ['Jost', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
