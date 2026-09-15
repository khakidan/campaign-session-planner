import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Npc } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field } from './EditorFormControls';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { npcTemplate as defaultNpcTemplate } from '../lib/entityTemplates';

export interface NpcFormValues {
  name: string;
  details: Block[];
}

function npcToFormValues(npc: Npc | null): NpcFormValues {
  return { name: npc?.name ?? '', details: npc?.details ?? [] };
}

export interface NpcEditorProps {
  /** `null` means "creating a new NPC." */
  npc: Npc | null;
  onSave: (values: NpcFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2c — entity-linking, only meaningful once the NPC actually
   * exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the NPC starter
   * template, if any (from the Template Settings panel). Falls back to
   * the shipped default when omitted. */
  template?: PartialBlock[];
}

/**
 * Slice 4.2e — Name is the one real property; everything the doc lists
 * under NPC (Identity, Appearance, Personality, Motivation & Goals,
 * Knowledge, History, Current Situation, Roleplaying, Tactics, Secrets,
 * Campaign Role) is one flowing BlockNote document the GM writes
 * naturally, Notion-page style — not a form of ~25 small boxed
 * questions (4.2c's original design). Affiliations/Relationships are
 * `EntityLink`s (the "Linked Entities" panel below), not document
 * content.
 */
export const NpcEditor: React.FC<NpcEditorProps> = ({ npc, onSave, onDelete, onCancel, isSaving = false, links, template }) => {
  const [values, setValues] = useState<NpcFormValues>(() => npcToFormValues(npc));
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
        &larr; Back to NPCs
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <Field id="npc-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultNpcTemplate}
      />

      {npc && links && <EntityLinksPanel selfRef={{ type: 'npc', id: npc.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete NPC
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
            {isSaving ? 'Saving…' : 'Save NPC'}
          </button>
        </div>
      </div>
    </div>
  );
};
