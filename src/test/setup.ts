import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
// Type-only — just the ambient `declare module 'vitest'` augmentation
// that gives `expect(...).toBeInTheDocument()` etc. their types.
// Erased entirely at compile time, so (unlike the side-effect
// `'@testing-library/jest-dom/vitest'` import this replaces below) it
// can never affect which `expect` the matchers actually attach to.
import type {} from '@testing-library/jest-dom/vitest';

// `@testing-library/jest-dom/vitest`'s own entry point does its own
// internal `import { expect } from 'vitest'` before calling
// `expect.extend(...)` — resolved from wherever that file physically
// sits in node_modules, which is NOT necessarily the same `vitest`
// this package's test files import `expect` from. In a monorepo/
// workspace install, npm can hoist `@testing-library/jest-dom` to a
// shared root while this package's own `vitest` (pinned to a
// different major version than whatever else the workspace hoists)
// stays nested locally — two different `expect` module instances, so
// the matchers silently extend the wrong one and every
// `toBeInTheDocument()`/`toHaveValue()`/etc. call fails with "Invalid
// Chai property." Importing the dependency-free `/matchers` entry
// (plain matcher functions, no internal `vitest` import at all) and
// extending *this file's own* `expect` — resolved from right here,
// inside this package's own `src/`, so Node's module resolution finds
// this package's nested `vitest` long before it would ever reach a
// hoisted ancestor's — sidesteps the whole resolution question by
// construction, regardless of hoisting topology.
expect.extend(jestDomMatchers);

// Node 25+ (verified present on v25.9.0/v26.10.0; verified absent on
// v22.22.2/v22.23.3/v23.11.1/v24.21.0) ships a non-experimental global
// `localStorage`/`sessionStorage` descriptor that, without the
// `--localstorage-file` flag, is present on `globalThis` but
// non-functional. Because it's already there (as a non-enumerable
// accessor — `Object.getOwnPropertyDescriptor(globalThis,
// 'localStorage')`, confirmed directly) before vitest's jsdom
// environment finishes setting up, vitest's own "copy jsdom's
// `window` onto `global`" step — which only copies *enumerable* keys —
// skips it, leaving Node's non-functional one in place instead of
// overwriting it with jsdom's real, `Storage`-backed implementation
// (`global.jsdom = dom` is vitest's own jsdom environment, confirmed
// from its bundled source — `dom.window.localStorage` is the real
// thing). Every test that calls `localStorage.clear()`/`.getItem()`/
// etc. then fails with "Cannot read properties of undefined." Re-bind
// both explicitly to jsdom's own window; the equality check makes
// this a no-op on Node <25 (or any environment without this global
// pre-populated), where the normal copy already worked.
const jsdomWindow = (globalThis as { jsdom?: { window?: Window } }).jsdom?.window;
if (jsdomWindow && globalThis.localStorage !== jsdomWindow.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomWindow.localStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: jsdomWindow.sessionStorage,
    writable: true,
    configurable: true,
  });
}

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

// jsdom's `Range` also doesn't implement `getClientRects` (ProseMirror
// calls it, via `coordsAtPos`, to compute on-screen cursor position
// after every keystroke dispatched into the editor — e.g. to decide
// whether to scroll the caret into view). Same rationale as the
// `elementsFromPoint` polyfill above: this is jsdom lacking real
// browser geometry, not a bug to work around in this package's code.
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = function getClientRects() {
    return [] as unknown as DOMRectList;
  };
}

// jsdom's `DOMRect` (the return type of `getBoundingClientRect`) has no
// `toJSON`, which real browsers provide — BlockNote's SuggestionMenu
// extension calls it when computing the menu's anchor position.
if (typeof DOMRect !== 'undefined' && !DOMRect.prototype.toJSON) {
  DOMRect.prototype.toJSON = function toJSON(this: DOMRect) {
    const { x, y, width, height, top, right, bottom, left } = this;
    return { x, y, width, height, top, right, bottom, left };
  };
}
