import React from 'react';
import type { EntityReference, Note, Thread } from '../types';
import type { SessionBriefing } from '../lib/plannerMemory';
import { getNoteConfidence } from '../lib/plannerMemory';
import type { CharacterMemoryGroup } from '../hooks/useSessionBriefing';

export interface SessionBriefingPanelProps {
  briefing: SessionBriefing;
  onOpenPlannerEntity: (ref: EntityReference) => void;
  /** Phase 2 item 3 (Player Intent) — active memory Notes grouped by
   * the host Character each is linked to (`useSessionBriefing`'s
   * `byCharacter`). Omitted or empty simply skips the "Why This
   * Session Matters" section entirely — every other group still
   * renders campaign-wide regardless. */
  byCharacter?: CharacterMemoryGroup[];
}

interface Group {
  label: string;
  emptyLabel: string;
  items: Array<Note | Thread>;
  refType: EntityReference['type'];
  displayLabel: (item: Note | Thread) => string;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  observed: 'observed',
  inferred: 'inferred',
  proposed: 'proposed — unconfirmed',
};

/** A small badge next to a memory Note showing its recorded confidence
 * (Phase 2 item 4) — deliberately visible wherever a Note's title
 * renders in this panel, so a player's still-unconfirmed theory never
 * reads indistinguishably from an established fact. */
const ConfidenceBadge: React.FC<{ item: Note | Thread }> = ({ item }) => {
  if (!('tags' in item)) return null;
  const confidence = getNoteConfidence(item);
  if (!confidence) return null;
  return (
    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--csp-neutral-100)] text-[9px] font-semibold uppercase tracking-wide text-[var(--csp-neutral-500)]">
      {CONFIDENCE_LABELS[confidence] ?? confidence}
    </span>
  );
};

/**
 * Phase 1 "Memory" (ROADMAP.md) — a read-only, pre-session-prep view of
 * what's already been established: open Threads and active memory
 * Notes (player theories, interests, character goals, NPC attachments,
 * unresolved questions, player preferences), each click-through into
 * its real entity via `onOpenPlannerEntity` (the same callback every
 * other editor's `EntityLinksPanel` uses). Every group renders even
 * when empty, with its own empty-state message, so a GM discovers the
 * feature exists even in a fresh campaign rather than seeing nothing
 * at all.
 *
 * Phase 2 item 3 additionally surfaces a "Why This Session Matters"
 * section, one sub-list per PC, when `byCharacter` is supplied.
 */
export const SessionBriefingPanel: React.FC<SessionBriefingPanelProps> = ({ briefing, onOpenPlannerEntity, byCharacter }) => {
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
    {
      label: 'Player Preferences',
      emptyLabel: 'No noted player preferences yet.',
      items: briefing.playerPreferences,
      refType: 'note',
      displayLabel: (item) => (item as Note).title,
    },
  ];

  return (
    <div className="space-y-4 p-3 border border-[var(--csp-neutral-200)] rounded-lg bg-[var(--csp-neutral-50)]">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)]">
        Previously Established
      </h3>

      {byCharacter && byCharacter.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1">
            Why This Session Matters
          </h4>
          <div className="space-y-2">
            {byCharacter.map(({ character, notes }) => (
              <div key={character.id}>
                <p className="text-xs font-semibold text-[var(--csp-neutral-700)]">{character.name}</p>
                <ul className="space-y-1 pl-2">
                  {notes.map((note) => (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => onOpenPlannerEntity({ type: 'note', id: note.id, source: 'planner' })}
                        className="text-left text-sm text-[var(--csp-accent-700)] hover:underline cursor-pointer truncate"
                      >
                        {note.title}
                      </button>
                      <ConfidenceBadge item={note} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <ConfidenceBadge item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};
