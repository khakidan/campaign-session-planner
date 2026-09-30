import { useEffect, useMemo, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, EntityId, TTRPGCharacter, TTRPGHostAdapter } from '../types';
import { useNotes } from './useNotes';
import { useThreads } from './useThreads';
import { buildSessionBriefing, groupMemoryByCharacter, selectActiveMemoryNotes, type SessionBriefing } from '../lib/plannerMemory';

export interface CharacterMemoryGroup {
  character: TTRPGCharacter;
  notes: SessionBriefing['playerTheories'];
}

export interface UseSessionBriefingResult extends SessionBriefing {
  /** Phase 2 item 3 (Player Intent) — active memory Notes grouped by
   * the host Character each is linked to, via `groupMemoryByCharacter`.
   * Always empty when `hostAdapter` is omitted. */
  byCharacter: CharacterMemoryGroup[];
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
 */
export function useSessionBriefing(
  repository: CampaignPlannerRepository,
  campaignId: CampaignId,
  hostAdapter?: TTRPGHostAdapter
): UseSessionBriefingResult {
  const { notes } = useNotes(repository, campaignId);
  const { threads } = useThreads(repository, campaignId);
  const briefing = useMemo(() => buildSessionBriefing(notes ?? [], threads ?? []), [notes, threads]);

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

  return { ...briefing, byCharacter };
}
