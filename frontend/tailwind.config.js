// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Esto es importante: asegura que Tailwind escanee todos tus archivos JS, TS, JSX y TSX
  ],
  theme: {
    extend: {
      // Puedes extender el tema de Tailwind aquí si lo necesitas
    },
  },
  plugins: [],
  // Configuración para el modo oscuro, si usas la clase 'dark' en el HTML
  darkMode: 'media', // o 'class' si prefieres controlar el modo oscuro con una clase
};