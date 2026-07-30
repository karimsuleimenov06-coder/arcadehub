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
        neon: {
          blue: '#00f3ff',
          purple: '#9b59b6',
          pink: '#ff2d95',
          green: '#00ff88',
          yellow: '#ffdd00',
          red: '#ff3355',
        },
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0, 243, 255, 0.5), 0 0 40px rgba(0, 243, 255, 0.2)',
        'neon-purple': '0 0 20px rgba(155, 89, 182, 0.5), 0 0 40px rgba(155, 89, 182, 0.2)',
        'neon-pink': '0 0 20px rgba(255, 45, 149, 0.5), 0 0 40px rgba(255, 45, 149, 0.2)',
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.5), 0 0 40px rgba(0, 255, 136, 0.2)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 243, 255, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 243, 255, 0.7), 0 0 60px rgba(0, 243, 255, 0.3)' },
        },
      },
    },
  },
  plugins: [],
}