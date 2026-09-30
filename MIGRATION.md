# Migration Notes

For host apps (`daggerheart-gm-dashboard-multiuser`, `dnd-gm-dashboard-multiuser`, or any future consumer) pulling in a newer version of this submodule. Empty sections mean nothing to do — most updates land here with nothing required. See `CHANGELOG.md` for what changed; this file is specifically about what a host must *do* in response, if anything.

---

## Unreleased (current `claude/nifty-gauss-ocyzxc` branch state)

### ⚠️ Build step: compiled `dist/` output — real action needed in both `daggerheart-gm-dashboard-multiuser` and `dnd-gm-dashboard-multiuser`

This is the one change in this batch that isn't a no-op. `main`/`types` no longer point at raw `src/index.ts` — they point at compiled `dist/index.js`/`dist/index.d.ts`, produced by `npm run build` (via a new `"prepare"` script, which `npm install` runs automatically). Full rationale in `CHANGELOG.md`.

**Action needed, in each host repo:**

1. **Pull and rebuild.** After updating the submodule pointer:
   ```bash
   cd packages/campaign-session-planner
   git pull origin master
   npm run build
   cd ../..
   ```
   (Or just `npm install` at the host root — the first time this specific `dist/` doesn't yet exist, `prepare` will run. But once it exists, npm won't reliably know to rebuild it again on a later pull unless you run the build explicitly — see `README.md`'s "Pulling in upstream changes later.")

2. **Import the package's compiled stylesheet once**, in your app's entry point (wherever you already import global CSS/Tailwind):
   ```ts
   import 'campaign-session-planner/dist/index.css';
   ```
   Without this, the planner's colors and BlockNote layout styling will be missing (Tailwind utility classes will still render — see next point — but the CSS-variable-driven colors and structural CSS won't).

3. **Point your Tailwind `content` config at the compiled output, not the source.** Find wherever your Tailwind config (or CSS `@source` directives, if you're on Tailwind v4's CSS-first config) currently scans this package — likely something scanning `packages/campaign-session-planner/src/**/*.tsx` or relying on default whole-module-graph scanning — and confirm it also covers `packages/campaign-session-planner/dist/**/*.js`. **If you were relying on `@tailwindcss/vite`'s automatic whole-module-graph scanning and never had an explicit `content`/`@source` entry for this package, you likely need to check this now**: Vite's plugin scans whatever's actually in the resolved module graph, and that's now compiled JS in `dist/`, not `.tsx` source — for most setups this should already work with zero changes (Tailwind v4's Vite plugin doesn't care about file extension, just that content-scannable files are in the graph), but verify: if any Tailwind utility classes render unstyled after upgrading, this is the first thing to check.

4. **`@blocknote/core`/`@blocknote/shadcn`'s own base stylesheets are unaffected** — the compiled output still imports them directly (`@blocknote/core/fonts/inter.css`, `@blocknote/shadcn/style.css`), and your bundler already needed to resolve those before this change. Nothing to do here.

**How to verify it worked:** load any page that mounts `<CampaignSessionPlanner>` and confirm buttons/tabs/borders have their normal emerald/slate colors (not colorless or unstyled) and BlockNote's rich-text editors render with their normal spacing/typography (not a wall of unstyled browser-default text).

### Theming: hardcoded Tailwind colors replaced with CSS custom properties

**Action needed: none, under normal circumstances.** Every color this package renders now resolves through a CSS custom property (`--csp-neutral-*`/`--csp-accent-*`/`--csp-danger-*`, defined in `src/theme.css`, imported once from this package's own `src/index.ts`) instead of a literal Tailwind class. Every variable's default value is the exact hex code the old Tailwind class resolved to, so this should render pixel-identical to before.

**What could theoretically break, and how to check:** the CSS variables only take effect because `theme.css` is imported as a side effect of importing anything from this package (`import './theme.css'` at the top of `src/index.ts`). This relies on the same mechanism your build already needs for BlockNote's own stylesheets (`@blocknote/core/fonts/inter.css`, etc.) — nothing new is being asked of your build that it didn't already need to do. If, after updating, the planner's buttons/borders/accents render with no color at all (not "wrong color" — a total absence, likely inheriting black/transparent), that means this CSS import isn't reaching your bundle. Fix: confirm your build processes `.css` imports from this package's source the same way it already does for `blockNoteBaseline.css`/`blockNoteColumns.css` (it should, automatically, if BlockNote's own styling has ever worked in your app).

**If you want to customize the palette** (new, not previously possible): override any of the variables in your own app's global stylesheet, e.g.:
```css
:root {
  --csp-accent-600: #7c3aed;
}
```
See README.md's "Theming & layout customization" section for the full variable list.

### New optional prop: `CampaignSessionPlanner`'s `renderNav`

**Action needed: none.** Purely additive — omitting it keeps the exact shipped tab bar. Only relevant if you want to replace the tab bar with your own navigation UI; see README.md.

### `tsconfig.json` no longer extends a host-relative path

**Action needed: none for consumption.** This only affects running this package's own `tsc`/`vitest` *standalone* (i.e., working inside this repo directly, not through your app). Your own build has its own `tsconfig.json` and never referenced this package's — nothing about how your bundler transpiles this package's source changed.

### Test suite and `devDependencies` added

**Action needed: none**, beyond a slightly larger `node_modules` after your next full (non-production) `npm install`, since npm workspaces install every member package's `devDependencies` by default. These are dev/test-only (`vitest`, `jsdom`, `@testing-library/*`) — not part of what your app imports or bundles, and typically excluded already by a production install (`npm ci --omit=dev` or similar).

---

## Template for future entries

When a change here has any consumer-facing effect — a new required prop, a `CampaignPlannerRepository`/`TTRPGHostAdapter` interface change, a CSS/build assumption, anything a host might need to touch — add a dated section above with:
- **What changed** (one line, link to the `CHANGELOG.md` entry for detail).
- **Action needed** — state plainly if it's "none."
- **How to verify** it actually applies cleanly, and what a real problem would look like vs. false-alarm noise.
