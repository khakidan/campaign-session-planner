import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type {
  CampaignId,
  CampaignPlannerRepository,
  EntityId,
  EntityReference,
  EntityType,
  Session,
  TTRPGHostAdapter,
} from '../types';
import { SessionEditor, type SessionEditorProps, type SessionFormValues } from './SessionEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import type { PlannerSearchItem } from './EntityLinkPicker';
import type { View } from '../lib/plannerRoutes';

export interface SessionEditorRouteProps {
  sessions: Session[] | null;
  viewId: string | null;
  setView: (next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  hostAdapter: TTRPGHostAdapter;
  plannerItems: PlannerSearchItem[];
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  debriefTemplate: PartialBlock[] | undefined;
  sceneTemplate: PartialBlock[] | undefined;
  renderFields: SessionEditorProps['renderFields'];
  renderSceneFields: SessionEditorProps['renderSceneFields'];
  onScenesChanged: () => Promise<void>;
  onOpenPlannerEntity: (ref: EntityReference) => void;
  onOpenHostEntity: ((type: EntityType, id: EntityId) => void) | undefined;
  createSession: (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Session>;
  updateSession: (session: Session) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  reloadSessions: () => Promise<void>;
}

/** The Sessions tab's edit view — kept fully custom, not routed through
 * the shared `buildCrudHandlers` every other "simple" kind's own
 * `*EditorRoute` uses, since Session's wiring genuinely differs: an
 * extra `onScenesChanged` callback and two starter templates (its own
 * body plus the separate Debrief document) beyond what `Note`/`Npc`/
 * etc. need. See `NoteEditorRoute.tsx`'s own doc comment for why every
 * kind gets its own file at all. */
export const SessionEditorRoute: React.FC<SessionEditorRouteProps> = ({
  sessions,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  hostAdapter,
  plannerItems,
  links,
  template,
  debriefTemplate,
  sceneTemplate,
  renderFields,
  renderSceneFields,
  onScenesChanged,
  onOpenPlannerEntity,
  onOpenHostEntity,
  createSession,
  updateSession,
  deleteSession,
  reloadSessions,
}) => {
  const session = viewId ? (sessions ?? []).find((s) => s.id === viewId) ?? null : null;
  const sessionFormPayload = (values: SessionFormValues) => ({
    title: values.title.trim(),
    sessionNumber: values.sessionNumber.trim() ? Number(values.sessionNumber) : null,
    date: values.date || null,
    status: values.status.trim() || null,
    details: values.details,
    debrief: values.debrief,
  });
  return (
    <SessionEditor
      key={viewId ?? 'new'}
      session={session}
      repository={repository}
      campaignId={campaignId}
      hostAdapter={hostAdapter}
      plannerItems={plannerItems}
      isSaving={isSaving}
      links={links}
      template={template}
      debriefTemplate={debriefTemplate}
      sceneTemplate={sceneTemplate}
      renderFields={renderFields}
      renderSceneFields={renderSceneFields}
      onScenesChanged={onScenesChanged}
      onOpenPlannerEntity={onOpenPlannerEntity}
      onOpenHostEntity={onOpenHostEntity}
      onCancel={() => setView({ mode: 'list' })}
      onDelete={
        session
          ? () =>
              runSaving(async () => {
                await deleteSession(session.id);
                setView({ mode: 'list' });
              })
          : undefined
      }
      onSave={(values: SessionFormValues, existingId: string | null) =>
        runSaving(async () => {
          const payload = sessionFormPayload(values);
          const saved = existingId
            ? await updateSession({ ...session, id: existingId, campaignId, ...payload } as Session)
            : await createSession(payload);
          setView(viewId ? { mode: 'list' } : { mode: 'edit', id: saved.id });
        })
      }
      onAutosave={async (values: SessionFormValues, existingId: string | null) => {
        const payload = sessionFormPayload(values);
        if (existingId) {
          const saved = await repository.saveSession({ id: existingId, campaignId, ...payload });
          await reloadSessions();
          return { id: saved.id };
        }
        const created = await createSession(payload);
        return { id: created.id };
      }}
    />
  );
};
