import React from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, Event, PlannerEntityType } from '../types';
import { EventEditor, type EventEditorProps, type EventFormValues } from './EventEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, type View } from '../lib/plannerRoutes';

export interface EventEditorRouteProps {
  events: Event[] | null;
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  template: PartialBlock[] | undefined;
  renderFields: EventEditorProps['renderFields'];
  createEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Event>;
  updateEvent: (event: Event) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  reloadEvents: () => Promise<void>;
}

/** The Events tab's edit view — see `NoteEditorRoute.tsx`'s own doc
 * comment for why this is its own file. */
export const EventEditorRoute: React.FC<EventEditorRouteProps> = ({
  events,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  template,
  renderFields,
  createEvent,
  updateEvent,
  deleteEvent,
  reloadEvents,
}) => {
  const event = viewId ? (events ?? []).find((e) => e.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'event',
    entity: event,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: EventFormValues) => ({
      name: values.name.trim(),
      eventType: values.eventType.trim() || null,
      status: values.status.trim() || null,
      date: values.date || null,
      details: values.details,
    }),
    createEntity: createEvent,
    updateEntity: updateEvent,
    deleteEntity: deleteEvent,
    saveEntity: repository.saveEvent,
    reloadEntity: reloadEvents,
  });
  return (
    <EventEditor
      key={viewId ?? 'new'}
      event={event}
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
