import React, { useMemo, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, EntityReference, EntityType, PlannerEntityType } from '../types';
import { useSessions } from '../hooks/useSessions';
import { useScenes } from '../hooks/useScenes';
import { useEntityLinks } from '../hooks/useEntityLinks';
import { ReadOnlyBlockNoteView } from './ReadOnlyBlockNoteView';
import { EntityReferenceLinkingContext } from './EntityReferenceInlineContent';

const PLANNER_TYPES: PlannerEntityType[] = [
  'note',
  'npc',
  'group',
  'location',
  'session',
  'scene',
  'storyline',
  'thread',
  'quest',
  'event',
];

export interface SessionRunPanelProps {
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
  /** Same callback contract every other cross-reference in this
   * package uses — a host typically wires this straight to
   * `useQuickReferenceDrawer().push()`, so tapping a linked entity here
   * opens it in the Drawer rather than navigating anywhere. */
  onOpenPlannerEntity: (ref: EntityReference) => void;
  onOpenHostEntity?: (type: EntityType, id: string) => void;
}

/**
 * "Run Mode" (ROADMAP.md) — reference support for the moment of
 * actually running a session, deliberately scoped as a small,
 * non-modal, composable piece rather than a dedicated route: this
 * package is a reference tool, not where a GM manages players (that's
 * the host app's own live-session screen — initiative, character
 * sheets, combat). A host mounts this alongside that screen, not
 * instead of it, the same way `SessionSafetyControls` already floats
 * over the host's page without taking it over.
 *
 * Renders nothing when no Session has `status === 'Running'` — same
 * convention `SessionSafetyControls` uses. Shows the Running Session's
 * Scenes as a prev/next strip, the selected Scene's content read-only
 * (reusing `ReadOnlyBlockNoteView`, the same renderer the Quick
 * Reference Drawer already uses — no new rendering path), and that
 * Scene's linked entities as tappable chips.
 */
export const SessionRunPanel: React.FC<SessionRunPanelProps> = ({
  repository,
  campaignId,
  onOpenPlannerEntity,
  onOpenHostEntity,
}) => {
  const { sessions } = useSessions(repository, campaignId);
  const runningSession = useMemo(() => (sessions ?? []).find((s) => s.status === 'Running') ?? null, [sessions]);

  const { scenes } = useScenes(repository, runningSession?.id ?? null);
  const sortedScenes = useMemo(() => [...(scenes ?? [])].sort((a, b) => a.order - b.order), [scenes]);

  const [sceneIndex, setSceneIndex] = useState(0);
  const clampedIndex = sortedScenes.length === 0 ? 0 : Math.min(sceneIndex, sortedScenes.length - 1);
  const activeScene = sortedScenes[clampedIndex] ?? null;
  const activeSceneRef: EntityReference | null = activeScene
    ? { type: 'scene', id: activeScene.id, source: 'planner' }
    : null;

  const { outgoing } = useEntityLinks(repository, activeSceneRef, campaignId);

  const linkingHandlers = useMemo(
    () => ({ onOpenPlannerEntity, onOpenHostEntity }),
    [onOpenPlannerEntity, onOpenHostEntity]
  );

  const openTarget = (type: EntityType, id: string) => {
    if (PLANNER_TYPES.includes(type as PlannerEntityType)) onOpenPlannerEntity({ type, id, source: 'planner' });
    else onOpenHostEntity?.(type, id);
  };

  if (!runningSession) return null;

  return (
    <div className="space-y-3 p-3 border border-[var(--csp-neutral-200)] rounded-lg bg-[var(--csp-neutral-50)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] truncate">
          Now Running: {runningSession.title}
        </h3>
      </div>

      {sortedScenes.length === 0 ? (
        <p className="text-xs text-[var(--csp-neutral-400)] italic">No Scenes prepared for this Session yet.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous Scene"
              disabled={clampedIndex === 0}
              onClick={() => setSceneIndex(clampedIndex - 1)}
              className="px-2 py-1 text-xs font-semibold text-[var(--csp-neutral-600)] hover:text-[var(--csp-neutral-900)] disabled:opacity-30 cursor-pointer"
            >
              ← Prev
            </button>
            <span className="text-sm font-semibold text-[var(--csp-neutral-800)] truncate">
              {activeScene!.title}
              {activeScene!.status && (
                <span className="ml-2 text-[10px] uppercase text-[var(--csp-neutral-400)]">{activeScene!.status}</span>
              )}
            </span>
            <button
              type="button"
              aria-label="Next Scene"
              disabled={clampedIndex === sortedScenes.length - 1}
              onClick={() => setSceneIndex(clampedIndex + 1)}
              className="px-2 py-1 text-xs font-semibold text-[var(--csp-neutral-600)] hover:text-[var(--csp-neutral-900)] disabled:opacity-30 cursor-pointer"
            >
              Next →
            </button>
          </div>

          <EntityReferenceLinkingContext.Provider value={linkingHandlers}>
            <ReadOnlyBlockNoteView blocks={activeScene!.details ?? []} />
          </EntityReferenceLinkingContext.Provider>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1">
              Linked to this Scene
            </h4>
            {outgoing.length === 0 ? (
              <p className="text-xs text-[var(--csp-neutral-400)] italic">Nothing linked yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {outgoing.map((link) => {
                  const metadata = link.metadata as { label?: string } | undefined;
                  return (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => openTarget(link.targetType, link.targetId)}
                      className="px-2 py-1 text-xs font-semibold text-[var(--csp-accent-700)] bg-[var(--csp-accent-50)] hover:bg-[var(--csp-accent-100)] rounded-full cursor-pointer"
                    >
                      {metadata?.label ?? `${link.targetType}:${link.targetId}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
