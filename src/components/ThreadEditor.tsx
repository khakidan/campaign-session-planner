import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Thread } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field } from './EditorFormControls';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { threadTemplate as defaultThreadTemplate } from '../lib/entityTemplates';

const SUGGESTED_STATUSES = ['Open', 'Resolved', 'Abandoned'];

export interface ThreadFormValues {
  name: string;
  status: string;
  priority: string;
  details: Block[];
}

function threadToFormValues(thread: Thread | null): ThreadFormValues {
  return {
    name: thread?.name ?? '',
    status: thread?.status ?? '',
    priority: thread?.priority ?? '',
    details: thread?.details ?? [],
  };
}

export interface ThreadEditorProps {
  /** `null` means "creating a new Thread." */
  thread: Thread | null;
  onSave: (values: ThreadFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2d — entity-linking, only meaningful once the Thread
   * actually exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Thread starter
   * template, if any. Falls back to the shipped default when omitted. */
  template?: PartialBlock[];
}

/**
 * Slice 4.2e — an unresolved question the GM doesn't want to lose
 * track of, distinct from a Storyline (larger arc) or Quest (what the
 * *players* know they're pursuing). Name/Status/Priority are the real
 * properties; everything else the doc lists (The Unresolved Element,
 * Origin, Player Knowledge, Resolution) is one flowing BlockNote
 * document, Notion-page style, not a form of small boxed questions
 * (4.2d's original design). Created-In/Resolved-In Session and every
 * other Connection are `EntityLink`s (the "Linked Entities" panel
 * below), not document content.
 */
export const ThreadEditor: React.FC<ThreadEditorProps> = ({
  thread,
  onSave,
  onDelete,
  onCancel,
  isSaving = false,
  links,
  template,
}) => {
  const [values, setValues] = useState<ThreadFormValues>(() => threadToFormValues(thread));
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
        &larr; Back to Threads
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <Field id="thread-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="thread-status">
            Status
          </label>
          <input
            id="thread-status"
            type="text"
            list="thread-status-suggestions"
            value={values.status}
            onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="Open"
          />
          <datalist id="thread-status-suggestions">
            {SUGGESTED_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <Field id="thread-priority" label="Priority" value={values.priority} onChange={(v) => setValues((p) => ({ ...p, priority: v }))} />
      </div>

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultThreadTemplate}
      />

      {thread && links && <EntityLinksPanel selfRef={{ type: 'thread', id: thread.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Thread
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
            {isSaving ? 'Saving…' : 'Save Thread'}
          </button>
        </div>
      </div>
    </div>
  );
};
