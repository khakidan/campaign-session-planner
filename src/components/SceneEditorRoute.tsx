import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignPlannerRepository, Scene, Session } from '../types';
import { SceneEditor, type SceneEditorProps, type SceneFormValues } from './SceneEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import type { View } from '../lib/plannerRoutes';

export interface SceneEditorRouteProps {
  allScenes: Scene[] | null;
  sessions: Session[] | null;
  viewId: string | null;
  setView: (next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  renderFields: SceneEditorProps['renderFields'];
  createScene: (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Scene>;
  updateScene: (scene: Scene) => Promise<Scene>;
  deleteScene: (id: string) => Promise<void>;
  reloadAllScenes: () => Promise<void>;
}

/** The Scenes tab's edit view — kept fully custom, not routed through
 * the shared `buildCrudHandlers` every other "simple" kind's own
 * `*EditorRoute` uses, since Scene's wiring genuinely differs: it
 * needs a Session picker (a Scene always belongs to one) and has to
 * resolve `order` within whichever Session is chosen — see
 * `resolveOrder` below. See `NoteEditorRoute.tsx`'s own doc comment for
 * why every kind gets its own file at all. */
export const SceneEditorRoute: React.FC<SceneEditorRouteProps> = ({
  allScenes,
  sessions,
  viewId,
  setView,
  runSaving,
  isSaving,
  repository,
  links,
  template,
  renderFields,
  createScene,
  updateScene,
  deleteScene,
  reloadAllScenes,
}) => {
  const scene = viewId ? (allScenes ?? []).find((s) => s.id === viewId) ?? null : null;
  const sceneFormPayload = (values: SceneFormValues) => ({
    title: values.title.trim(),
    sceneNumber: values.sceneNumber.trim() ? Number(values.sceneNumber) : null,
    status: values.status.trim() || null,
    details: values.details,
  });
  // A Scene's `order` only has meaning within its own Session — keep it
  // when the Session is unchanged, otherwise append at the end of the
  // newly-chosen Session's own Scenes (same as `SessionEditor.tsx`'s
  // "+ Add Scene", just picking the Session explicitly here instead of
  // it being implicit).
  const resolveOrder = (sessionId: string) =>
    scene && scene.sessionId === sessionId ? scene.order : (allScenes ?? []).filter((s) => s.sessionId === sessionId).length;
  return (
    <SceneEditor
      key={viewId ?? 'new'}
      scene={scene}
      sessions={(sessions ?? []).map((s) => ({ id: s.id, title: s.title }))}
      isSaving={isSaving}
      links={links}
      template={template}
      renderFields={renderFields}
      onCancel={() => setView({ mode: 'list' })}
      onDelete={
        scene
          ? () =>
              runSaving(async () => {
                await deleteScene(scene.id);
                setView({ mode: 'list' });
              })
          : undefined
      }
      onSave={(values: SceneFormValues, existingId: string | null) =>
        runSaving(async () => {
          const payload = sceneFormPayload(values);
          const saved = existingId
            ? await updateScene({ ...scene, id: existingId, sessionId: values.sessionId, order: resolveOrder(values.sessionId), ...payload } as Scene)
            : await createScene({ ...payload, sessionId: values.sessionId, order: resolveOrder(values.sessionId) });
          setView(viewId ? { mode: 'list' } : { mode: 'edit', id: saved.id });
        })
      }
      onAutosave={async (values: SceneFormValues, existingId: string | null) => {
        const payload = sceneFormPayload(values);
        if (existingId) {
          const saved = await repository.saveScene({
            id: existingId,
            sessionId: values.sessionId,
            order: resolveOrder(values.sessionId),
            ...payload,
          });
          await reloadAllScenes();
          return { id: saved.id };
        }
        const created = await createScene({ ...payload, sessionId: values.sessionId, order: resolveOrder(values.sessionId) });
        return { id: created.id };
      }}
    />
  );
};
