import { useMemo } from 'react';
import type { CampaignId, CampaignPlannerRepository } from '../types';
import { useNpcs } from './useNpcs';
import { useGroups } from './useGroups';
import { useLocations } from './useLocations';
import { useThreads } from './useThreads';
import { useQuests } from './useQuests';
import { useEvents } from './useEvents';
import { buildCampaignChanges, type CampaignChanges } from '../lib/campaignChanges';

/**
 * Phase 2 item 5 (Campaign Changes) — composes the existing per-kind
 * hooks (no new repository methods) into "what's changed since
 * `since`," the backward-looking counterpart to `useSessionBriefing`'s
 * forward-looking "what's already established."
 */
export function useCampaignChanges(repository: CampaignPlannerRepository, campaignId: CampaignId, since: string): CampaignChanges {
  const { npcs } = useNpcs(repository, campaignId);
  const { groups } = useGroups(repository, campaignId);
  const { locations } = useLocations(repository, campaignId);
  const { threads } = useThreads(repository, campaignId);
  const { quests } = useQuests(repository, campaignId);
  const { events } = useEvents(repository, campaignId);

  return useMemo(
    () =>
      buildCampaignChanges(
        {
          npcs: npcs ?? [],
          groups: groups ?? [],
          locations: locations ?? [],
          threads: threads ?? [],
          quests: quests ?? [],
          events: events ?? [],
        },
        since
      ),
    [npcs, groups, locations, threads, quests, events, since]
  );
}
