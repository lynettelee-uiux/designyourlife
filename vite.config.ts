/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` lets the built app be served from any sub-path (e.g. GitHub Pages or an iframe).
// Three pages: the full experience (/), Design Your Life (Lite) (/lite/) and the Sprint challenge (/challenge/).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lite: resolve(__dirname, 'lite/index.html'),
        challenge: resolve(__dirname, 'challenge/index.html'),
      },
    },
  },
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
