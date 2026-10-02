/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class', // অ্যাপের ভেতর থেকে হালকা/গাঢ় বদলানোর জন্য
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // রং ঠিক হয় global.css-এর ভ্যারিয়েবল থেকে — গাঢ় মোডে নিজে নিজে বদলে যায়।
      // bg-white → কার্ডের রং, bg-slate-900 → "ink" (হালকায় কালো, গাঢ় মোডে টিল)।
      // আলাদা আলাদা (bg / border / text) রাখা হয়েছে যাতে text-white, bg-brand-600 এসব একই থাকে।
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)', // অ্যাপের ব্যাকগ্রাউন্ড
        card: 'rgb(var(--card) / <alpha-value>)', // কার্ড / ইনপুট
        line: 'rgb(var(--line) / <alpha-value>)', // বর্ডার
        ink: 'rgb(var(--ink) / <alpha-value>)', // কালো পিল / বাটন
        brand: {
          50: '#ECFBFC', 100: '#D3F4F6', 200: '#A8E8EC', 300: '#6FD8DD', 400: '#3CC1CB',
          500: '#22B3C0', 600: '#18A9B7', 700: '#0E8F9B', 800: '#0B747F', 900: '#0A5A63',
        },
        bkash: '#E2136E',
      },
      backgroundColor: {
        white: 'rgb(var(--card) / <alpha-value>)',
        slate: { 50: 'rgb(var(--slate-50) / <alpha-value>)', 100: 'rgb(var(--slate-100) / <alpha-value>)', 200: 'rgb(var(--slate-200) / <alpha-value>)', 900: 'rgb(var(--ink) / <alpha-value>)' },
        brand: { 50: 'rgb(var(--brand-50) / <alpha-value>)', 100: 'rgb(var(--brand-100) / <alpha-value>)', 200: 'rgb(var(--brand-200) / <alpha-value>)' },
        emerald: { 50: 'rgb(var(--emerald-50) / <alpha-value>)', 100: 'rgb(var(--emerald-100) / <alpha-value>)', 200: 'rgb(var(--emerald-200) / <alpha-value>)' },
        rose: { 50: 'rgb(var(--rose-50) / <alpha-value>)', 100: 'rgb(var(--rose-100) / <alpha-value>)', 200: 'rgb(var(--rose-200) / <alpha-value>)' },
        amber: { 50: 'rgb(var(--amber-50) / <alpha-value>)', 100: 'rgb(var(--amber-100) / <alpha-value>)', 200: 'rgb(var(--amber-200) / <alpha-value>)' },
        orange: { 50: 'rgb(var(--orange-50) / <alpha-value>)' },
      },
      borderColor: {
        slate: { 100: 'rgb(var(--slate-100) / <alpha-value>)', 200: 'rgb(var(--slate-200) / <alpha-value>)', 900: 'rgb(var(--ink) / <alpha-value>)' },
        brand: { 100: 'rgb(var(--brand-100) / <alpha-value>)', 200: 'rgb(var(--brand-200) / <alpha-value>)' },
        emerald: { 100: 'rgb(var(--emerald-100) / <alpha-value>)', 200: 'rgb(var(--emerald-200) / <alpha-value>)' },
        rose: { 100: 'rgb(var(--rose-100) / <alpha-value>)', 200: 'rgb(var(--rose-200) / <alpha-value>)' },
        amber: { 100: 'rgb(var(--amber-100) / <alpha-value>)', 200: 'rgb(var(--amber-200) / <alpha-value>)' },
      },
      textColor: {
        slate: { 300: 'rgb(var(--slate-300) / <alpha-value>)', 400: 'rgb(var(--slate-400) / <alpha-value>)', 500: 'rgb(var(--slate-500) / <alpha-value>)', 600: 'rgb(var(--slate-600) / <alpha-value>)', 700: 'rgb(var(--slate-700) / <alpha-value>)', 800: 'rgb(var(--slate-800) / <alpha-value>)', 900: 'rgb(var(--slate-900) / <alpha-value>)' },
        brand: { 700: 'rgb(var(--brand-700) / <alpha-value>)', 800: 'rgb(var(--brand-800) / <alpha-value>)' },
        emerald: { 600: 'rgb(var(--emerald-600) / <alpha-value>)', 700: 'rgb(var(--emerald-700) / <alpha-value>)', 800: 'rgb(var(--emerald-800) / <alpha-value>)' },
        rose: { 600: 'rgb(var(--rose-600) / <alpha-value>)', 700: 'rgb(var(--rose-700) / <alpha-value>)' },
        amber: { 600: 'rgb(var(--amber-600) / <alpha-value>)', 700: 'rgb(var(--amber-700) / <alpha-value>)', 800: 'rgb(var(--amber-800) / <alpha-value>)' },
        orange: { 700: 'rgb(var(--orange-700) / <alpha-value>)' },
      },
    },
  },
  plugins: [],
};