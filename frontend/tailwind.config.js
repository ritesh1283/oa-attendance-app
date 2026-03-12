/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        oa: {
          primary:   '#4F46E5',
          secondary: '#7C3AED',
          accent:    '#06B6D4',
          neutral:   '#1F2937',
          'base-100': '#F9FAFB',
          info:      '#3B82F6',
          success:   '#10B981',
          warning:   '#F59E0B',
          error:     '#EF4444',
        },
      },
      'light',
    ],
    defaultTheme: 'oa',
  },
};
