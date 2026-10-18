import React from 'react';
import type { CampaignId, CampaignPlannerRepository, Lore, PlannerEntityType } from '../types';
import { LoreEditor, type LoreEditorProps, type LoreFormValues } from './LoreEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, parseTags, type View } from '../lib/plannerRoutes';

export interface LoreEditorRouteProps {
  lores: Lore[] | null;
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  renderFields: LoreEditorProps['renderFields'];
  createLore: (lore: Omit<Lore, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Lore>;
  updateLore: (lore: Lore) => Promise<Lore>;
  deleteLore: (id: string) => Promise<void>;
  reloadLores: () => Promise<void>;
}

/** The Lore tab's edit view — see `NoteEditorRoute.tsx`'s own doc
 * comment for why this is its own file. */
export const LoreEditorRoute: React.FC<LoreEditorRouteProps> = ({
  lores,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  renderFields,
  createLore,
  updateLore,
  deleteLore,
  reloadLores,
}) => {
  const lore = viewId ? (lores ?? []).find((l) => l.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'lore',
    entity: lore,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: LoreFormValues) => ({
      title: values.title.trim(),
      status: values.status.trim() || null,
      content: values.content,
      tags: parseTags(values.tags),
    }),
    createEntity: createLore,
    updateEntity: updateLore,
    deleteEntity: deleteLore,
    saveEntity: repository.saveLore,
    reloadEntity: reloadLores,
  });
  return (
    <LoreEditor
      key={viewId ?? 'new'}
      lore={lore}
      isSaving={isSaving}
      links={links}
      renderFields={renderFields}
      onCancel={handlers.onCancel}
      onDelete={handlers.onDelete}
      onSave={handlers.onSave}
      onAutosave={handlers.onAutosave}
    />
  );
};
