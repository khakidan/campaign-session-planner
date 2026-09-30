# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

- **Template enrichment** (new toggle-headings on existing shipped templates — Scene pacing/collaboration prompts, NPC motivation depth, Thread pressure, Session player-contribution prompts) drawn from `template-proposals.md`'s compatible subset. See "Template Enrichment" below.
- **Workflow & facilitation support** — a second pass over `chatGPTWorkflowProposal.md`/`template-proposals.md`, this time specifically for what would help a GM *think through preparing and running* a session the way the book describes (react to players, don't over-script, keep continuity), not just richer documents. Four concrete, architecture-compatible pieces identified; none need a new entity or host-adapter change. See "Phase 2 Implementation Plan" below.
- **Further layout customization beyond the tab bar.** `CampaignSessionPlanner`'s `renderNav` prop (see `CHANGELOG.md`) only overrides the top tab bar. Every editor's own field order/markup (`NoteEditor`, `NpcEditor`, `SessionEditor`, etc.) is still fixed — a host that wants, say, a different field order or extra fields alongside the shipped ones currently has to fork. Needs its own scoping pass (likely a `renderFields`/slot-per-section API, similar in spirit to `renderNav`) once there's a concrete host need driving the shape of it, rather than guessing at an API up front.
- **The `[[`/`@` *typed-trigger* path (opening BlockNote's `SuggestionMenuController` via real keystrokes) is still untested** — confirmed genuinely impractical in jsdom, not just unattempted. See `CHANGELOG.md` for what was tried and why; `EntityReferenceInlineContent.test.tsx` covers the actual custom logic (render/click-dispatch) via pre-seeded content instead. Real coverage of the typed-trigger path itself would need a real browser (Playwright/Vitest browser mode), not jsdom — worth it only if this path actually breaks in practice, since BlockNote's own `SuggestionMenuController` (not this package's code) owns most of that mechanism.

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

**Not compatible without a real design pass — templates for entity kinds that don't exist:** `Player Intent`, `Player Preferences`, `Observation`, `Collaboration Opportunity` (as its own entity, distinct from the Scene heading above), `Session Safety`, and `Story Possibility` aren't templates for anything in `TemplateEntityKind` — there's no `Player`, `Observation`, etc. entity to attach a template to. Templating them doesn't avoid the underlying issue:

- `Observation` is a verbatim restatement of the `SessionObservation` enum schema already rejected above (Phase 1 deliberately uses `Note.type`/`status` instead) — and it can't become "the Note template" either, since 4.2f ships one template per entity *kind*, not one per `Note.type`, so it would collide with every other kind of Note (General, Idea, Lore, ...).
- `Player Intent`/`Player Preferences` and `Session Safety` each imply a new host-adapter contract (a real `Player` concept the host would need to supply) or a persisted-entity/schema change — same class of change flagged as out-of-scope in the Phase 1 plan above, for the same reasons (submodule-propagation cost, host-agnosticism).

**Reconsidered — these don't actually need a new entity after all:** `Next Session Briefing`, `Complication Bank`, and `Campaign Changes` were originally lumped in with the list above on the assumption each needed new persisted state. On the closer look below (see "Phase 2 Implementation Plan"), none of them do:

- `Next Session Briefing` is already built — it's the Phase 1 `SessionBriefingPanel`, a derived live view rather than a hand-filled template, which is strictly better than templating it (a GM retyping "Active Threads: ..." from memory doesn't deliver the actual memory-system value).
- `Complication Bank` is just static prompt content — a checklist of "story accelerator" prompts a GM can tick off mid-session. It doesn't need its own entity; it can ship as a `checkListItem` section inside `sessionTemplate` itself, exactly like every other template heading.
- `Campaign Changes` doesn't need a new "dashboard" entity either — every entity this package already owns (`Note`, `Npc`, `Thread`, etc.) already has a real `updatedAt` column. "What changed since last session" is a pure computation over data already in the repository, not a new persisted concept.

---

## Phase 2 Implementation Plan: Workflow & Facilitation Support

A second, more targeted pass over `chatGPTWorkflowProposal.md` and `template-proposals.md`, specifically for the book's core workflow lesson — **Prepare → Play → Observe → Record → Update Campaign State → Prepare Again**, not a predetermined-plot document — rather than for individual template headings (that's "Template Enrichment" above). These four are scoped the same way Phase 1 was: no `CampaignPlannerRepository`/`TTRPGHostAdapter` changes, nothing that requires the host to supply a `Player` concept, and nothing that's actually live-session UI (Table Facilitation stays its own, separate, explicitly-deferred subsystem — see "Explicitly out of scope" below).

### 1. Complication Bank — a real checklist, not just a heading

The proposal's "story accelerator" prompts (an NPC arrives unexpectedly, an old thread resurfaces, a faction makes a move, ...) are exactly the kind of thing a GM wants *visible and tickable* mid-session, not buried as a paragraph of guidance text under a collapsed heading.

- **`src/lib/entityTemplates.ts`** — add a `checklistSection(title, items: string[])` helper (parallel to the existing `section`/`linkSection` helpers) that emits a toggle heading containing one `checkListItem` block per item (block type confirmed present in `@blocknote/core`'s default schema). Add a "Complication Bank" heading to `sessionTemplate` using it, seeded with the 10 prompts from `template-proposals.md`'s Complication Bank template.
- Per-campaign override already works for free — a GM who dislikes the shipped list edits or replaces it via the existing Template Settings panel, same as every other template section.
- **Test**: extend `entityTemplates.test.ts` to assert the new heading's children are `checkListItem` blocks with the expected text — same pure-function, no-mocking pattern already used there.

### 2. Session Readiness — a pre-session completeness check

The book's "mandatory check-in before play" is mostly about *character* prep this package doesn't own (no `Player` entity — out of scope, as above). But there's a real, GM-facing subset that's entirely computable from data this package already has: has this Session actually been prepared, not just created?

- **`src/lib/sessionReadiness.ts`** (new, pure functions, same shape as `plannerMemory.ts`): `checkSessionReadiness(session, scenes, links): SessionReadinessCheck[]`, each item `{ label: string, met: boolean }` — e.g. "Session has at least one Scene," "At least one active Thread or Quest is linked," "At least one NPC or Location is anticipated" (derived from `EntityLinksPanel`'s existing outgoing links, filtered to `thread`/`quest`/`npc`/`location` targets). No new repository calls — built on `getScenes`/`getLinks`, which already exist.
- **`src/components/SessionReadinessChecklist.tsx`** (new, read-only, styled like `SessionBriefingPanel`): renders each check with a ✓/⚠ marker. Deliberately doesn't block saving or navigating — it's a nudge, not a validation gate, consistent with the book's own point that this is guidance, not a rulebook.
- **`src/components/SessionEditor.tsx`** — mount alongside `SessionBriefingPanel`, same visibility condition (`session === null` or Draft/Prepared).
- **Test**: `sessionReadiness.test.ts` (pure function, fixture-driven), `SessionReadinessChecklist.test.tsx` (render + marker assertions), one `SessionEditor.test.tsx` case for visibility.

### 3. "Why This Session Matters" — cross-referencing the Phase 1 briefing against this session's own links

Phase 1's `SessionBriefingPanel` already surfaces every active memory Note/Thread campaign-wide. The proposal's sharper ask — "why might *this* session matter to each character?" — is a narrower, session-scoped version of the same idea: which of those active threads/theories are actually connected (via the same `EntityLink` graph every other cross-reference in this package already uses) to something this Session has linked?

- **`src/lib/plannerMemory.ts`** — add `selectRelevantToSession(briefing: SessionBriefing, sessionLinks: EntityLink[]): SessionBriefing`, filtering each group to items that share a linked entity with `sessionLinks` (or, simplest first pass, items directly linked to the Session itself). Still zero new I/O — `useEntityLinks` already loads a Session's own links.
- **`src/components/SessionBriefingPanel.tsx`** — accept an optional `relevanceFilter` flag (or a pre-filtered `briefing` prop from the caller); when a Session already has its own links loaded, show a "Relevant to this session" subset above the full campaign-wide lists, rather than replacing them (players' unresolved theories about an unrelated thread are still worth a glance, just not the headline).
- This is explicitly the smallest, most conservative version of the proposal's "Player Intent" layer that doesn't require a `Player` entity — it rides entirely on data this package already persists (`Note`, `Thread`, `EntityLink`).

### 4. Campaign Changes — "what's changed since last session"

The proposal's "What changed?" dashboard doesn't need a new entity, a snapshot table, or a diffing engine — every entity already carries a real `updatedAt`. "Changed" can mean, simply, "touched since the previous Session's `date`."

- **`src/lib/campaignChanges.ts`** (new, pure functions): `selectChangedSince(entities: { id, updatedAt }[], since: string): T[]` (a generic timestamp filter), and `buildCampaignChanges(repository state, since)` composing it across NPCs/Groups/Locations/Threads/Quests/Events into one grouped object, mirroring `buildSessionBriefing`'s shape.
- **`src/hooks/useCampaignChanges.ts`** (new hook): takes `repository`/`campaignId` and a `since` timestamp (the previous Session's `date`, or the campaign's most recently completed Session — caller's choice), composes the existing per-kind hooks, returns the grouped result via `useMemo`.
- **`src/components/CampaignChangesPanel.tsx`** (new, read-only, same list/click-through/empty-state pattern as `SessionBriefingPanel`/`EntityLinksPanel`).
- **`src/components/SessionEditor.tsx`** — surface this only where the book's own workflow puts it: at the top of a *new* Session being created right after the previous one completed, i.e. `session === null && sessions.length > 0`, using the most recent prior Session's `date` as `since`. This is deliberately the mirror image of `SessionBriefingPanel` (backward-looking "what changed" vs. forward-looking "what's already established") — both can be shown together without conflict.
- **Test**: `campaignChanges.test.ts` (pure timestamp filtering, no mocking), `useCampaignChanges.test.ts` (fake-repository-backed), `CampaignChangesPanel.test.tsx`.

### Explicitly out of scope for this pass (unchanged reasoning from Phase 1)

- No `Player` entity or `TTRPGHostAdapter` extension — "Player Intent"/"Player Preferences"/"Player Style" as the proposal describes them need real per-player state this package has no host contract for. Item 3 above is the closest conservative approximation buildable without one.
- No Daggerheart-specific Hope/Fear "Scene Pressure" fields — game-system-specific, would break host-agnosticism for the D&D host.
- No live-session "Table Facilitation" UI (safety tools, X-Card, pause/rewind controls, live Session Pulse dials, one-click "record consequence" buttons) — a genuinely different subsystem (real-time, in-session interaction) from everything else this package does (async, between-session prep/record-keeping). Worth a dedicated design pass of its own if ever pursued, not a few added headings.
- No `SessionObservation` entity/enum, no `Player`-scoped `Player Preferences` entity — both already rejected under Phase 1 for the same reason (Slice 4.2e's one-freeform-document-per-entity design), and nothing here reopens that.

---

## Source documents referenced above

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. See `CHANGELOG.md` for the review outcome; the Phase 1 plan above is the part of it judged worth building.
- `template-proposals.md` — a templated restatement of the same ideas; see "Template Enrichment" above for the compatible/incompatible split.
