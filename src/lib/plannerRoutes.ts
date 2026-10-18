import type { CampaignId, PlannerEntityType } from '../types';

/** One browsable kind's current list/edit state — owned by
 * `CampaignSessionPlanner.tsx` (one `View` per kind, in a single
 * `Record<PlannerEntityType, View>`), passed down to each kind's own
 * `*EditorRoute` component. `id: null` means "creating a new record." */
export type View = { mode: 'list' } | { mode: 'edit'; id: string | null };

/** Shared by Note's and Lore's own `tags` field — split on commas,
 * trim, drop empties. */
export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** The onSave/onAutosave/onDelete/onCancel wiring every "simple" kind's
 * `*EditorRoute` needs is structurally identical — only the entity
 * type, its payload-mapping function, and its CRUD functions differ.
 * Factored out once there were 9 near-identical copies (Note/Lore/Npc/
 * Group/Location/Storyline/Thread/Quest/Event); Session and Scene stay
 * fully custom in their own route components since each has genuinely
 * different wiring (Session's extra `onScenesChanged`/two templates;
 * Scene's `sessionId`/`order` resolution for its own Session picker).
 * Plain function, not a hook — it calls no hooks itself, so there's no
 * rules-of-hooks concern calling it conditionally. */
export function buildCrudHandlers<TEntity extends { id: string }, TFormValues, TPayload extends object>({
  kind,
  entity,
  currentViewId,
  setView,
  runSaving,
  campaignId,
  toPayload,
  createEntity,
  updateEntity,
  deleteEntity,
  saveEntity,
  reloadEntity,
}: {
  kind: PlannerEntityType;
  entity: TEntity | null;
  /** This view's own `view.id` — see the comment on `onSave` below for
   * why this, not `existingId`, decides whether to stay on the editor. */
  currentViewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  campaignId: CampaignId;
  toPayload: (values: TFormValues) => TPayload;
  createEntity: (payload: TPayload) => Promise<TEntity>;
  updateEntity: (entity: TEntity) => Promise<TEntity>;
  deleteEntity: (id: string) => Promise<void>;
  saveEntity: (input: TPayload & { id: string; campaignId: CampaignId }) => Promise<TEntity>;
  reloadEntity: () => Promise<void>;
}) {
  return {
    onCancel: () => setView(kind, { mode: 'list' }),
    onDelete: entity
      ? () =>
          runSaving(async () => {
            await deleteEntity(entity.id);
            setView(kind, { mode: 'list' });
          })
      : undefined,
    onSave: (values: TFormValues, existingId: string | null) =>
      runSaving(async () => {
        const payload = toPayload(values);
        // `existingId` is the *editor's* own knowledge, which an
        // autosave may already have updated in the background;
        // `currentViewId` is whether this view has ever actually shown
        // linking for this record. An autosave can create the real
        // row without this view learning its id, so this explicit
        // Save click can still be the first moment it's revealed —
        // branch on `currentViewId`, not `existingId`, so that moment
        // doesn't close the editor the instant it happens.
        const saved = existingId
          ? await updateEntity({ ...entity, id: existingId, campaignId, ...payload } as unknown as TEntity)
          : await createEntity(payload);
        setView(kind, currentViewId ? { mode: 'list' } : { mode: 'edit', id: saved.id });
      }),
    onAutosave: async (values: TFormValues, existingId: string | null) => {
      const payload = toPayload(values);
      if (existingId) {
        const saved = await saveEntity({ ...payload, id: existingId, campaignId });
        await reloadEntity();
        return { id: saved.id };
      }
      const created = await createEntity(payload);
      return { id: created.id };
    },
  };
}
