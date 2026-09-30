# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

- **Phase 1 "Memory" feature set** (player theories, unresolved questions, NPC attachments, a pre-session "previously established" briefing) is scoped and ready to build. See "Phase 1 Implementation Plan" below.
- **Template enrichment** (new toggle-headings on existing shipped templates — Scene pacing/collaboration prompts, NPC motivation depth, Thread pressure, Session player-contribution prompts) drawn from `template-proposals.md`'s compatible subset. See "Template Enrichment" below.
- **Further layout customization beyond the tab bar.** `CampaignSessionPlanner`'s `renderNav` prop (see `CHANGELOG.md`) only overrides the top tab bar. Every editor's own field order/markup (`NoteEditor`, `NpcEditor`, `SessionEditor`, etc.) is still fixed — a host that wants, say, a different field order or extra fields alongside the shipped ones currently has to fork. Needs its own scoping pass (likely a `renderFields`/slot-per-section API, similar in spirit to `renderNav`) once there's a concrete host need driving the shape of it, rather than guessing at an API up front.
- **No build step** (`package.json`'s `main`/`types` point straight at `src/index.ts`). Works today because every consumer is a Vite/esbuild-based bundler that transpiles TypeScript from a workspace member directly — a host on a different toolchain (plain `tsc`+Node, webpack without workspace-source transpilation, etc.) can't consume this package at all yet. Fixing this means adding a real build step (`tsup` or Vite library mode) emitting `dist/` + `.d.ts`, plus deciding how the CSS this package imports (BlockNote's own stylesheets, `theme.css`) gets shipped to a host that isn't already running this package's raw `.tsx` through its own CSS-aware bundler — a real design decision (a separate `dist/style.css` a host must import explicitly is the common pattern for React UI libraries) worth deciding deliberately rather than guessing at, since it changes how every host consumes this package. See README.md's "Known gaps" section.
- **The `[[`/`@` *typed-trigger* path (opening BlockNote's `SuggestionMenuController` via real keystrokes) is still untested** — confirmed genuinely impractical in jsdom, not just unattempted. See `CHANGELOG.md` for what was tried and why; `EntityReferenceInlineContent.test.tsx` covers the actual custom logic (render/click-dispatch) via pre-seeded content instead. Real coverage of the typed-trigger path itself would need a real browser (Playwright/Vitest browser mode), not jsdom — worth it only if this path actually breaks in practice, since BlockNote's own `SuggestionMenuController` (not this package's code) owns most of that mechanism.

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

- No `Player` entity, no `TTRPGHostAdapter` extension — the proposal's "Player Intent" layer needs that and is a real contract change (see `CHANGELOG.md`'s review notes); this plan only uses entities/interfaces that already exist.
- No Daggerheart-specific Hope/Fear fields — would require branching on `hostAdapter.getGameSystem()`, which nothing in this package does today and which would break host-agnosticism for the D&D host.
- No live-session "Table Facilitation" UI (safety tools, pulse meters, one-click buttons) — different subsystem, separate design pass.
- No new `SessionObservation` entity or closed enum schema — deliberately reuses `Note`'s existing free-text `type`/`status` design from Slice 4.2e instead of reintroducing per-field structure.

### Test coverage for this feature (per `CHANGELOG.md`'s testing conventions)

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

This is the cheapest of the remaining items on this roadmap: it's edits to string literals in one file (`entityTemplates.ts`), ships independent of the Phase 1 plan, and needs only pure-function tests (assert the new headings appear in the exported `PartialBlock[]` arrays) — same pattern as `entityTemplates.test.ts` already uses.

**Not compatible without a real design pass — templates for entity kinds that don't exist:** `Player Intent`, `Player Preferences`, `Observation`, `Collaboration Opportunity` (as its own entity, distinct from the Scene heading above), `Session Safety`, `Complication Bank`, `Next Session Briefing`, `Campaign Changes`, and `Story Possibility` aren't templates for anything in `TemplateEntityKind` — there's no `Player`, `Observation`, etc. entity to attach a template to. Templating them doesn't avoid the underlying issue:

- `Observation` is a verbatim restatement of the `SessionObservation` enum schema already rejected above (Phase 1 deliberately uses `Note.type`/`status` instead) — and it can't become "the Note template" either, since 4.2f ships one template per entity *kind*, not one per `Note.type`, so it would collide with every other kind of Note (General, Idea, Lore, ...).
- `Next Session Briefing` is the static-document version of the Phase 1 `SessionBriefingPanel` above — worth noting as validation of that plan's direction, but shipping it as a hand-filled template (GM retypes "Active Threads: ..." from memory each session) doesn't deliver the actual memory-system value; that's the reason Phase 1 builds it as a derived, live view instead of a template.
- The rest (`Player Intent`/`Preferences`, `Session Safety`, `Complication Bank`, `Campaign Changes`, `Story Possibility`) each imply either a new host-adapter contract (Player), a new persisted entity, or a new computed dashboard — same class of change flagged as out-of-scope in the Phase 1 plan above, for the same reasons (submodule-propagation cost, host-agnosticism, live-session UI being a separate subsystem).

---

## Source documents referenced above

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. See `CHANGELOG.md` for the review outcome; the Phase 1 plan above is the part of it judged worth building.
- `template-proposals.md` — a templated restatement of the same ideas; see "Template Enrichment" above for the compatible/incompatible split.
