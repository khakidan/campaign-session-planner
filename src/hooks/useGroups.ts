import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Group, GroupId } from '../types';

/**
 * Loads and mutates this campaign's Groups (Factions/Organizations)
 * through the host-supplied `CampaignPlannerRepository` — mirrors
 * `useNotes.ts` exactly.
 */
export function useGroups(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getGroups(campaignId)
      .then(setGroups)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Groups.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createGroup = useCallback(
    async (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveGroup({ ...group, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateGroup = useCallback(
    async (group: Group) => {
      const saved = await repository.saveGroup(group);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteGroup = useCallback(
    async (id: GroupId) => {
      await repository.deleteGroup(id);
      await reload();
    },
    [repository, reload]
  );

  return { groups, error, reload, createGroup, updateGroup, deleteGroup };
}
