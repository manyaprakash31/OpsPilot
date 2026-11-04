/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F3F0E8',
          surface: '#FAF8F5',
          card: '#FFFFFF',
          hover: '#ECE8DE',
          border: '#D8D4C8',
          line: '#E2DEC6',
        },
        ink: {
          DEFAULT: '#202622',
          muted: '#4F5B54',
          faint: '#7E8B84',
          subtle: '#A8B3AC',
        },
        sage: {
          DEFAULT: '#78836B',
          light: '#E9EDE6',
          dark: '#56604D',
          hover: '#69745D',
        },
        accent: {
          DEFAULT: '#C76542',
          hover: '#B25433',
          faint: '#FAF1ED',
          border: '#E8A389',
        },
        opstatus: {
          critical: '#A32D1C',
          warning: '#C76542',
          success: '#3A6346',
          info: '#3D5A6C',
          neutral: '#6B7280',
        }
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(32, 38, 34, 0.04)',
        'panel': '0 2px 4px -1px rgba(32, 38, 34, 0.06), 0 1px 2px -1px rgba(32, 38, 34, 0.04)',
      }
    },
  },
  plugins: [],
}
