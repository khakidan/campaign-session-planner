import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, Location, PlannerEntityType } from '../types';
import { LocationEditor, type LocationEditorProps, type LocationFormValues } from './LocationEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, type View } from '../lib/plannerRoutes';

export interface LocationEditorRouteProps {
  locations: Location[] | null;
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  renderFields: LocationEditorProps['renderFields'];
  createLocation: (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Location>;
  updateLocation: (location: Location) => Promise<Location>;
  deleteLocation: (id: string) => Promise<void>;
  reloadLocations: () => Promise<void>;
}

/** The Locations tab's edit view — see `NoteEditorRoute.tsx`'s own doc
 * comment for why this is its own file. */
export const LocationEditorRoute: React.FC<LocationEditorRouteProps> = ({
  locations,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  template,
  renderFields,
  createLocation,
  updateLocation,
  deleteLocation,
  reloadLocations,
}) => {
  const location = viewId ? (locations ?? []).find((l) => l.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'location',
    entity: location,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: LocationFormValues) => ({
      name: values.name.trim(),
      type: values.type.trim() || null,
      parentLocationId: values.parentLocationId || null,
      details: values.details,
    }),
    createEntity: createLocation,
    updateEntity: updateLocation,
    deleteEntity: deleteLocation,
    saveEntity: repository.saveLocation,
    reloadEntity: reloadLocations,
  });
  return (
    <LocationEditor
      key={viewId ?? 'new'}
      location={location}
      otherLocations={(locations ?? []).filter((l) => l.id !== location?.id)}
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
