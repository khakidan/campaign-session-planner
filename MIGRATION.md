# Migration Notes

For host apps (`daggerheart-gm-dashboard-multiuser`, `dnd-gm-dashboard`, or any future consumer) pulling in a newer version of this submodule. Empty sections mean nothing to do — most updates land here with nothing required. See `CHANGELOG.md` for what changed; this file is specifically about what a host must *do* in response, if anything.

---

## Unreleased (current `claude/nifty-gauss-ocyzxc` branch state)

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
