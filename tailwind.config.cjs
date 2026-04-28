module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: 'rgba(16, 19, 30, 0.8)',
        neon: '#00f5d4',
        cyber: '#7c3aed',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0,245,212,0.25)',
      },
    },
  },
  plugins: [],
};
