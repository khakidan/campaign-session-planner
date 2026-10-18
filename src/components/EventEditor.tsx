import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Event } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field, AutosaveIndicator, SelectField } from './EditorFormControls';
import { useAutosave } from '../hooks/useAutosave';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { eventTemplate as defaultEventTemplate } from '../lib/entityTemplates';

/** ROADMAP.md's "Event Type field... should be better defined" — the
 * kind of happening this Event represents. Converted from free text
 * (the doc gave no suggested list) to a strict closed-set dropdown
 * (confirmed via `AskUserQuestion`). */
const EVENT_TYPES = ['Combat', 'Social', 'Political', 'Discovery', 'Disaster', 'Personal', 'Supernatural', 'Other'] as const;

/** ROADMAP.md's "Status fields... should be better defined" — whether
 * this Event has happened yet, and how. Same treatment as `eventType`
 * above. */
const EVENT_STATUSES = ['Anticipated', 'Occurred', 'Prevented', 'Cancelled'] as const;

export interface EventFormValues {
  name: string;
  eventType: string;
  status: string;
  date: string;
  details: Block[];
}

function eventToFormValues(event: Event | null): EventFormValues {
  return {
    name: event?.name ?? '',
    eventType: event?.eventType ?? '',
    status: event?.status ?? '',
    date: event?.date ?? '',
    details: event?.details ?? [],
  };
}

export interface EventEditorProps {
  /** `null` means "creating a new Event." */
  event: Event | null;
  /** `existingId` is this editor's own current best knowledge of the
   * Event's id — see `NoteEditorProps.onSave`'s own doc comment for why
   * this must be branched on instead of `event`, which never changes
   * mid-edit even after an autosave has already created a record. */
  onSave: (values: EventFormValues, existingId: string | null) => Promise<void> | void;
  /** Background autosave (ROADMAP.md's "Campaign Planner Notes App") —
   * omit to disable autosave entirely. See `NoteEditorProps.onAutosave`. */
  onAutosave?: (values: EventFormValues, existingId: string | null) => Promise<{ id: string }>;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2d — entity-linking, only meaningful once the Event
   * actually exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Event starter
   * template, if any. Falls back to the shipped default when omitted. */
  template?: PartialBlock[];
  /** Layout customization (ROADMAP.md's "further layout customization
   * beyond the tab bar") — replaces the default Name/Type/Status/Date
   * field block with host-rendered markup. `defaultFields` is that
   * shipped block; wrap it to add a field alongside it, or ignore it to
   * render your own from `values`/`onChange`. Omit to keep the shipped
   * layout. */
  renderFields?: (ctx: {
    values: EventFormValues;
    onChange: React.Dispatch<React.SetStateAction<EventFormValues>>;
    defaultFields: React.ReactNode;
  }) => React.ReactNode;
}

/**
 * Slice 4.2e — something that happens in the world whether or not the
 * PCs are present. Name/Type/Status/Date are the real properties;
 * everything else the doc lists (Description, What Happens,
 * Player Involvement, Outcomes, Campaign Impact) is one flowing
 * BlockNote document, Notion-page style, not a form of small boxed
 * questions (4.2d's original design). Participants and every other
 * Connection are `EntityLink`s (the "Linked Entities" panel below),
 * not document content.
 */
export const EventEditor: React.FC<EventEditorProps> = ({
  event,
  onSave,
  onAutosave,
  onDelete,
  onCancel,
  isSaving = false,
  links,
  template,
  renderFields,
}) => {
  const [values, setValues] = useState<EventFormValues>(() => eventToFormValues(event));
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(event?.id ?? null);

  const autosaveStatus = useAutosave(values, {
    enabled: Boolean(onAutosave) && values.name.trim() !== '',
    onAutosave: async (current) => {
      const result = await onAutosave!(current, savedId);
      setSavedId(result.id);
    },
  });

  const handleSave = async () => {
    if (!values.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    await onSave(values, savedId);
  };

  const defaultFields = (
    <>
      <Field id="event-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SelectField
          id="event-type"
          label="Event Type"
          value={values.eventType}
          onChange={(v) => setValues((p) => ({ ...p, eventType: v }))}
          options={EVENT_TYPES}
          helperText="What kind of happening this is."
        />
        <SelectField
          id="event-status"
          label="Status"
          value={values.status}
          onChange={(v) => setValues((p) => ({ ...p, status: v }))}
          options={EVENT_STATUSES}
          helperText="Whether this Event has happened yet, and how."
        />
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="event-date">
            Date / Time
          </label>
          <input
            id="event-date"
            type="date"
            value={values.date ? values.date.slice(0, 10) : ''}
            onChange={(e) => setValues((prev) => ({ ...prev, date: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)] cursor-pointer"
      >
        &larr; Back to Events
      </button>

      {error && <div className="text-xs font-semibold text-[var(--csp-danger-600)]">{error}</div>}

      {renderFields ? renderFields({ values, onChange: setValues, defaultFields }) : defaultFields}

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultEventTemplate}
      />

      {event && links && <EntityLinksPanel selfRef={{ type: 'event', id: event.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-[var(--csp-danger-600)] hover:text-[var(--csp-danger-800)] cursor-pointer"
          >
            Delete Event
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <AutosaveIndicator status={autosaveStatus} />
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold text-[var(--csp-neutral-600)] border border-[var(--csp-neutral-300)] rounded-lg hover:bg-[var(--csp-neutral-50)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--csp-accent-600)] hover:bg-[var(--csp-accent-700)] rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Saving…' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  );
};
