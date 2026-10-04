import { useEffect, useMemo, useRef } from 'react';
import type { CampaignId, CampaignPlannerRepository, SessionId } from '../types';
import { useSessions } from './useSessions';
import { useNotes } from './useNotes';
import { SAFETY_EVENT_NOTE_TYPE, getSafetyEventSessionId, getSafetyEventTool, getSafetyEventTriggeredBy } from '../lib/safetyEvents';

export interface SafetyEventAlert {
  /** The Safety Event Note's own id — stable, usable as a React key or
   * a toast's dedupe/dismiss id. */
  id: string;
  /** e.g. `'X-Card'`/`'Pause'` — `SessionSafetyControls`'s own
   * `SAFETY_TOOLS` list, read back off the Note's tag. Falls back to
   * `'Safety'` for a Safety Event Note missing that tag (recorded by
   * something other than this package's own `SessionSafetyControls`,
   * or written before this tag existed). */
  tool: string;
  /** The host-supplied `triggeredBy` name, or `null` if that prop was
   * omitted when the event was recorded. */
  triggeredBy: string | null;
  sessionId: SessionId;
  sessionTitle: string;
  createdAt: string;
}

/**
 * The GM-side half of `SessionSafetyControls` — fires `onSafetyEvent`
 * once for every *new* Safety Event Note that appears on the currently
 * Running Session, so a host can pipe it straight into their own
 * toast/notification system (`SafetyEventToasts` is a ready-made
 * fallback for a host that doesn't have one). A pure side-effect hook:
 * renders nothing itself.
 *
 * "New" means "appeared after this hook first loaded data for this
 * Running Session," not "every Safety Event Note this Session has ever
 * had" — otherwise a GM opening their screen mid-session would get hit
 * with a toast storm replaying the whole session's history. Detecting
 * a *new* event (not just "something changed") needs this package's
 * own data, which is why this composes `useNotes` directly rather than
 * asking the host to detect it from a raw `subscribeToChanges` signal.
 *
 * Composes the existing `useSessions`/`useNotes` hooks only (no new
 * repository methods, no second `useEntityLinks` subscription — the
 * Session a Safety Event Note belongs to rides its own tag, read via
 * `getSafetyEventSessionId`, the same reserved-tag convention
 * `tool`/`triggeredBy` already use): if the host's
 * `CampaignPlannerRepository` implements the optional
 * `subscribeToChanges`, new events arrive live; without it, they
 * surface whenever something else causes this hook's `useNotes`
 * instance to reload — same fallback behavior every other hook built
 * on `subscribeToChanges` in this package already has.
 */
export function useSafetyEventAlerts(
  repository: CampaignPlannerRepository,
  campaignId: CampaignId,
  onSafetyEvent: (alert: SafetyEventAlert) => void
): void {
  const { sessions } = useSessions(repository, campaignId);
  const runningSession = useMemo(() => (sessions ?? []).find((s) => s.status === 'Running') ?? null, [sessions]);

  const { notes, reload: reloadNotes } = useNotes(repository, campaignId);

  useEffect(() => {
    if (!repository.subscribeToChanges) return;
    return repository.subscribeToChanges(() => {
      reloadNotes();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository]);

  const onSafetyEventRef = useRef(onSafetyEvent);
  onSafetyEventRef.current = onSafetyEvent;

  // Keyed by Session id, not just a bare `Set`, so a transition to a
  // *different* Running Session reseeds silently in this same effect —
  // a separate reset effect keyed off the Session id would risk
  // running after this one in the same commit and wiping a seed this
  // effect had just performed, silently swallowing the very next real
  // event.
  const seen = useRef<{ sessionId: SessionId; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!notes || !runningSession) return;

    const safetyNotes = notes.filter(
      (note) => note.type === SAFETY_EVENT_NOTE_TYPE && getSafetyEventSessionId(note) === runningSession.id
    );

    if (!seen.current || seen.current.sessionId !== runningSession.id) {
      // First load, or a different Session just started Running —
      // seed silently rather than alerting on every event the Session
      // already had.
      seen.current = { sessionId: runningSession.id, ids: new Set(safetyNotes.map((note) => note.id)) };
      return;
    }

    for (const note of safetyNotes) {
      if (seen.current.ids.has(note.id)) continue;
      seen.current.ids.add(note.id);
      onSafetyEventRef.current({
        id: note.id,
        tool: getSafetyEventTool(note) ?? 'Safety',
        triggeredBy: getSafetyEventTriggeredBy(note),
        sessionId: runningSession.id,
        sessionTitle: runningSession.title,
        createdAt: note.createdAt,
      });
    }
  }, [notes, runningSession]);
}
