/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk color palette
        'cyber-pink': '#ff0080',
        'cyber-blue': '#00ffff',
        'cyber-purple': '#8000ff',
        'cyber-green': '#00ff41',
        'cyber-yellow': '#ffff00',
        'cyber-dark': '#0a0a0a',
        'cyber-gray': '#1a1a1a',
        'cyber-light': '#f0f0f0',
      },
      fontFamily: {
        'cyber': ['Orbitron', 'monospace'],
        'mono': ['Fira Code', 'monospace'],
      },
      animation: {
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite alternate',
        'glitch': 'glitch 0.3s ease-in-out infinite',
        'cyber-glow': 'cyber-glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        'neon-pulse': {
          '0%': { 
            textShadow: '0 0 5px #ff0080, 0 0 10px #ff0080, 0 0 15px #ff0080',
            boxShadow: '0 0 5px #ff0080'
          },
          '100%': { 
            textShadow: '0 0 10px #ff0080, 0 0 20px #ff0080, 0 0 30px #ff0080',
            boxShadow: '0 0 10px #ff0080, 0 0 20px #ff0080'
          }
        },
        'glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' }
        },
        'cyber-glow': {
          '0%': { 
            boxShadow: '0 0 5px #00ffff, inset 0 0 5px #00ffff'
          },
          '100%': { 
            boxShadow: '0 0 20px #00ffff, inset 0 0 10px #00ffff'
          }
        }
      },
      backdropBlur: {
        'cyber': '10px',
      }
    },
  },
  plugins: [],
}