/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        aicte: {
          blue: '#1e3a8a',
          gold: '#f59e0b',
          dark: '#0f172a',
        }
      },
      // Tailwind 3 has no xs / 2xs shadows; the pages already use these class names.
      boxShadow: {
        '2xs': '0 1px 0 0 rgb(15 23 42 / 0.04)',
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.06)',
        card: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(14deg)' },
          '30%': { transform: 'rotate(-12deg)' },
          '45%': { transform: 'rotate(8deg)' },
          '60%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(0deg)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.35s ease-out both',
        fade: 'fade 0.2s ease-out both',
        float: 'float 6s ease-in-out infinite',
        floatSlow: 'float 8s ease-in-out infinite',
        pulseRing: 'pulseRing 2s ease-out infinite',
        wiggle: 'wiggle 1.4s ease-in-out infinite',
        toastIn: 'toastIn 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
