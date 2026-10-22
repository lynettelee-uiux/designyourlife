/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` lets the built app be served from any sub-path (e.g. GitHub Pages or an iframe).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
