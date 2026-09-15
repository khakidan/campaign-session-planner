import { useCallback, useEffect, useState } from 'react';
import type { Block, CampaignId, CampaignPlannerRepository, PlannerTemplate, TemplateEntityKind } from '../types';

/**
 * Slice 4.2f — a campaign's saved template overrides. Only customized
 * kinds come back from `getTemplates`; a kind missing from the result
 * means "use the shipped default" (`lib/entityTemplates.ts`), same
 * absence-means-default convention `PlannerTemplate`'s own doc comment
 * establishes.
 */
export function useTemplates(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [templates, setTemplates] = useState<PlannerTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getTemplates(campaignId)
      .then(setTemplates)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load templates.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveTemplate = useCallback(
    async (entityKind: TemplateEntityKind, blocks: Block[]) => {
      const saved = await repository.saveTemplate(campaignId, entityKind, blocks);
      await reload();
      return saved;
    },
    [repository, campaignId, reload]
  );

  const deleteTemplate = useCallback(
    async (entityKind: TemplateEntityKind) => {
      await repository.deleteTemplate(campaignId, entityKind);
      await reload();
    },
    [repository, campaignId, reload]
  );

  return { templates, error, reload, saveTemplate, deleteTemplate };
}
