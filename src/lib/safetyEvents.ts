import type { Note } from '../types';

/** Every Note `SessionSafetyControls` writes carries this type —
 * visible in the running Session's own Linked Entities afterward, same
 * as any other cross-reference in this package. Lives here rather than
 * on `SessionSafetyControls.tsx` itself now that a second component
 * (`SafetyEventToasts`/`useSafetyEventAlerts`) reads it too — still
 * re-exported from there for the existing public import path. */
export const SAFETY_EVENT_NOTE_TYPE = 'Safety Event';

/** Reserved-prefix tags on a Safety Event Note's `tags: string[]` —
 * same convention `plannerMemory.ts`'s `confidence:` tag already
 * established (structured info riding the existing free-text field,
 * no schema change) rather than parsing the human-readable title. The
 * Session id rides a tag too, not just the `EntityLink` this package
 * also creates to it — `useSafetyEventAlerts` reads only `useNotes`,
 * not a second `useEntityLinks` subscription, to detect a new event;
 * the `EntityLink` itself still exists for every other cross-reference
 * view (Linked Entities, backlinks, ...) to find this Note by. */
const SAFETY_TOOL_TAG_PREFIX = 'safety-tool:';
const TRIGGERED_BY_TAG_PREFIX = 'triggered-by:';
const SESSION_ID_TAG_PREFIX = 'session-id:';

/** Builds the tags a Safety Event Note is created with. `triggeredBy`
 * is the host-supplied display name of whoever clicked the button
 * (`SessionSafetyControls`'s own `triggeredBy` prop) — omitted
 * entirely when the host doesn't provide one, so a GM-side reader
 * falls back to an "a player" phrasing rather than showing a blank. */
export function buildSafetyEventTags(tool: string, sessionId: string, triggeredBy?: string): string[] {
  const tags = [`${SAFETY_TOOL_TAG_PREFIX}${tool}`, `${SESSION_ID_TAG_PREFIX}${sessionId}`];
  if (triggeredBy) tags.push(`${TRIGGERED_BY_TAG_PREFIX}${triggeredBy}`);
  return tags;
}

/** Which safety tool (`'Pause'`/`'X-Card'`/...) a Safety Event Note
 * records, or `null` for a Note of this type predating this tag (or
 * written outside this package's own `SessionSafetyControls`). */
export function getSafetyEventTool(note: Pick<Note, 'tags'>): string | null {
  const tag = note.tags.find((t) => t.startsWith(SAFETY_TOOL_TAG_PREFIX));
  return tag ? tag.slice(SAFETY_TOOL_TAG_PREFIX.length) : null;
}

/** The display name of whoever triggered a Safety Event Note, or
 * `null` if the host didn't supply `SessionSafetyControls`'s
 * `triggeredBy` prop when it was recorded. */
export function getSafetyEventTriggeredBy(note: Pick<Note, 'tags'>): string | null {
  const tag = note.tags.find((t) => t.startsWith(TRIGGERED_BY_TAG_PREFIX));
  return tag ? tag.slice(TRIGGERED_BY_TAG_PREFIX.length) : null;
}

/** The Session id a Safety Event Note was recorded against. */
export function getSafetyEventSessionId(note: Pick<Note, 'tags'>): string | null {
  const tag = note.tags.find((t) => t.startsWith(SESSION_ID_TAG_PREFIX));
  return tag ? tag.slice(SESSION_ID_TAG_PREFIX.length) : null;
}
