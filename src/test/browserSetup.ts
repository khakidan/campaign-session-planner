import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// No jsdom polyfills here — that's the entire point of this config.
// A real browser already implements elementsFromPoint/getClientRects/
// DOMRect.toJSON/getBoundingClientRect correctly, which is exactly what
// blocked testing the `[[`/`@` typed-trigger path under jsdom (see
// `EntityReferenceInlineContent.browser.test.tsx`'s doc comment).

afterEach(() => {
  cleanup();
});
