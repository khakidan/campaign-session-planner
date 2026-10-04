# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

The Safety Tools overlay (`SessionSafetyControls`) can now be shown/hidden via its new `visible` prop (e.g. hidden on a GM-permissioned layout, shown on a Player-permissioned one — this package has no auth/role concept of its own, so that's a host-side decision) and repositioned via `position` (any of the four corners, no longer hardcoded bottom-right), closing the "it would get in the way of the bug reporting tool" part of this. Still open: it's unclear from the UI alone what clicking a button actually does (nothing to the live session — each button just logs a timestamped Note for later review) — worth a collapsed/expanded state, or at least a tooltip/caption making that explicit, so a GM or player isn't left guessing.

---

## Ideas under consideration

Brainstormed while discussing what would make this a genuinely better GM prep/reference/recap tool, not yet scoped to file-level plans the way "Pending Features" entries above are. Recorded here so they aren't lost, not because they're ready to build.

**A hard boundary that applies to all of these**: this package is a *reference* tool, not where a GM manages actual players — that's the host app's job (`daggerheart-gm-dashboard-multiuser`/`dnd-gm-dashboard-multiuser` own initiative, character sheets, combat, the real "running the game" surface). Nothing here should require a GM to navigate away from that host-owned surface to use it. Concretely: no full-page/full-route UI. Anything built from these ideas should be small, non-modal, composable pieces — in the spirit of the existing `QuickReferenceDrawer` (floats over the host's page, `Dialog.Root modal={false}`, never traps focus or blocks the app underneath) — that a host places wherever its own live-session screen already has room, not a screen this package dictates.

None currently queued — every idea brainstormed in this round (Run Mode, Discoverability, Full-content search, Campaign Hygiene, Session Recap) has shipped; see `CHANGELOG.md`.

---

## Source documents referenced elsewhere

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. Every numbered idea in it now maps to something already shipped (see `CHANGELOG.md`), with one deliberately left out as game-system-specific (Daggerheart's Hope/Fear mechanic — not relevant to this host-agnostic package).
- `template-proposals.md` — a templated restatement of the same ideas; fully folded into the shipped starter templates (`src/lib/entityTemplates.ts`) — see `CHANGELOG.md` for the heading-level mapping.
