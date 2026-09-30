# Changelog

Everything implemented in this package so far, newest first. `ROADMAP.md` tracks only what's still pending — once something here is done, it comes out of that file.

This package has no release/version scheme yet (`package.json` is still `0.0.0`, unpublished, consumed via git submodule), so entries are grouped by change, not by version tag.

---

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
