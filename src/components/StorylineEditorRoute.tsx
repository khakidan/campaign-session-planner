import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, PlannerEntityType, Storyline } from '../types';
import { StorylineEditor, type StorylineEditorProps, type StorylineFormValues } from './StorylineEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, type View } from '../lib/plannerRoutes';

export interface StorylineEditorRouteProps {
  storylines: Storyline[] | null;
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  renderFields: StorylineEditorProps['renderFields'];
  createStoryline: (storyline: Omit<Storyline, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Storyline>;
  updateStoryline: (storyline: Storyline) => Promise<Storyline>;
  deleteStoryline: (id: string) => Promise<void>;
  reloadStorylines: () => Promise<void>;
}

/** The Storylines tab's edit view — see `NoteEditorRoute.tsx`'s own
 * doc comment for why this is its own file. */
export const StorylineEditorRoute: React.FC<StorylineEditorRouteProps> = ({
  storylines,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  template,
  renderFields,
  createStoryline,
  updateStoryline,
  deleteStoryline,
  reloadStorylines,
}) => {
  const storyline = viewId ? (storylines ?? []).find((s) => s.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'storyline',
    entity: storyline,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: StorylineFormValues) => ({
      name: values.name.trim(),
      status: values.status.trim() || null,
      priority: values.priority.trim() || null,
      details: values.details,
    }),
    createEntity: createStoryline,
    updateEntity: updateStoryline,
    deleteEntity: deleteStoryline,
    saveEntity: repository.saveStoryline,
    reloadEntity: reloadStorylines,
  });
  return (
    <StorylineEditor
      key={viewId ?? 'new'}
      storyline={storyline}
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
