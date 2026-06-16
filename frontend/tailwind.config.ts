import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17201b',
        panel: '#f6f7f3',
        line: '#d8ddd2',
        accent: '#2f7d57',
        warning: '#b7791f'
      }
    }
  },
  plugins: []
};

export default config;

