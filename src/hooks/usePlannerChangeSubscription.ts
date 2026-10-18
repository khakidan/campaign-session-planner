import { useEffect } from 'react';
import type { CampaignPlannerRepository } from '../types';

/**
 * Phase 5, Slice 5.4 (ROADMAP.md) — another connected DM/Co-GM's write
 * anywhere in the planner reloads every top-level list, so a
 * newly-created NPC (for example) shows up without a manual refresh.
 * Coarse by design (docs/campaign_session_notes_app.md's "no
 * Player-facing surface" means no time-critical concurrent-editing
 * scenario here the way Live Encounter has) — one event, reload
 * everything, rather than per-entity-kind events. `repository
 * .subscribeToChanges` is optional on the interface, so a host that
 * doesn't implement it (or a test's repository fake) just never fires
 * this — the planner still works exactly as it always has.
 */
export function usePlannerChangeSubscription(repository: CampaignPlannerRepository, reloadAll: Array<() => void | Promise<void>>) {
  useEffect(() => {
    if (!repository.subscribeToChanges) return;
    return repository.subscribeToChanges(() => {
      reloadAll.forEach((reload) => reload());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository]);
}
