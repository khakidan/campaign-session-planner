import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Location } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field } from './EditorFormControls';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { locationTemplate as defaultLocationTemplate } from '../lib/entityTemplates';

export interface LocationFormValues {
  name: string;
  type: string;
  parentLocationId: string;
  details: Block[];
}

function locationToFormValues(location: Location | null): LocationFormValues {
  return {
    name: location?.name ?? '',
    type: location?.type ?? '',
    parentLocationId: location?.parentLocationId ?? '',
    details: location?.details ?? [],
  };
}

export interface LocationEditorProps {
  /** `null` means "creating a new Location." */
  location: Location | null;
  /** Every other Location in the campaign, for the Parent Location
   * picker — the record being edited is excluded by the caller so it
   * can never be selected as its own parent. Full cycle detection
   * beyond that one-hop guard is out of scope for this manual GM
   * tool. */
  otherLocations: Location[];
  onSave: (values: LocationFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2c — entity-linking, only meaningful once the Location
   * actually exists (has an id); omitted while creating a new one. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Location
   * starter template, if any. Falls back to the shipped default when
   * omitted. */
  template?: PartialBlock[];
}

/**
 * Slice 4.2e — Name/Type/Parent Location are the real properties;
 * everything else the doc lists (Description, Appearance, Atmosphere,
 * Features, Inhabitants, History, Current State, Access, Resources,
 * Secrets) is one flowing BlockNote document, Notion-page style, not a
 * form of small boxed questions (4.2c's original design). Connected
 * Locations is an `EntityLink` (the "Linked Entities" panel below),
 * not document content.
 */
export const LocationEditor: React.FC<LocationEditorProps> = ({
  location,
  otherLocations,
  onSave,
  onDelete,
  onCancel,
  isSaving = false,
  links,
  template,
}) => {
  const [values, setValues] = useState<LocationFormValues>(() => locationToFormValues(location));
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
        &larr; Back to Locations
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <Field id="location-name" label="Name" value={values.name} onChange={(v) => setValues((p) => ({ ...p, name: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="location-type" label="Type" value={values.type} onChange={(v) => setValues((p) => ({ ...p, type: v }))} />
        <div>
          <label
            className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            htmlFor="location-parent"
          >
            Parent Location
          </label>
          <select
            id="location-parent"
            value={values.parentLocationId}
            onChange={(e) => setValues((prev) => ({ ...prev, parentLocationId: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">None</option>
            {otherLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultLocationTemplate}
      />

      {location && links && (
        <EntityLinksPanel selfRef={{ type: 'location', id: location.id, source: 'planner' }} {...links} />
      )}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Location
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
            {isSaving ? 'Saving…' : 'Save Location'}
          </button>
        </div>
      </div>
    </div>
  );
};
