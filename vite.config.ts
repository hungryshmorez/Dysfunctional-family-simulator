import { defineConfig } from 'vite';

// base is set for GitHub Pages project-page hosting:
// https://hungryshmorez.github.io/Dysfunctional-family-simulator/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/Dysfunctional-family-simulator/' : '/',
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
