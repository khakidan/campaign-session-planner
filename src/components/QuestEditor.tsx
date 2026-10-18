import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Quest } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field, AutosaveIndicator, SelectField } from './EditorFormControls';
import { useAutosave } from '../hooks/useAutosave';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { questTemplate as defaultQuestTemplate } from '../lib/entityTemplates';

/** ROADMAP.md's "Status fields... should be better defined" — tracks
 * this Quest's own progress toward completion. Converted from free
 * text (the doc gave no suggested list) to a strict closed-set
 * dropdown (confirmed via `AskUserQuestion`). */
const QUEST_STATUSES = ['Not Started', 'Active', 'Completed', 'Failed', 'Abandoned'] as const;

export interface QuestFormValues {
  name: string;
  status: string;
  details: Block[];
}

function questToFormValues(quest: Quest | null): QuestFormValues {
  return {
    name: quest?.name ?? '',
    status: quest?.status ?? '',
    details: quest?.details ?? [],
  };
}

export interface QuestEditorProps {
  /** `null` means "creating a new Quest." */
  quest: Quest | null;
  /** `existingId` is this editor's own current best knowledge of the
   * Quest's id — see `NoteEditorProps.onSave`'s own doc comment for why
   * this must be branched on instead of `quest`, which never changes
   * mid-edit even after an autosave has already created a record. */
  onSave: (values: QuestFormValues, existingId: string | null) => Promise<void> | void;
  /** Background autosave (ROADMAP.md's "Campaign Planner Notes App") —
   * omit to disable autosave entirely. See `NoteEditorProps.onAutosave`. */
  onAutosave?: (values: QuestFormValues, existingId: string | null) => Promise<{ id: string }>;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2d — entity-linking, only meaningful once the Quest
   * actually exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Quest starter
   * template, if any. Falls back to the shipped default when omitted. */
  template?: PartialBlock[];
  /** Layout customization (ROADMAP.md's "further layout customization
   * beyond the tab bar") — replaces the default Name/Status field block
   * with host-rendered markup. `defaultFields` is that shipped block;
   * wrap it to add a field alongside it, or ignore it to render your
   * own from `values`/`onChange`. Omit to keep the shipped layout. */
  renderFields?: (ctx: {
    values: QuestFormValues;
    onChange: React.Dispatch<React.SetStateAction<QuestFormValues>>;
    defaultFields: React.ReactNode;
  }) => React.ReactNode;
}

/**
 * Slice 4.2e — what the players *know* they're pursuing, distinct from
 * a Thread (what the GM is tracking, which players may not know
 * about). Name/Status are the real properties; everything else the
 * doc lists (Overview, Requirements, Current State, Rewards, History)
 * is one flowing BlockNote document, Notion-page style, not a form of
 * small boxed questions (4.2d's original design). Related Storylines/
 * Threads/People & Places/Encounters are `EntityLink`s (the "Linked
 * Entities" panel below), not document content.
 */
export const QuestEditor: React.FC<QuestEditorProps> = ({
  quest,
  onSave,
  onAutosave,
  onDelete,
  onCancel,
  isSaving = false,
  links,
  template,
  renderFields,
}) => {
  const [values, setValues] = useState<QuestFormValues>(() => questToFormValues(quest));
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(quest?.id ?? null);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field id="quest-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />
      <SelectField
        id="quest-status"
        label="Status"
        value={values.status}
        onChange={(v) => setValues((p) => ({ ...p, status: v }))}
        options={QUEST_STATUSES}
        helperText="Where this Quest stands — not started, actively pursued, finished, or called off."
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)] cursor-pointer"
      >
        &larr; Back to Quests
      </button>

      {error && <div className="text-xs font-semibold text-[var(--csp-danger-600)]">{error}</div>}

      {renderFields ? renderFields({ values, onChange: setValues, defaultFields }) : defaultFields}

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultQuestTemplate}
      />

      {quest && links && <EntityLinksPanel selfRef={{ type: 'quest', id: quest.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-[var(--csp-danger-600)] hover:text-[var(--csp-danger-800)] cursor-pointer"
          >
            Delete Quest
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
            {isSaving ? 'Saving…' : 'Save Quest'}
          </button>
        </div>
      </div>
    </div>
  );
};
