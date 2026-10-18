import React, { useState } from 'react';
import type { Block, Lore } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { AutosaveIndicator, SelectField } from './EditorFormControls';
import { useAutosave } from '../hooks/useAutosave';

/** ROADMAP.md's "Status fields... should be better defined" — Lore was
 * pulled out of Note (see this file's own doc comment below) and kept
 * the same free-text `status` Note's had before its own conversion;
 * this closes that gap with the identical vocabulary, since a Lore
 * entry's status tracks the same thing a Note's did: whether its
 * information is still live/useful, not what kind of entry it is.
 * Converted from free text to a strict closed-set dropdown (confirmed
 * via `AskUserQuestion`); an existing Lore entry whose stored `status`
 * predates this and isn't one of these four shows as unselected until
 * the GM explicitly picks one. */
const LORE_STATUSES = ['Active', 'Resolved', 'Outdated', 'Archived'] as const;

export interface LoreFormValues {
  title: string;
  status: string;
  tags: string;
  content: Block[];
}

function loreToFormValues(lore: Lore | null): LoreFormValues {
  return {
    title: lore?.title ?? '',
    status: lore?.status ?? '',
    tags: lore?.tags?.join(', ') ?? '',
    content: lore?.content ?? [],
  };
}

export interface LoreEditorProps {
  /** `null` means "creating a new Lore entry." */
  lore: Lore | null;
  /** `existingId` is this editor's own current best knowledge of the
   * Lore entry's id — see `NoteEditorProps.onSave`'s own doc comment
   * for why this must be branched on instead of `lore`, which never
   * changes mid-edit even after an autosave has already created a
   * record. */
  onSave: (values: LoreFormValues, existingId: string | null) => Promise<void> | void;
  /** Background autosave (ROADMAP.md's "Campaign Planner Notes App") —
   * omit to disable autosave entirely. See `NoteEditorProps.onAutosave`. */
  onAutosave?: (values: LoreFormValues, existingId: string | null) => Promise<{ id: string }>;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Entity-linking, only meaningful once this Lore entry actually
   * exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Layout customization (ROADMAP.md's "further layout customization
   * beyond the tab bar") — replaces the default Title/Status/Tags
   * field block with host-rendered markup. `defaultFields` is that
   * shipped block; wrap it to add a field alongside it, or ignore it
   * to render your own from `values`/`onChange`. Omit to keep the
   * shipped layout. */
  renderFields?: (ctx: {
    values: LoreFormValues;
    onChange: React.Dispatch<React.SetStateAction<LoreFormValues>>;
    defaultFields: React.ReactNode;
  }) => React.ReactNode;
}

/**
 * A durable, campaign-wide worldbuilding fact — pulled out of Note
 * (formerly just a suggested `type: 'Lore'`) into its own top-level
 * entity (ROADMAP.md). Kept the exact same shape Note already gave
 * it: Title/Status/Tags are the real properties, Content is one
 * freeform BlockNote document with no starter template — same as
 * Note itself, a Lore entry has no one fixed shape to transcribe into
 * sections.
 */
export const LoreEditor: React.FC<LoreEditorProps> = ({ lore, onSave, onAutosave, onDelete, onCancel, isSaving = false, links, renderFields }) => {
  const [values, setValues] = useState<LoreFormValues>(() => loreToFormValues(lore));
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(lore?.id ?? null);

  const autosaveStatus = useAutosave(values, {
    enabled: Boolean(onAutosave) && values.title.trim() !== '',
    onAutosave: async (current) => {
      const result = await onAutosave!(current, savedId);
      setSavedId(result.id);
    },
  });

  const handleSave = async () => {
    if (!values.title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    await onSave(values, savedId);
  };

  const defaultFields = (
    <>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="lore-title">
          Title
        </label>
        <input
          id="lore-title"
          type="text"
          value={values.title}
          onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
          placeholder="Lore title"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          id="lore-status"
          label="Status"
          value={values.status}
          onChange={(v) => setValues((prev) => ({ ...prev, status: v }))}
          options={LORE_STATUSES}
          helperText="Whether this Lore entry's information is still live/useful, already handled, or kept only for reference."
        />
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="lore-tags">
            Tags (comma-separated)
          </label>
          <input
            id="lore-tags"
            type="text"
            value={values.tags}
            onChange={(e) => setValues((prev) => ({ ...prev, tags: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
            placeholder="ebon-sigil, pandemonium"
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
        &larr; Back to Lore
      </button>

      {error && <div className="text-xs font-semibold text-[var(--csp-danger-600)]">{error}</div>}

      {renderFields ? renderFields({ values, onChange: setValues, defaultFields }) : defaultFields}

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1">Content</label>
        <BlockNoteFreeformField value={values.content} onChange={(blocks) => setValues((prev) => ({ ...prev, content: blocks }))} linking={links} />
      </div>

      {lore && links && <EntityLinksPanel selfRef={{ type: 'lore', id: lore.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-[var(--csp-danger-600)] hover:text-[var(--csp-danger-800)] cursor-pointer"
          >
            Delete Lore
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
            {isSaving ? 'Saving…' : 'Save Lore'}
          </button>
        </div>
      </div>
    </div>
  );
};
