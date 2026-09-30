import React from 'react';
import type { EntityReference, Note, Thread } from '../types';
import type { SessionBriefing } from '../lib/plannerMemory';

export interface SessionBriefingPanelProps {
  briefing: SessionBriefing;
  onOpenPlannerEntity: (ref: EntityReference) => void;
}

interface Group {
  label: string;
  emptyLabel: string;
  items: Array<Note | Thread>;
  refType: EntityReference['type'];
  displayLabel: (item: Note | Thread) => string;
}

/**
 * Phase 1 "Memory" (ROADMAP.md) — a read-only, pre-session-prep view of
 * what's already been established: open Threads and active memory
 * Notes (player theories, interests, character goals, NPC attachments,
 * unresolved questions), each click-through into its real entity via
 * `onOpenPlannerEntity` (the same callback every other editor's
 * `EntityLinksPanel` uses). Every group renders even when empty, with
 * its own empty-state message, so a GM discovers the feature exists
 * even in a fresh campaign rather than seeing nothing at all.
 */
export const SessionBriefingPanel: React.FC<SessionBriefingPanelProps> = ({ briefing, onOpenPlannerEntity }) => {
  const groups: Group[] = [
    {
      label: 'Active Threads',
      emptyLabel: 'No open threads yet.',
      items: briefing.activeThreads,
      refType: 'thread',
      displayLabel: (item) => (item as Thread).name,
    },
    {
      label: 'Player Theories Worth Revisiting',
      emptyLabel: 'No open player theories yet.',
      items: briefing.playerTheories,
      refType: 'note',
      displayLabel: (item) => (item as Note).title,
    },
    {
      label: 'Unresolved Questions',
      emptyLabel: 'No unresolved questions yet.',
      items: briefing.unresolvedQuestions,
      refType: 'note',
      displayLabel: (item) => (item as Note).title,
    },
    {
      label: 'Player Interests',
      emptyLabel: 'No noted player interests yet.',
      items: briefing.playerInterests,
      refType: 'note',
      displayLabel: (item) => (item as Note).title,
    },
    {
      label: 'Character Goals',
      emptyLabel: 'No noted character goals yet.',
      items: briefing.characterGoals,
      refType: 'note',
      displayLabel: (item) => (item as Note).title,
    },
    {
      label: 'NPC Attachments',
      emptyLabel: 'No noted NPC attachments yet.',
      items: briefing.npcAttachments,
      refType: 'note',
      displayLabel: (item) => (item as Note).title,
    },
  ];

  return (
    <div className="space-y-4 p-3 border border-[var(--csp-neutral-200)] rounded-lg bg-[var(--csp-neutral-50)]">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)]">
        Previously Established
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
                    {group.displayLabel(item)}
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
