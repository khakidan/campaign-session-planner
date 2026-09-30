import React, { useMemo, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository } from '../types';
import { useSessions } from '../hooks/useSessions';

const SAFETY_TOOLS = ['Pause', 'Resume', 'Rewind', 'Fast Forward', 'X-Card'] as const;
type SafetyTool = (typeof SAFETY_TOOLS)[number];

/** Every Note this control writes carries this type — visible in the
 * running Session's own Linked Entities afterward, same as any other
 * cross-reference in this package. */
export const SAFETY_EVENT_NOTE_TYPE = 'Safety Event';

export interface SessionSafetyControlsProps {
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
}

/**
 * Phase 2 item 10 (Table Facilitation) — a small, always-mounted
 * control that appears only while this campaign has a Session with
 * `status === 'Running'` (found via the already-loaded `useSessions`
 * list — no new query). Not a hard state machine: each button simply
 * writes a timestamped `Note` (type `'Safety Event'`), linked to the
 * running Session via `EntityLink` — the same "just a Note +
 * EntityLink" pattern every other cross-reference in this package
 * already uses, deliberately not a new persisted concept. Exported for
 * a host to render at its own app-shell level (same integration point
 * as `QuickReferenceDrawerProvider`) — this package still never owns
 * routing/global layout.
 */
export const SessionSafetyControls: React.FC<SessionSafetyControlsProps> = ({ repository, campaignId }) => {
  const { sessions } = useSessions(repository, campaignId);
  const runningSession = useMemo(() => (sessions ?? []).find((s) => s.status === 'Running') ?? null, [sessions]);
  const [lastUsed, setLastUsed] = useState<SafetyTool | null>(null);

  if (!runningSession) return null;

  const recordTool = async (tool: SafetyTool) => {
    const note = await repository.saveNote({
      campaignId,
      title: `${tool} — ${runningSession.title}`,
      type: SAFETY_EVENT_NOTE_TYPE,
      status: null,
      content: [],
      tags: [],
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
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1 p-2 bg-white border border-[var(--csp-neutral-200)] rounded-2xl shadow-xl"
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
