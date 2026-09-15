import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Npc, NpcId } from '../types';

/**
 * Loads and mutates this campaign's NPCs through the host-supplied
 * `CampaignPlannerRepository` — mirrors `useNotes.ts` exactly.
 */
export function useNpcs(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [npcs, setNpcs] = useState<Npc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getNpcs(campaignId)
      .then(setNpcs)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load NPCs.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createNpc = useCallback(
    async (npc: Omit<Npc, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveNpc({ ...npc, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateNpc = useCallback(
    async (npc: Npc) => {
      const saved = await repository.saveNpc(npc);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteNpc = useCallback(
    async (id: NpcId) => {
      await repository.deleteNpc(id);
      await reload();
    },
    [repository, reload]
  );

  return { npcs, error, reload, createNpc, updateNpc, deleteNpc };
}
