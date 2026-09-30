import React from 'react';
import type { SessionReadinessCheck } from '../lib/sessionReadiness';

export interface SessionReadinessChecklistProps {
  checks: SessionReadinessCheck[];
}

/**
 * Phase 2 item 2 (Session Readiness) — a read-only pre-session
 * completeness nudge, styled consistently with `SessionBriefingPanel`.
 * Deliberately doesn't block saving or navigating; it's guidance, not
 * a validation gate.
 */
export const SessionReadinessChecklist: React.FC<SessionReadinessChecklistProps> = ({ checks }) => (
  <div className="space-y-1.5 p-3 border border-[var(--csp-neutral-200)] rounded-lg bg-[var(--csp-neutral-50)]">
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1">Session Readiness</h3>
    <ul className="space-y-1">
      {checks.map((check) => (
        <li key={check.label} className="flex items-center gap-2 text-sm">
          <span aria-hidden="true">{check.met ? '✓' : '⚠'}</span>
          <span className={check.met ? 'text-[var(--csp-neutral-700)]' : 'text-[var(--csp-neutral-500)]'}>{check.label}</span>
        </li>
      ))}
    </ul>
  </div>
);
