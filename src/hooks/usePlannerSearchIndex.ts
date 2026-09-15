import { useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository } from '../types';
import type { PlannerSearchItem } from '../components/EntityLinkPicker';

/**
 * Slice 4.2g — every Note/NPC/Group/Location/Session/Storyline/Thread/
 * Quest/Event in the campaign, flattened into one searchable list, for
 * the Quick-reference Drawer's search box. Scene is deliberately
 * excluded — same convention `CampaignSessionPlanner.tsx`'s own
 * `plannerItems` list already establishes (a Scene is only ever reached
 * nested under its Session, never searched for directly at the top
 * level). This is a standalone fetch, not shared state with
 * `CampaignSessionPlanner`'s own equivalent computation — the Drawer is
 * mounted independently, at the app-shell level, and may be summoned
 * without that component ever having mounted.
 */
export function usePlannerSearchIndex(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [items, setItems] = useState<PlannerSearchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      repository.getNotes(campaignId),
      repository.getNpcs(campaignId),
      repository.getGroups(campaignId),
      repository.getLocations(campaignId),
      repository.getSessions(campaignId),
      repository.getStorylines(campaignId),
      repository.getThreads(campaignId),
      repository.getQuests(campaignId),
      repository.getEvents(campaignId),
    ])
      .then(([notes, npcs, groups, locations, sessions, storylines, threads, quests, events]) => {
        if (cancelled) return;
        setItems([
          ...notes.map((n): PlannerSearchItem => ({ type: 'note', id: n.id, label: n.title })),
          ...npcs.map((n): PlannerSearchItem => ({ type: 'npc', id: n.id, label: n.name })),
          ...groups.map((g): PlannerSearchItem => ({ type: 'group', id: g.id, label: g.name })),
          ...locations.map((l): PlannerSearchItem => ({ type: 'location', id: l.id, label: l.name })),
          ...sessions.map((s): PlannerSearchItem => ({ type: 'session', id: s.id, label: s.title })),
          ...storylines.map((s): PlannerSearchItem => ({ type: 'storyline', id: s.id, label: s.name })),
          ...threads.map((t): PlannerSearchItem => ({ type: 'thread', id: t.id, label: t.name })),
          ...quests.map((q): PlannerSearchItem => ({ type: 'quest', id: q.id, label: q.name })),
          ...events.map((e): PlannerSearchItem => ({ type: 'event', id: e.id, label: e.name })),
        ]);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load planner entities.');
      });
    return () => {
      cancelled = true;
    };
  }, [repository, campaignId]);

  return { items, error };
}
