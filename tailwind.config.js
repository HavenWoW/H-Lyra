/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        haven: {
          sidebarBg: '#111726',
          sidebarPanel: '#161F33',
          sidebarIconBox: '#1C2742',
          sidebarBorder: '#23304E',
          contentBg: '#F0F2F5',
          cardBg: '#FFFFFF',
          cardBorder: '#E2E8F0',
          darkest: '#0B0F19',
          darker: '#111726',
          dark: '#161F33',
          panel: '#1E293B',
          panelHover: '#25334A',
          border: '#27354E',
          borderLight: '#3B4D6E',
          accent: '#2563EB',      // Primary Blue
          accentHover: '#1D4ED8',
          accentGlow: 'rgba(37, 99, 235, 0.35)',
          accentCyan: '#0284C7',
          accentGold: '#D97706',
          accentGreen: '#16A34A',
          accentRed: '#DC2626',
          textMuted: '#64748B',
          textDark: '#1E293B',
          textNormal: '#334155',
          textBright: '#0F172A',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
