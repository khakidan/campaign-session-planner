import type { Note, Thread } from '../types';

/**
 * Phase 1 "Memory" (ROADMAP.md) — the suggested `Note.type` values that
 * mark a Note as a memory object (player theory, character goal, NPC
 * attachment, etc.) rather than a general-purpose Note. Deliberately
 * just more entries in the same free-text `type` field `NoteEditor.tsx`
 * already offers as datalist suggestions — no schema change, no new
 * entity. Exported so `NoteEditor.tsx` and this file share one list
 * instead of duplicating the strings.
 */
export const MEMORY_NOTE_TYPES = [
  'Player Theory',
  'Player Interest',
  'Character Goal',
  'NPC Attachment',
  'Unresolved Question',
  'Player-Created Fact',
  'Future Hook',
] as const;

export type MemoryNoteType = (typeof MEMORY_NOTE_TYPES)[number];

const RESOLVED_STATUSES = new Set(['resolved', 'archived']);

/**
 * A memory Note is "active" unless its free-text `status` says
 * otherwise — tolerant of case/whitespace since `Note.status` is a
 * plain text field, not an enum (see `types/index.ts`).
 */
function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !RESOLVED_STATUSES.has(status.trim().toLowerCase());
}

/** Notes whose `type` is one of `MEMORY_NOTE_TYPES` and whose `status`
 * isn't Resolved/Archived — the pool a session briefing draws from. */
export function selectActiveMemoryNotes(notes: Note[]): Note[] {
  const memoryTypes = new Set<string>(MEMORY_NOTE_TYPES);
  return notes.filter((note) => note.type != null && memoryTypes.has(note.type) && isActiveStatus(note.status));
}

/** Threads with an Open (or unset) status — the existing Thread entity
 * reused as-is, per the Phase 1 plan's "no new schema" constraint. */
export function selectActiveThreads(threads: Thread[]): Thread[] {
  return threads.filter((thread) => !thread.status || thread.status.trim().toLowerCase() === 'open');
}

export interface SessionBriefing {
  playerTheories: Note[];
  playerInterests: Note[];
  characterGoals: Note[];
  npcAttachments: Note[];
  unresolvedQuestions: Note[];
  activeThreads: Thread[];
}

/**
 * Groups active memory Notes by type and active Threads into the
 * shape `SessionBriefingPanel.tsx` renders. A derived, read-only view —
 * nothing here is persisted; recomputed fresh from whatever `Note`/
 * `Thread` rows the host's repository currently returns.
 */
export function buildSessionBriefing(notes: Note[], threads: Thread[]): SessionBriefing {
  const active = selectActiveMemoryNotes(notes);
  const byType = (type: MemoryNoteType) => active.filter((note) => note.type === type);

  return {
    playerTheories: byType('Player Theory'),
    playerInterests: byType('Player Interest'),
    characterGoals: byType('Character Goal'),
    npcAttachments: byType('NPC Attachment'),
    unresolvedQuestions: byType('Unresolved Question'),
    activeThreads: selectActiveThreads(threads),
  };
}
