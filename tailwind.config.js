/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        safe: 'var(--color-safe)',
        dark: 'var(--color-dark)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
      },
    },
  },
  plugins: [],
}