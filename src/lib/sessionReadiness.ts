import type { EntityLink, Scene } from '../types';

export interface SessionReadinessCheck {
  label: string;
  met: boolean;
}

/**
 * Phase 2 item 2 (Session Readiness) — a pre-session completeness
 * nudge, entirely computed from data this package already has (no new
 * repository call: `scenes` and this Session's own outgoing links are
 * what `SessionEditor.tsx` already loads via `useScenes`/its
 * `links.outgoing` prop). Deliberately a nudge, not a save-blocking
 * gate — the book's own point is that this is guidance, not a
 * rulebook, so nothing here should ever prevent a GM from running an
 * under-prepared session on purpose.
 *
 * Takes this Session's own `outgoingLinks` directly (already scoped to
 * it by the caller's `useEntityLinks(repository, sessionRef, ...)`)
 * rather than a `Session` + the full link list, so a brand-new,
 * not-yet-saved Session (no id yet) can still be checked — it just
 * starts out with nothing linked, same as a real unmet check.
 */
export function checkSessionReadiness(scenes: Scene[], outgoingLinks: EntityLink[]): SessionReadinessCheck[] {
  return [
    { label: 'Session has at least one Scene', met: scenes.length > 0 },
    {
      label: 'At least one active Thread or Quest is linked',
      met: outgoingLinks.some((link) => link.targetType === 'thread' || link.targetType === 'quest'),
    },
    {
      label: 'At least one NPC or Location is anticipated',
      met: outgoingLinks.some((link) => link.targetType === 'npc' || link.targetType === 'location'),
    },
  ];
}
