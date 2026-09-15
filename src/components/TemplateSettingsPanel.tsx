import React, { useState } from 'react';
import type { Block, PlannerTemplate, TemplateEntityKind } from '../types';
import { TEMPLATE_DEFAULTS, TEMPLATE_LABELS } from '../lib/entityTemplates';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';

export interface TemplateSettingsPanelProps {
  /** Owned by the caller (`CampaignSessionPlanner`'s own `useTemplates`
   * call) rather than fetched again here, so a save made in this panel
   * is immediately visible to every entity editor's own "+ Use starter
   * template" button without a remount — both read the same state. */
  templates: PlannerTemplate[] | null;
  error: string | null;
  saveTemplate: (entityKind: TemplateEntityKind, blocks: Block[]) => Promise<PlannerTemplate>;
  deleteTemplate: (entityKind: TemplateEntityKind) => Promise<void>;
  onClose: () => void;
}

const KINDS: TemplateEntityKind[] = [
  'npc',
  'group',
  'location',
  'session',
  'sessionDebrief',
  'scene',
  'storyline',
  'thread',
  'quest',
  'event',
];

interface TemplateEditorProps {
  initialBlocks: Block[];
  /** The shipped default, distinct from `initialBlocks` (which may be a
   * campaign override) — "Reset to Default" needs to restore *this*,
   * never whatever the still-mounted `initialBlocks` closure captured at
   * mount time (that would just put the just-deleted override back). */
  defaultBlocks: Block[];
  isCustomized: boolean;
  onSave: (blocks: Block[]) => Promise<void>;
  onReset: () => Promise<void>;
}

/**
 * The actual editor + Save/Reset controls for whichever kind is selected.
 * Rendered with `key={selectedKind}` by `TemplateSettingsPanel` below, so
 * its `draft` state is freshly (re-)initialized, in the same render pass
 * as the remount, every time the selected kind changes — critical, not
 * cosmetic: an earlier version kept `draft` in the parent and reset it via
 * a `useEffect` after a kind switch, which ran one render late relative to
 * `BlockNoteFreeformField`'s own remount (itself already keyed to force a
 * fresh BlockNote editor instance, since that editor is otherwise created
 * once and ignores prop changes afterward — see its own comment). The
 * result was `BlockNoteFreeformField` remounting with the *previous*
 * kind's still-stale `draft` value, one render before the effect corrected
 * it — a correction it then had no way to deliver, since the editor
 * inside had already mounted and, by design, never re-reads `value`
 * again. Moving `draft`'s `useState` here means its lazy initializer runs
 * fresh on every remount, using the current `initialBlocks` prop directly
 * — no effect, no lag, no stale render.
 */
const TemplateEditor: React.FC<TemplateEditorProps> = ({ initialBlocks, defaultBlocks, isCustomized, onSave, onReset }) => {
  const [draft, setDraft] = useState<Block[]>(initialBlocks);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(draft);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await onReset();
      setDraft(defaultBlocks);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <BlockNoteFreeformField value={draft} onChange={setDraft} />

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving || !isCustomized}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40 cursor-pointer"
        >
          Reset to Default
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? 'Saving…' : 'Save Template'}
        </button>
      </div>
    </>
  );
};

/**
 * Slice 4.2f — lets a GM customize the per-kind starter template
 * (`lib/entityTemplates.ts`'s shipped defaults) a "+ Use starter
 * template" button inserts on a brand-new, empty document. Edits are
 * per-campaign, stored via `CampaignPlannerRepository.saveTemplate`
 * (confirmed via `AskUserQuestion` over a global/code-only
 * alternative) — one GM's tweaks never affect another campaign. Note
 * has no entry here: it has no shipped template to customize (the doc
 * gives no sub-breakdown of its "Content" bullet to transcribe).
 */
export const TemplateSettingsPanel: React.FC<TemplateSettingsPanelProps> = ({
  templates,
  error,
  saveTemplate,
  deleteTemplate,
  onClose,
}) => {
  const [selectedKind, setSelectedKind] = useState<TemplateEntityKind>('npc');

  const overrideFor = (kind: TemplateEntityKind) => (templates ?? []).find((t) => t.entityKind === kind);
  const effectiveBlocks = (kind: TemplateEntityKind): Block[] =>
    (overrideFor(kind)?.blocks ?? (TEMPLATE_DEFAULTS[kind] as unknown as Block[])) as Block[];

  return (
    <div className="space-y-4">
      <button type="button" onClick={onClose} className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
        &larr; Back to Campaign Planner
      </button>

      <div>
        <h3 className="text-sm font-bold text-slate-800">Starter Templates</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Customize the headings each entity kind's "+ Use starter template" button inserts into a brand-new document. Changes
          apply only to this campaign.
        </p>
      </div>

      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setSelectedKind(kind)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
              selectedKind === kind
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {TEMPLATE_LABELS[kind]}
            {overrideFor(kind) && <span className="ml-1 text-emerald-600">&bull;</span>}
          </button>
        ))}
      </div>

      <TemplateEditor
        key={selectedKind}
        initialBlocks={effectiveBlocks(selectedKind)}
        defaultBlocks={TEMPLATE_DEFAULTS[selectedKind] as unknown as Block[]}
        isCustomized={Boolean(overrideFor(selectedKind))}
        onSave={(blocks) => saveTemplate(selectedKind, blocks).then(() => {})}
        onReset={() => deleteTemplate(selectedKind)}
      />
    </div>
  );
};
