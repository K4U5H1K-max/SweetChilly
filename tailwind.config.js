/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern GovTech Operational Palette
        canvas: '#F8FAFC',       // Slate 50 - clean airy background
        surface: '#FFFFFF',      // Crisp card surface
        'surface-subtle': '#F1F5F9', // Slate 100
        'border-subtle': '#E2E8F0',  // Slate 200 - hairline border
        'border-strong': '#CBD5E1',  // Slate 300
        
        // Brand & Primary
        govnavy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          500: '#334E68',
          700: '#102A43',
          800: '#0F172A', // Primary Navy
          900: '#0B1120', // Deepest Navy
        },
        
        // Semantic Operational Accents
        status: {
          nominal: '#059669',  // Emerald 600 (Operational / Active)
          caution: '#D97706',  // Amber 600 (Delayed / Watch)
          critical: '#E11D48', // Rose 600 (Critical Disruption / Blocked)
          info: '#2563EB',     // Blue 600 (Route / Transit)
        },
        
        // Legacy color alias compatibility
        parchment: '#F8FAFC',
        contour: '#E2E8F0',
        'ink-navy': '#0F172A',
        'terrain-low': '#F1F5F9',
        'terrain-high': '#475569',
        waypoint: '#E11D48',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'elevated': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
