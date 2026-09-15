import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Quest } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field } from './EditorFormControls';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { questTemplate as defaultQuestTemplate } from '../lib/entityTemplates';

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
  onSave: (values: QuestFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2d — entity-linking, only meaningful once the Quest
   * actually exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Quest starter
   * template, if any. Falls back to the shipped default when omitted. */
  template?: PartialBlock[];
}

/**
 * Slice 4.2e — what the players *know* they're pursuing, distinct from
 * a Thread (what the GM is tracking, which players may not know
 * about). Name/Status are the real properties (the doc gives no
 * suggested Status list, so it's plain free text); everything else the
 * doc lists (Overview, Requirements, Current State, Rewards, History)
 * is one flowing BlockNote document, Notion-page style, not a form of
 * small boxed questions (4.2d's original design). Related Storylines/
 * Threads/People & Places/Encounters are `EntityLink`s (the "Linked
 * Entities" panel below), not document content.
 */
export const QuestEditor: React.FC<QuestEditorProps> = ({ quest, onSave, onDelete, onCancel, isSaving = false, links, template }) => {
  const [values, setValues] = useState<QuestFormValues>(() => questToFormValues(quest));
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
        &larr; Back to Quests
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="quest-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />
        <Field id="quest-status" label="Status" value={values.status} onChange={(v) => setValues((p) => ({ ...p, status: v }))} />
      </div>

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
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Quest
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
            {isSaving ? 'Saving…' : 'Save Quest'}
          </button>
        </div>
      </div>
    </div>
  );
};
