import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, Npc, PlannerEntityType } from '../types';
import { NpcEditor, type NpcEditorProps, type NpcFormValues } from './NpcEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, type View } from '../lib/plannerRoutes';

export interface NpcEditorRouteProps {
  npcs: Npc[] | null;
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  renderFields: NpcEditorProps['renderFields'];
  createNpc: (npc: Omit<Npc, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Npc>;
  updateNpc: (npc: Npc) => Promise<Npc>;
  deleteNpc: (id: string) => Promise<void>;
  reloadNpcs: () => Promise<void>;
}

/** The NPCs tab's edit view — see `NoteEditorRoute.tsx`'s own doc
 * comment for why this is its own file. */
export const NpcEditorRoute: React.FC<NpcEditorRouteProps> = ({
  npcs,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  template,
  renderFields,
  createNpc,
  updateNpc,
  deleteNpc,
  reloadNpcs,
}) => {
  const npc = viewId ? (npcs ?? []).find((n) => n.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'npc',
    entity: npc,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: NpcFormValues) => ({ name: values.name.trim(), status: values.status.trim() || null, details: values.details }),
    createEntity: createNpc,
    updateEntity: updateNpc,
    deleteEntity: deleteNpc,
    saveEntity: repository.saveNpc,
    reloadEntity: reloadNpcs,
  });
  return (
    <NpcEditor
      key={viewId ?? 'new'}
      npc={npc}
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
