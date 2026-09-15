import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Storyline, StorylineId } from '../types';

/**
 * Loads and mutates this campaign's Storylines through the
 * host-supplied `CampaignPlannerRepository` — mirrors `useNotes.ts`
 * exactly.
 */
export function useStorylines(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [storylines, setStorylines] = useState<Storyline[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getStorylines(campaignId)
      .then(setStorylines)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Storylines.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createStoryline = useCallback(
    async (storyline: Omit<Storyline, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveStoryline({ ...storyline, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateStoryline = useCallback(
    async (storyline: Storyline) => {
      const saved = await repository.saveStoryline(storyline);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteStoryline = useCallback(
    async (id: StorylineId) => {
      await repository.deleteStoryline(id);
      await reload();
    },
    [repository, reload]
  );

  return { storylines, error, reload, createStoryline, updateStoryline, deleteStoryline };
}
