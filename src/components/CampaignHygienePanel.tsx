import React from 'react';
import type { EntityReference } from '../types';
import type { CampaignHygieneReport } from '../lib/campaignHygiene';
import { DEFAULT_STALE_DAYS } from '../lib/campaignHygiene';

export interface CampaignHygienePanelProps {
  hygiene: CampaignHygieneReport;
  onOpenPlannerEntity: (ref: EntityReference) => void;
  /** Must match whatever `staleDays` was passed to `useCampaignHygiene`
   * — only used for this panel's own "not updated in N+ days" copy, not
   * for any computation. */
  staleDays?: number;
}

interface Row {
  id: string;
  label: string;
}

interface Section {
  label: string;
  refType: EntityReference['type'];
  items: Row[];
}

function sections(groups: CampaignHygieneReport['stale']): Section[] {
  return [
    { label: 'NPCs', refType: 'npc', items: groups.npcs.map((n) => ({ id: n.id, label: n.name })) },
    { label: 'Groups', refType: 'group', items: groups.groups.map((g) => ({ id: g.id, label: g.name })) },
    { label: 'Locations', refType: 'location', items: groups.locations.map((l) => ({ id: l.id, label: l.name })) },
    { label: 'Threads', refType: 'thread', items: groups.threads.map((t) => ({ id: t.id, label: t.name })) },
    { label: 'Quests', refType: 'quest', items: groups.quests.map((q) => ({ id: q.id, label: q.name })) },
    { label: 'Storylines', refType: 'storyline', items: groups.storylines.map((s) => ({ id: s.id, label: s.name })) },
  ];
}

function totalItems(groups: CampaignHygieneReport['stale']): number {
  return sections(groups).reduce((sum, s) => sum + s.items.length, 0);
}

const SectionList: React.FC<{ sections: Section[]; onOpenPlannerEntity: (ref: EntityReference) => void }> = ({
  sections,
  onOpenPlannerEntity,
}) => (
  <div className="space-y-2">
    {sections
      .filter((s) => s.items.length > 0)
      .map((section) => (
        <div key={section.label}>
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-[var(--csp-neutral-400)] mb-0.5">
            {section.label}
          </h5>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenPlannerEntity({ type: section.refType, id: item.id, source: 'planner' })}
                  className="text-left text-sm text-[var(--csp-accent-700)] hover:underline cursor-pointer truncate"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
  </div>
);

/**
 * ROADMAP.md's "Campaign hygiene view" — the backward-looking,
 * campaign-wide counterpart to `CampaignChangesPanel`: instead of "what
 * changed since last session," this flags what's gone quiet (not
 * touched in a while) or never got connected to anything, across the
 * whole campaign. Unlike `CampaignChangesPanel`, empty groups aren't
 * rendered at all — with up to 12 groups across two categories here
 * (vs. 6 in one list there), always showing every "No X stale." line
 * would bury the handful that actually matter; a single top-level
 * all-clear message covers the fully-tidy case instead.
 *
 * Entirely a standalone, host-placed building block — like
 * `SessionRunPanel`, not auto-mounted anywhere, since "between
 * sessions, campaign-wide" doesn't belong inside any one Session's own
 * editor the way `CampaignChangesPanel` does.
 */
export const CampaignHygienePanel: React.FC<CampaignHygienePanelProps> = ({
  hygiene,
  onOpenPlannerEntity,
  staleDays = DEFAULT_STALE_DAYS,
}) => {
  const staleSections = sections(hygiene.stale);
  const orphanedSections = sections(hygiene.orphaned);
  const nothingToFlag = totalItems(hygiene.stale) === 0 && totalItems(hygiene.orphaned) === 0;

  return (
    <div className="space-y-4 p-3 border border-[var(--csp-neutral-200)] rounded-lg bg-[var(--csp-neutral-50)]">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)]">Campaign Hygiene</h3>

      {nothingToFlag ? (
        <p className="text-xs text-[var(--csp-neutral-400)] italic">Nothing to flag — campaign looks tidy.</p>
      ) : (
        <>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1">
              Not Updated in {staleDays}+ Days
            </h4>
            {totalItems(hygiene.stale) === 0 ? (
              <p className="text-xs text-[var(--csp-neutral-400)] italic">Nothing stale.</p>
            ) : (
              <SectionList sections={staleSections} onOpenPlannerEntity={onOpenPlannerEntity} />
            )}
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1">
              Not Linked to Anything
            </h4>
            {totalItems(hygiene.orphaned) === 0 ? (
              <p className="text-xs text-[var(--csp-neutral-400)] italic">Nothing orphaned.</p>
            ) : (
              <SectionList sections={orphanedSections} onOpenPlannerEntity={onOpenPlannerEntity} />
            )}
          </div>
        </>
      )}
    </div>
  );
};
