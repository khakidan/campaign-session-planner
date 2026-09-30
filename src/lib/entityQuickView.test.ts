import { describe, expect, it } from 'vitest';
import { fetchEntityQuickView, plannerTypeLabel } from './entityQuickView';
import { createFakeRepository } from '../test/fixtures';
import type { Note, Npc, Session } from '../types';

const paragraph = (text: string) => [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text, styles: {} }] }];

describe('fetchEntityQuickView', () => {
  it('returns the title, filtered badges, and content section for a Note', async () => {
    const note: Note = {
      id: 'note-1',
      campaignId: 'campaign-1',
      title: 'A Secret',
      type: 'Secret',
      status: null,
      content: paragraph('The Duke is hiding something.'),
      tags: [],
      createdAt: 'x',
      updatedAt: 'x',
    };
    const repository = createFakeRepository({ notes: [note] });

    const view = await fetchEntityQuickView(repository, { type: 'note', id: 'note-1', source: 'planner' });

    expect(view).toEqual({
      title: 'A Secret',
      badges: ['Secret'],
      sections: [{ blocks: paragraph('The Duke is hiding something.') }],
    });
  });

  it('omits null/undefined badge fields instead of showing them blank', async () => {
    const npc: Npc = {
      id: 'npc-1',
      campaignId: 'campaign-1',
      name: 'Sister Mariel',
      details: [],
      createdAt: 'x',
      updatedAt: 'x',
    };
    const repository = createFakeRepository({ npcs: [npc] });

    const view = await fetchEntityQuickView(repository, { type: 'npc', id: 'npc-1', source: 'planner' });

    expect(view?.badges).toEqual([]);
  });

  it('returns null when the entity no longer exists', async () => {
    const repository = createFakeRepository();
    const view = await fetchEntityQuickView(repository, { type: 'note', id: 'missing', source: 'planner' });
    expect(view).toBeNull();
  });

  it("adds a separate Debrief section for a Session only once it has one", async () => {
    const sessionWithoutDebrief: Session = {
      id: 'session-1',
      campaignId: 'campaign-1',
      title: 'The Sunken Temple',
      sessionNumber: 4,
      date: null,
      status: 'Completed',
      details: paragraph('They descended into the temple.'),
      debrief: null,
      createdAt: 'x',
      updatedAt: 'x',
    };
    const repository = createFakeRepository({ sessions: [sessionWithoutDebrief] });

    const withoutDebrief = await fetchEntityQuickView(repository, { type: 'session', id: 'session-1', source: 'planner' });
    expect(withoutDebrief?.sections).toHaveLength(1);
    expect(withoutDebrief?.badges).toEqual(['Session 4', 'Completed']);

    await repository.saveSession({ ...sessionWithoutDebrief, debrief: paragraph('They found the amulet.') });
    const withDebrief = await fetchEntityQuickView(repository, { type: 'session', id: 'session-1', source: 'planner' });
    expect(withDebrief?.sections).toEqual([
      { blocks: paragraph('They descended into the temple.') },
      { label: 'Debrief', blocks: paragraph('They found the amulet.') },
    ]);
  });
});

describe('plannerTypeLabel', () => {
  it('gives every planner entity type a human-readable label', () => {
    expect(plannerTypeLabel('npc')).toBe('NPC');
    expect(plannerTypeLabel('storyline')).toBe('Storyline');
  });
});
