import React from 'react';
import type { PlannerEntityType } from '../types';

/** What the default tab-bar nav renders from, and what a `renderNav`
 * override receives instead — every browsable kind's label, which one
 * is active, a setter for it, and the "Templates" trigger. Deliberately
 * plain data/callbacks, not JSX, so a host can build a sidebar, a
 * dropdown, or anything else entirely from the same inputs rather than
 * restyling the shipped tab bar. */
export interface CampaignSessionPlannerNavProps {
  kinds: PlannerEntityType[];
  labels: Record<PlannerEntityType, string>;
  activeKind: PlannerEntityType;
  onSelectKind: (kind: PlannerEntityType) => void;
  onOpenTemplateSettings: () => void;
}

/**
 * The shipped tab bar — kind switcher + "Templates" trigger — rendered
 * whenever `CampaignSessionPlannerProps.renderNav` is omitted. Built
 * from exactly the same `CampaignSessionPlannerNavProps` a host's own
 * `renderNav` override receives, so this doubles as a worked example
 * of what's available to build a sidebar/dropdown/etc. from instead.
 */
export const DefaultPlannerNav: React.FC<CampaignSessionPlannerNavProps> = ({
  kinds,
  labels,
  activeKind,
  onSelectKind,
  onOpenTemplateSettings,
}) => (
  <nav aria-label="Planner sections" className="flex items-center justify-between gap-1 border-b border-[var(--csp-neutral-200)]">
    <div className="flex items-center gap-1 overflow-x-auto">
      {kinds.map((kind) => (
        <button
          key={kind}
          type="button"
          aria-current={activeKind === kind ? 'true' : undefined}
          onClick={() => onSelectKind(kind)}
          className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
            activeKind === kind
              ? 'border-[var(--csp-accent-600)] text-[var(--csp-accent-700)]'
              : 'border-transparent text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)]'
          }`}
        >
          {labels[kind]}
        </button>
      ))}
    </div>
    <button
      type="button"
      onClick={onOpenTemplateSettings}
      className="px-3 py-2 text-xs font-semibold text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)] whitespace-nowrap cursor-pointer"
    >
      Templates
    </button>
  </nav>
);
