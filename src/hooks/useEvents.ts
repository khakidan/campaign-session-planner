import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Event, EventId } from '../types';

/**
 * Loads and mutates this campaign's Events through the host-supplied
 * `CampaignPlannerRepository` — mirrors `useNotes.ts` exactly.
 */
export function useEvents(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getEvents(campaignId)
      .then(setEvents)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Events.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEvent = useCallback(
    async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveEvent({ ...event, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateEvent = useCallback(
    async (event: Event) => {
      const saved = await repository.saveEvent(event);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteEvent = useCallback(
    async (id: EventId) => {
      await repository.deleteEvent(id);
      await reload();
    },
    [repository, reload]
  );

  return { events, error, reload, createEvent, updateEvent, deleteEvent };
}
