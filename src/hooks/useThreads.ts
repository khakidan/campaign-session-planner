import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Thread, ThreadId } from '../types';

/**
 * Loads and mutates this campaign's Threads through the host-supplied
 * `CampaignPlannerRepository` — mirrors `useNotes.ts` exactly.
 */
export function useThreads(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getThreads(campaignId)
      .then(setThreads)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Threads.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createThread = useCallback(
    async (thread: Omit<Thread, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveThread({ ...thread, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateThread = useCallback(
    async (thread: Thread) => {
      const saved = await repository.saveThread(thread);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteThread = useCallback(
    async (id: ThreadId) => {
      await repository.deleteThread(id);
      await reload();
    },
    [repository, reload]
  );

  return { threads, error, reload, createThread, updateThread, deleteThread };
}
