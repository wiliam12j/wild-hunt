import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works on GitHub Pages sub-paths as well as Netlify.
  base: './',
});
