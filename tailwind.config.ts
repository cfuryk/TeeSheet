/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: '#093b60',
        'brand-hover': '#072e4c',
        danger: '#d02030',
        'danger-hover': '#a81926',
        'card-bg': '#eeeeee',
        'card-border': '#dedfe1',
        'btn-secondary': '#D7DCE0',
        'btn-secondary-hover': '#c8cdd2',
        muted: '#6B7280',
      },
    },
  },
  plugins: [],
}
