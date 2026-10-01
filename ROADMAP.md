# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

None currently open.

---

## Ideas under consideration

Brainstormed while discussing what would make this a genuinely better GM prep/reference/recap tool, not yet scoped to file-level plans the way "Pending Features" entries above are. Recorded here so they aren't lost, not because they're ready to build.

**A hard boundary that applies to all of these**: this package is a *reference* tool, not where a GM manages actual players — that's the host app's job (`daggerheart-gm-dashboard-multiuser`/`dnd-gm-dashboard-multiuser` own initiative, character sheets, combat, the real "running the game" surface). Nothing here should require a GM to navigate away from that host-owned surface to use it. Concretely: no full-page/full-route UI. Anything built from these ideas should be small, non-modal, composable pieces — in the spirit of the existing `QuickReferenceDrawer` (floats over the host's page, `Dialog.Root modal={false}`, never traps focus or blocks the app underneath) — that a host places wherever its own live-session screen already has room, not a screen this package dictates.

- **Session recap as an output, not just an input.** The Debrief today is something a GM writes for themselves. A guided flow that turns those answers into a clean, shareable, player-facing "what happened last time" page/document would close a loop that doesn't exist yet — this package would need to decide whether it owns rendering that output itself or just structures the data well enough for a host to build the shareable page.
- **Campaign hygiene view.** A between-sessions, campaign-wide dashboard — stale Threads untouched in N sessions, NPCs with no recent activity, orphaned entities with no links — mirroring the existing `CampaignChangesPanel`'s "what changed" pattern but looking backward across the whole campaign rather than since one prior Session.

---

## Source documents referenced elsewhere

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. Every numbered idea in it now maps to something already shipped (see `CHANGELOG.md`), with one deliberately left out as game-system-specific (Daggerheart's Hope/Fear mechanic — not relevant to this host-agnostic package).
- `template-proposals.md` — a templated restatement of the same ideas; fully folded into the shipped starter templates (`src/lib/entityTemplates.ts`) — see `CHANGELOG.md` for the heading-level mapping.
