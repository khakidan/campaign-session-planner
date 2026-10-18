import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, PlannerEntityType, Quest } from '../types';
import { QuestEditor, type QuestEditorProps, type QuestFormValues } from './QuestEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, type View } from '../lib/plannerRoutes';

export interface QuestEditorRouteProps {
  quests: Quest[] | null;
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  renderFields: QuestEditorProps['renderFields'];
  createQuest: (quest: Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Quest>;
  updateQuest: (quest: Quest) => Promise<Quest>;
  deleteQuest: (id: string) => Promise<void>;
  reloadQuests: () => Promise<void>;
}

/** The Quests tab's edit view — see `NoteEditorRoute.tsx`'s own doc
 * comment for why this is its own file. */
export const QuestEditorRoute: React.FC<QuestEditorRouteProps> = ({
  quests,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  template,
  renderFields,
  createQuest,
  updateQuest,
  deleteQuest,
  reloadQuests,
}) => {
  const quest = viewId ? (quests ?? []).find((q) => q.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'quest',
    entity: quest,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: QuestFormValues) => ({ name: values.name.trim(), status: values.status.trim() || null, details: values.details }),
    createEntity: createQuest,
    updateEntity: updateQuest,
    deleteEntity: deleteQuest,
    saveEntity: repository.saveQuest,
    reloadEntity: reloadQuests,
  });
  return (
    <QuestEditor
      key={viewId ?? 'new'}
      quest={quest}
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
