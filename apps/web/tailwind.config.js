/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#151923',
        warmWhite: '#F7F8F5',
        lime: '#C7F36B',
        graphBlue: '#526BEE',
        mutedGray: '#8B929E',
        borderGray: '#E4E7E1',
        halo: '#EDF0F7',
        amber: {
          brand: '#F5A623',
        },
        red: {
          brand: '#E5484D',
        },
        scoutBlue: '#7CC7FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
