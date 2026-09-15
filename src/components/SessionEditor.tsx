import React, { useMemo, useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, CampaignId, CampaignPlannerRepository, EntityReference, Scene, Session, TTRPGHostAdapter } from '../types';
import { useScenes } from '../hooks/useScenes';
import { useEntityLinks } from '../hooks/useEntityLinks';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { SceneEditor, type SceneFormValues } from './SceneEditor';
import { Field } from './EditorFormControls';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { sessionTemplate as defaultSessionTemplate, sessionDebriefTemplate as defaultSessionDebriefTemplate } from '../lib/entityTemplates';
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
  onSave: (values: SessionFormValues) => Promise<void> | void;
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
}

type ScenesView = { mode: 'list' } | { mode: 'edit'; id: string | null };

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
 * Scenes are managed entirely inline here (add/reorder/edit/delete) —
 * per the doc's own tree (Sessions → Scenes → Encounters), a Scene
 * outside its Session's context is close to meaningless, so it gets no
 * top-level tab of its own (confirmed via `AskUserQuestion`). Scene is
 * still a real, independently-linkable entity — each open Scene gets
 * its own `EntityLinksPanel`, separate from the Session's.
 */
export const SessionEditor: React.FC<SessionEditorProps> = ({
  session,
  repository,
  campaignId,
  hostAdapter,
  plannerItems,
  onSave,
  onDelete,
  onCancel,
  isSaving = false,
  onOpenPlannerEntity,
  onOpenHostEntity,
  links,
  template,
  debriefTemplate,
  sceneTemplate,
}) => {
  const [values, setValues] = useState<SessionFormValues>(() => sessionToFormValues(session));
  const [error, setError] = useState<string | null>(null);
  const [scenesView, setScenesView] = useState<ScenesView>({ mode: 'list' });

  const { scenes, createScene, updateScene, deleteScene } = useScenes(repository, session?.id ?? null);
  const sortedScenes = useMemo(() => [...(scenes ?? [])].sort((a, b) => a.order - b.order), [scenes]);

  const editingScene = scenesView.mode === 'edit' && scenesView.id ? sortedScenes.find((s) => s.id === scenesView.id) ?? null : null;
  const editingSceneRef: EntityReference | null =
    scenesView.mode === 'edit' && scenesView.id ? { type: 'scene', id: scenesView.id, source: 'planner' } : null;
  const scenePlannerItems: PlannerSearchItem[] = useMemo(
    () => [...plannerItems, ...sortedScenes.map((s): PlannerSearchItem => ({ type: 'scene', id: s.id, label: s.title }))],
    [plannerItems, sortedScenes]
  );
  const sceneLabel = editingScene?.title;
  const { outgoing: sceneOutgoing, incoming: sceneIncoming, addLink: addSceneLink, removeLink: removeSceneLink } = useEntityLinks(
    repository,
    editingSceneRef,
    campaignId,
    sceneLabel
  );
  const sceneLinks: EntityEditorLinksProps | undefined = editingSceneRef
    ? {
        plannerItems: scenePlannerItems,
        hostAdapter,
        outgoing: sceneOutgoing,
        incoming: sceneIncoming,
        onAddLink: addSceneLink,
        onRemoveLink: removeSceneLink,
        onOpenPlannerEntity,
        onOpenHostEntity,
      }
    : undefined;

  const handleSave = async () => {
    if (!values.title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    await onSave(values);
  };

  const handleReorder = async (scene: Scene, direction: 'up' | 'down') => {
    const index = sortedScenes.findIndex((s) => s.id === scene.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= sortedScenes.length) return;
    const neighbor = sortedScenes[swapIndex];
    await updateScene({ ...scene, order: neighbor.order });
    await updateScene({ ...neighbor, order: scene.order });
  };

  if (scenesView.mode === 'edit') {
    return (
      <SceneEditor
        key={scenesView.id ?? 'new'}
        scene={editingScene}
        links={sceneLinks}
        template={sceneTemplate}
        isSaving={isSaving}
        onCancel={() => setScenesView({ mode: 'list' })}
        onDelete={
          editingScene
            ? async () => {
                await deleteScene(editingScene.id);
                setScenesView({ mode: 'list' });
              }
            : undefined
        }
        onSave={async (sceneValues: SceneFormValues) => {
          const payload = {
            title: sceneValues.title.trim(),
            sceneNumber: sceneValues.sceneNumber.trim() ? Number(sceneValues.sceneNumber) : null,
            status: sceneValues.status.trim() || null,
            details: sceneValues.details,
          };
          if (editingScene) {
            await updateScene({ ...editingScene, ...payload });
          } else {
            await createScene({ ...payload, order: sortedScenes.length });
          }
          setScenesView({ mode: 'list' });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
      >
        &larr; Back to Sessions
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <Field id="session-title" label="Title" value={values.title} onChange={(v) => setValues((p) => ({ ...p, title: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field id="session-number" label="Session Number" value={values.sessionNumber} onChange={(v) => setValues((p) => ({ ...p, sessionNumber: v }))} />
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="session-date">
            Date
          </label>
          <input
            id="session-date"
            type="date"
            value={values.date ? values.date.slice(0, 10) : ''}
            onChange={(e) => setValues((prev) => ({ ...prev, date: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="session-status">
            Status
          </label>
          <input
            id="session-status"
            type="text"
            list="session-status-suggestions"
            value={values.status}
            onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="Draft"
          />
          <datalist id="session-status-suggestions">
            {SUGGESTED_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultSessionTemplate}
      />

      <fieldset className="space-y-3 border-t border-slate-200 pt-4">
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Scenes</legend>
        {sortedScenes.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No Scenes yet.</p>
        ) : (
          <ul className="space-y-1">
            {sortedScenes.map((scene, index) => (
              <li key={scene.id} className="flex items-center justify-between gap-2 p-2 border border-slate-200 rounded-lg text-sm">
                <button
                  type="button"
                  onClick={() => setScenesView({ mode: 'edit', id: scene.id })}
                  className="text-left text-slate-800 hover:text-emerald-700 cursor-pointer truncate flex-1"
                >
                  {scene.title}
                  {scene.status && <span className="ml-2 text-[10px] uppercase text-slate-400">{scene.status}</span>}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={`Move ${scene.title} up`}
                    disabled={index === 0}
                    onClick={() => handleReorder(scene, 'up')}
                    className="px-1.5 py-0.5 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${scene.title} down`}
                    disabled={index === sortedScenes.length - 1}
                    onClick={() => handleReorder(scene, 'down')}
                    className="px-1.5 py-0.5 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={!session}
          onClick={() => setScenesView({ mode: 'edit', id: null })}
          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-40 cursor-pointer"
        >
          + Add Scene
        </button>
        {!session && <p className="text-[11px] text-slate-400 italic">Save this Session before adding Scenes.</p>}
      </fieldset>

      <p className="text-xs text-slate-400 italic">
        Active Storylines/Threads/Quests, Anticipated NPCs/Locations/Factions/Events — link them via "Linked Entities" below.
      </p>

      {values.status === 'Completed' && (
        <fieldset className="space-y-3 border-t border-slate-200 pt-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Debrief</legend>
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
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Session
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Saving…' : 'Save Session'}
          </button>
        </div>
      </div>
    </div>
  );
};
