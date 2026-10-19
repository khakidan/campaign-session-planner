import { useEffect, useMemo, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, EntityId, EntityReference, Note, SessionId, TTRPGCharacter, TTRPGHostAdapter } from '../types';
import { useNotes } from './useNotes';
import { useThreads } from './useThreads';
import { useEntityLinks } from './useEntityLinks';
import { buildSessionBriefing, groupMemoryByCharacter, selectActiveMemoryNotes, type SessionBriefing } from '../lib/plannerMemory';
import { selectSessionRecapHighlights } from '../lib/sessionRecap';

export interface CharacterMemoryGroup {
  character: TTRPGCharacter;
  notes: SessionBriefing['playerTheories'];
}

export interface UseSessionBriefingResult extends SessionBriefing {
  /** Phase 2 item 3 (Player Intent) — active memory Notes grouped by
   * the host Character each is linked to, via `groupMemoryByCharacter`.
   * Always empty when `hostAdapter` is omitted. */
  byCharacter: CharacterMemoryGroup[];
  /** The "Last Session" recap (ROADMAP.md) — whichever
   * `'Recap Highlight'` Notes the GM linked to `previousSessionId`, the
   * same selection `useSessionRecap`/`SessionRecapView` use for the
   * player-facing recap. Always empty when `previousSessionId` is
   * omitted/`null` (no prior Session to recap). */
  previousSessionHighlights: Note[];
}

/**
 * Phase 1 "Memory" (ROADMAP.md) — composes the existing `useNotes`/
 * `useThreads` hooks (no new repository methods) into the grouped,
 * read-only briefing `SessionBriefingPanel.tsx` renders. Recomputes
 * automatically whenever either hook's underlying data changes, since
 * `notes`/`threads` are the `useMemo` dependencies.
 *
 * `hostAdapter` (optional, Phase 2 item 3) additionally resolves
 * `byCharacter` — per-active-memory-Note lookups via the repository's
 * existing `getLinks(ref)` (the same call every other cross-reference
 * in this package already makes; no new repository method), fed
 * through `groupMemoryByCharacter` and `hostAdapter.getCharacters`.
 *
 * `previousSessionId` (optional, ROADMAP.md's "Last Session" recap)
 * additionally resolves `previousSessionHighlights`, the same
 * `useEntityLinks` + `selectSessionRecapHighlights` composition
 * `useSessionRecap` uses — reusing this hook's own already-loaded
 * `notes` rather than fetching them again.
 */
export function useSessionBriefing(
  repository: CampaignPlannerRepository,
  campaignId: CampaignId,
  hostAdapter?: TTRPGHostAdapter,
  /** The campaign's most recent prior Session (by date), excluding
   * whichever Session is currently being edited — `null`/omitted for a
   * campaign's very first Session, or when the caller doesn't need
   * `previousSessionHighlights` at all. */
  previousSessionId?: SessionId | null
): UseSessionBriefingResult {
  const { notes } = useNotes(repository, campaignId);
  const { threads } = useThreads(repository, campaignId);
  const briefing = useMemo(() => buildSessionBriefing(notes ?? [], threads ?? []), [notes, threads]);

  const previousSessionRef = useMemo<EntityReference | null>(
    () => (previousSessionId ? { type: 'session', id: previousSessionId, source: 'planner' } : null),
    [previousSessionId]
  );
  const { links: previousSessionLinks } = useEntityLinks(repository, previousSessionRef, campaignId);
  const previousSessionHighlights = useMemo(
    () => (previousSessionId ? selectSessionRecapHighlights(notes ?? [], previousSessionId, previousSessionLinks ?? []) : []),
    [notes, previousSessionId, previousSessionLinks]
  );

  const [byCharacter, setByCharacter] = useState<CharacterMemoryGroup[]>([]);

  useEffect(() => {
    if (!hostAdapter || !notes) {
      setByCharacter([]);
      return;
    }
    let cancelled = false;

    (async () => {
      const activeNotes = selectActiveMemoryNotes(notes);
      const linkLists = await Promise.all(
        activeNotes.map((note) => repository.getLinks({ type: 'note', id: note.id, source: 'planner' }))
      );
      const grouped = groupMemoryByCharacter(notes, linkLists.flat());
      const characterIds: EntityId[] = [...grouped.keys()];
      const characters = characterIds.length > 0 ? await hostAdapter.getCharacters(characterIds) : [];
      if (cancelled) return;
      setByCharacter(characters.map((character) => ({ character, notes: grouped.get(character.id) ?? [] })));
    })();

    return () => {
      cancelled = true;
    };
  }, [repository, hostAdapter, notes]);

  return { ...briefing, byCharacter, previousSessionHighlights };
}
