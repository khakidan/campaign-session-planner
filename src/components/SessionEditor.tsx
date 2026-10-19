import React, { useMemo, useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, CampaignId, CampaignPlannerRepository, EntityReference, Session, TTRPGHostAdapter } from '../types';
import { useScenes } from '../hooks/useScenes';
import { useSessions } from '../hooks/useSessions';
import { useSessionBriefing } from '../hooks/useSessionBriefing';
import { useCampaignChanges } from '../hooks/useCampaignChanges';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import type { SceneEditorProps } from './SceneEditor';
import { SessionScenesSection } from './SessionScenesSection';
import { SessionBriefingPanel } from './SessionBriefingPanel';
import { SessionReadinessChecklist } from './SessionReadinessChecklist';
import { CampaignChangesPanel } from './CampaignChangesPanel';
import { Field, AutosaveIndicator } from './EditorFormControls';
import { useAutosave } from '../hooks/useAutosave';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { sessionTemplate as defaultSessionTemplate, sessionDebriefTemplate as defaultSessionDebriefTemplate } from '../lib/entityTemplates';
import { checkSessionReadiness } from '../lib/sessionReadiness';
import type { PlannerSearchItem } from './EntityLinkPicker';

const SUGGESTED_STATUSES = ['Draft', 'Prepared', 'Running', 'Completed'];

export interface SessionFormValues {
  title: string;
  sessionNumber: string;
  date: string;
  status: string;
  details: Block[];
  debrief: Block[];
}

function sessionToFormValues(session: Session | null): SessionFormValues {
  return {
    title: session?.title ?? '',
    sessionNumber: session?.sessionNumber != null ? String(session.sessionNumber) : '',
    date: session?.date ?? '',
    status: session?.status ?? '',
    details: session?.details ?? [],
    debrief: session?.debrief ?? [],
  };
}

export interface SessionEditorProps {
  /** `null` means "creating a new Session." */
  session: Session | null;
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
  hostAdapter: TTRPGHostAdapter;
  /** Every planner-owned Note/NPC/Group/Location/Session/Storyline/
   * Thread/Quest/Event, flattened — passed straight through to this
   * Session's own `EntityLinksPanel` and, extended with this Session's
   * own Scenes, to each Scene's `EntityLinksPanel` too, so a Scene is
   * linkable to the same universe of entities as everything else. */
  plannerItems: PlannerSearchItem[];
  /** `existingId` is this editor's own current best knowledge of the
   * Session's id — see `NoteEditorProps.onSave`'s own doc comment for
   * why this must be branched on instead of `session`, which never
   * changes mid-edit even after an autosave has already created a
   * record. (Scenes and entity-linking still gate on the `session`
   * prop itself, unchanged — those stay locked behind an explicit Save,
   * same as today; only the main Title/Date/Status/body fields get a
   * background autosave safety net.) */
  onSave: (values: SessionFormValues, existingId: string | null) => Promise<void> | void;
  /** Background autosave (ROADMAP.md's "Campaign Planner Notes App") —
   * omit to disable autosave entirely. See `NoteEditorProps.onAutosave`. */
  onAutosave?: (values: SessionFormValues, existingId: string | null) => Promise<{ id: string }>;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  onOpenPlannerEntity: (ref: EntityReference) => void;
  onOpenHostEntity?: (type: EntityReference['type'], id: string) => void;
  /** The Session's own entity-linking, only meaningful once it
   * actually exists (has an id) — same contract every other editor's
   * `links` prop uses. Scenes get their own, separate links (below),
   * since a Scene is independently linkable. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Session body/
   * Debrief/Scene starter templates, if any. Each falls back to its
   * own shipped default when omitted. */
  template?: PartialBlock[];
  debriefTemplate?: PartialBlock[];
  sceneTemplate?: PartialBlock[];
  /** Layout customization (ROADMAP.md's "further layout customization
   * beyond the tab bar") — replaces the default Title/Number/Date/
   * Status field block with host-rendered markup. `defaultFields` is
   * that shipped block; wrap it to add a field alongside it, or ignore
   * it to render your own from `values`/`onChange`. Omit to keep the
   * shipped layout. */
  renderFields?: (ctx: {
    values: SessionFormValues;
    onChange: React.Dispatch<React.SetStateAction<SessionFormValues>>;
    defaultFields: React.ReactNode;
  }) => React.ReactNode;
  /** Same idea, forwarded to the nested `SceneEditor` shown while
   * adding/editing one of this Session's Scenes. */
  renderSceneFields?: SceneEditorProps['renderFields'];
  /** Called after any inline Scene create/update/delete/reorder here —
   * this component's own `useScenes` call is a separate cache from
   * `CampaignSessionPlanner.tsx`'s campaign-wide one backing its
   * top-level "Scenes" tab, so a change made here wouldn't otherwise
   * be reflected there until something else happens to reload it. */
  onScenesChanged?: () => void;
}

/**
 * Slice 4.2e — a playable unit of campaign time, both a prep document
 * and, after the fact, a historical record. Title/Number/Date/Status
 * are the real properties; everything else the doc lists under Session
 * (Summary, Objectives, Preparation, GM Materials, Running Notes,
 * Outcomes) is one flowing BlockNote document, Notion-page style, not
 * a form of small boxed questions (4.2d's original design). Debrief is
 * a second, separate BlockNote document, shown only once Status is
 * "Completed" per the doc's Session Lifecycle ("collected when a
 * session moves to Completed") — deliberately just that document, not
 * the doc's further "auto-create Thread/Storyline rows from the
 * debrief" workflow, which is real text-to-structured-data logic out
 * of scope this slice (confirmed via `AskUserQuestion`); the GM links
 * Threads/Storylines manually via "Add Link" instead.
 *
 * Scenes can be added/reordered/edited/deleted inline here, same as
 * always, AND browsed/created/edited from their own top-level "Scenes"
 * tab in `CampaignSessionPlanner.tsx` (confirmed via `AskUserQuestion`)
 * — reordering stays Session-scoped and so stays here only, since
 * `Scene.order` only has meaning within one Session. Scene is a real,
 * independently-linkable entity either way — each open Scene gets its
 * own `EntityLinksPanel`, separate from the Session's.
 */
export const SessionEditor: React.FC<SessionEditorProps> = ({
  session,
  repository,
  campaignId,
  hostAdapter,
  plannerItems,
  onSave,
  onAutosave,
  onDelete,
  onCancel,
  isSaving = false,
  onOpenPlannerEntity,
  onOpenHostEntity,
  links,
  template,
  debriefTemplate,
  sceneTemplate,
  renderFields,
  renderSceneFields,
  onScenesChanged,
}) => {
  const [values, setValues] = useState<SessionFormValues>(() => sessionToFormValues(session));
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(session?.id ?? null);

  const autosaveStatus = useAutosave(values, {
    enabled: Boolean(onAutosave) && values.title.trim() !== '',
    onAutosave: async (current) => {
      const result = await onAutosave!(current, savedId);
      setSavedId(result.id);
    },
  });

  const { scenes, reload: reloadScenes, createScene, updateScene, deleteScene } = useScenes(repository, session?.id ?? null);
  const showBriefing = session === null || values.status === 'Draft' || values.status === 'Prepared';
  const sortedScenes = useMemo(() => [...(scenes ?? [])].sort((a, b) => a.order - b.order), [scenes]);

  const readinessChecks = useMemo(
    () => checkSessionReadiness(sortedScenes, links?.outgoing ?? []),
    [sortedScenes, links]
  );

  // Phase 2 item 5 (Campaign Changes) — the backward-looking
  // counterpart to `SessionBriefingPanel`, shown only for a brand-new
  // Session created after a prior one already exists, using the most
  // recent prior Session's date as the "since" boundary. Also backs
  // `SessionBriefingPanel`'s "Last Session" recap (ROADMAP.md) —
  // excludes `session` itself so an already-saved Draft/Prepared
  // Session (which, unlike a brand-new one, is already in `allSessions`)
  // never resolves to itself here.
  const { sessions: allSessions } = useSessions(repository, campaignId);
  const mostRecentPriorSession = useMemo(() => {
    const withDates = (allSessions ?? []).filter((s): s is typeof s & { date: string } => !!s.date && s.id !== session?.id);
    return [...withDates].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  }, [allSessions, session?.id]);
  const showCampaignChanges = session === null && !!mostRecentPriorSession;
  const campaignChanges = useCampaignChanges(repository, campaignId, mostRecentPriorSession?.date ?? '1970-01-01T00:00:00.000Z');
  const briefing = useSessionBriefing(repository, campaignId, hostAdapter, mostRecentPriorSession?.id ?? null);

  const handleSave = async () => {
    if (!values.title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    await onSave(values, savedId);
  };

  const defaultFields = (
    <>
      <Field id="session-title" label="Title" value={values.title} onChange={(v) => setValues((p) => ({ ...p, title: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          id="session-number"
          label="Session Number"
          value={values.sessionNumber}
          onChange={(v) => setValues((p) => ({ ...p, sessionNumber: v }))}
        />
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="session-date">
            Date
          </label>
          <input
            id="session-date"
            type="date"
            value={values.date ? values.date.slice(0, 10) : ''}
            onChange={(e) => setValues((prev) => ({ ...prev, date: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="session-status">
            Status
          </label>
          <div className="flex items-center gap-2">
            <input
              id="session-status"
              type="text"
              list="session-status-suggestions"
              value={values.status}
              onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
              placeholder="Draft"
            />
            {values.status !== 'Completed' && (
              <button
                type="button"
                onClick={() => setValues((prev) => ({ ...prev, status: 'Completed' }))}
                className="shrink-0 px-2 py-1.5 text-[11px] font-semibold text-[var(--csp-accent-700)] border border-[var(--csp-accent-600)] rounded-lg hover:bg-[var(--csp-accent-50)] whitespace-nowrap cursor-pointer"
              >
                Mark Completed
              </button>
            )}
          </div>
          <datalist id="session-status-suggestions">
            {SUGGESTED_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {/* Discoverability fix (ROADMAP.md's "Session Debriefs" item) —
           * the Debrief section below is entirely gated on this field
           * reading exactly 'Completed', with nothing else in the UI
           * hinting that. This line, plus the "Mark Completed" shortcut
           * above, are the fix: a GM who's never typed that exact string
           * in has no other way to discover the Debrief exists at all. */}
          {values.status !== 'Completed' && (
            <p className="mt-1 text-[11px] text-[var(--csp-neutral-500)]">Set to "Completed" to unlock this Session's Debrief below.</p>
          )}
        </div>
      </div>
    </>
  );

  return (
    <SessionScenesSection
      session={session}
      sortedScenes={sortedScenes}
      createScene={createScene}
      updateScene={updateScene}
      deleteScene={deleteScene}
      reloadScenes={reloadScenes}
      repository={repository}
      campaignId={campaignId}
      plannerItems={plannerItems}
      hostAdapter={hostAdapter}
      onOpenPlannerEntity={onOpenPlannerEntity}
      onOpenHostEntity={onOpenHostEntity}
      sceneTemplate={sceneTemplate}
      renderSceneFields={renderSceneFields}
      isSaving={isSaving}
      onScenesChanged={onScenesChanged}
    >
      {(scenesFieldset) => (
        <div className="space-y-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)] cursor-pointer"
          >
            &larr; Back to Sessions
          </button>

          {error && <div className="text-xs font-semibold text-[var(--csp-danger-600)]">{error}</div>}

          {renderFields ? renderFields({ values, onChange: setValues, defaultFields }) : defaultFields}

          {showCampaignChanges && showBriefing ? (
            // Side by side once both have something to show for a
            // brand-new Session — "What Changed" (backward-looking) on
            // the left, "Previously Established" (forward-looking prep)
            // on the right. Either alone still renders full-width below,
            // same as before this layout existed.
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CampaignChangesPanel changes={campaignChanges} onOpenPlannerEntity={onOpenPlannerEntity} />
              <SessionBriefingPanel
                briefing={briefing}
                byCharacter={briefing.byCharacter}
                onOpenPlannerEntity={onOpenPlannerEntity}
                previousSessionDebrief={mostRecentPriorSession?.debrief}
                previousSessionHighlights={briefing.previousSessionHighlights}
              />
            </div>
          ) : (
            <>
              {showCampaignChanges && <CampaignChangesPanel changes={campaignChanges} onOpenPlannerEntity={onOpenPlannerEntity} />}
              {showBriefing && (
                <SessionBriefingPanel
                  briefing={briefing}
                  byCharacter={briefing.byCharacter}
                  onOpenPlannerEntity={onOpenPlannerEntity}
                  previousSessionDebrief={mostRecentPriorSession?.debrief}
                  previousSessionHighlights={briefing.previousSessionHighlights}
                />
              )}
            </>
          )}

          {showBriefing && <SessionReadinessChecklist checks={readinessChecks} />}

          <BlockNoteFreeformField
            value={values.details}
            onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
            linking={links}
            template={template ?? defaultSessionTemplate}
          />

          {scenesFieldset}

          <p className="text-xs text-[var(--csp-neutral-400)] italic">
            Active Storylines/Threads/Quests, Anticipated NPCs/Locations/Factions/Events — link them via "Linked Entities" below.
          </p>

          {values.status === 'Completed' && (
            <fieldset className="space-y-3 border-t border-[var(--csp-neutral-200)] pt-4">
              <legend className="text-xs font-bold uppercase tracking-wider text-[var(--csp-neutral-600)] mb-1">Debrief</legend>
              <p className="text-[11px] text-[var(--csp-neutral-400)] italic">
                Captured once this Session wraps up — new information, what to remember, how the table felt it went.
              </p>
              <BlockNoteFreeformField
                value={values.debrief}
                onChange={(blocks) => setValues((prev) => ({ ...prev, debrief: blocks }))}
                linking={links}
                template={debriefTemplate ?? defaultSessionDebriefTemplate}
              />
            </fieldset>
          )}

          {session && links && <EntityLinksPanel selfRef={{ type: 'session', id: session.id, source: 'planner' }} {...links} />}

          <div className="flex items-center justify-between pt-2">
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete()}
                className="text-xs font-semibold text-[var(--csp-danger-600)] hover:text-[var(--csp-danger-800)] cursor-pointer"
              >
                Delete Session
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <AutosaveIndicator status={autosaveStatus} />
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-semibold text-[var(--csp-neutral-600)] border border-[var(--csp-neutral-300)] rounded-lg hover:bg-[var(--csp-neutral-50)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--csp-accent-600)] hover:bg-[var(--csp-accent-700)] rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving…' : 'Save Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SessionScenesSection>
  );
};
