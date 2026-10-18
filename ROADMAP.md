# Roadmap

This file tracks **only currently-open work** — pending features/bugs and in-progress/scoped-but-not-yet-built plans. See `CHANGELOG.md` for everything already implemented.

---

## Pending Features

### 🔴 Bugs to Fix

None.

### 🟡 Features to Add / Test Coverage Gaps

None.

### 🔵 Refactoring Candidates (code-health audit, 2026-10-18)

Audited against `dnd-gm-dashboard-multiuser`'s own `docs/agents/component-standards.md`, `performance.md`, `react-patterns.md`, and `testing-philosophy.md` — that host app's AI-agent guides, used here as external criteria for "is this codebase fundamentally sound," not because this package imports anything from it. One refactor judged safe enough to execute immediately (see `CHANGELOG.md`); everything else below is a finding, not yet acted on, pending a decision on scope/risk.

**Already fixed**: `CampaignSessionPlanner.tsx` had the exact same ~15-line `onSave`/`onAutosave`/`onDelete` wiring copy-pasted 9 times (Note/Lore/Npc/Group/Location/Storyline/Thread/Quest/Event) — `react-patterns.md`'s "extract a hook when logic is reused" applies directly, and it was safe to do immediately since it's purely mechanical (no behavior change) and the existing 370-test suite — which already follows `testing-philosophy.md`'s Seam Test Standard, asserting exact `onSave` payloads rather than just "was it called" — catches any regression. Collapsed into one shared `buildCrudHandlers` helper; Session and Scene stay inlined (genuinely different wiring: Session's extra `onScenesChanged`/two templates, Scene's `sessionId`/`order` resolution). **Net effect on file size: roughly neutral** (934 → 940 lines) — the helper function itself is about as long as the duplication it replaced. The real win is eliminating 9 places that could silently drift out of sync, not a line-count reduction; the size problem below is still open.

**Open finding — `CampaignSessionPlanner.tsx` is ~940 lines.** `react-patterns.md`'s own bar: "Preferred: 50–150 lines. Acceptable: 150–250. Over 250: consider refactoring. Over 400: almost certainly doing too much." This file is over 400 by a wide margin. The remaining size is structural, not duplication: 11 entity kinds' hook wiring (~70 lines), an effect, template-override/view-state plumbing (~60 lines), 11 edit-view dispatch blocks (~400 lines even after the fix above, since each kind's JSX still needs its own explicit props), and the list-view config + render (~90 lines). A real fix would mean extracting each kind's edit-view block into its own small file/component (e.g. `routes/NoteEditorRoute.tsx`), receiving the shared pieces (`repository`, `campaignId`, `view`/`setView`, `runSaving`, `linksProp`, `templateOverride`, `isSaving`, `renderFields`) as explicit props. That's a bigger, genuinely risky change (9+ new files, non-trivial prop-threading, much larger review surface) than the mechanical fix above — not executed without an explicit decision to take it on. If pursued, it should land as its own dedicated pass, not bundled with anything else.

**Open finding — `SessionEditor.tsx` is one ~380-line component.** Also over the "over 250, consider refactoring" line, and close to "almost certainly doing too much." Unlike `CampaignSessionPlanner.tsx`, this isn't duplication — it's genuine breadth (Session's own fields, inline Scene list/reorder/edit, the Debrief sub-section, the Briefing/Readiness/Campaign-Changes panels, two autosave hooks, two sets of entity links). The cleanest extraction candidate is the Scene-management chunk (`scenesView` state, `sortedScenes`, `editingScene`, `sceneLinks`, `handleReorder`, the nested `SceneEditor` switch, and the "Scenes" `<fieldset>` JSX) into its own `SessionScenesSection` component — a real, self-contained "manage this Session's Scenes inline" responsibility. Not executed — moderate value, non-trivial prop-threading, worth a deliberate pass rather than a drive-by.

**Checked and found compliant — no action needed:**

- `QuickReferenceDrawer.tsx` (596 lines) holds three components (`QuickReferenceDrawerProvider` ~246 lines, `PanelHeader` ~35, `SearchPanel` ~218) — each individually within `react-patterns.md`'s acceptable band. The file is long because it holds several related, reasonably-sized components, not because any one of them is oversized.
- Every other editor (`SessionBriefingPanel`/`SceneEditor`/`LocationEditor`/`EventEditor`/`BlockNoteFreeformField`/`ThreadEditor`/`StorylineEditor`/`GroupEditor`, 200–230 lines) sits in the "acceptable" band. `NoteEditor.tsx` (325 lines) is the one outlier past "consider refactoring," driven by its extra Confidence/Memory-type machinery layered on the base fields — a minor, low-priority candidate, not a structural problem.
- **Testing** (`testing-philosophy.md`): already fully compliant, no changes made. This package's own `createFakeRepository` is a real in-memory implementation (not a naive mock), and every save-flow test already asserts the *exact* payload reaching the repository (`expect(onSave).toHaveBeenCalledWith({ title: '...', status: '...', ... }, null)`), not just that a function fired — exactly the Seam Test Standard and Anti-Pattern-1 avoidance this doc asks for. Predates this audit; confirmed, not changed.
- **Memoization** (`performance.md`): hooks' `useCallback`-wrapped `reload`/`createX`/`updateX`/`deleteX` are legitimate — each is a dependency of a `useEffect` (`useEffect(() => { reload(); }, [reload])`), so reference stability genuinely matters there; this isn't the "memoizing without profiling" anti-pattern the doc warns against.
- **Component library** (`component-standards.md`): that doc's Select/Button/Card are this *host's* shadcn/Radix component library — deliberately not adopted here. This package is consumed by two different host apps (`daggerheart-gm-dashboard-multiuser` and `dnd-gm-dashboard-multiuser`) and its own doc comments repeatedly state the package must stay host-agnostic, with no dependency on either host's UI library. The underlying concern the guide is protecting — accessible, labeled, keyboard-navigable form controls — is already met with plain `<select>`/`<button>`/`<label>` elements, which are natively accessible without needing a component library at all.
- **Forms/empty/loading states** (`component-standards.md`): already match — every editor explains validation errors near the field and preserves input on failure, `EntityListView.tsx` already has an explanatory empty state ("No X yet — create one to get started.") and a loading state ("Loading…"), not a blank screen.

---

## Ideas under consideration

Brainstormed while discussing what would make this a genuinely better GM prep/reference/recap tool, not yet scoped to file-level plans the way "Pending Features" entries above are. Recorded here so they aren't lost, not because they're ready to build.

**A hard boundary that applies to all of these**: this package is a *reference* tool, not where a GM manages actual players — that's the host app's job (`daggerheart-gm-dashboard-multiuser`/`dnd-gm-dashboard-multiuser` own initiative, character sheets, combat, the real "running the game" surface). Nothing here should require a GM to navigate away from that host-owned surface to use it. Concretely: no full-page/full-route UI. Anything built from these ideas should be small, non-modal, composable pieces — in the spirit of the existing `QuickReferenceDrawer` (floats over the host's page, `Dialog.Root modal={false}`, never traps focus or blocks the app underneath) — that a host places wherever its own live-session screen already has room, not a screen this package dictates.

None currently queued — every idea brainstormed in this round (Run Mode, Discoverability, Full-content search, Campaign Hygiene, Session Recap) has shipped; see `CHANGELOG.md`.

---

## Source documents referenced elsewhere

- `chatGPTWorkflowProposal.md` — a synthesis of ideas from the *Rolling with the Youth* GMing book. Every numbered idea in it now maps to something already shipped (see `CHANGELOG.md`), with one deliberately left out as game-system-specific (Daggerheart's Hope/Fear mechanic — not relevant to this host-agnostic package).
- `template-proposals.md` — a templated restatement of the same ideas; fully folded into the shipped starter templates (`src/lib/entityTemplates.ts`) — see `CHANGELOG.md` for the heading-level mapping.
