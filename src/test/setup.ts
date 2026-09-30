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

// jsdom doesn't implement `elementsFromPoint`/`elementFromPoint` (real
// browsers do) — BlockNote's SideMenu extension calls the former on
// every `mousemove` over the editor (tracking which block to show a
// drag handle next to), which user-event's pointer simulation can
// trigger incidentally from an unrelated click. Without this, that
// throws as an unhandled exception during otherwise-passing tests, per
// Vitest's own "might cause false positive tests" warning — this
// polyfills the browser behavior BlockNote assumes, not a workaround
// for a bug in this package's code.
if (!document.elementsFromPoint) {
  document.elementsFromPoint = () => [];
}
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
