import { defineConfig } from 'vitest/config';

/**
 * A second, separate Vitest config for real-browser tests
 * (`*.browser.test.tsx`) — kept apart from `vitest.config.ts`'s jsdom
 * run rather than folded in, so the fast, default `npm test` isn't
 * slowed down or made flaky by spinning up a real Chromium instance
 * for the 231 tests that don't need one. Only the handful of tests
 * that specifically exercise something jsdom can't (BlockNote's real
 * `[[`/`@` typed-trigger path — see `EntityReferenceInlineContent.browser.test.tsx`)
 * opt into this.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['src/**/*.browser.test.tsx'],
    setupFiles: ['./src/test/browserSetup.ts'],
    css: false,
    globals: false,
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      name: 'chromium',
      // Only set if you've pointed a pre-installed Chromium at a
      // non-standard path (e.g. a sandboxed CI image) via this env var.
      // A normal machine needs nothing here — `npx playwright install
      // chromium` (once, like any Playwright project) puts the browser
      // exactly where this provider already looks for it by default.
      providerOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { launch: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
        : undefined,
    },
  },
});
