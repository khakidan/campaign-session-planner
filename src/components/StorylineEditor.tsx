import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Storyline } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field } from './EditorFormControls';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { storylineTemplate as defaultStorylineTemplate } from '../lib/entityTemplates';

const SUGGESTED_STATUSES = ['Active', 'Resolved', 'Abandoned', 'Paused'];

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
  onSave: (values: StorylineFormValues) => Promise<void> | void;
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
  onDelete,
  onCancel,
  isSaving = false,
  links,
  template,
}) => {
  const [values, setValues] = useState<StorylineFormValues>(() => storylineToFormValues(storyline));
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!values.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    await onSave(values);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
      >
        &larr; Back to Storylines
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <Field id="storyline-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="storyline-status">
            Status
          </label>
          <input
            id="storyline-status"
            type="text"
            list="storyline-status-suggestions"
            value={values.status}
            onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="Active"
          />
          <datalist id="storyline-status-suggestions">
            {SUGGESTED_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <Field id="storyline-priority" label="Priority" value={values.priority} onChange={(v) => setValues((p) => ({ ...p, priority: v }))} />
      </div>

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
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Storyline
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Saving…' : 'Save Storyline'}
          </button>
        </div>
      </div>
    </div>
  );
};
