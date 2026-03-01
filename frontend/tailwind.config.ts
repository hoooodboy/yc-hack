import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'soul-bg': '#ffffff',
        'soul-card': '#ffffff',
        'soul-card-hover': '#f8f9fc',
        'soul-accent': '#1a1a2e',
        'soul-text': '#1a1a2e',
        'soul-muted': '#9ca3af',
        'soul-border': '#f0f0f5',
        'soul-subtle': '#f8f9fc',
        'soul-primary': '#6366f1',
        'soul-primary-light': '#818cf8',
      },
    },
  },
  plugins: [],
}
export default config
