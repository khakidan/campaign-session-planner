# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

- **No test infrastructure exists in this package at all** — no `vitest`/testing-library in `package.json`, no `tests/` dir. See "Testing Plan" below.
- **Phase 1 "Memory" feature set** (player theories, unresolved questions, NPC attachments, a pre-session "previously established" briefing) is scoped and ready to build. See "Phase 1 Implementation Plan" below.
- **Template enrichment** (new toggle-headings on existing shipped templates — Scene pacing/collaboration prompts, NPC motivation depth, Thread pressure, Session player-contribution prompts) drawn from `template-proposals.md`'s compatible subset. See "Template Enrichment" below — this is the cheapest of the three and can land independent of the other two.

---

## Testing Plan

This package currently ships zero tests of its own (README's "Known gaps" confirms: coverage today only exists indirectly, via `daggerheart-gm-dashboard-multiuser`'s `tests/components/CampaignSessionPlanner.test.tsx`). Before adding the Phase 1 feature set below — or anything else — this package needs its own test suite, following the same testing philosophy already established in the host repo (`docs/markdown/testing-philosophy.md`, referenced from its root `AGENTS.md`): tests must resemble real usage, assert on outcomes, and would actually fail if behavior broke. No shallow "was it called" assertions, no circular mock assertions, no asserting on internal state.

### 1. Add test tooling

`package.json` gets new `devDependencies` (this package has no runtime test deps today):

- `vitest` + `jsdom` (test runner/environment)
- `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- A `vitest.config.ts` at the package root (mirror the shape of the host repo's, since hosts already run Vite/esbuild against this package directly per the README)
- A `test` script in `package.json`

### 2. What counts as a "seam" in this package

The host repo's Seam Test Standard is about UI → service layer. In this package, the equivalent seam is **UI/hook → `CampaignPlannerRepository`**. Every hook in `src/hooks/*` and every editor in `src/components/*Editor.tsx` exists specifically to shape data before it crosses that interface, so that's where the highest-value tests live. `TTRPGHostAdapter` calls are the second seam (search/reference resolution).

Concretely, "don't mock the thing under test" means: build one small **fake `CampaignPlannerRepository`** (a plain object with in-memory arrays behind each method, not `vi.fn()` stubs returning fixed values), and use it directly in hook/component tests. Assert on what the fake actually received/returned, not on whether a mock function was "called." A real fake also means `useNotes`' `reload()`-after-mutation behavior gets validated for free, instead of asserted via call-count.

### 3. Priority order (highest-value first)

1. **`src/hooks/*.ts` (useNotes, useThreads, useNpcs, useSessions, useScenes, useEntityLinks, etc.)** — same shape, so one pattern covers all of them:
   - Seed the fake repository with fixture rows, render the hook, assert `result.current.notes` (etc.) equals the seeded data.
   - Call `createNote`/`updateNote`/`deleteNote` and assert the **exact object** now sitting in the fake repository's backing store (not just that `saveNote` "was called") — mirrors the "assert on the exact row data" rule for service tests.
   - `useEntityLinks` additionally needs a case asserting `sourceLabel`/`label` are captured correctly at link-creation time (this is a real, previously-noted fragility — see the `types/index.ts` comment about pre-4.2c links lacking `sourceLabel`).

2. **`src/components/*Editor.tsx` (NoteEditor, NpcEditor, SessionEditor, ThreadEditor, etc.)** — true seam tests:
   - Render the real editor with a fake repository/hostAdapter.
   - Use `@testing-library/user-event` to type into fields exactly as a GM would (title, type via the datalist input, tags, BlockNote content where feasible).
   - Click Save, and assert on the **complete values object** passed to `onSave` (every field, not just that it was called) — e.g. for `NoteEditor`, assert `title`, `type`, `status`, `tags` (as the parsed array, not the raw comma string), and `content` all match what was typed.
   - `SessionEditor` additionally needs a scene-reorder test: add two scenes, click "move down," and assert the resulting `order` values are swapped correctly (this is real bespoke logic in `handleReorder`, not framework behavior).
   - Cover the validation path (empty title → `onSave` never called, error text visible via `screen.getByText`), since that's user-observable behavior, not an implementation detail.

3. **`src/lib/*.ts` (entityTemplates, blockNoteUtils, recentEntities, entityQuickView)** — pure functions, no mocking needed at all. Feed them realistic inputs, assert on outputs.

4. **`src/components/EntityLinkPicker.tsx` / `EntityLinksPanel.tsx`** — search-and-link flow: type a query, assert the right results render (backed by a fake `hostAdapter.searchEntities`/`plannerItems`), pick one, assert `onAddLink` receives the correct `EntityReference` shape.

### 4. Explicit non-goals (per the testing philosophy's mocking rules)

- Don't mock `CampaignPlannerRepository` or `TTRPGHostAdapter` methods individually with `vi.fn()` returning canned values when a fixture-backed fake object does the same job more realistically — reserve real mocking for things this package can't run in a test at all (BlockNote's editor internals may need light mocking/stubbing since it's a heavy third-party rich-text engine, not because it's "the thing under test").
- Don't test `Block[]` (BlockNote document) internals — treat BlockNote content as an opaque value in hook/repository tests; only editor-level tests that render `BlockNoteFreeformField` need to touch it, and even then assert on the resulting `content` array reaching `onSave`, not the editor's internal state.

---

## Phase 1 Implementation Plan: Session Memory

This is the "Phase 1 — Memory" subset previously identified as the highest-value, lowest-risk piece of the `chatGPTWorkflowProposal.md` synthesis (player interests, character goals, player theories, NPC attachments, unresolved questions, and a "previously established" pre-session briefing) — scoped down to fit the package's actual architecture rather than the originally-proposed new `SessionObservation` entity/enum schema, which would have undone the Slice 4.2e consolidation to one freeform BlockNote document per entity.

**Core thesis carried forward:** don't make the planner a place where the GM writes what will happen — make it a place that remembers what's already happened and what players care about, and hands that back at the start of the next session. Concretely: extend what `Note` already does (it's a freeform, campaign-scoped, taggable, typed record — exactly the memory-object shape the proposal wanted) rather than inventing new entities, and add one small read-only view that surfaces the active ones.

### Why this needs zero `CampaignPlannerRepository`/`TTRPGHostAdapter` changes

`Note.type` and `Note.status` are already untyped `string | null` fields with UI-suggested (not enum-enforced) values (`NoteEditor.tsx`'s `SUGGESTED_TYPES` + a `<datalist>`). That means every "memory" concept from the proposal can be represented as a `Note` with a new suggested `type`, filtered by `status`. No new tables, no interface changes to propagate into `daggerheart-gm-dashboard-multiuser` or `dnd-gm-dashboard`'s repository implementations — this is a front-end-only, additive change to the already-unpublished, submodule-distributed package.

### File-level plan

1. **`src/components/NoteEditor.tsx`** — extend `SUGGESTED_TYPES` with the memory-specific values the proposal called out: `'Player Theory'`, `'Player Interest'`, `'Character Goal'`, `'NPC Attachment'`, `'Unresolved Question'`, `'Player-Created Fact'`, `'Future Hook'`. Purely additive to the existing datalist — no schema change, no migration.

2. **`src/lib/plannerMemory.ts`** (new, pure functions, no I/O — same shape as `entityTemplates.ts`/`recentEntities.ts`):
   - `MEMORY_NOTE_TYPES` — the constant list above, shared with `NoteEditor.tsx` (single source of truth instead of duplicating the string list).
   - `selectActiveMemoryNotes(notes: Note[]): Note[]` — filters to memory types with `status !== 'Resolved' && status !== 'Archived'` (free-text status, so this is a tolerant string check, not an enum match).
   - `selectActiveThreads(threads: Thread[]): Thread[]` — filters to `status === 'Open'` (or unset), reusing the existing `Thread` entity rather than inventing a new "thread pressure" schema.
   - `buildSessionBriefing(notes: Note[], threads: Thread[]): SessionBriefing` — groups the above into a small plain object (`{ playerTheories, playerInterests, characterGoals, npcAttachments, unresolvedQuestions, activeThreads }`) ready for a component to render. This is the one new "shape" this plan introduces, and it's a derived view, not a persisted entity.

3. **`src/hooks/useSessionBriefing.ts`** (new hook, same pattern as every other hook in `src/hooks/`):
   - Takes `repository`/`campaignId`, calls `useNotes` + `useThreads` internally (composition, not duplication), and returns `buildSessionBriefing(notes, threads)` via `useMemo`.
   - No new repository methods — it's built entirely on `getNotes`/`getThreads`, which already exist.

4. **`src/components/SessionBriefingPanel.tsx`** (new, read-only display component, styled consistently with `EntityLinksPanel.tsx`):
   - Renders the grouped briefing as labeled lists (e.g. "Player Theories worth revisiting," "Unresolved Questions," "Active Threads"), each item a click-through into the existing entity view (reuses `onOpenPlannerEntity`, already threaded through every editor).
   - Empty-state per group ("No open threads yet") rather than hiding groups, so a GM learns the feature exists even in a fresh campaign.

5. **`src/components/SessionEditor.tsx`** — mount `<SessionBriefingPanel>` above the session's own `BlockNoteFreeformField` details editor, but only when `session === null` (creating a new session) or `values.status === 'Draft'`/`'Prepared'` — i.e. exactly the pre-session-prep moment the proposal targeted, not during/after a `Running`/`Completed` session where it'd just be noise. Needs `plannerItems`/`onOpenPlannerEntity`, both already passed into `SessionEditor` today.

6. **`src/index.ts`** — export `useSessionBriefing`, `SessionBriefingPanel`, and the `SessionBriefing` type alongside the existing hook/component exports.

### Explicitly out of scope for this pass

- No `Player` entity, no `TTRPGHostAdapter` extension — the proposal's "Player Intent" layer needs that and is a real contract change (see the earlier review); this plan only uses entities/interfaces that already exist.
- No Daggerheart-specific Hope/Fear fields — would require branching on `hostAdapter.getGameSystem()`, which nothing in this package does today and which would break host-agnosticism for the D&D host.
- No live-session "Table Facilitation" UI (safety tools, pulse meters, one-click buttons) — different subsystem, separate design pass.
- No new `SessionObservation` entity or closed enum schema — deliberately reuses `Note`'s existing free-text `type`/`status` design from Slice 4.2e instead of reintroducing per-field structure.

### Test coverage for this feature (per the Testing Plan above)

- `plannerMemory.test.ts` — pure function tests: given a fixture array of `Note`s/`Thread`s with mixed types/statuses, assert `buildSessionBriefing` groups and excludes exactly the right ones (no mocking needed at all).
- `useSessionBriefing.test.ts` — fake-repository-backed hook test: seed notes/threads, render the hook, assert `result.current` matches the expected grouped shape; then mutate (add a new `Player Theory` note through `useNotes`' own `createNote`) and assert the briefing recomputes.
- `SessionBriefingPanel.test.tsx` — render with a fixture briefing, assert each group's items are visible via `screen.getByText`, assert clicking an item calls `onOpenPlannerEntity` with the correct `EntityReference`.
- `SessionEditor.test.tsx` — assert the panel is present when `session === null` and absent/not rendered once `status === 'Completed'`.

---

## Template Enrichment

`template-proposals.md` (a set of Notion-style templates for the same ideas in `chatGPTWorkflowProposal.md`) splits into two buckets once checked against `src/lib/entityTemplates.ts`'s actual `TEMPLATE_DEFAULTS` mechanism (Slice 4.2f: one shipped starter template per `TemplateEntityKind`, toggle-heading + guidance-paragraph shape, per-campaign overridable, purely default content of the entity's one BlockNote document — no schema, no repository change).

**Compatible now — new toggle-headings on templates that already exist:**

- `sceneTemplate` — add "Priority" (Core/Supporting/Optional) and "Pacing" (Keep/Cut/Compress if short on time; Expand/Follow Players if engaged) as heading guidance under `Situation`/`Outcomes`; add a "Collaboration Opportunity" heading with the checklist (different information / complementary abilities / shared objective / etc.) from `template-proposals.md`'s Scene and Collaboration Opportunity templates.
- `npcTemplate` — extend the existing "Motivation & Goals" guidance to explicitly include Will Do / Will Not Do, and add a "Current Pressure" and "Player Connection" heading (from `template-proposals.md`'s NPC template) alongside the existing "Current Situation".
- `threadTemplate` — add "Pressure" and "Player Investment" as heading guidance (freeform Low/Medium/High prompt text, not an enforced field) under the existing "Current State" section.
- `sessionTemplate` — extend "Outcomes" guidance to prompt for "Things Players Were Excited About" / "Things Players Disengaged From" (from the Aftermath and Session Pulse templates), and add a "Player Hooks" heading near the existing "Anticipated Content" link-section.
- `groupTemplate`/`storylineTemplate`/`questTemplate`/`eventTemplate`/`locationTemplate` — each gets one small "Player Contributions" or "Player-Created Details" heading, matching the corresponding template-proposals.md section, in the same additive, no-schema-change way.

This is the cheapest of the three items on this roadmap: it's edits to string literals in one file (`entityTemplates.ts`), ships independent of the Testing Plan or the Phase 1 plan, and needs only the pure-function tests already scoped for `entityTemplates` in the Testing Plan's priority-3 tier (assert the new headings appear in the exported `PartialBlock[]` arrays).

**Not compatible without a real design pass — templates for entity kinds that don't exist:** `Player Intent`, `Player Preferences`, `Observation`, `Collaboration Opportunity` (as its own entity, distinct from the Scene heading above), `Session Safety`, `Complication Bank`, `Next Session Briefing`, `Campaign Changes`, and `Story Possibility` aren't templates for anything in `TemplateEntityKind` — there's no `Player`, `Observation`, etc. entity to attach a template to. Templating them doesn't avoid the underlying issue:

- `Observation` is a verbatim restatement of the `SessionObservation` enum schema already rejected above (Phase 1 deliberately uses `Note.type`/`status` instead) — and it can't become "the Note template" either, since 4.2f ships one template per entity *kind*, not one per `Note.type`, so it would collide with every other kind of Note (General, Idea, Lore, ...).
- `Next Session Briefing` is the static-document version of the Phase 1 `SessionBriefingPanel` above — worth noting as validation of that plan's direction, but shipping it as a hand-filled template (GM retypes "Active Threads: ..." from memory each session) doesn't deliver the actual memory-system value; that's the reason Phase 1 builds it as a derived, live view instead of a template.
- The rest (`Player Intent`/`Preferences`, `Session Safety`, `Complication Bank`, `Campaign Changes`, `Story Possibility`) each imply either a new host-adapter contract (Player), a new persisted entity, or a new computed dashboard — same class of change flagged as out-of-scope in the Phase 1 plan above, for the same reasons (submodule-propagation cost, host-agnosticism, live-session UI being a separate subsystem).

---

## Design Proposition

- `chatGPTWorkflowProposal.md` — one attempt at incorporating concepts from the *Rolling with the Youth* book. Reviewed; see conversation history for the full critique (it conflicts with the Slice 4.2e freeform-document design in places, invents entities/contracts not discussed, and — checked against the actual PDF — generalizes several youth-safety-specific recommendations as if they were generic GM advice). The Phase 1 subset above is the part of it judged worth building, rescoped to fit the existing architecture.
- `template-proposals.md` — a templated restatement of the same ideas; see "Template Enrichment" above for the compatible/incompatible split.
