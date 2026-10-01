import type { EntityId, EntityLink, Note, Thread } from '../types';

/**
 * Phase 1 "Memory" (ROADMAP.md) — the suggested `Note.type` values that
 * mark a Note as a memory object (player theory, character goal, NPC
 * attachment, etc.) rather than a general-purpose Note. Deliberately
 * just more entries in the same free-text `type` field `NoteEditor.tsx`
 * already offers as datalist suggestions — no schema change, no new
 * entity. Exported so `NoteEditor.tsx` and this file share one list
 * instead of duplicating the strings.
 *
 * `'Player Preference'` (Phase 2 item 3) covers the proposal's "Player
 * Style" section (Enjoys/Often Contributes/Needs Opportunities For) —
 * deliberately framed as a note a GM writes and revisits, not a
 * permanent label on a player.
 */
export const MEMORY_NOTE_TYPES = [
  'Player Theory',
  'Player Interest',
  'Character Goal',
  'NPC Attachment',
  'Unresolved Question',
  'Player-Created Fact',
  'Future Hook',
  'Player Preference',
] as const;

export type MemoryNoteType = (typeof MEMORY_NOTE_TYPES)[number];

/**
 * Phase 2 item 4 (Session Observations) — the proposal's
 * `SessionObservation.confidence` field, minus the new entity: rather
 * than a schema column, this is a reserved-prefix tag on the existing
 * `Note.tags: string[]` field, the same "free-text, UI-suggested, not
 * schema-enforced" convention `type`/`status` already use. The book's
 * own point is the whole reason this exists: a player's guess should
 * never render indistinguishably from an established fact.
 */
export const OBSERVATION_CONFIDENCE_LEVELS = ['observed', 'inferred', 'proposed'] as const;
export type ObservationConfidence = (typeof OBSERVATION_CONFIDENCE_LEVELS)[number];

const CONFIDENCE_TAG_PREFIX = 'confidence:';

/** Reads the confidence level encoded in a Note's `tags`, if any. */
export function getNoteConfidence(note: Pick<Note, 'tags'>): ObservationConfidence | null {
  const tag = note.tags.find((t) => t.startsWith(CONFIDENCE_TAG_PREFIX));
  if (!tag) return null;
  const value = tag.slice(CONFIDENCE_TAG_PREFIX.length);
  return (OBSERVATION_CONFIDENCE_LEVELS as readonly string[]).includes(value) ? (value as ObservationConfidence) : null;
}

/** Returns a new `tags` array with any existing confidence tag replaced
 * (or removed, if `level` is `null`) — never producing two confidence
 * tags at once. Every other tag is left untouched, in its original
 * order. */
export function withConfidence(tags: string[], level: ObservationConfidence | null): string[] {
  const withoutConfidence = tags.filter((t) => !t.startsWith(CONFIDENCE_TAG_PREFIX));
  return level ? [...withoutConfidence, `${CONFIDENCE_TAG_PREFIX}${level}`] : withoutConfidence;
}

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
  playerPreferences: Note[];
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
    playerPreferences: byType('Player Preference'),
    activeThreads: selectActiveThreads(threads),
  };
}

/** ROADMAP.md's "Discoverability of what's already built" — true when
 * every group `SessionBriefingPanel` renders would be empty, i.e. this
 * campaign hasn't adopted the Memory-Note-type/Thread conventions at
 * all yet. Drives the panel's dismissible intro tip: shown while this
 * is true (a GM genuinely has nothing to see yet, so explaining where
 * content comes from can't be noise), hidden automatically the moment
 * the first memory Note or open Thread exists, regardless of whether
 * the tip was ever dismissed. */
export function isSessionBriefingEmpty(briefing: SessionBriefing): boolean {
  return (
    briefing.activeThreads.length === 0 &&
    briefing.playerTheories.length === 0 &&
    briefing.playerInterests.length === 0 &&
    briefing.characterGoals.length === 0 &&
    briefing.npcAttachments.length === 0 &&
    briefing.unresolvedQuestions.length === 0 &&
    briefing.playerPreferences.length === 0
  );
}

/**
 * Phase 2 item 3 (Player Intent) — groups already-active memory Notes
 * by the host-owned `'character'` each is linked to, via the *existing*
 * `EntityLink` graph (no new entity, no `TTRPGHostAdapter` change: a
 * Note has always been linkable to a host Character through "Add Link"
 * → `EntityLinkPicker`, which already searches and links host entities
 * with `source: 'host'`). A Note with no such link simply doesn't
 * appear in the result — it's still visible in the plain campaign-wide
 * `SessionBriefing` groups, just not attributable to one PC.
 */
export function groupMemoryByCharacter(notes: Note[], links: EntityLink[]): Map<EntityId, Note[]> {
  const active = selectActiveMemoryNotes(notes);
  const result = new Map<EntityId, Note[]>();

  for (const note of active) {
    const characterId = links.find(
      (link) => link.sourceType === 'note' && link.sourceId === note.id && link.targetType === 'character'
    )?.targetId;
    if (!characterId) continue;
    const existing = result.get(characterId);
    if (existing) existing.push(note);
    else result.set(characterId, [note]);
  }

  return result;
}
