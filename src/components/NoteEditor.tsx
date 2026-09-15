import React, { useState } from 'react';
import type { Block, Note } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';

const SUGGESTED_TYPES = ['General', 'Idea', 'Reminder', 'Research', 'Lore', 'Session Note', 'GM Note', 'Player Note', 'Secret'];

export interface NoteFormValues {
  title: string;
  type: string;
  status: string;
  tags: string;
  content: Block[];
}

function noteToFormValues(note: Note | null): NoteFormValues {
  return {
    title: note?.title ?? '',
    type: note?.type ?? '',
    status: note?.status ?? '',
    tags: note?.tags?.join(', ') ?? '',
    content: note?.content ?? [],
  };
}

export interface NoteEditorProps {
  /** `null` means "creating a new Note." */
  note: Note | null;
  onSave: (values: NoteFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /**
   * Slice 4.2b — entity-linking, only meaningful once a Note actually
   * exists (has an id), so all of this is optional and simply omitted
   * while creating a new one.
   */
  links?: EntityEditorLinksProps;
}

/**
 * Content is a real BlockNote document (Slice 4.2e) — Note's own
 * `[[`/`@` picker inserts a real, clickable `entityReference` node
 * backed by an `EntityLink` row, per the doc's "not just a styled
 * mention" goal. Deliberately not built on this host app's own
 * `MarkdownEditor.tsx`/`ui/*` components: this package stays
 * stylistically self-contained so it stays portable to a future,
 * different host app, per the doc's package-boundary goal.
 */
export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onDelete, onCancel, isSaving = false, links }) => {
  const [values, setValues] = useState<NoteFormValues>(() => noteToFormValues(note));
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!values.title.trim()) {
      setError('Title is required.');
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
        &larr; Back to Notes
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="note-title">
          Title
        </label>
        <input
          id="note-title"
          type="text"
          value={values.title}
          onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          placeholder="Note title"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="note-type">
            Type
          </label>
          <input
            id="note-type"
            type="text"
            list="note-type-suggestions"
            value={values.type}
            onChange={(e) => setValues((prev) => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="General"
          />
          <datalist id="note-type-suggestions">
            {SUGGESTED_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="note-status">
            Status
          </label>
          <input
            id="note-status"
            type="text"
            value={values.status}
            onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="note-tags">
          Tags (comma-separated)
        </label>
        <input
          id="note-tags"
          type="text"
          value={values.tags}
          onChange={(e) => setValues((prev) => ({ ...prev, tags: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          placeholder="ebon-sigil, pandemonium"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Content</label>
        <BlockNoteFreeformField
          value={values.content}
          onChange={(blocks) => setValues((prev) => ({ ...prev, content: blocks }))}
          linking={links}
        />
      </div>

      {note && links && <EntityLinksPanel selfRef={{ type: 'note', id: note.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Note
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
            {isSaving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
