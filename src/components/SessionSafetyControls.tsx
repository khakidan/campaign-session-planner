import React, { useMemo, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository } from '../types';
import { useSessions } from '../hooks/useSessions';
import { SAFETY_EVENT_NOTE_TYPE, buildSafetyEventTags } from '../lib/safetyEvents';

const SAFETY_TOOLS = ['Pause', 'Resume', 'Rewind', 'Fast Forward', 'X-Card'] as const;
type SafetyTool = (typeof SAFETY_TOOLS)[number];

export { SAFETY_EVENT_NOTE_TYPE };

/** Which corner of the viewport this floats in. Defaults to
 * `'bottom-right'` — this component's original, previously-hardcoded
 * position. */
export type SafetyControlsPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const POSITION_CLASSES: Record<SafetyControlsPosition, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
};

export interface SessionSafetyControlsProps {
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
  /**
   * This package has no concept of "GM" vs. "Player" — that's entirely
   * the host's own auth/role model. A host that wants this control
   * hidden on its GM-permissioned layout and shown on its
   * Player-permissioned one (the real-world X-Card convention: *any*
   * participant can call one, not just the GM) passes its own
   * permission check here, e.g. `visible={session.role === 'player'}`.
   * Defaults to `true` — still gated by `status === 'Running'`
   * regardless, same as before this prop existed. Deliberately a prop
   * rather than leaving it to the host to conditionally mount/unmount
   * the component: toggling this keeps the component mounted (and its
   * `lastUsed` confirmation state intact) across a permission change
   * instead of remounting from scratch.
   */
  visible?: boolean;
  /** Defaults to `'bottom-right'`. */
  position?: SafetyControlsPosition;
  /**
   * The display name of whoever is using this control, supplied by the
   * host (this package has no identity/auth concept of its own, same
   * reasoning as `visible` above) — recorded on the Safety Event Note
   * so a GM-side `useSafetyEventAlerts`/`SafetyEventToasts` can say who
   * triggered it. Omit to record the event anonymously; a GM-side
   * reader then falls back to an "a player" phrasing.
   */
  triggeredBy?: string;
}

/**
 * Phase 2 item 10 (Table Facilitation) — a small, always-mounted
 * control that appears only while this campaign has a Session with
 * `status === 'Running'` (found via the already-loaded `useSessions`
 * list — no new query) *and* `visible` isn't explicitly `false`. Not a
 * hard state machine: each button simply writes a timestamped `Note`
 * (type `'Safety Event'`), linked to the running Session via
 * `EntityLink` — the same "just a Note + EntityLink" pattern every
 * other cross-reference in this package already uses, deliberately not
 * a new persisted concept. Exported for a host to render at its own
 * app-shell level (same integration point as
 * `QuickReferenceDrawerProvider`) — this package still never owns
 * routing/global layout; `position` controls which corner it floats in
 * there, instead of the bottom-right corner being hardcoded.
 */
export const SessionSafetyControls: React.FC<SessionSafetyControlsProps> = ({
  repository,
  campaignId,
  visible = true,
  position = 'bottom-right',
  triggeredBy,
}) => {
  const { sessions } = useSessions(repository, campaignId);
  const runningSession = useMemo(() => (sessions ?? []).find((s) => s.status === 'Running') ?? null, [sessions]);
  const [lastUsed, setLastUsed] = useState<SafetyTool | null>(null);

  if (!runningSession || !visible) return null;

  const recordTool = async (tool: SafetyTool) => {
    const note = await repository.saveNote({
      campaignId,
      title: `${tool} — ${runningSession.title}`,
      type: SAFETY_EVENT_NOTE_TYPE,
      status: null,
      content: [],
      tags: buildSafetyEventTags(tool, runningSession.id, triggeredBy),
    });
    await repository.createLink({
      campaignId,
      sourceType: 'note',
      sourceId: note.id,
      targetType: 'session',
      targetId: runningSession.id,
      relationshipType: 'safety-event',
      metadata: { label: runningSession.title, sourceLabel: note.title },
    });
    setLastUsed(tool);
  };

  return (
    <div
      className={`fixed ${POSITION_CLASSES[position]} z-50 flex items-center gap-1 p-2 bg-white border border-[var(--csp-neutral-200)] rounded-2xl shadow-xl`}
      role="group"
      aria-label="Session safety controls"
    >
      <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--csp-neutral-400)]">Safety</span>
      {SAFETY_TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          onClick={() => recordTool(tool)}
          className="px-2 py-1 text-xs font-semibold text-[var(--csp-neutral-600)] hover:bg-[var(--csp-neutral-100)] rounded-lg cursor-pointer"
        >
          {tool}
        </button>
      ))}
      {lastUsed && <span className="pl-1 text-[10px] text-[var(--csp-neutral-400)]">{lastUsed} recorded</span>}
    </div>
  );
};
