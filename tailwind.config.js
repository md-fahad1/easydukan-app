/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ব্র্যান্ড: গাঢ় সবুজ (Emerald) — টাকা/লাভের রঙ
        brand: {
          50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399',
          500: '#10B981', 600: '#059669', 700: '#047857', 800: '#065F46', 900: '#064E3B',
        },
        canvas: '#F3F6F4', // অ্যাপের ব্যাকগ্রাউন্ড (হালকা সবুজাভ)
        line: '#E3E9E5', // বর্ডার
        bkash: '#E2136E',
      },
    },
  },
  plugins: [],
};
