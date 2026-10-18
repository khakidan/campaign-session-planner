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

**Already fixed (all five passes)**:

1. `CampaignSessionPlanner.tsx` had the exact same ~15-line `onSave`/`onAutosave`/`onDelete` wiring copy-pasted 9 times (Note/Lore/Npc/Group/Location/Storyline/Thread/Quest/Event) — `react-patterns.md`'s "extract a hook when logic is reused" applies directly, and it was safe to do immediately since it's purely mechanical (no behavior change) and the existing 370-test suite — which already follows `testing-philosophy.md`'s Seam Test Standard, asserting exact `onSave` payloads rather than just "was it called" — catches any regression. Collapsed into one shared `buildCrudHandlers` helper (`src/lib/plannerRoutes.ts`); Session and Scene stay custom (genuinely different wiring: Session's extra `onScenesChanged`/two templates, Scene's `sessionId`/`order` resolution). That pass's net effect on file size was roughly neutral (934 → 940 lines) — the value was eliminating 9 places that could silently drift out of sync, not a line-count reduction.
2. Given the green light to go further: each of the 11 kinds' edit-view wiring (the `if (activeKind === 'x' && view.mode === 'edit') { ... return <XEditor .../> }` block) moved into its own `*EditorRoute.tsx` component (`NoteEditorRoute`, `LoreEditorRoute`, `NpcEditorRoute`, `GroupEditorRoute`, `LocationEditorRoute`, `SessionEditorRoute`, `SceneEditorRoute`, `StorylineEditorRoute`, `ThreadEditorRoute`, `QuestEditorRoute`, `EventEditorRoute`), each receiving the shared pieces (`repository`, `campaignId`, `isSaving`, `linksProp`, `setView`/`runSaving`) plus its own kind-specific list/CRUD functions/template/renderFields as explicit props — `buildCrudHandlers` moved alongside into `src/lib/plannerRoutes.ts` so every "simple" kind's route can reuse it. **This time the line-count win was real**: `CampaignSessionPlanner.tsx` dropped from 940 to 661 lines; every new route file lands in the 72–131 line range, comfortably in `react-patterns.md`'s "Preferred: 50–150" band. Purely mechanical again — same 370-test suite passes unchanged, confirming no behavior moved along with the code.
3. The remaining open finding below — `SessionEditor.tsx`'s Scene-management slice (`scenesView` state, the inline Scene-editing switch, the "Scenes" `<fieldset>`, each editing Scene's own `EntityLinksPanel` wiring, and reorder) — moved into a new `SessionScenesSection.tsx`, a real, self-contained "manage this Session's Scenes inline" responsibility. `SessionEditor.tsx` keeps `useScenes`/`sortedScenes` (its own Readiness checklist still needs them) and hands the CRUD functions down as props; `SessionScenesSection` owns the rest, including — via a render-prop — whether to show the rest of the Session form or replace it entirely with the inline Scene editor, matching the prior early-return behavior exactly. `SessionEditor.tsx` dropped from 510 to 365 lines; the new file is 238 lines. Same 370-test suite passes unchanged.
4. A follow-up pass over `CampaignSessionPlanner.tsx` and `SessionScenesSection.tsx` found a genuine duplication the prior three passes missed: both built the exact same `EntityEditorLinksProps` wrapper around `useEntityLinks` — one for whichever top-level record is being edited, one for whichever Scene is being edited inline. Collapsed into one shared `useEntityLinksProp` hook (`src/hooks/useEntityLinksProp.ts`); along the way, an unused `EntityLinksPanel` import left over in `SessionScenesSection.tsx` from the earlier split came out too.
5. Three more pieces of `CampaignSessionPlanner.tsx` moved out, each a genuinely separable concern rather than duplicated logic: the `plannerItems` search-index builder and the per-kind `listConfig` builder (both pure data shaping, no React — moved to `src/lib/plannerEntityIndex.ts` as `buildPlannerItems`/`buildListConfig`, testable without rendering anything); the default tab-bar JSX shown when no `renderNav` override is given (moved to `DefaultPlannerNav.tsx`, built from the exact same `CampaignSessionPlannerNavProps` a host's own override receives); and the `repository.subscribeToChanges` reload-everything effect (moved to `usePlannerChangeSubscription.ts`). `CampaignSessionPlanner.tsx` dropped from 661 to 582 lines. Same 370-test suite passes unchanged throughout.

**Still open — `CampaignSessionPlanner.tsx` is 582 lines**, still past "over 400: almost certainly doing too much," but the remaining size is now genuinely cross-cutting coordination (11 kinds' hook orchestration, template-override/view-state plumbing, the edit-view dispatch to each `*EditorRoute`, and the list/nav render) rather than duplicated, misplaced, or separable logic. Bundling the 11 `useX`/`useTemplates` calls into one orchestrator hook was considered and rejected — it wouldn't reduce real complexity, just wrap the same individually-needed variables in an extra layer of indirection. Further reduction from here would mean fragmenting state that several kinds genuinely need to share (the entity-link picker's combined `plannerItems`, for one) — a different, judgment-heavy kind of change, not another mechanical extraction. Left as-is for now; revisit only if a concrete pain point shows up, not on a size number alone.

`SessionEditor.tsx` itself, at 365 lines, is also left as-is — still past "over 250, consider refactoring" but no longer close to "almost certainly doing too much," and its remaining content (Session's own fields, Briefing/Readiness/Campaign-Changes panels, autosave, Debrief, entity links, Save/Cancel/Delete) is genuinely Session-level, not another extractable sub-responsibility the way Scenes was.

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
