import { useMemo } from 'react';
import type { CampaignId, CampaignPlannerRepository, EntityReference, Session, SessionId } from '../types';
import { useSessions } from './useSessions';
import { useNotes } from './useNotes';
import { useEntityLinks } from './useEntityLinks';
import { selectSessionRecapHighlights } from '../lib/sessionRecap';

export interface SessionRecapResult {
  /** `null` while loading, or if no Session with this id exists. */
  session: Session | null;
  highlights: ReturnType<typeof selectSessionRecapHighlights>;
}

/**
 * ROADMAP.md's "Session recap as an output" — composes the existing
 * `useSessions`/`useNotes`/`useEntityLinks` hooks (no new repository
 * methods) into the shareable, player-facing view `SessionRecapView`
 * renders: this Session's own title/number/date, plus whichever
 * `'Recap Highlight'` Notes the GM has linked to it.
 */
export function useSessionRecap(repository: CampaignPlannerRepository, campaignId: CampaignId, sessionId: SessionId): SessionRecapResult {
  const { sessions } = useSessions(repository, campaignId);
  const session = useMemo(() => (sessions ?? []).find((s) => s.id === sessionId) ?? null, [sessions, sessionId]);

  const { notes } = useNotes(repository, campaignId);

  const sessionRef = useMemo<EntityReference>(() => ({ type: 'session', id: sessionId, source: 'planner' }), [sessionId]);
  const { links } = useEntityLinks(repository, sessionRef, campaignId);

  const highlights = useMemo(
    () => selectSessionRecapHighlights(notes ?? [], sessionId, links ?? []),
    [notes, sessionId, links]
  );

  return { session, highlights };
}
