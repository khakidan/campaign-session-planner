import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Group } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field } from './EditorFormControls';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { groupTemplate as defaultGroupTemplate } from '../lib/entityTemplates';

const SUGGESTED_TYPES = [
  'FACTION',
  'ORGANIZATION',
  'GUILD',
  'GOVERNMENT',
  'INSTITUTION',
  'CULT',
  'MILITARY',
  'CRIMINAL_SYNDICATE',
];

export interface GroupFormValues {
  name: string;
  type: string;
  status: string;
  details: Block[];
}

function groupToFormValues(group: Group | null): GroupFormValues {
  return {
    name: group?.name ?? '',
    type: group?.type ?? '',
    status: group?.status ?? '',
    details: group?.details ?? [],
  };
}

export interface GroupEditorProps {
  /** `null` means "creating a new Group." */
  group: Group | null;
  onSave: (values: GroupFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2c — entity-linking, only meaningful once the Group
   * actually exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Group starter
   * template, if any. Falls back to the shipped default when omitted. */
  template?: PartialBlock[];
}

/**
 * Slice 4.2e — Faction/Organization, one table with a `type`
 * discriminator (docs/markdown/campaign_session_notes_app.md's Group
 * section — "this replaces the source doc's separate Faction and
 * Organization templates with one table"). Name/Type/Status are the
 * real properties; everything else the doc lists (Ideology, Goals,
 * Leadership, Resources, Methods, Reputation, Current Activity,
 * Secrets, Campaign Role) is one flowing BlockNote document, Notion-
 * page style, not a form of small boxed questions (4.2c's original
 * design). Allies/Rivals/Enemies/Subordinates/Membership are
 * `EntityLink`s (the "Linked Entities" panel below), not document
 * content.
 */
export const GroupEditor: React.FC<GroupEditorProps> = ({
  group,
  onSave,
  onDelete,
  onCancel,
  isSaving = false,
  links,
  template,
}) => {
  const [values, setValues] = useState<GroupFormValues>(() => groupToFormValues(group));
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
        &larr; Back to Groups
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <Field id="group-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="group-type">
            Type
          </label>
          <input
            id="group-type"
            type="text"
            list="group-type-suggestions"
            value={values.type}
            onChange={(e) => setValues((prev) => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="FACTION"
          />
          <datalist id="group-type-suggestions">
            {SUGGESTED_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <Field id="group-status" label="Status" value={values.status} onChange={(v) => setValues((p) => ({ ...p, status: v }))} />
      </div>

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultGroupTemplate}
      />

      {group && links && <EntityLinksPanel selfRef={{ type: 'group', id: group.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Group
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
            {isSaving ? 'Saving…' : 'Save Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
