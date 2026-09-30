import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    globals: false,
    // `*.browser.test.tsx` runs only under `vitest.browser.config.ts`
    // (a real Chromium via Playwright, `npm run test:browser`) — jsdom
    // can't drive the real `[[`/`@` typed-trigger path those tests
    // exercise, which is the whole reason that separate config exists.
    // Extends (not replaces) Vitest's own default exclude list.
    exclude: [...configDefaults.exclude, '**/*.browser.test.tsx'],
  },
});
