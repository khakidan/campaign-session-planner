import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Session, SessionId } from '../types';

/**
 * Loads and mutates this campaign's Sessions through the host-supplied
 * `CampaignPlannerRepository` — mirrors `useNotes.ts` exactly.
 */
export function useSessions(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getSessions(campaignId)
      .then(setSessions)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Sessions.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSession = useCallback(
    async (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveSession({ ...session, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateSession = useCallback(
    async (session: Session) => {
      const saved = await repository.saveSession(session);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteSession = useCallback(
    async (id: SessionId) => {
      await repository.deleteSession(id);
      await reload();
    },
    [repository, reload]
  );

  return { sessions, error, reload, createSession, updateSession, deleteSession };
}
