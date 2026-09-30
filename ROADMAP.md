# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

- **Template enrichment** (new toggle-headings on existing shipped templates — Scene pacing/collaboration prompts, NPC motivation depth, Thread pressure, Session player-contribution prompts) drawn from `template-proposals.md`'s compatible subset. See "Template Enrichment" below.
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

**Not compatible without a real design pass — templates for entity kinds that don't exist:** `Player Intent`, `Player Preferences`, `Observation`, `Collaboration Opportunity` (as its own entity, distinct from the Scene heading above), `Session Safety`, `Complication Bank`, `Next Session Briefing`, `Campaign Changes`, and `Story Possibility` aren't templates for anything in `TemplateEntityKind` — there's no `Player`, `Observation`, etc. entity to attach a template to. Templating them doesn't avoid the underlying issue:

- `Observation` is a verbatim restatement of the `SessionObservation` enum schema already rejected above (Phase 1 deliberately uses `Note.type`/`status` instead) — and it can't become "the Note template" either, since 4.2f ships one template per entity *kind*, not one per `Note.type`, so it would collide with every other kind of Note (General, Idea, Lore, ...).
- `Next Session Briefing` is the static-document version of the Phase 1 `SessionBriefingPanel` above — worth noting as validation of that plan's direction, but shipping it as a hand-filled template (GM retypes "Active Threads: ..." from memory each session) doesn't deliver the actual memory-system value; that's the reason Phase 1 builds it as a derived, live view instead of a template.
- The rest (`Player Intent`/`Preferences`, `Session Safety`, `Complication Bank`, `Campaign Changes`, `Story Possibility`) each imply either a new host-adapter contract (Player), a new persisted entity, or a new computed dashboard — same class of change flagged as out-of-scope in the Phase 1 plan above, for the same reasons (submodule-propagation cost, host-agnosticism, live-session UI being a separate subsystem).

---

## Source documents referenced above

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. See `CHANGELOG.md` for the review outcome; the Phase 1 plan above is the part of it judged worth building.
- `template-proposals.md` — a templated restatement of the same ideas; see "Template Enrichment" above for the compatible/incompatible split.
