/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#e2f0d9',
          brown: '#8B4513',
          lightblue: '#87CEEB',
          pink: '#DA70D6',
          orange: '#FF8C00',
          red: '#DC143C',
          yellow: '#FFD700',
          green: '#228B22',
          darkblue: '#00008B',
          railway: '#4A5568',
          utility: '#ECC94B',
          chance: '#ED8936',
          community: '#3182CE'
        },
        india: {
          saffron: '#FF9933',
          white: '#FFFFFF',
          green: '#138808',
          navy: '#000080',
          gold: '#D4AF37'
        }
      },
      animation: {
        'bounce-short': 'bounce 0.5s ease-in-out 2',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
