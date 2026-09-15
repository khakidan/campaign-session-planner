import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Quest, QuestId } from '../types';

/**
 * Loads and mutates this campaign's Quests through the host-supplied
 * `CampaignPlannerRepository` — mirrors `useNotes.ts` exactly.
 */
export function useQuests(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getQuests(campaignId)
      .then(setQuests)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Quests.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createQuest = useCallback(
    async (quest: Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveQuest({ ...quest, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateQuest = useCallback(
    async (quest: Quest) => {
      const saved = await repository.saveQuest(quest);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteQuest = useCallback(
    async (id: QuestId) => {
      await repository.deleteQuest(id);
      await reload();
    },
    [repository, reload]
  );

  return { quests, error, reload, createQuest, updateQuest, deleteQuest };
}
