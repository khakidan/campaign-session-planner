import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Storyline } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field, AutosaveIndicator, SelectField } from './EditorFormControls';
import { useAutosave } from '../hooks/useAutosave';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { storylineTemplate as defaultStorylineTemplate } from '../lib/entityTemplates';

const SUGGESTED_STATUSES = ['Active', 'Resolved', 'Abandoned', 'Paused'];

/** ROADMAP.md's "Priority fields... should be better defined" — how
 * urgently this Storyline needs the GM's attention. Converted from
 * free text (no suggested list at all before this) to a strict
 * closed-set dropdown (confirmed via `AskUserQuestion`). */
const STORYLINE_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export interface StorylineFormValues {
  name: string;
  status: string;
  priority: string;
  details: Block[];
}

function storylineToFormValues(storyline: Storyline | null): StorylineFormValues {
  return {
    name: storyline?.name ?? '',
    status: storyline?.status ?? '',
    priority: storyline?.priority ?? '',
    details: storyline?.details ?? [],
  };
}

export interface StorylineEditorProps {
  /** `null` means "creating a new Storyline." */
  storyline: Storyline | null;
  /** `existingId` is this editor's own current best knowledge of the
   * Storyline's id — see `NoteEditorProps.onSave`'s own doc comment for
   * why this must be branched on instead of `storyline`, which never
   * changes mid-edit even after an autosave has already created a record. */
  onSave: (values: StorylineFormValues, existingId: string | null) => Promise<void> | void;
  /** Background autosave (ROADMAP.md's "Campaign Planner Notes App") —
   * omit to disable autosave entirely. See `NoteEditorProps.onAutosave`. */
  onAutosave?: (values: StorylineFormValues, existingId: string | null) => Promise<{ id: string }>;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2d — entity-linking, only meaningful once the Storyline
   * actually exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Storyline
   * starter template, if any. Falls back to the shipped default when
   * omitted. */
  template?: PartialBlock[];
  /** Layout customization (ROADMAP.md's "further layout customization
   * beyond the tab bar") — replaces the default Name/Status/Priority
   * field block with host-rendered markup. `defaultFields` is that
   * shipped block; wrap it to add a field alongside it, or ignore it to
   * render your own from `values`/`onChange`. Omit to keep the shipped
   * layout. */
  renderFields?: (ctx: {
    values: StorylineFormValues;
    onChange: React.Dispatch<React.SetStateAction<StorylineFormValues>>;
    defaultFields: React.ReactNode;
  }) => React.ReactNode;
}

/**
 * Slice 4.2e — a larger narrative arc that Threads advance and Scenes
 * play out. Name/Status/Priority are the real properties; everything
 * else the doc lists (Premise, Goals, Progression, Milestones, History,
 * Secrets) is one flowing BlockNote document, Notion-page style, not a
 * form of small boxed questions (4.2d's original design). Active
 * Threads/Quests/Important People & Places are `EntityLink`s (the
 * "Linked Entities" panel below), not document content.
 */
export const StorylineEditor: React.FC<StorylineEditorProps> = ({
  storyline,
  onSave,
  onAutosave,
  onDelete,
  onCancel,
  isSaving = false,
  links,
  template,
  renderFields,
}) => {
  const [values, setValues] = useState<StorylineFormValues>(() => storylineToFormValues(storyline));
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(storyline?.id ?? null);

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
      <Field id="storyline-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="storyline-status">
            Status
          </label>
          <input
            id="storyline-status"
            type="text"
            list="storyline-status-suggestions"
            value={values.status}
            onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
            placeholder="Active"
          />
          <datalist id="storyline-status-suggestions">
            {SUGGESTED_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <SelectField
          id="storyline-priority"
          label="Priority"
          value={values.priority}
          onChange={(v) => setValues((p) => ({ ...p, priority: v }))}
          options={STORYLINE_PRIORITIES}
          helperText="How urgently this Storyline needs your attention."
        />
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
        &larr; Back to Storylines
      </button>

      {error && <div className="text-xs font-semibold text-[var(--csp-danger-600)]">{error}</div>}

      {renderFields ? renderFields({ values, onChange: setValues, defaultFields }) : defaultFields}

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultStorylineTemplate}
      />

      {storyline && links && (
        <EntityLinksPanel selfRef={{ type: 'storyline', id: storyline.id, source: 'planner' }} {...links} />
      )}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-[var(--csp-danger-600)] hover:text-[var(--csp-danger-800)] cursor-pointer"
          >
            Delete Storyline
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
            {isSaving ? 'Saving…' : 'Save Storyline'}
          </button>
        </div>
      </div>
    </div>
  );
};
