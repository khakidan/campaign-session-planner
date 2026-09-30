# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

- **Further layout customization beyond the tab bar.** `CampaignSessionPlanner`'s `renderNav` prop (see `CHANGELOG.md`) only overrides the top tab bar. Every editor's own field order/markup (`NoteEditor`, `NpcEditor`, `SessionEditor`, etc.) is still fixed — a host that wants, say, a different field order or extra fields alongside the shipped ones currently has to fork. Needs its own scoping pass (likely a `renderFields`/slot-per-section API, similar in spirit to `renderNav`) once there's a concrete host need driving the shape of it, rather than guessing at an API up front.
- **The `[[`/`@` *typed-trigger* path (opening BlockNote's `SuggestionMenuController` via real keystrokes) is still untested** — confirmed genuinely impractical in jsdom, not just unattempted. See `CHANGELOG.md` for what was tried and why; `EntityReferenceInlineContent.test.tsx` covers the actual custom logic (render/click-dispatch) via pre-seeded content instead. Real coverage of the typed-trigger path itself would need a real browser (Playwright/Vitest browser mode), not jsdom — worth it only if this path actually breaks in practice, since BlockNote's own `SuggestionMenuController` (not this package's code) owns most of that mechanism.
- **Daggerheart-specific Hope/Fear "Scene Pressure" content** — the one item from `chatGPTWorkflowProposal.md` still deliberately left out. Game-system-specific; nothing in this package branches on `hostAdapter.getGameSystem()` today, and adding Hope/Fear-flavored template content would either be wrong for the D&D host or require that branch, which is a real, deliberate architecture decision this package hasn't made yet.

---

## Source documents referenced elsewhere

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. Every numbered idea in it now maps to something already shipped (see `CHANGELOG.md`) or the one item above still out of scope.
- `template-proposals.md` — a templated restatement of the same ideas; fully folded into the shipped starter templates (`src/lib/entityTemplates.ts`) — see `CHANGELOG.md` for the heading-level mapping.
