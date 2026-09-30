// This package imports a handful of real (non-Tailwind) stylesheets
// directly — `@blocknote/core`/`@blocknote/shadcn`'s own CSS and this
// package's own `blockNoteBaseline.css`/`blockNoteColumns.css`/
// `readOnlyTypography.css` — as side-effect imports
// (`BlockNoteFreeformField.tsx`, `ReadOnlyBlockNoteView.tsx`). TS has no
// built-in understanding of CSS imports; bundlers do (Vite, webpack,
// etc. all handle `import './x.css'` natively), so this ambient module
// declaration only exists to satisfy the type checker, not to describe
// real runtime behavior. Previously supplied for free by whichever
// host app's own `vite-env.d.ts` (`/// <reference types="vite/client"
// />`) happened to be compiled in the same TS program — this package
// no longer assumes a host is present at all, so it declares this
// itself instead of silently depending on one.
declare module '*.css';
