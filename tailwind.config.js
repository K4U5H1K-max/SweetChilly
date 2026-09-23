/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Reference Mobile UI Design Tokens
        brand: {
          navy: '#0B1220',     // Primary Navy Header / Chrome
          surface: '#172033',  // Slate Surface
          canvas: '#F5F7FA',   // Light Background
          card: '#FFFFFF',     // Crisp White Card
        },

        // Semantic Operational Accents
        op: {
          info: '#2563EB',     // Blue: Actions / Nav / Info / Routes
          success: '#16A34A',  // Green: Safe / Available / Active
          warning: '#F59E0B',  // Amber: Delayed / Warning / Disruption
          critical: '#DC2626', // Red: Critical / Roadblock / Emergency
          ai: '#7C3AED',       // Purple: AI Verified / AI Analysis
        },

        // Legacy / Standard Compatibility aliases
        canvas: '#F5F7FA',
        surface: '#FFFFFF',
        'surface-subtle': '#F1F5F9',
        'border-subtle': '#E2E8F0',
        'border-strong': '#CBD5E1',

        govnavy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          500: '#334E68',
          700: '#102A43',
          800: '#0F172A',
          900: '#0B1220', // Reference Navy
        },

        status: {
          nominal: '#16A34A',  // Green
          caution: '#F59E0B',  // Amber
          critical: '#DC2626', // Red
          info: '#2563EB',     // Blue
          ai: '#7C3AED',       // Purple
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(11, 18, 32, 0.05), 0 1px 2px -1px rgba(11, 18, 32, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(11, 18, 32, 0.07), 0 2px 4px -2px rgba(11, 18, 32, 0.03)',
        'elevated': '0 10px 15px -3px rgba(11, 18, 32, 0.08), 0 4px 6px -4px rgba(11, 18, 32, 0.03)',
      },
      borderRadius: {
        'sm': '6px',
        DEFAULT: '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '14px',
        '2xl': '16px',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
