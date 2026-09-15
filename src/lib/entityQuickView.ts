import type { Block, CampaignPlannerRepository, EntityReference, PlannerEntityType } from '../types';

export interface EntityQuickViewSection {
  /** Omitted for the entity's single/primary document (Note.content,
   * every other kind's `details`) — shown for Session's separate
   * Debrief, the one kind with two documents. */
  label?: string;
  blocks: Block[];
}

export interface EntityQuickView {
  title: string;
  /** A short property line under the title — Type/Status/etc., already
   * real columns on the entity, not document content. Omitted fields
   * are skipped, not shown blank. */
  badges: string[];
  sections: EntityQuickViewSection[];
}

const PLANNER_TYPE_LABELS: Record<PlannerEntityType, string> = {
  note: 'Note',
  npc: 'NPC',
  group: 'Group',
  location: 'Location',
  session: 'Session',
  scene: 'Scene',
  storyline: 'Storyline',
  thread: 'Thread',
  quest: 'Quest',
  event: 'Event',
};

/** Display label for a planner entity kind, e.g. for the Drawer's
 * breadcrumb/title area. */
export function plannerTypeLabel(type: PlannerEntityType): string {
  return PLANNER_TYPE_LABELS[type];
}

/**
 * Slice 4.2g — the Quick-reference Drawer's one entry point for "given
 * a planner `EntityReference`, fetch it and normalize it into a
 * uniform, read-only-friendly shape." Every entity kind stores its
 * document(s) under different field names (`Note.content`, everything
 * else's `details`, `Session`'s extra `debrief`) — this is the single
 * place that dispatches on `ref.type` so nothing else in the Drawer
 * needs a switch statement over entity kind. Returns `null` if the
 * entity no longer exists (deleted since a link/recent was created) —
 * the Drawer shows a "not found" state rather than throwing.
 */
export async function fetchEntityQuickView(
  repository: CampaignPlannerRepository,
  ref: EntityReference
): Promise<EntityQuickView | null> {
  switch (ref.type as PlannerEntityType) {
    case 'note': {
      const note = await repository.getNote(ref.id);
      if (!note) return null;
      return {
        title: note.title,
        badges: [note.type, note.status].filter((v): v is string => !!v),
        sections: [{ blocks: note.content ?? [] }],
      };
    }
    case 'npc': {
      const npc = await repository.getNpc(ref.id);
      if (!npc) return null;
      return { title: npc.name, badges: [], sections: [{ blocks: npc.details ?? [] }] };
    }
    case 'group': {
      const group = await repository.getGroup(ref.id);
      if (!group) return null;
      return {
        title: group.name,
        badges: [group.type, group.status].filter((v): v is string => !!v),
        sections: [{ blocks: group.details ?? [] }],
      };
    }
    case 'location': {
      const location = await repository.getLocation(ref.id);
      if (!location) return null;
      return {
        title: location.name,
        badges: [location.type].filter((v): v is string => !!v),
        sections: [{ blocks: location.details ?? [] }],
      };
    }
    case 'session': {
      const session = await repository.getSession(ref.id);
      if (!session) return null;
      const sections: EntityQuickViewSection[] = [{ blocks: session.details ?? [] }];
      if (session.debrief && session.debrief.length > 0) {
        sections.push({ label: 'Debrief', blocks: session.debrief });
      }
      return {
        title: session.title,
        badges: [
          session.sessionNumber != null ? `Session ${session.sessionNumber}` : null,
          session.status,
        ].filter((v): v is string => !!v),
        sections,
      };
    }
    case 'scene': {
      const scene = await repository.getScene(ref.id);
      if (!scene) return null;
      return {
        title: scene.title,
        badges: [scene.status].filter((v): v is string => !!v),
        sections: [{ blocks: scene.details ?? [] }],
      };
    }
    case 'storyline': {
      const storyline = await repository.getStoryline(ref.id);
      if (!storyline) return null;
      return {
        title: storyline.name,
        badges: [storyline.status, storyline.priority].filter((v): v is string => !!v),
        sections: [{ blocks: storyline.details ?? [] }],
      };
    }
    case 'thread': {
      const thread = await repository.getThread(ref.id);
      if (!thread) return null;
      return {
        title: thread.name,
        badges: [thread.status, thread.priority].filter((v): v is string => !!v),
        sections: [{ blocks: thread.details ?? [] }],
      };
    }
    case 'quest': {
      const quest = await repository.getQuest(ref.id);
      if (!quest) return null;
      return {
        title: quest.name,
        badges: [quest.status].filter((v): v is string => !!v),
        sections: [{ blocks: quest.details ?? [] }],
      };
    }
    case 'event': {
      const event = await repository.getEvent(ref.id);
      if (!event) return null;
      return {
        title: event.name,
        badges: [event.eventType, event.status].filter((v): v is string => !!v),
        sections: [{ blocks: event.details ?? [] }],
      };
    }
    default:
      return null;
  }
}
