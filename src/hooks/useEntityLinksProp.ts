import { useEntityLinks } from './useEntityLinks';
import type { CampaignId, CampaignPlannerRepository, EntityReference, TTRPGHostAdapter } from '../types';
import type { EntityEditorLinksProps } from '../components/EntityLinksPanel';
import type { PlannerSearchItem } from '../components/EntityLinkPicker';

/**
 * Wraps `useEntityLinks` into the exact `EntityEditorLinksProps` shape
 * every editor's `links` prop expects — `undefined` while `ref` is
 * `null` (nothing being edited yet, or a brand-new unsaved record with
 * no id to link from/to). Pulled out once this same wiring showed up
 * twice doing the identical thing for two different entities —
 * `CampaignSessionPlanner.tsx` for whichever top-level record is being
 * edited, and `SessionScenesSection.tsx` for whichever Scene is being
 * edited inline.
 */
export function useEntityLinksProp(
  repository: CampaignPlannerRepository,
  campaignId: CampaignId,
  ref: EntityReference | null,
  selfLabel: string | undefined,
  plannerItems: PlannerSearchItem[],
  hostAdapter: TTRPGHostAdapter,
  onOpenPlannerEntity: (ref: EntityReference) => void,
  onOpenHostEntity?: (type: EntityReference['type'], id: string) => void
): EntityEditorLinksProps | undefined {
  const { outgoing, incoming, addLink, removeLink } = useEntityLinks(repository, ref, campaignId, selfLabel);
  return ref
    ? {
        plannerItems,
        hostAdapter,
        outgoing,
        incoming,
        onAddLink: addLink,
        onRemoveLink: removeLink,
        onOpenPlannerEntity,
        onOpenHostEntity,
      }
    : undefined;
}
