import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  // Relative base so the built bundle also works from file:// —
  // that is what the Android (Capacitor) WebView loads.
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 5173,
  },
});
