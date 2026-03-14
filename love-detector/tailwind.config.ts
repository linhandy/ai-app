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
        'primary-purple': '#7C3AED',
        'primary-pink': '#DB2777',
        'true-green': '#059669',
        'lie-red': '#EF4444',
        'warning-amber': '#F59E0B',
        'card-purple': '#F5F3FF',
        'card-pink': '#FFF0F6',
        'card-green': '#ECFDF5',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7C3AED, #DB2777)',
        'gradient-hero': 'linear-gradient(180deg, #3B0764 0%, #7C3AED 55%, #DB2777 100%)',
      },
    },
  },
  plugins: [],
}
export default config
