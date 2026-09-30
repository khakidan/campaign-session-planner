import React, { useState } from 'react';
import type { Block, Note } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { MEMORY_NOTE_TYPES, OBSERVATION_CONFIDENCE_LEVELS, getNoteConfidence, withConfidence, type ObservationConfidence } from '../lib/plannerMemory';
import { NOTE_TYPE_TEMPLATES } from '../lib/noteTypeTemplates';

/** Phase 1 "Memory" (ROADMAP.md) adds `MEMORY_NOTE_TYPES` to the
 * datalist alongside the original suggestions — a Note tagged with one
 * of those types is what `useSessionBriefing`/`SessionBriefingPanel`
 * surface as "previously established" context. Phase 2 item 4 (Session
 * Observations) adds the rest of the proposal's `SessionObservation`
 * type list that isn't already covered by `MEMORY_NOTE_TYPES` or the
 * dedicated `'Player Preference'` type — these are GM/table
 * observations, not "still-open memory" a future session briefing
 * needs to resurface, so they live in this plain suggestion list
 * rather than `MEMORY_NOTE_TYPES`. `'Session Safety'` (item 8) and
 * `'Player Contribution'` (item 6) each have matching starter content
 * in `NOTE_TYPE_TEMPLATES`. Every addition is purely additive to the
 * existing free-text `type` field; no schema change. */
const SUGGESTED_TYPES = [
  'General',
  'Idea',
  'Reminder',
  'Research',
  'Lore',
  'Session Note',
  'GM Note',
  'Player Note',
  'Secret',
  ...MEMORY_NOTE_TYPES,
  'World Fact',
  'Consequence',
  'Pacing Note',
  'Rules Question',
  'Session Safety',
  'Player Contribution',
];

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
  /** Layout customization (ROADMAP.md's "further layout customization
   * beyond the tab bar") — replaces the default Title/Type/Status/Tags/
   * Confidence field block with host-rendered markup. `defaultFields`
   * is that shipped block, rendered exactly as it normally would be, so
   * a host that only wants to add a field alongside the shipped ones
   * can return `<>{defaultFields}<MyField .../></>` without
   * reimplementing anything; a host that wants a different order or to
   * omit a field entirely can ignore `defaultFields` and render its own
   * markup from `values`/`onChange` instead. Omit to keep the shipped
   * layout unchanged. Everything below the fields (Content, Linked
   * Entities, Save/Cancel/Delete) is unaffected either way. */
  renderFields?: (ctx: {
    values: NoteFormValues;
    onChange: React.Dispatch<React.SetStateAction<NoteFormValues>>;
    defaultFields: React.ReactNode;
  }) => React.ReactNode;
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
export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onDelete, onCancel, isSaving = false, links, renderFields }) => {
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

  const parsedTags = values.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const confidence = getNoteConfidence({ tags: parsedTags });

  const handleConfidenceChange = (level: ObservationConfidence | '') => {
    setValues((prev) => ({ ...prev, tags: withConfidence(parsedTags, level || null).join(', ') }));
  };

  /** Phase 2 item 7 — type-specific starter content, offered only while
   * creating a brand-new Note (an existing Note's content shouldn't be
   * silently reinterpreted if its type is edited later). */
  const starterTemplate = note === null ? NOTE_TYPE_TEMPLATES[values.type] : undefined;

  const defaultFields = (
    <>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="note-title">
          Title
        </label>
        <input
          id="note-title"
          type="text"
          value={values.title}
          onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
          placeholder="Note title"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="note-type">
            Type
          </label>
          <input
            id="note-type"
            type="text"
            list="note-type-suggestions"
            value={values.type}
            onChange={(e) => setValues((prev) => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
            placeholder="General"
          />
          <datalist id="note-type-suggestions">
            {SUGGESTED_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="note-status">
            Status
          </label>
          <input
            id="note-status"
            type="text"
            value={values.status}
            onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="note-tags">
            Tags (comma-separated)
          </label>
          <input
            id="note-tags"
            type="text"
            value={values.tags}
            onChange={(e) => setValues((prev) => ({ ...prev, tags: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
            placeholder="ebon-sigil, pandemonium"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="note-confidence">
            Confidence
          </label>
          <select
            id="note-confidence"
            value={confidence ?? ''}
            onChange={(e) => handleConfidenceChange(e.target.value as ObservationConfidence | '')}
            className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
          >
            <option value="">Not recorded</option>
            {OBSERVATION_CONFIDENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
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
        &larr; Back to Notes
      </button>

      {error && <div className="text-xs font-semibold text-[var(--csp-danger-600)]">{error}</div>}

      {renderFields ? renderFields({ values, onChange: setValues, defaultFields }) : defaultFields}

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1">Content</label>
        <BlockNoteFreeformField
          value={values.content}
          onChange={(blocks) => setValues((prev) => ({ ...prev, content: blocks }))}
          linking={links}
          template={starterTemplate}
        />
      </div>

      {note && links && <EntityLinksPanel selfRef={{ type: 'note', id: note.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-[var(--csp-danger-600)] hover:text-[var(--csp-danger-800)] cursor-pointer"
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
            {isSaving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
