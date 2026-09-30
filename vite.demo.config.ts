import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Config for the local-only visual demo harness (`demo/`) — separate
 * from `tsup.config.ts` (the real published build) and
 * `vitest.config.ts` (the test suite). Tailwind is compiled here only
 * for the demo's sake: the published package ships zero Tailwind CSS
 * (see README.md's "What a host app must provide") — every host is
 * expected to bring its own Tailwind pipeline, which this demo stands
 * in for locally so the components render with their real styling.
 */
export default defineConfig({
  root: 'demo',
  plugins: [react(), tailwindcss()],
});
