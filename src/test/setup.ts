import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// `globals: false` in vitest.config.ts (this project's tests import
// `describe`/`it`/`expect` explicitly rather than relying on ambient
// globals) means `@testing-library/react`'s own auto-cleanup — which
// only registers itself when it detects a global `afterEach` — never
// fires. Without this, every `render()` in a test file stacks up in
// `document.body` instead of unmounting, and later tests in the same
// file start matching leftover elements from earlier ones.
afterEach(() => {
  cleanup();
});
