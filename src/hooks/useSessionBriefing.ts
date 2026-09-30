import { useMemo } from 'react';
import type { CampaignId, CampaignPlannerRepository } from '../types';
import { useNotes } from './useNotes';
import { useThreads } from './useThreads';
import { buildSessionBriefing, type SessionBriefing } from '../lib/plannerMemory';

/**
 * Phase 1 "Memory" (ROADMAP.md) — composes the existing `useNotes`/
 * `useThreads` hooks (no new repository methods) into the grouped,
 * read-only briefing `SessionBriefingPanel.tsx` renders. Recomputes
 * automatically whenever either hook's underlying data changes, since
 * `notes`/`threads` are the `useMemo` dependencies.
 */
export function useSessionBriefing(repository: CampaignPlannerRepository, campaignId: CampaignId): SessionBriefing {
  const { notes } = useNotes(repository, campaignId);
  const { threads } = useThreads(repository, campaignId);

  return useMemo(() => buildSessionBriefing(notes ?? [], threads ?? []), [notes, threads]);
}
