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
        navy: '#021D44',
        royal: '#0052FA',
        'royal-m': '#0E5DFC',
        steel: '#4573A7',
        ice: '#EDEDED',
        mint: '#00DEB2',
        paper: '#FFFFFF',
        ink: '#052049',
        label: '#1C355E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'mazotech': '20px',
      },
    },
  },
  plugins: [],
};