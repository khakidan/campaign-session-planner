# Changelog

Everything implemented in this package so far, newest first. `ROADMAP.md` tracks only what's still pending — once something here is done, it comes out of that file.

This package has no release/version scheme yet (`package.json` is still `0.0.0`, unpublished, consumed via git submodule), so entries are grouped by change, not by version tag.

---

## Phase 1 "Memory" feature set: Session Briefing

Closes the "Phase 1 Memory feature set" roadmap item — the highest-value subset of the `chatGPTWorkflowProposal.md` synthesis (player theories/interests, character goals, NPC attachments, unresolved questions, a pre-session "previously established" briefing), scoped down to fit the package's existing architecture rather than the originally-proposed new `SessionObservation` entity/enum schema. **No `CampaignPlannerRepository`/`TTRPGHostAdapter` changes** — this is a front-end-only, additive change; nothing propagates into either host's repository implementation.

- **`src/lib/plannerMemory.ts`** (new, pure functions) — `MEMORY_NOTE_TYPES` (`'Player Theory'`, `'Player Interest'`, `'Character Goal'`, `'NPC Attachment'`, `'Unresolved Question'`, `'Player-Created Fact'`, `'Future Hook'`), `selectActiveMemoryNotes`/`selectActiveThreads` (tolerant, case-insensitive free-text status filtering — `Note.status`/`Thread.status` stay untyped strings, not enums), and `buildSessionBriefing(notes, threads)`, which groups the active ones into a `SessionBriefing` object.
- **`src/hooks/useSessionBriefing.ts`** (new) — composes the existing `useNotes`/`useThreads` hooks (no new I/O) and returns `buildSessionBriefing(...)` via `useMemo`. Reactive to `campaignId` changing (reloads and regroups), but — like every other hook in this package — has no live-update subscription: a mutation made through a *different* mounted `useNotes` instance elsewhere in the app won't be reflected until this hook's own owning component remounts, same as the rest of the package without `subscribeToChanges` wired up.
- **`src/components/SessionBriefingPanel.tsx`** (new) — read-only display, one labeled group per memory category plus Active Threads, each item clickable via `onOpenPlannerEntity` (the same callback contract every `EntityLinksPanel` already uses). Every group always renders, with its own empty-state text, so a GM discovers the feature in a brand-new campaign instead of seeing nothing.
- **`src/components/SessionEditor.tsx`** — mounts `<SessionBriefingPanel>` above the Session's own details editor, but only while `session === null` (creating a new Session) or `status` is `'Draft'`/`'Prepared'` — the actual pre-session-prep moment the proposal targeted. Hidden once a session is `Running`/`Completed`, where it would just be noise alongside the real running notes/debrief.
- **`src/components/NoteEditor.tsx`** — `SUGGESTED_TYPES`' datalist now also offers `MEMORY_NOTE_TYPES`, sourced from `plannerMemory.ts` (single list, not duplicated).
- **`src/index.ts`** — exports `useSessionBriefing`, `SessionBriefingPanel` (+ its props type), `MEMORY_NOTE_TYPES`/`selectActiveMemoryNotes`/`selectActiveThreads`/`buildSessionBriefing`, and the `MemoryNoteType`/`SessionBriefing` types.

**Explicitly out of scope** (unchanged from the roadmap plan): no `Player` entity or `TTRPGHostAdapter` extension, no Daggerheart-specific Hope/Fear fields, no live-session "Table Facilitation" UI, no new `SessionObservation` entity/enum — all deliberately deferred, each for a reason recorded in the roadmap plan this closes.

**Test coverage** (11 new tests, 185 total): `plannerMemory.test.ts` (pure grouping/filtering logic, no mocking), `useSessionBriefing.test.ts` (fake-repository-backed, including a campaign-switch reload/regroup case), `SessionBriefingPanel.test.tsx` (empty-state per group, click-through calls `onOpenPlannerEntity` with the right `EntityReference`), and two new `SessionEditor.test.tsx` cases (briefing shown while creating/Draft, hidden once Completed).

## Build step: compiled `dist/` output via `tsup`

**Action needed for both host apps — see `MIGRATION.md`.** Closes the "No build step" roadmap item. `package.json`'s `main`/`module`/`types`/`exports` now point at compiled `dist/index.js` (ESM) + `dist/index.d.ts` + `dist/index.css`, built by `tsup` (`tsup.config.ts`), instead of pointing straight at raw `src/index.ts` and relying on the host's own bundler to transpile TypeScript from a workspace member directly — which only ever worked for a Vite/esbuild-based host.

- **Externals**: `react`, `react-dom`, `@base-ui/react`, `@blocknote/core`, `@blocknote/react`, `@blocknote/shadcn` are all marked external — never bundled into `dist/index.js`. Bundling any of them would mean this package's copy and the host's own installed copy stop being the same module instance, breaking React context/hooks. `@blocknote/core`/`@blocknote/shadcn`'s own base stylesheets (`fonts/inter.css`, `style.css`) are consequently left as plain `import` statements inside `dist/index.js` rather than bundled into `dist/index.css` — externalizing a package externalizes its subpaths too (confirmed: esbuild's `external` matching cascades to deep imports of an externalized package name, there's no "external except this subpath" option without a custom resolver plugin). This isn't a new requirement: any realistic host (a bundler capable of rendering this package's React components at all) already needs to resolve CSS imports from `node_modules`, exactly as it did before this change.
- **`dist/index.css`** contains only this package's *own* CSS: `theme.css`'s color variables and the package's structural/layout CSS (`blockNoteBaseline.css`, `blockNoteColumns.css`, `readOnlyTypography.css`). A host must now `import 'campaign-session-planner/dist/index.css'` explicitly — this CSS previously reached a host "for free" only because the host's bundler processed this package's raw source directly in the same module graph.
- **Distribution**: this package isn't published to npm (git submodule + npm workspace), so `dist/` isn't committed to git (already `.gitignore`d). A `"prepare"` script (`tsup`) runs automatically the first time `npm install` links this package as a workspace member. Because npm doesn't reliably re-run `prepare` for an already-linked workspace package on every later install (there's no `package.json`/lockfile change for it to notice when only the submodule's tracked commit moves), `README.md`'s "Pulling in upstream changes later" instructions now include an explicit `npm run build` step rather than depending on that.
- **Local dev**: `npm run dev` (`tsup --watch`) rebuilds on save while actively developing this package itself — replaces the instant, build-free source-level HMR a Vite host previously got by transpiling raw source directly.
- **Verified**: `tsc --noEmit`, the full `vitest` suite (174 tests), a `.d.ts` completeness check (every `src/index.ts` export present in the generated declarations), and an `esbuild`-based smoke bundle confirming the externals boundary (`react`/`@blocknote/*` left unbundled, resolved as real imports) and zero import errors from the compiled output itself. Not verified: an actual install-and-render in either live host app (`daggerheart-gm-dashboard-multiuser`, `dnd-gm-dashboard-multiuser`) — do this before relying on it in production.

## Shared BlockNote test mocks, and `EntityReferenceInlineContent` coverage

Two related pieces of test-suite cleanup/completion:

**Deduplicated the `BlockNoteFreeformField`/`ReadOnlyBlockNoteView` mocks.** 10 test files each redefined their own near-identical inline `vi.mock('./BlockNoteFreeformField', ...)` stub (a button that fires one fixed, per-file flavor-text payload). Factored into `src/test/mocks/blockNote.tsx`: `mockBlockNoteFreeformField()` (shared `MOCK_TYPED_CONTENT` constant instead of bespoke text per file — the seam being tested was always "whatever BlockNote reports reaches `onSave`," not the wording) and `mockReadOnlyBlockNoteView()`. `TemplateSettingsPanel.test.tsx` keeps its own inline mock since it genuinely needs to assert on the incoming `value` prop, which the shared one doesn't take.

One real gotcha hit doing this, worth recording: `vi.mock('./X', () => helperFn())` — referencing a normally-imported helper inside the factory — throws `Cannot access '...' before initialization`, because `vi.mock` calls are hoisted above the file's own `import` statements, not just above local `const`s. The fix is a dynamic import *inside* the factory: `vi.mock('./X', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField())`. Every call site uses this form now.

**`EntityReferenceInlineContent.test.tsx`** (5 tests) — the one file `ROADMAP.md` had flagged as untested. It has no standalone-testable API (a BlockNote inline content spec, not a mountable component), so these tests render `BlockNoteFreeformField` with a document that already contains an inserted `entityReference` node and exercise its real render/click-dispatch behavior: label rendering (and the `type:id` fallback when unlabeled), `contenteditable="false"`, and — the actual logic this package owns — dispatching to `onOpenPlannerEntity` vs. `onOpenHostEntity` based on `refSource`, and doing nothing (not throwing) with no linking context at all.

What this does *not* cover, deliberately: actually typing `[[`/`@` to trigger BlockNote's `SuggestionMenuController` through real keystrokes. Attempting it surfaced a cascade of missing jsdom browser-geometry APIs, each fix uncovering the next, all inside ProseMirror's live cursor-positioning code (`coordsAtPos`/`scrollToSelection`, run on every keystroke to decide things like whether to scroll the caret into view):

1. `document.elementsFromPoint` (BlockNote's SideMenu, per the earlier BlockNote-testing changelog entry).
2. `Range.prototype.getClientRects`.
3. `DOMRect.prototype.toJSON` (called by BlockNote's SuggestionMenu extension when computing the menu's anchor position).
4. A fourth, `target.getBoundingClientRect is not a function` on what ProseMirror treats as a text-node target — where this was stopped rather than chased further.

The first three are polyfilled in `src/test/setup.ts` as harmless no-ops (real browsers implement all of them; jsdom doesn't) since they were blocking otherwise-legitimate interaction. The fourth is the point this was judged genuinely impractical in jsdom rather than just unattempted: this is real browser geometry a DOM-emulation library was never going to fully replicate, the mechanism belongs to BlockNote/ProseMirror rather than this package's own code, and the actual custom logic in `EntityReferenceInlineContent.tsx` is fully covered via the pre-seeded-content approach above regardless.

174 tests across 28 files, all passing; `tsc --noEmit` clean.

## Test coverage: remaining editors, integration components, and BlockNote itself

Closes out every gap the Testing Plan and its follow-ups had left open. Adds 51 tests across 9 new files (169 total, up from 118, across 27 files):

- **The remaining six structurally-identical editors** — `GroupEditor`, `LocationEditor`, `StorylineEditor`, `ThreadEditor`, `QuestEditor`, `EventEditor` — each get the same seam-test treatment as `NpcEditor.test.tsx` (exact `onSave` payload, empty-name validation). `LocationEditor` additionally covers its Parent Location `<select>` (defaults to "None," offers every `otherLocations` entry by name, reports the chosen id).
- **`TemplateSettingsPanel.test.tsx`** — kind-switching loads that kind's own effective blocks (a saved override, or the shipped default) rather than leaking the previous kind's draft; the customized-kind indicator dot; Save/Reset call `saveTemplate`/`deleteTemplate` with the right arguments; Reset re-populates the editor with the shipped default afterward.
- **`QuickReferenceDrawer.test.tsx`** — the full non-modal, stacking Drawer: opening to search, filtering the planner search index, selecting a result to view it (title/badges/content/linked entities), clicking a linked entity *pushing* a new stacked panel rather than replacing the current one, "Back to search," recording to Recents, and closing. `ReadOnlyBlockNoteView` is mocked here (it's the thing under test in its own file below), everything else is real.
- **`EntityListView.test.tsx`** — loading/empty/no-matches states, title+tag search, and the create/select callbacks.
- **`EditorFormControls.test.tsx`** — `Field`'s controlled input/textarea behavior and `Section`'s rendering.
- **`BlockNoteFreeformField.test.tsx` and `ReadOnlyBlockNoteView.test.tsx`** — real, unmocked BlockNote, not stubbed. Turned out to render and behave correctly under jsdom once actually attempted (this package's own prior assumption, and the testing philosophy's own allowance to stub "heavy third-party engines," turned out to be more conservative than necessary here). Covers: the "+ Use starter template" button's visibility rules (only when a template is given *and* the document is still empty) and its apply behavior, working Undo/Redo, and `ReadOnlyBlockNoteView`'s empty-state placeholder vs. rendering real non-editable content.
  - One real environment gap found and fixed along the way: jsdom doesn't implement `elementsFromPoint`/`elementFromPoint` (real browsers do), which BlockNote's SideMenu extension calls on every `mousemove` over the editor — surfaced as an unhandled exception during an otherwise-passing test. `src/test/setup.ts` now polyfills both as harmless no-ops, matching real browser presence rather than working around a bug in this package.

Not attempted: `EntityReferenceInlineContent.tsx`'s actual `[[`/`@` suggestion-menu interaction (real ProseMirror input-rule/plugin behavior, not just render/click) — see `ROADMAP.md`.

## Layout customization: `renderNav` slot on `CampaignSessionPlanner`

`CampaignSessionPlanner`'s top tab bar — the single most opinionated piece of layout it owns — is now overridable via a `renderNav` prop. Omit it to keep the shipped horizontal tab bar; pass a function to render a sidebar, dropdown, or anything else instead, built from the same underlying data (`CampaignSessionPlannerNavProps`: `kinds`, `labels`, `activeKind`, `onSelectKind`, `onOpenTemplateSettings`) rather than fighting the shipped markup/CSS. Both the type and prop are exported from `src/index.ts`. Covered by 3 new tests in `CampaignSessionPlanner.test.tsx` (default nav renders, a custom `renderNav` fully replaces it, and the props it receives are correct and wired to working callbacks). Documented in README.md's new "Theming & layout customization" section.

Every other editor's field order/markup is still fixed — this is the first, not the only, layout customization point; see `ROADMAP.md` for what's left.

## Theming: CSS custom properties replace hardcoded Tailwind colors

Every component previously hardcoded Tailwind color classes directly (`bg-emerald-600`, `text-slate-500`, `text-rose-600`, etc. — ~250 occurrences across ~20 files, but only ever three semantic roles: slate for neutrals, emerald for the accent/primary color, rose for destructive actions). All of them now resolve through CSS custom properties instead (`src/theme.css`: `--csp-neutral-*`, `--csp-accent-*`, `--csp-danger-*`, each a full Tailwind-style shade scale), imported once from the package's own entry point (`src/index.ts`) so every consumer gets the default palette for free. A host app restyles the whole package — e.g. swapping the accent color to match its own brand — by overriding these variables in its own stylesheet; no Tailwind config, build step, or component code change needed on the host's side. Purely a mechanical class-string swap (`-slate-N` → `-[var(--csp-neutral-N)]` and the equivalent for emerald/rose); no component logic changed, and no test asserted on literal class strings, so the existing suite caught any regression for free.

## Package independence: no more hidden host-repo path assumptions

This package's own `tsconfig.json` `extended` `"../../tsconfig.json"` — a path that only resolves when the package is checked out as a submodule two directories inside a host app's own repo (`<host>/packages/campaign-session-planner/tsconfig.json` → `<host>/tsconfig.json`). Standalone, in this extracted repo, that path doesn't exist, which broke `vitest`'s esbuild-based test transform outright (surfaced while building the test suite below) and meant `tsc --noEmit` could never actually be run on this package by itself. Fixed by giving `tsconfig.json` its own complete, self-contained `compilerOptions` (copied from — not referencing — the host's previous values, since they were already the right settings for this package, just borrowed instead of owned) and adding `src/css.d.ts` (an ambient `declare module '*.css'` the host's own `vite-env.d.ts` used to supply for free, for the handful of real, non-Tailwind stylesheets this package imports for BlockNote). `vitest.config.ts`'s previous `esbuild.tsconfigRaw` workaround (needed only to route around the broken `extends` before this fix) was removed once no longer necessary.

Verified: `npx tsc --noEmit` and `npm test` both now run clean in this repo alone, with no host app checked out anywhere nearby.

## Test suite: vitest infra, fake repository, 118 seam/unit tests

Implements the Testing Plan that was drafted in `ROADMAP.md` (see below). Adds `vitest` + Testing Library as `devDependencies`, a `vitest.config.ts`, and `npm test`. `src/test/fixtures.ts` provides a real, in-memory implementation of `CampaignPlannerRepository` (`createFakeRepository(seed?)`) and `TTRPGHostAdapter` (`createFakeHostAdapter(overrides?)`), used across every test instead of mocking individual repository methods — assertions check what the fake actually stored/returned, not whether a mock function "was called," per the testing philosophy referenced from the host repo's `AGENTS.md`.

Coverage added:
- All 9 campaign-scoped CRUD hooks (`useNotes`/`useNpcs`/`useGroups`/`useLocations`/`useSessions`/`useStorylines`/`useThreads`/`useQuests`/`useEvents`) via one table-driven suite (`crudHooks.test.ts`), plus `useScenes` (session-scoped, not campaign-scoped), `useEntityLinks` (outgoing/incoming split, `sourceLabel` capture), `useTemplates`, and `usePlannerSearchIndex` individually.
- Seam tests for `NoteEditor`, `NpcEditor`, `SessionEditor` (exact `onSave` payloads, validation, `SessionEditor`'s scene add/reorder logic) and `CampaignSessionPlanner` (the `renderNav` slot, added alongside that feature above). `BlockNoteFreeformField` is stubbed via `vi.mock` in these — a heavy third-party rich-text engine that isn't the thing under test, per the testing philosophy's own rule on when mocking is appropriate.
- `EntityLinksPanel`/`EntityLinkPicker`'s full link-picking flow (search, grouping, selecting a planner vs. host result, add/remove).
- The pure `lib/` functions: `blockNoteUtils.toBlocksValue`, `entityTemplates.TEMPLATE_DEFAULTS`, `entityQuickView.fetchEntityQuickView`, `recentEntities` (including malformed-storage and storage-write-failure cases).

Not yet covered (tracked in `ROADMAP.md`): `BlockNoteFreeformField` itself, the remaining structurally-identical editors (`GroupEditor`/`LocationEditor`/`StorylineEditor`/`ThreadEditor`/`QuestEditor`/`EventEditor`), and `QuickReferenceDrawer`/`TemplateSettingsPanel`.

## Roadmap drafted: testing plan, Phase 1 memory feature, template enrichment

`ROADMAP.md` gained three concrete, scoped-out plans after reviewing `chatGPTWorkflowProposal.md` (a synthesis of ideas from the *Rolling with the Youth* GMing book) and `template-proposals.md` against this package's actual architecture:

- A **Testing Plan** (implemented above) for adding this package's own test suite.
- A **Phase 1 "Session Memory" plan** — the one subset of `chatGPTWorkflowProposal.md`'s ideas judged worth building (player theories, unresolved questions, NPC attachments, a pre-session "previously established" briefing), rescoped to reuse `Note`'s existing free-text `type`/`status` fields instead of the originally-proposed `SessionObservation` entity/enum schema, which would have undone the Slice 4.2e consolidation to one freeform BlockNote document per entity. Not yet built.
- A **Template Enrichment plan** — the subset of `template-proposals.md`'s templates that are genuinely templates for entity kinds this package already ships (`entityTemplates.ts`'s `TEMPLATE_DEFAULTS`), versus the subset that are really new-entity proposals (`Player Intent`, `Observation`, `Session Safety`, etc.) in template formatting, needing their own design pass. Not yet built.

## Initial proposal documents

`chatGPTWorkflowProposal.md` and (later) `template-proposals.md` added — external synthesis documents proposing ways to incorporate GMing/facilitation concepts from *Rolling with the Youth* into this package's design. Reviewed for architectural fit (see the roadmap entry above) rather than adopted wholesale.

## Package extracted from the Daggerheart host repo

This package's history before this point lived inside `daggerheart-gm-dashboard-multiuser`; `docs/markdown/campaign_session_notes_app.md` there is still the fuller original design rationale (entity model, why BlockNote, the Scenes-vs-Threads-vs-Storylines distinction). Extracted into its own repo, consumed by host apps as a git submodule under `packages/campaign-session-planner` (see README.md).
