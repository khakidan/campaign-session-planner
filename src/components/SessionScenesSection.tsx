import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, EntityReference, Scene, TTRPGHostAdapter } from '../types';
import { useEntityLinksProp } from '../hooks/useEntityLinksProp';
import { SceneEditor, type SceneEditorProps, type SceneFormValues } from './SceneEditor';
import type { PlannerSearchItem } from './EntityLinkPicker';

type ScenesView = { mode: 'list' } | { mode: 'edit'; id: string | null };

export interface SessionScenesSectionProps {
  /** `null` while the parent Session is still being created — Scenes
   * can't exist until it does (see the "Save this Session before
   * adding Scenes" notice below). */
  session: { id: string } | null;
  sortedScenes: Scene[];
  createScene: (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt' | 'sessionId'>) => Promise<Scene>;
  updateScene: (scene: Scene) => Promise<Scene>;
  deleteScene: (id: string) => Promise<void>;
  reloadScenes: () => Promise<void>;
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
  /** Already includes every Scene campaign-wide (see `SessionEditor`'s
   * own doc comment on this same prop) — not re-appended with
   * `sortedScenes` on top. */
  plannerItems: PlannerSearchItem[];
  hostAdapter: TTRPGHostAdapter;
  onOpenPlannerEntity: (ref: EntityReference) => void;
  onOpenHostEntity?: (type: EntityReference['type'], id: string) => void;
  sceneTemplate?: PartialBlock[];
  renderSceneFields?: SceneEditorProps['renderFields'];
  isSaving?: boolean;
  /** See `SessionEditorProps.onScenesChanged`'s own doc comment. */
  onScenesChanged?: () => void;
  /** The rest of the Session form (fields/briefing/body/debrief/links/
   * footer) — rendered with this section's own "Scenes" fieldset JSX
   * passed through to be placed wherever it belongs in that layout.
   * Only called at all while not currently editing one specific Scene;
   * editing one replaces the entire Session form with just that
   * Scene's own editor, same as before this was split out. */
  children: (scenesFieldset: React.ReactNode) => React.ReactNode;
}

/**
 * The Scene-management slice of `SessionEditor`'s rendering — split
 * out as its own self-contained "manage this Session's Scenes inline"
 * responsibility (ROADMAP.md's code-health audit). Owns the inline
 * add/edit/reorder view state and the Scene's own entity-linking, so
 * `SessionEditor` itself only needs to keep the data (`sortedScenes`
 * and the CRUD functions) that the Session Readiness checklist above
 * it also depends on.
 */
export const SessionScenesSection: React.FC<SessionScenesSectionProps> = ({
  session,
  sortedScenes,
  createScene,
  updateScene,
  deleteScene,
  reloadScenes,
  repository,
  campaignId,
  plannerItems,
  hostAdapter,
  onOpenPlannerEntity,
  onOpenHostEntity,
  sceneTemplate,
  renderSceneFields,
  isSaving = false,
  onScenesChanged,
  children,
}) => {
  const [scenesView, setScenesView] = useState<ScenesView>({ mode: 'list' });

  const editingScene = scenesView.mode === 'edit' && scenesView.id ? sortedScenes.find((s) => s.id === scenesView.id) ?? null : null;
  const editingSceneRef: EntityReference | null =
    scenesView.mode === 'edit' && scenesView.id ? { type: 'scene', id: scenesView.id, source: 'planner' } : null;
  const sceneLinks = useEntityLinksProp(
    repository,
    campaignId,
    editingSceneRef,
    editingScene?.title,
    plannerItems,
    hostAdapter,
    onOpenPlannerEntity,
    onOpenHostEntity
  );

  const handleReorder = async (scene: Scene, direction: 'up' | 'down') => {
    const index = sortedScenes.findIndex((s) => s.id === scene.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= sortedScenes.length) return;
    const neighbor = sortedScenes[swapIndex];
    await updateScene({ ...scene, order: neighbor.order });
    await updateScene({ ...neighbor, order: scene.order });
    onScenesChanged?.();
  };

  if (scenesView.mode === 'edit') {
    return (
      <SceneEditor
        key={scenesView.id ?? 'new'}
        scene={editingScene}
        defaultSessionId={session!.id}
        links={sceneLinks}
        template={sceneTemplate}
        renderFields={renderSceneFields}
        isSaving={isSaving}
        onCancel={() => setScenesView({ mode: 'list' })}
        onDelete={
          editingScene
            ? async () => {
                await deleteScene(editingScene.id);
                onScenesChanged?.();
                setScenesView({ mode: 'list' });
              }
            : undefined
        }
        onSave={async (sceneValues: SceneFormValues, existingId: string | null) => {
          const payload = {
            title: sceneValues.title.trim(),
            sceneNumber: sceneValues.sceneNumber.trim() ? Number(sceneValues.sceneNumber) : null,
            status: sceneValues.status.trim() || null,
            details: sceneValues.details,
          };
          const existing = existingId ? sortedScenes.find((s) => s.id === existingId) : null;
          const saved = existingId
            ? await updateScene({
                ...existing,
                id: existingId,
                sessionId: session!.id,
                order: existing?.order ?? sortedScenes.length,
                ...payload,
              } as Scene)
            : await createScene({ ...payload, order: sortedScenes.length });
          onScenesChanged?.();
          // Same reasoning as every other editor's onSave in
          // CampaignSessionPlanner.tsx: a brand-new Scene has no id (so
          // no linking) until this first save — don't also close the
          // editor the instant that becomes available. Branch on
          // `scenesView.id` (this view's own knowledge), not
          // `existingId` (the editor's, which a background autosave
          // may already have set) — an autosave can create the real
          // Scene without this view ever learning its id, so the
          // explicit Save click can still be the first moment it's
          // revealed here.
          setScenesView(scenesView.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
        }}
        onAutosave={async (sceneValues: SceneFormValues, existingId: string | null) => {
          const payload = {
            title: sceneValues.title.trim(),
            sceneNumber: sceneValues.sceneNumber.trim() ? Number(sceneValues.sceneNumber) : null,
            status: sceneValues.status.trim() || null,
            details: sceneValues.details,
          };
          if (existingId) {
            const existing = sortedScenes.find((s) => s.id === existingId);
            const saved = await repository.saveScene({
              id: existingId,
              sessionId: session!.id,
              order: existing?.order ?? sortedScenes.length,
              ...payload,
            });
            await reloadScenes();
            onScenesChanged?.();
            return { id: saved.id };
          }
          const created = await createScene({ ...payload, order: sortedScenes.length });
          onScenesChanged?.();
          return { id: created.id };
        }}
      />
    );
  }

  const scenesFieldset = (
    <fieldset className="space-y-3 border-t border-[var(--csp-neutral-200)] pt-4">
      <legend className="text-xs font-bold uppercase tracking-wider text-[var(--csp-neutral-600)] mb-1">Scenes</legend>
      {sortedScenes.length === 0 ? (
        <p className="text-xs text-[var(--csp-neutral-400)] italic">No Scenes yet.</p>
      ) : (
        <ul className="space-y-1">
          {sortedScenes.map((scene, index) => (
            <li key={scene.id} className="flex items-center justify-between gap-2 p-2 border border-[var(--csp-neutral-200)] rounded-lg text-sm">
              <button
                type="button"
                onClick={() => setScenesView({ mode: 'edit', id: scene.id })}
                className="text-left text-[var(--csp-neutral-800)] hover:text-[var(--csp-accent-700)] cursor-pointer truncate flex-1"
              >
                {scene.title}
                {scene.status && <span className="ml-2 text-[10px] uppercase text-[var(--csp-neutral-400)]">{scene.status}</span>}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Move ${scene.title} up`}
                  disabled={index === 0}
                  onClick={() => handleReorder(scene, 'up')}
                  className="px-1.5 py-0.5 text-xs text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)] disabled:opacity-30 cursor-pointer"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${scene.title} down`}
                  disabled={index === sortedScenes.length - 1}
                  onClick={() => handleReorder(scene, 'down')}
                  className="px-1.5 py-0.5 text-xs text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)] disabled:opacity-30 cursor-pointer"
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
        className="px-3 py-1.5 text-xs font-semibold text-[var(--csp-accent-700)] border border-[var(--csp-accent-600)] rounded-lg hover:bg-[var(--csp-accent-50)] disabled:opacity-40 cursor-pointer"
      >
        + Add Scene
      </button>
      {!session && <p className="text-[11px] text-[var(--csp-neutral-400)] italic">Save this Session before adding Scenes.</p>}
    </fieldset>
  );

  return <>{children(scenesFieldset)}</>;
};
