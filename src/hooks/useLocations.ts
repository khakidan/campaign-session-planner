import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Location, LocationId } from '../types';

/**
 * Loads and mutates this campaign's Locations through the host-supplied
 * `CampaignPlannerRepository` — mirrors `useNotes.ts` exactly.
 */
export function useLocations(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getLocations(campaignId)
      .then(setLocations)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Locations.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createLocation = useCallback(
    async (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveLocation({ ...location, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateLocation = useCallback(
    async (location: Location) => {
      const saved = await repository.saveLocation(location);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteLocation = useCallback(
    async (id: LocationId) => {
      await repository.deleteLocation(id);
      await reload();
    },
    [repository, reload]
  );

  return { locations, error, reload, createLocation, updateLocation, deleteLocation };
}
