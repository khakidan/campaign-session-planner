# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

1. Scenes don't autosave — every top-level entity (Note/NPC/Group/Location/Session/Storyline/Thread/Quest/Event) now does via `useAutosave`, but a Scene's fields are still only written on an explicit Save click inside `SessionEditor.tsx`'s nested `SceneEditor`.

### 🟡 Features to Add / Test Coverage Gaps

1. Scenes should be pulled out of the Sessions entity and be visible along with all the other top level entities.
2. Lore should be its own top level entity.
3. Session Debriefs should be its own top level entity.
4. Status fields in Notes, NPCs, Quests, and Events should be better defined so that it is clear what the purpose of this field is.
5. Type field in Locations should be better defined so it is clear what the purpose of this field is.
6. Priority fields in Storylines, Threads should be better defined so it is clear what the purpose of this field is.
7. Event Type field in Events should be better defined so it is clear what the purpose of this field is.

---

## Ideas under consideration

Brainstormed while discussing what would make this a genuinely better GM prep/reference/recap tool, not yet scoped to file-level plans the way "Pending Features" entries above are. Recorded here so they aren't lost, not because they're ready to build.

**A hard boundary that applies to all of these**: this package is a *reference* tool, not where a GM manages actual players — that's the host app's job (`daggerheart-gm-dashboard-multiuser`/`dnd-gm-dashboard-multiuser` own initiative, character sheets, combat, the real "running the game" surface). Nothing here should require a GM to navigate away from that host-owned surface to use it. Concretely: no full-page/full-route UI. Anything built from these ideas should be small, non-modal, composable pieces — in the spirit of the existing `QuickReferenceDrawer` (floats over the host's page, `Dialog.Root modal={false}`, never traps focus or blocks the app underneath) — that a host places wherever its own live-session screen already has room, not a screen this package dictates.

None currently queued — every idea brainstormed in this round (Run Mode, Discoverability, Full-content search, Campaign Hygiene, Session Recap) has shipped; see `CHANGELOG.md`.

---

## Source documents referenced elsewhere

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. Every numbered idea in it now maps to something already shipped (see `CHANGELOG.md`), with one deliberately left out as game-system-specific (Daggerheart's Hope/Fear mechanic — not relevant to this host-agnostic package).
- `template-proposals.md` — a templated restatement of the same ideas; fully folded into the shipped starter templates (`src/lib/entityTemplates.ts`) — see `CHANGELOG.md` for the heading-level mapping.
