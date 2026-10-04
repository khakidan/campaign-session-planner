import type { EntityLink, Note, SessionId } from '../types';

/**
 * ROADMAP.md's "Session recap as an output, not just an input" — the
 * Debrief (`entityTemplates.ts`'s `sessionDebriefTemplate`) is written
 * for the GM: "Things Players Disengaged From," a private "Session
 * Pulse" checklist, GM-only "Campaign Updates." None of that is safe to
 * hand a player unfiltered — it can mix in secrets, GM self-critique, or
 * table-management notes never meant to leave the GM's own screen.
 * Rather than parse that free text to guess what's shareable, this asks
 * the GM to deliberately write the shareable part as its own thing: a
 * `Note` whose `type` is `'Recap Highlight'`, linked to the Session it's
 * about — same "free-text `type`, suggested not enforced" convention
 * `plannerMemory.ts`'s `MEMORY_NOTE_TYPES` already established, just a
 * backward-looking counterpart rather than a forward-looking one, so it
 * lives in its own small module rather than extending that list.
 */
export const RECAP_HIGHLIGHT_TYPE = 'Recap Highlight';

/**
 * Recap Highlight Notes linked to the given Session, in either link
 * direction — a GM might add the link from the Note's own editor or
 * from the Session's, and both are equally valid, same tolerance
 * `useEntityLinks`'s outgoing/incoming split already has for either
 * side having created the row.
 */
export function selectSessionRecapHighlights(notes: Note[], sessionId: SessionId, links: EntityLink[]): Note[] {
  const linkedNoteIds = new Set(
    links
      .filter(
        (link) =>
          (link.sourceType === 'session' && link.sourceId === sessionId && link.targetType === 'note') ||
          (link.targetType === 'session' && link.targetId === sessionId && link.sourceType === 'note')
      )
      .map((link) => (link.sourceType === 'note' ? link.sourceId : link.targetId))
  );
  return notes.filter((note) => note.type === RECAP_HIGHLIGHT_TYPE && linkedNoteIds.has(note.id));
}
