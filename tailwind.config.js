/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './lite/index.html', './challenge/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#17123D', soft: '#3D3A63', mute: '#5E5C7A' },
        navy: { 50: '#EEF2FF', 100: '#DCE4FD', 600: '#1A56E5', 700: '#1442B8', 800: '#1E1660', 900: '#140F42' },
        magenta: { 50: '#FFF0F7', 100: '#FFDCEC', 300: '#FF8CC2', 400: '#F2559F', 500: '#E6187F', 600: '#C8106C', 700: '#A00C57' },
        blush: { 50: '#FFF5FA', 100: '#FDE7F1', 200: '#F9CFE2' },
        mist: { 50: '#F6F7FC', 100: '#EDF0F8', 200: '#E2E6F0', 300: '#CDD3E3' },
        sage: { 100: '#E1F3EA', 600: '#1F7A52', 700: '#17603F' },
        amber: { 100: '#FCEFD6', 700: '#8A5A00' },
        // Sprint's dark "game mode" (same blue/pink brand, night palette). Contrast-checked: text-soft 10.5:1, mute 6.6:1 on card.
        sp: { bg: '#120D3A', card: '#1E1766', raised: '#2A2180', soft: '#D4D2F5', mute: '#A8A5DB', blue: '#6E95FF', 'blue-fill': '#2F5BEA', pink: '#FF5AAE', 'pink-fill': '#D41472', mint: '#3DDC97', amber: '#FFC857' },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        grotesk: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: { card: '0 1px 2px rgba(30,22,96,0.04), 0 8px 24px -12px rgba(30,22,96,0.12)' },
    },
  },
  plugins: [],
};
