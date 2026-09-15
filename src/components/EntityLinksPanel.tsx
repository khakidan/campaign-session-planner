import React, { useState } from 'react';
import type { EntityLink, EntityLinkId, EntityReference, PlannerEntityType, TTRPGHostAdapter } from '../types';
import { EntityLinkPicker, type PlannerSearchItem } from './EntityLinkPicker';

const PLANNER_TYPES: PlannerEntityType[] = [
  'note',
  'npc',
  'group',
  'location',
  'session',
  'scene',
  'storyline',
  'thread',
  'quest',
  'event',
];

/** The shape every entity editor (Note/NPC/Group/Location) passes as
 * its optional `links` prop once editing an existing, saved record —
 * defined once here and reused rather than repeated per editor. */
export interface EntityEditorLinksProps {
  plannerItems: PlannerSearchItem[];
  hostAdapter: TTRPGHostAdapter;
  outgoing: EntityLink[];
  incoming: EntityLink[];
  onAddLink: (target: EntityReference, label: string) => Promise<void> | void;
  onRemoveLink: (id: EntityLinkId) => Promise<void> | void;
  onOpenPlannerEntity: (ref: EntityReference) => void;
  onOpenHostEntity?: (type: EntityReference['type'], id: string) => void;
}

export interface EntityLinksPanelProps extends EntityEditorLinksProps {
  /** The entity currently being edited — the link's source when adding
   * a new link. */
  selfRef: EntityReference;
}

function linkLabel(link: EntityLink, plannerItems: PlannerSearchItem[], targetSide: boolean): string {
  const type = targetSide ? link.targetType : link.sourceType;
  const id = targetSide ? link.targetId : link.sourceId;
  const metadata = link.metadata as { label?: string; sourceLabel?: string } | undefined;
  const storedLabel = targetSide ? metadata?.label : metadata?.sourceLabel;
  if (storedLabel) return storedLabel;
  // Fallback for Slice 4.2b links (Note-only sources) created before
  // `sourceLabel` existed — resolve from the already-loaded list.
  if (type === 'note') return plannerItems.find((i) => i.type === 'note' && i.id === id)?.label ?? 'Untitled Note';
  return `${type}:${id}`;
}

export const EntityLinksPanel: React.FC<EntityLinksPanelProps> = ({
  selfRef,
  plannerItems,
  hostAdapter,
  outgoing,
  incoming,
  onAddLink,
  onRemoveLink,
  onOpenPlannerEntity,
  onOpenHostEntity,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const openTarget = (type: EntityReference['type'], id: string) => {
    if (PLANNER_TYPES.includes(type as PlannerEntityType)) onOpenPlannerEntity({ type, id, source: 'planner' });
    else onOpenHostEntity?.(type, id);
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-200">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Linked Entities</h4>
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            + Add Link
          </button>
        </div>
        {outgoing.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No links yet.</p>
        ) : (
          <ul className="space-y-1">
            {outgoing.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => openTarget(link.targetType, link.targetId)}
                  className="text-left text-emerald-700 hover:underline cursor-pointer truncate"
                >
                  {linkLabel(link, plannerItems, true)}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveLink(link.id)}
                  aria-label={`Remove link to ${linkLabel(link, plannerItems, true)}`}
                  className="text-slate-400 hover:text-rose-600 text-xs shrink-0 cursor-pointer"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Backlinks</h4>
        {incoming.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Nothing links here yet.</p>
        ) : (
          <ul className="space-y-1">
            {incoming.map((link) => (
              <li key={link.id}>
                <button
                  type="button"
                  onClick={() => openTarget(link.sourceType, link.sourceId)}
                  className="text-left text-sm text-emerald-700 hover:underline cursor-pointer truncate"
                >
                  {linkLabel(link, plannerItems, false)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isPickerOpen && (
        <EntityLinkPicker
          plannerItems={plannerItems}
          hostAdapter={hostAdapter}
          excludeRef={selfRef}
          onClose={() => setIsPickerOpen(false)}
          onSelect={async (target, label) => {
            await onAddLink(target, label);
            setIsPickerOpen(false);
          }}
        />
      )}
    </div>
  );
};
