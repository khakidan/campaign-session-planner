import React, { useMemo, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, EntityReference, EntityType, SessionId } from '../types';
import { useSessionRecap } from '../hooks/useSessionRecap';
import { ReadOnlyBlockNoteView } from './ReadOnlyBlockNoteView';
import { EntityReferenceLinkingContext } from './EntityReferenceInlineContent';
import { extractBlockText } from '../lib/blockNoteUtils';

export interface SessionRecapViewProps {
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
  sessionId: SessionId;
  onOpenPlannerEntity: (ref: EntityReference) => void;
  onOpenHostEntity?: (type: EntityType, id: string) => void;
}

function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * ROADMAP.md's "Session recap as an output, not just an input" — a
 * clean, player-facing view built from `'Recap Highlight'` Notes the GM
 * deliberately linked to this Session (`sessionRecap.ts`), not the
 * Debrief itself: the Debrief mixes in GM-only reflection ("Things
 * Players Disengaged From," secrets in "Campaign Updates") that isn't
 * safe to hand a player unfiltered, so this only ever shows what the GM
 * explicitly chose to write for that audience.
 *
 * This package owns the *rendering* — turning those Notes into
 * something presentable, plus a one-click "Copy as Text" for pasting
 * into Discord/a group chat/anywhere else — not the *distribution*
 * (printing, a public link, posting somewhere): that's genuinely
 * host/platform-specific infrastructure outside what a reference
 * package like this one should take on. A standalone, host-placed
 * building block like `SessionRunPanel`/`CampaignHygienePanel` — not
 * auto-mounted anywhere.
 *
 * Renders nothing if `sessionId` doesn't resolve to a real Session
 * (still loading, or deleted) — same convention `SessionRunPanel` uses
 * for its own "nothing to show yet" case.
 */
export const SessionRecapView: React.FC<SessionRecapViewProps> = ({
  repository,
  campaignId,
  sessionId,
  onOpenPlannerEntity,
  onOpenHostEntity,
}) => {
  const { session, highlights } = useSessionRecap(repository, campaignId, sessionId);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const linkingHandlers = useMemo(() => ({ onOpenPlannerEntity, onOpenHostEntity }), [onOpenPlannerEntity, onOpenHostEntity]);

  if (!session) return null;

  const formattedDate = formatDate(session.date);

  const handleCopy = async () => {
    const lines = [
      [session.title, session.sessionNumber != null ? `Session ${session.sessionNumber}` : null, formattedDate]
        .filter(Boolean)
        .join(' — '),
      '',
      ...highlights.map((note) => extractBlockText(note.content)).filter(Boolean),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n\n'));
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <div className="space-y-4 p-4 border border-[var(--csp-neutral-200)] rounded-lg bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--csp-neutral-900)]">{session.title}</h3>
          <p className="text-xs text-[var(--csp-neutral-500)]">
            {[session.sessionNumber != null ? `Session ${session.sessionNumber}` : null, formattedDate]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {highlights.length > 0 && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 px-2.5 py-1 text-xs font-semibold text-[var(--csp-neutral-600)] border border-[var(--csp-neutral-300)] rounded-lg hover:bg-[var(--csp-neutral-50)] cursor-pointer"
          >
            {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'failed' ? 'Copy failed' : 'Copy as Text'}
          </button>
        )}
      </div>

      {highlights.length === 0 ? (
        <p className="text-xs text-[var(--csp-neutral-400)] italic">
          No recap highlights yet — write a Note of type "{`Recap Highlight`}" and link it to this Session to include it
          here.
        </p>
      ) : (
        <EntityReferenceLinkingContext.Provider value={linkingHandlers}>
          <div className="space-y-3">
            {highlights.map((note) => (
              <div key={note.id} className="pb-3 border-b border-[var(--csp-neutral-100)] last:border-b-0 last:pb-0">
                <ReadOnlyBlockNoteView blocks={note.content ?? []} />
              </div>
            ))}
          </div>
        </EntityReferenceLinkingContext.Provider>
      )}
    </div>
  );
};
