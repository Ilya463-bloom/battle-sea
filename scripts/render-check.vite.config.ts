import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

/**
 * Used only by `npm run check:render`. The app config compiles JSX for the DOM;
 * here it has to be compiled for Solid's server renderer instead.
 */
export default defineConfig({
  plugins: [solid({ ssr: true })],
  build: {
    ssr: true,
    target: 'node20',
    outDir: 'node_modules/.render-check',
    emptyOutDir: true,
    minify: false,
  },
});
