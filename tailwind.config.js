/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ব্র্যান্ড: লগইন পেজের টিল (Teal) — পুরো অ্যাপে এক রঙ
        brand: {
          50: '#ECFBFC', 100: '#D3F4F6', 200: '#A8E8EC', 300: '#6FD8DD', 400: '#3CC1CB',
          500: '#22B3C0', 600: '#18A9B7', 700: '#0E8F9B', 800: '#0B747F', 900: '#0A5A63',
        },
        canvas: '#F4F5F7', // অ্যাপের ব্যাকগ্রাউন্ড (হালকা ধূসর)
        line: '#EDEEF1', // বর্ডার
        ink: '#0F172A',
        bkash: '#E2136E',
      },
    },
  },
  plugins: [],
};