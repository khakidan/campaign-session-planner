import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Lore, LoreId } from '../types';

/**
 * Loads and mutates this campaign's Lore entries through the
 * host-supplied `CampaignPlannerRepository` — the package never
 * fetches or persists anything itself, only through this interface
 * (see types/index.ts). Mirrors `useNotes.ts` exactly; Lore was
 * pulled out of Note into its own top-level entity (ROADMAP.md) but
 * kept the same loading shape.
 */
export function useLores(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [lores, setLores] = useState<Lore[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getLores(campaignId)
      .then(setLores)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Lore.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createLore = useCallback(
    async (lore: Omit<Lore, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveLore({ ...lore, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateLore = useCallback(
    async (lore: Lore) => {
      const saved = await repository.saveLore(lore);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteLore = useCallback(
    async (id: LoreId) => {
      await repository.deleteLore(id);
      await reload();
    },
    [repository, reload]
  );

  return { lores, error, reload, createLore, updateLore, deleteLore };
}
