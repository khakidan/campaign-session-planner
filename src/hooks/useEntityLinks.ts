import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, EntityLink, EntityLinkId, EntityReference } from '../types';

/**
 * Slice 4.2b — loads every `EntityLink` touching one entity (either
 * direction) through the host-supplied repository, then splits them
 * client-side into `outgoing` (this entity is the source — the links
 * a viewer explicitly created from here) and `incoming` (this entity is
 * the target — Obsidian-style backlinks, always derived, never
 * manually maintained, per docs/markdown/campaign_session_notes_app.md's
 * "The universal entity-link system"). A self-link (source === target)
 * would otherwise appear in both — excluded from `incoming` so it isn't
 * double-counted.
 *
 * `selfLabel` (Slice 4.2c) is the display name of whatever `ref` points
 * at — stored into a new link's `metadata.sourceLabel` at creation time
 * so a *backlink* can render this entity's name without an extra fetch
 * or assuming the source is always a Note (true only for links created
 * in Slice 4.2b, before NPCs/Groups/Locations could create links too).
 */
export function useEntityLinks(
  repository: CampaignPlannerRepository,
  ref: EntityReference | null,
  campaignId: CampaignId,
  selfLabel?: string
) {
  const [links, setLinks] = useState<EntityLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!ref) {
      setLinks([]);
      return Promise.resolve();
    }
    setError(null);
    return repository
      .getLinks(ref)
      .then(setLinks)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load links.'));
  }, [repository, ref?.type, ref?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isSameRef = useCallback(
    (type: string, id: string) => !!ref && ref.type === type && ref.id === id,
    [ref]
  );

  const outgoing = useMemo(
    () => (links ?? []).filter((l) => isSameRef(l.sourceType, l.sourceId)),
    [links, isSameRef]
  );
  const incoming = useMemo(
    () => (links ?? []).filter((l) => isSameRef(l.targetType, l.targetId) && !isSameRef(l.sourceType, l.sourceId)),
    [links, isSameRef]
  );

  const addLink = useCallback(
    async (target: EntityReference, label: string, relationshipType = 'mentions') => {
      if (!ref) return;
      await repository.createLink({
        campaignId,
        sourceType: ref.type,
        sourceId: ref.id,
        targetType: target.type,
        targetId: target.id,
        relationshipType,
        metadata: { label, sourceLabel: selfLabel },
      });
      await reload();
    },
    [repository, ref, campaignId, reload, selfLabel]
  );

  const removeLink = useCallback(
    async (id: EntityLinkId) => {
      await repository.deleteLink(id);
      await reload();
    },
    [repository, reload]
  );

  return { links, outgoing, incoming, error, addLink, removeLink };
}
