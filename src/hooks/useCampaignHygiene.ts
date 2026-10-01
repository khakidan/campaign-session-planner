import { useEffect, useMemo, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, EntityLink } from '../types';
import { useNpcs } from './useNpcs';
import { useGroups } from './useGroups';
import { useLocations } from './useLocations';
import { useThreads } from './useThreads';
import { useQuests } from './useQuests';
import { useStorylines } from './useStorylines';
import { buildCampaignHygiene, DEFAULT_STALE_DAYS, type CampaignHygieneReport } from '../lib/campaignHygiene';

/**
 * ROADMAP.md's "Campaign hygiene view" — composes the existing per-kind
 * hooks (no new repository methods) the same way `useCampaignChanges`
 * does, plus every `EntityLink` in the campaign (`repository.getLinks()`
 * with no `source` — client-filtered to `campaignId`, since the
 * interface doesn't scope that call itself) to check for orphans.
 */
export function useCampaignHygiene(
  repository: CampaignPlannerRepository,
  campaignId: CampaignId,
  staleDays: number = DEFAULT_STALE_DAYS
): CampaignHygieneReport {
  const { npcs } = useNpcs(repository, campaignId);
  const { groups } = useGroups(repository, campaignId);
  const { locations } = useLocations(repository, campaignId);
  const { threads } = useThreads(repository, campaignId);
  const { quests } = useQuests(repository, campaignId);
  const { storylines } = useStorylines(repository, campaignId);

  const [links, setLinks] = useState<EntityLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    repository.getLinks().then((all) => {
      if (!cancelled) setLinks(all.filter((link) => link.campaignId === campaignId));
    });
    return () => {
      cancelled = true;
    };
  }, [repository, campaignId]);

  return useMemo(
    () =>
      buildCampaignHygiene(
        {
          npcs: npcs ?? [],
          groups: groups ?? [],
          locations: locations ?? [],
          threads: threads ?? [],
          quests: quests ?? [],
          storylines: storylines ?? [],
        },
        links,
        new Date(),
        staleDays
      ),
    [npcs, groups, locations, threads, quests, storylines, links, staleDays]
  );
}
