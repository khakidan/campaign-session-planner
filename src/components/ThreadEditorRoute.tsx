import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, PlannerEntityType, Thread } from '../types';
import { ThreadEditor, type ThreadEditorProps, type ThreadFormValues } from './ThreadEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, type View } from '../lib/plannerRoutes';

export interface ThreadEditorRouteProps {
  threads: Thread[] | null;
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  renderFields: ThreadEditorProps['renderFields'];
  createThread: (thread: Omit<Thread, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Thread>;
  updateThread: (thread: Thread) => Promise<Thread>;
  deleteThread: (id: string) => Promise<void>;
  reloadThreads: () => Promise<void>;
}

/** The Threads tab's edit view — see `NoteEditorRoute.tsx`'s own doc
 * comment for why this is its own file. */
export const ThreadEditorRoute: React.FC<ThreadEditorRouteProps> = ({
  threads,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  template,
  renderFields,
  createThread,
  updateThread,
  deleteThread,
  reloadThreads,
}) => {
  const thread = viewId ? (threads ?? []).find((t) => t.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'thread',
    entity: thread,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: ThreadFormValues) => ({
      name: values.name.trim(),
      status: values.status.trim() || null,
      priority: values.priority.trim() || null,
      details: values.details,
    }),
    createEntity: createThread,
    updateEntity: updateThread,
    deleteEntity: deleteThread,
    saveEntity: repository.saveThread,
    reloadEntity: reloadThreads,
  });
  return (
    <ThreadEditor
      key={viewId ?? 'new'}
      thread={thread}
      isSaving={isSaving}
      links={links}
      template={template}
      renderFields={renderFields}
      onCancel={handlers.onCancel}
      onDelete={handlers.onDelete}
      onSave={handlers.onSave}
      onAutosave={handlers.onAutosave}
    />
  );
};
