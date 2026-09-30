import React from 'react';
import type { EntityReference } from '../types';
import type { CampaignChanges } from '../lib/campaignChanges';

export interface CampaignChangesPanelProps {
  changes: CampaignChanges;
  onOpenPlannerEntity: (ref: EntityReference) => void;
}

interface Group {
  label: string;
  emptyLabel: string;
  items: Array<{ id: string; label: string }>;
  refType: EntityReference['type'];
}

/**
 * Phase 2 item 5 (Campaign Changes) — "what's changed since last
 * session," the backward-looking counterpart to `SessionBriefingPanel`.
 * Same list/click-through/empty-state pattern; each group always
 * renders so a GM sees at a glance that nothing changed, rather than
 * an ambiguous empty panel.
 */
export const CampaignChangesPanel: React.FC<CampaignChangesPanelProps> = ({ changes, onOpenPlannerEntity }) => {
  const groups: Group[] = [
    { label: 'NPCs', emptyLabel: 'No NPCs changed.', items: changes.npcs.map((n) => ({ id: n.id, label: n.name })), refType: 'npc' },
    {
      label: 'Groups',
      emptyLabel: 'No Groups changed.',
      items: changes.groups.map((g) => ({ id: g.id, label: g.name })),
      refType: 'group',
    },
    {
      label: 'Locations',
      emptyLabel: 'No Locations changed.',
      items: changes.locations.map((l) => ({ id: l.id, label: l.name })),
      refType: 'location',
    },
    {
      label: 'Threads',
      emptyLabel: 'No Threads changed.',
      items: changes.threads.map((t) => ({ id: t.id, label: t.name })),
      refType: 'thread',
    },
    {
      label: 'Quests',
      emptyLabel: 'No Quests changed.',
      items: changes.quests.map((q) => ({ id: q.id, label: q.name })),
      refType: 'quest',
    },
    {
      label: 'Events',
      emptyLabel: 'No Events changed.',
      items: changes.events.map((e) => ({ id: e.id, label: e.name })),
      refType: 'event',
    },
  ];

  return (
    <div className="space-y-4 p-3 border border-[var(--csp-neutral-200)] rounded-lg bg-[var(--csp-neutral-50)]">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)]">
        What Changed Since Last Session
      </h3>
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1">{group.label}</h4>
          {group.items.length === 0 ? (
            <p className="text-xs text-[var(--csp-neutral-400)] italic">{group.emptyLabel}</p>
          ) : (
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenPlannerEntity({ type: group.refType, id: item.id, source: 'planner' })}
                    className="text-left text-sm text-[var(--csp-accent-700)] hover:underline cursor-pointer truncate"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};
