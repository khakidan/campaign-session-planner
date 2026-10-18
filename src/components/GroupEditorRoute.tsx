import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, Group, PlannerEntityType } from '../types';
import { GroupEditor, type GroupEditorProps, type GroupFormValues } from './GroupEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, type View } from '../lib/plannerRoutes';

export interface GroupEditorRouteProps {
  groups: Group[] | null;
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  renderFields: GroupEditorProps['renderFields'];
  createGroup: (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Group>;
  updateGroup: (group: Group) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  reloadGroups: () => Promise<void>;
}

/** The Groups tab's edit view — see `NoteEditorRoute.tsx`'s own doc
 * comment for why this is its own file. */
export const GroupEditorRoute: React.FC<GroupEditorRouteProps> = ({
  groups,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  template,
  renderFields,
  createGroup,
  updateGroup,
  deleteGroup,
  reloadGroups,
}) => {
  const group = viewId ? (groups ?? []).find((g) => g.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'group',
    entity: group,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: GroupFormValues) => ({
      name: values.name.trim(),
      type: values.type.trim() || null,
      status: values.status.trim() || null,
      details: values.details,
    }),
    createEntity: createGroup,
    updateEntity: updateGroup,
    deleteEntity: deleteGroup,
    saveEntity: repository.saveGroup,
    reloadEntity: reloadGroups,
  });
  return (
    <GroupEditor
      key={viewId ?? 'new'}
      group={group}
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
