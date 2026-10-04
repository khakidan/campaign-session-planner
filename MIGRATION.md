# Migration Notes

For host apps (`daggerheart-gm-dashboard-multiuser`, `dnd-gm-dashboard-multiuser`, or any future consumer) pulling in a newer version of this submodule. Empty sections mean nothing to do — most updates land here with nothing required. See `CHANGELOG.md` for what changed; this file is specifically about what a host must *do* in response, if anything.

---

## Unreleased (current `claude/nifty-gauss-ocyzxc` branch state)

### Fix: standalone test suite on Node 25+, and a new `engines.node` range

**Action needed: none for consuming the built package** — `dist/` output and runtime behavior are unaffected; this only touches `src/test/setup.ts` (test-only) and adds metadata (`engines`, `.nvmrc`) that doesn't change how `npm install`/`npm run build` behave for you.

**One thing that could affect you**: `package.json` now declares `"engines": { "node": ">=22" }`. This is advisory only (no `.npmrc` with `engine-strict` is set, here or assumed in yours) — npm will warn, not fail, if your own Node version is older, and your install won't break. But if your own CI or local machines run Node below 22, you may start seeing that warning, and this package's own test suite (if you ever run it standalone, rather than just consuming `dist/`) is only verified on Node 22–26. If you run this package's tests under Node 18–21, you're in genuinely untested territory as of this change — not something this change asks you to upgrade for, just something it no longer claims to support silently.

### Fix: `--csp-accent-200`/`--csp-accent-900` theme variables, and the standalone test suite

**Action needed: none.** `--csp-accent-200`/`--csp-accent-900` now have defined defaults (previously undefined, rendering with no color wherever used) — this only adds color that was silently missing, pixel-identical to the rest of the palette's own "matches the previous hardcoded Tailwind class" rule; nothing to override or change unless you'd grown attached to the missing-color appearance. If you do customize the palette (see "Theming & layout customization" below), you can now also override these two shades the same way as any other.

The `vitest`/`@vitest/browser`/`@testing-library/jest-dom` devDependency pins got tighter (caret ranges → exact versions already verified working together) to fix the package's own test suite failing under some hoisted-install topologies — devDependencies only, never part of what `dist/` ships or what your app imports. The one case this could change something: if your own workspace's root `package.json` happens to pin a `vitest` version in the same major range as this package's own (`2.x`) and currently relies on your root's version being hoisted down into this submodule's test runs, the new exact pin means npm will now always nest this package's own `vitest`/`@vitest/browser`/`@testing-library/jest-dom` instead — slightly more disk space under this submodule's `node_modules`, no behavior change to anything you'd notice. You only encounter this at all if you run this package's own test suite (`npx vitest run` inside the submodule, or similar) rather than just consuming its built `dist/` output, which is the normal way of using this package.

### New: GM-side Safety Event alerts (`useSafetyEventAlerts`, `SafetyEventToasts`, `SessionSafetyControls`'s `triggeredBy` prop)

**Action needed: none unless you want to use it.** Purely additive — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, nothing mounted automatically. If you want live GM-side notification when a Player uses a safety tool, wire `useSafetyEventAlerts`'s `onSafetyEvent` into your own toast system (recommended), or mount the ready-made `SafetyEventToasts` if you don't have one. See `CHANGELOG.md` for detail and README.md's "Safety Tools" section for the updated wiring example.

### New: `SessionSafetyControls` `visible`/`position` props

**Action needed: none.** Purely additive — both new props are optional and default to the exact previous behavior (always shown while a Session is Running, fixed to the bottom-right corner). If you want to gate this to a Player-permissioned view of your app or move it out of the way of your own UI, pass `visible`/`position`; see `CHANGELOG.md` and README.md's "Safety Tools" mention for detail.

### New: Session Recap as an output (`SessionRecapView`, `useSessionRecap`, `'Recap Highlight'` Note type)

**Action needed: none unless you want to use it.** Purely additive — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, nothing mounted automatically. `sessionDebriefTemplate` gained one more heading pointing at the new convention; every existing Debrief document is unaffected. Like Run Mode's pieces, `SessionRecapView` is a standalone building block for your own screen, not auto-wired into `CampaignSessionPlanner`. See README.md's "Session Recap" section for how to wire it in.

### New: Campaign Hygiene view (`CampaignHygienePanel`, `useCampaignHygiene`)

**Action needed: none unless you want to use it.** Purely additive — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, nothing mounted automatically. Like Run Mode's pieces, it's a standalone building block meant for your own dashboard/overview screen, not auto-wired into `CampaignSessionPlanner`. See README.md's "Campaign Hygiene" section for how to wire it in.

### New: discoverability nudges (Session Briefing intro tip, NoteEditor hints)

**Action needed: none.** Purely additive UI — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, no new props. `SessionBriefingPanel` may now show a dismissible tip (only while that campaign's briefing is entirely empty), and `NoteEditor` may show a one-line caption under Type/Confidence (only once a relevant value is set). See `CHANGELOG.md` for detail.

### New: full-content search in the Quick Reference Drawer

**Action needed: none.** Purely additive — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes. The Drawer's search box now also matches against each entity's document content, not just its title; `PlannerSearchItem` gained a new optional `content` field. See `CHANGELOG.md` for detail.

### New: "Run Mode" (`SessionRunPanel`, `QuickCaptureComposer`)

**Action needed: none unless you want to use them.** Purely additive — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, nothing mounted automatically. If you do want them, they're meant to sit in your own live-session screen (not a new route this package dictates) — see README.md's "Run Mode" section for how to wire them in, including `onOpenPlannerEntity`/`onOpenHostEntity` and the optional `subscribeToChanges` note for live list updates.

### New: real-browser test coverage (`@vitest/browser`, `playwright`)

**Action needed: none.** Dev/test-only, same as the rest of the test suite — not part of what your app imports or bundles, and excluded already by a production install. See `CHANGELOG.md` for what this covers and why.

### New: `renderFields` layout customization + fully-exported editor building blocks

**Action needed: none.** Purely additive — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, no new required props, and every existing prop keeps its current behavior when the new ones are omitted. Adds an optional `renderFields` prop to every per-kind editor and to `CampaignSessionPlanner` (keyed by kind), plus new direct exports: each editor component + its `Props`/`FormValues` types, `BlockNoteFreeformField`, `EntityLinksPanel`/`EntityLinkPicker`, and everything in `src/lib/entityTemplates.ts`. See `CHANGELOG.md` for the full rundown, and README.md's "Theming & layout customization" and "Building a fully custom editor" sections for how to use them.

### New: Phase 2 "Workflow, Collaboration & Facilitation" feature set

**Action needed: none.** Purely additive — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, no new required props. Adds several new UI panels (Session Readiness, Campaign Changes, a "Why This Session Matters" section in the existing briefing, a floating Session Safety Controls widget for a Running Session), a Confidence field on Notes, several new suggested `Note.type` values, and enriched starter templates (Complication Bank, Scene Truth/Player Prompts, GM/Player/Shared Canon, etc.). See `CHANGELOG.md` for the full rundown. If you want to try any of it visually before pulling it into your host app, run `npm run demo` from inside this package's own directory (new, dev-only — see README.md's "Local demo").

### New: Phase 1 "Memory" feature set (Session Briefing)

**Action needed: none.** Purely additive — no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, no new required props. `NoteEditor`'s Type datalist now suggests a few new values (`Player Theory`, `Player Interest`, `Character Goal`, `NPC Attachment`, `Unresolved Question`, `Player-Created Fact`, `Future Hook`) and `SessionEditor` now shows a "Previously Established" briefing panel while a Session is new/Draft/Prepared. See `CHANGELOG.md` for the full rationale.

**What to check if you want to use it:** nothing required, but if you have existing Notes you'd like the briefing to pick up, edit their `type` field to one of the new suggested values above — anything already saved is unaffected otherwise.

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
