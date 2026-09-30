import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  // Every runtime dependency the host must supply a single shared
  // instance of — bundling any of these would mean a host's own React
  // (or BlockNote, or Base UI) and this package's copy stop being the
  // same instance, breaking context/hooks in ways that are miserable
  // to debug. `@blocknote/*`/`@base-ui/react` are real `dependencies`
  // (not peerDependencies — see README's "What a host app must
  // provide"), but still belong here: they render into the same React
  // tree the host's own components do, so they need the same
  // constraint react/react-dom already have.
  external: ['react', 'react-dom', 'react/jsx-runtime', '@base-ui/react', '@blocknote/core', '@blocknote/react', '@blocknote/shadcn'],
});
