import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    // This package's own tsconfig.json intentionally `extends`
    // "../../tsconfig.json" — it's designed to be consumed from a host
    // app's `packages/campaign-session-planner` submodule location,
    // where that path resolves to the host's own root tsconfig (see
    // README.md's "no build step" section). Standalone, in this
    // extracted repo, that path doesn't exist, and Vite/esbuild's
    // per-file tsconfig auto-discovery fails hard on it. `tsconfigRaw`
    // bypasses that file-based lookup entirely for the test run.
    // Must be a JSON *string*, not an object — Vite's esbuild transform
    // only skips its own tsconfig.json file lookup (which throws on
    // this package's host-relative `extends`) when `tsconfigRaw` is a
    // string; an object is merged with the (failed) file lookup instead
    // of replacing it.
    tsconfigRaw: JSON.stringify({
      compilerOptions: {
        jsx: 'react-jsx',
        useDefineForClassFields: true,
      },
    }),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    globals: false,
  },
});
