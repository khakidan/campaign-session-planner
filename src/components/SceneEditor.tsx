import React, { useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { Block, Scene } from '../types';
import { EntityLinksPanel, type EntityEditorLinksProps } from './EntityLinksPanel';
import { Field } from './EditorFormControls';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { sceneTemplate as defaultSceneTemplate } from '../lib/entityTemplates';

export interface SceneFormValues {
  title: string;
  sceneNumber: string;
  status: string;
  details: Block[];
}

function sceneToFormValues(scene: Scene | null): SceneFormValues {
  return {
    title: scene?.title ?? '',
    sceneNumber: scene?.sceneNumber != null ? String(scene.sceneNumber) : '',
    status: scene?.status ?? '',
    details: scene?.details ?? [],
  };
}

export interface SceneEditorProps {
  /** `null` means "creating a new Scene." */
  scene: Scene | null;
  onSave: (values: SceneFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  /** Slice 4.2d — entity-linking, only meaningful once the Scene
   * actually exists (has an id); omitted while creating a new one. A
   * Scene is independently linkable (the doc's "Campaign Connections"
   * section) even though it has no top-level browsable tab — see
   * `SessionEditor.tsx`'s Scenes sub-section for where this is opened
   * from. */
  links?: EntityEditorLinksProps;
  /** Slice 4.2f — this campaign's saved override of the Scene starter
   * template, if any. Falls back to the shipped default when omitted. */
  template?: PartialBlock[];
}

/**
 * Slice 4.2e — a discrete, bounded moment within a Session; rendered
 * inline from `SessionEditor.tsx`'s Scenes sub-section, never from a
 * top-level tab (a Scene browsed outside its Session's context is
 * fairly meaningless). Title/Number/Status are the real properties;
 * everything else the doc lists (Situation, GM Guidance, Player
 * Context, Challenge, Outcomes) is one flowing BlockNote document,
 * Notion-page style, not a form of small boxed questions (4.2d's
 * original design). Participants/Linked Encounter/Campaign Connections
 * are `EntityLink`s (the "Linked Entities" panel below), not document
 * content.
 */
export const SceneEditor: React.FC<SceneEditorProps> = ({ scene, onSave, onDelete, onCancel, isSaving = false, links, template }) => {
  const [values, setValues] = useState<SceneFormValues>(() => sceneToFormValues(scene));
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
    <div className="space-y-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
      >
        &larr; Back to Scenes
      </button>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Field id="scene-title" label="Title" value={values.title} onChange={(v) => setValues((p) => ({ ...p, title: v }))} />
        </div>
        <Field
          id="scene-number"
          label="Scene Number"
          value={values.sceneNumber}
          onChange={(v) => setValues((p) => ({ ...p, sceneNumber: v }))}
        />
      </div>
      <Field id="scene-status" label="Status" value={values.status} onChange={(v) => setValues((p) => ({ ...p, status: v }))} />

      <BlockNoteFreeformField
        value={values.details}
        onChange={(blocks) => setValues((prev) => ({ ...prev, details: blocks }))}
        linking={links}
        template={template ?? defaultSceneTemplate}
      />

      {scene && links && <EntityLinksPanel selfRef={{ type: 'scene', id: scene.id, source: 'planner' }} {...links} />}

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Scene
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
            {isSaving ? 'Saving…' : 'Save Scene'}
          </button>
        </div>
      </div>
    </div>
  );
};
