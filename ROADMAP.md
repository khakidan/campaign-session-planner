# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

- **Template enrichment** (new toggle-headings on existing shipped templates) — see "Template Enrichment" below.
- **Workflow, collaboration & facilitation support** — a full re-pass over `chatGPTWorkflowProposal.md`/`template-proposals.md` against this package's actual architecture, this time checking *every* actionable item in the proposal rather than stopping at the ones that were obviously cheap. Corrects two earlier mistakes: "Player Intent" and "Session Safety" were wrongly flagged as needing a new entity/host-adapter change (they don't — see below), and the whole "Collaborative Storytelling" category (Paint the Scene, Yes-and, Player-created canon) was skipped entirely in the prior pass. See "Phase 2 Implementation Plan" below for the corrected, much more complete plan.
- **Further layout customization beyond the tab bar.** `CampaignSessionPlanner`'s `renderNav` prop (see `CHANGELOG.md`) only overrides the top tab bar. Every editor's own field order/markup (`NoteEditor`, `NpcEditor`, `SessionEditor`, etc.) is still fixed — a host that wants, say, a different field order or extra fields alongside the shipped ones currently has to fork. Needs its own scoping pass (likely a `renderFields`/slot-per-section API, similar in spirit to `renderNav`) once there's a concrete host need driving the shape of it, rather than guessing at an API up front.
- **The `[[`/`@` *typed-trigger* path (opening BlockNote's `SuggestionMenuController` via real keystrokes) is still untested** — confirmed genuinely impractical in jsdom, not just unattempted. See `CHANGELOG.md` for what was tried and why; `EntityReferenceInlineContent.test.tsx` covers the actual custom logic (render/click-dispatch) via pre-seeded content instead. Real coverage of the typed-trigger path itself would need a real browser (Playwright/Vitest browser mode), not jsdom — worth it only if this path actually breaks in practice, since BlockNote's own `SuggestionMenuController` (not this package's code) owns most of that mechanism.

---

## Template Enrichment

`template-proposals.md` (a set of Notion-style templates for the same ideas in `chatGPTWorkflowProposal.md`) splits against `src/lib/entityTemplates.ts`'s actual `TEMPLATE_DEFAULTS` mechanism (Slice 4.2f: one shipped starter template per `TemplateEntityKind`, toggle-heading + guidance-paragraph shape, per-campaign overridable, purely default content of the entity's one BlockNote document — no schema, no repository change).

**Compatible now — new toggle-headings on templates that already exist:**

- `sceneTemplate` — add "Priority" (Core/Supporting/Optional), "Time Budget" (a freeform estimate, e.g. "15 min"), and "Pacing" (Keep/Cut/Compress if short on time; Expand/Follow Players if engaged) as heading guidance under `Situation`/`Outcomes`; add a "Collaboration Opportunity" heading with the checklist (different information / complementary abilities / shared objective / etc.); add "Scene Truth" and "Player Prompts" headings for Paint the Scene (see Phase 2 item 5 below — these two are simple enough to ship as plain template headings rather than needing their own plan item); add one guidance line under "GM Guidance" for the "don't over-prepare" reminder ("Not everything needs an answer yet — it's fine to leave what happens next unknown and react to the players").
- `npcTemplate` — extend the existing "Motivation & Goals" guidance to explicitly include Will Do / Will Not Do, and add a "Current Pressure" and "Player Connection" heading alongside the existing "Current Situation".
- `threadTemplate` — add "Pressure" and "Player Investment" as heading guidance (freeform Low/Medium/High prompt text, not an enforced field) under the existing "Current State" section.
- `sessionTemplate` — add a "Complication Bank" checklist (see Phase 2 item 1 below); add a "Player Hooks" heading near the existing "Anticipated Content" link-section.
- `sessionDebriefTemplate` — add "Things Players Were Excited About" / "Things Players Disengaged From" (from the Aftermath template) and a "Session Pulse" checklist heading (Combat/Exploration/Social/Character/Mystery/Worldbuilding/Comedy — a `checkListItem` list the GM ticks after a session, purely reflective, not a live in-session dial).
- `npcTemplate`/`groupTemplate`/`locationTemplate` — replace the single vague "Player Contributions" heading originally planned here with the sharper three-way split the proposal actually describes: **GM Canon** / **Player Canon** / **Shared Canon** headings (see Phase 2 item 7 below for the rationale — this is a refinement of what was previously planned here, not new scope).
- `storylineTemplate`/`questTemplate`/`eventTemplate` — each keeps the simpler single "Player Contributions" heading (these three don't have the same "who established this fact" ambiguity a Location/NPC/Group does, so the fuller three-way split isn't worth the extra headings there).

This is still the cheapest item on this roadmap: it's edits to string literals in one file (`entityTemplates.ts`), and needs only pure-function tests (assert the new headings/checklist items appear in the exported `PartialBlock[]` arrays) — same pattern as `entityTemplates.test.ts` already uses.

**Genuinely not compatible without a real design pass:**

- **Daggerheart-specific Hope/Fear "Scene Pressure" fields** — the one item in the whole proposal that's actually game-system-specific. Nothing in this package branches on `hostAdapter.getGameSystem()` today; adding Hope/Fear-flavored template content would either be wrong for the D&D host or require that branch, which is a real, deliberate architecture decision this package hasn't made yet. Left out unless/until there's a real per-system content story.
- **`SessionObservation` as a new entity/enum** — already deliberately rejected under Phase 1 (`Note.type`/`status` does the same job without a schema change). Nothing here reopens that.

Everything else originally on this "not compatible" list (`Player Intent`, `Player Preferences`, `Observation`, `Session Safety`, `Complication Bank`, `Next Session Briefing`, `Campaign Changes`, `Story Possibility`, `Collaboration Opportunity` as a standalone entity) turned out to be achievable without a new entity or host-adapter change — see "Phase 2 Implementation Plan" below for exactly how each one is now scoped.

---

## Phase 2 Implementation Plan: Workflow, Collaboration & Facilitation Support

The corrected, full-coverage pass. Each item below traces back to a specific numbered idea in `chatGPTWorkflowProposal.md`. **None of these need a `CampaignPlannerRepository`/`TTRPGHostAdapter` interface change** — the key realization that reopened several previously-dismissed items is that `EntityLink` can already target a host-owned `'character'` (`HostEntityType` already includes it, and `EntityLinkPicker.tsx` already searches host entities via `hostAdapter.searchEntities` and links to them with `source: 'host'`). A Note can already be tied to a specific PC today. That single existing mechanism is what makes most of the proposal's "Player Intent" layer buildable without inventing a `Player` entity.

### 1. Complication Bank — a real checklist, not just a heading

- **`src/lib/entityTemplates.ts`** — add a `checklistSection(title, items: string[])` helper (parallel to `section`/`linkSection`) emitting a toggle heading containing one `checkListItem` block per item (confirmed present in `@blocknote/core`'s default block schema). Add it to `sessionTemplate`, seeded with the 10 prompts from `template-proposals.md`'s Complication Bank template.
- Per-campaign override already works for free via the existing Template Settings panel.
- **Test**: extend `entityTemplates.test.ts` to assert the heading's children are `checkListItem` blocks with the expected text.

### 2. Session Readiness — a pre-session completeness check

- **`src/lib/sessionReadiness.ts`** (new, pure functions): `checkSessionReadiness(session, scenes, links): SessionReadinessCheck[]`, each `{ label, met }` — e.g. "Session has at least one Scene," "At least one active Thread or Quest is linked," "At least one NPC or Location is anticipated" (from existing outgoing links). Built entirely on `getScenes`/`getLinks`, already in the repository interface.
- **`src/components/SessionReadinessChecklist.tsx`** (new, read-only, styled like `SessionBriefingPanel`) — a nudge, not a save-blocking gate.
- **`src/components/SessionEditor.tsx`** — mount alongside `SessionBriefingPanel`, same visibility rule (`session === null` or Draft/Prepared).
- **Test**: `sessionReadiness.test.ts` (pure, fixture-driven), `SessionReadinessChecklist.test.tsx`, one `SessionEditor.test.tsx` visibility case.

### 3. Player Intent & Player Preferences — via existing Note↔Character links, not a new entity

This is the corrected version of what the last pass wrongly ruled out.

- **No repository/host-adapter change.** A GM records `Note`s with `type: 'Player Interest' | 'Character Goal' | 'Player Theory'` (already shipped in `MEMORY_NOTE_TYPES`) or the two new types below, and links each one to the relevant host `'character'` via the *existing* "Add Link" → `EntityLinkPicker` flow — already fully wired, needs zero new code to work today.
- **`src/lib/plannerMemory.ts`** — add `'Player Preference'` to `MEMORY_NOTE_TYPES` (Enjoys/Often Contributes/Needs Opportunities For — the proposal's "Player Style" section, deliberately framed as a note a GM writes, not a permanent label). Add `groupMemoryByCharacter(notes: Note[], links: EntityLink[]): Map<EntityId, Note[]>` — groups already-active memory Notes by the host `'character'` id each is linked to (via `EntityLink.targetType === 'character'`), for Notes with no such link, they simply don't appear in the per-character breakdown (they still appear in the plain campaign-wide groups).
- **`src/hooks/useSessionBriefing.ts`** — optionally accept `hostAdapter` and resolve `groupMemoryByCharacter`'s Note groups into `{ character: TTRPGCharacter, notes: Note[] }[]` via `hostAdapter.getCharacters`, giving the proposal's exact "why might this session matter to Seraphine / Thorn / Bramble" breakdown.
- **`src/components/SessionBriefingPanel.tsx`** — render an optional "Why This Session Matters" section, one sub-list per character, above the plain campaign-wide groups.
- **Test**: `plannerMemory.test.ts` (grouping logic, no mocking), `useSessionBriefing.test.ts` (fake repository + fake host adapter), `SessionBriefingPanel.test.tsx` (per-character rendering).

### 4. Campaign Changes — "what's changed since last session"

- **`src/lib/campaignChanges.ts`** (new, pure functions): `selectChangedSince(entities: { id, updatedAt }[], since: string): T[]`, and `buildCampaignChanges(state, since)` composing it across NPCs/Groups/Locations/Threads/Quests/Events — every one of them already carries a real `updatedAt`.
- **`src/hooks/useCampaignChanges.ts`** (new) — takes `repository`/`campaignId`/`since` (the previous Session's `date`), composes the existing per-kind hooks, returns the grouped result via `useMemo`.
- **`src/components/CampaignChangesPanel.tsx`** (new, same list/click-through/empty-state pattern as `SessionBriefingPanel`).
- **`src/components/SessionEditor.tsx`** — show only for a brand-new Session created after a prior one exists (`session === null && sessions.length > 0`), using the most recent prior Session's `date` as `since`. Backward-looking counterpart to `SessionBriefingPanel`'s forward-looking view; both can render together.
- **Test**: `campaignChanges.test.ts`, `useCampaignChanges.test.ts`, `CampaignChangesPanel.test.tsx`.

### 5. Paint the Scene & Yes-and — collaborative-storytelling prompts (previously skipped entirely)

- **`sceneTemplate`** (`entityTemplates.ts`) — add "Scene Truth" (one established fact the GM states) and "Player Prompts" (a short guidance list: "What detail tells you this place was once important?", "What does your character notice or remember here?", "Who recognizes something here, and how?") as toggle headings. Purely template content — no new plan item needed beyond the "Template Enrichment" entry above; listed here for traceability back to the proposal's item 4.
- **A new suggested Note type, `'Player Contribution'`** (`plannerMemory.ts`'s `MEMORY_NOTE_TYPES`, or a small adjacent list if it shouldn't count toward the "active memory" briefing groups — needs a naming decision, not an architecture one) for capturing the proposal's "Yes, and..." chain: a player's proposed idea, with the GM's own "**And...**" follow-ups written straight into the same BlockNote document as the conversation develops. No new mechanism — this is exactly what a freeform BlockNote document with `[[`/`@` linking already does; the only real work is the suggested type and a short guidance paragraph (in `NoteEditor.tsx`'s doc comment or a placeholder in the (currently empty) `noteTemplate`) describing the Accept → Develop pattern (existing NPC connection? existing faction connection? new NPC? cost? complication? future thread?) so a GM sees the prompt instead of a blank page.
- **Test**: covered by existing `entityTemplates.test.ts` (new headings) and `NoteEditor.test.tsx` (new suggested type appears in the datalist) — no new files needed.

### 6. Type-specific Note starter content (the mechanism items 7 and 8 both need)

Today, `TEMPLATE_DEFAULTS` ships one template per `TemplateEntityKind`, and `Note` deliberately has none (`noteTemplate` is `[]`) since a generic Note has no fixed shape. Two of the proposal's ideas (Session Safety, and a stronger Player Contribution prompt than a single guidance paragraph) want a *specific* `Note.type` to come with its own starter content — a genuinely new, small mechanism, not just another template entry.

- **`src/lib/noteTypeTemplates.ts`** (new, small): `NOTE_TYPE_TEMPLATES: Partial<Record<string, PartialBlock[]>>`, keyed by the exact suggested `type` string (e.g. `'Session Safety'`), each value a `PartialBlock[]` built with the same `heading`/`section` helpers already in `entityTemplates.ts` (export those helpers instead of keeping them file-private).
- **`src/components/NoteEditor.tsx`** — when creating a brand-new Note (`note === null`) and the GM picks a type with an entry in `NOTE_TYPE_TEMPLATES`, and `content` is still empty, offer to apply that starter content (mirrors how `BlockNoteFreeformField`'s existing `template` prop already seeds a document — same prop, just conditionally sourced from `NOTE_TYPE_TEMPLATES[type]` instead of a fixed default).
- **Test**: `noteTypeTemplates.test.ts` (pure content assertions), one `NoteEditor.test.tsx` case confirming the starter content applies only for a matching type on a new, empty Note.

### 7. Session Safety — as a Note type, not a new entity

- Uses mechanism #6 above. `NOTE_TYPE_TEMPLATES['Session Safety']` ships the Rating / Lines / Veils / Tools (`checkListItem`s for X-Card, Pause, Rewind, Fast Forward, Resume) / Session-Specific Concerns / Active Boundaries sections from `template-proposals.md`'s Session Safety template.
- Add `'Session Safety'` to `NoteEditor.tsx`'s `SUGGESTED_TYPES` (not `MEMORY_NOTE_TYPES` — it isn't session-progress memory, it's a standing reference document, closer to a campaign-level Note a GM writes once and revisits).
- **Why a Note and not a new field/entity**: a campaign's safety tools aren't inherently tied to one Session (the proposal itself treats it as durable, table-wide context, occasionally revised) — a single pinned Note is a better fit than per-Session duplication, and it's immediately linkable/backlinkable to Sessions via the existing `EntityLink` graph if a GM wants session-specific concerns tracked separately.

### 8. Player-created canon — GM Canon / Player Canon / Shared Canon

- Refines the "Player Contributions" heading already planned (previous pass) for `npcTemplate`/`groupTemplate`/`locationTemplate` into the three-way split the proposal actually describes, since "who established this" is a real, useful distinction for exactly these three kinds (a Location/NPC/Group is the thing most likely to accumulate both GM-authored and player-authored facts over a campaign's life) — see the "Template Enrichment" entry above for the concrete heading names.
- No new mechanism beyond template headings — an explicit non-goal is *enforcing* the distinction (e.g. locking "Player Canon" from GM edits); this is guidance structure for a human, same trust model as every other freeform template section.

### 9. Table Facilitation — live-session controls (the one item needing new UI surface, not just template content)

The prior pass blanket-deferred this as "a different subsystem." That's over-stated: `Session.status` already has a real `'Running'` value (`SUGGESTED_STATUSES` in `SessionEditor.tsx`), and `QuickReferenceDrawerProvider` already establishes the pattern this package uses for an always-mounted, floats-over-everything overlay. What's proposed here reuses both rather than inventing a new subsystem — but it's still real, standalone UI work, not a template edit, so it's sequenced last.

- **`src/components/SessionSafetyControls.tsx`** (new) — a small persistent control (styled consistently with the Quick-reference Drawer's own floating trigger), shown only while a campaign has a Session with `status === 'Running'` (found via the already-loaded `useSessions` list — no new query). Buttons: Pause / Resume / Rewind / Fast Forward / X-Card.
- **What each button actually does**: not a video-call-style hard state machine (nothing here should block real gameplay) — each writes a timestamped `Note` (`type: 'Safety Event'` or similar, linked to the running Session via `EntityLink`) recording that the tool was invoked, so it shows up in that Session's own linked-entities list afterward. This is deliberately the same "just a Note + EntityLink" pattern as everything else in this plan, not a new persisted concept.
- **Where it mounts**: exported for a host to render at its own app-shell level (same integration point as `QuickReferenceDrawerProvider` today) — this package still never owns routing/global layout, per the architecture doc's core boundary.
- **Test**: `SessionSafetyControls.test.tsx` (renders only while a Session is Running, each button writes the expected Note+EntityLink pair through the fake repository).
- **Deliberately not built**: Lines/Veils/rating display *during* play (that's the Session Safety Note from item 7 — a GM re-opens it via the Quick-reference Drawer's search, already fully wired, rather than this needing its own duplicate UI), and a live "Session Pulse" dial (kept as the post-session reflective checklist in "Template Enrichment" instead, per the proposal's own emphasis on capturing preferences *between* sessions rather than instrumenting play in real time).

### What's still genuinely out of scope

Only two items survive as real exclusions, both explained in "Template Enrichment" above: Daggerheart-specific Hope/Fear "Scene Pressure" content (game-system-specific, no per-system branching exists in this package today), and a `SessionObservation` entity/enum (superseded by `Note.type`/`status`, a deliberate simplification carried over from Phase 1, not a gap).

---

## Source documents referenced above

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. Every numbered idea in it now maps to something in "Template Enrichment" or "Phase 2 Implementation Plan" above, is already shipped (see `CHANGELOG.md`), or is one of the two items explicitly called out as still out of scope.
- `template-proposals.md` — a templated restatement of the same ideas; see "Template Enrichment" above for the concrete heading-level mapping.
