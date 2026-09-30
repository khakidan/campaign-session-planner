import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, makeEntityLink, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { useEntityLinks } from './useEntityLinks';
import type { EntityReference } from '../types';

const noteRef: EntityReference = { type: 'note', id: 'note-1', source: 'planner' };
const npcRef: EntityReference = { type: 'npc', id: 'npc-1', source: 'planner' };

describe('useEntityLinks', () => {
  it('splits links into outgoing (this entity is the source) and incoming (backlinks)', async () => {
    const outgoingLink = makeEntityLink({ id: 'link-out', sourceType: 'note', sourceId: 'note-1', targetType: 'npc', targetId: 'npc-1' });
    const incomingLink = makeEntityLink({ id: 'link-in', sourceType: 'npc', sourceId: 'npc-1', targetType: 'note', targetId: 'note-1' });
    const unrelatedLink = makeEntityLink({ id: 'link-unrelated', sourceType: 'npc', sourceId: 'npc-2', targetType: 'group', targetId: 'group-1' });
    const repository = createFakeRepository({ links: [outgoingLink, incomingLink, unrelatedLink] });

    const { result } = renderHook(() => useEntityLinks(repository, noteRef, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.links).not.toBeNull());
    expect(result.current.outgoing).toEqual([outgoingLink]);
    expect(result.current.incoming).toEqual([incomingLink]);
  });

  it('excludes a self-link (source === target) from incoming, so it is not double-counted', async () => {
    const selfLink = makeEntityLink({ id: 'link-self', sourceType: 'note', sourceId: 'note-1', targetType: 'note', targetId: 'note-1' });
    const repository = createFakeRepository({ links: [selfLink] });

    const { result } = renderHook(() => useEntityLinks(repository, noteRef, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.links).not.toBeNull());
    expect(result.current.outgoing).toEqual([selfLink]);
    expect(result.current.incoming).toEqual([]);
  });

  it('returns an empty (not null) links list and never fetches while ref is null', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useEntityLinks(repository, null, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.links).toEqual([]));
  });

  it('addLink: stores the target reference, campaignId, and both labels in the created link', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useEntityLinks(repository, noteRef, TEST_CAMPAIGN_ID, 'A Secret'));
    await waitFor(() => expect(result.current.links).toEqual([]));

    await act(async () => {
      await result.current.addLink(npcRef, 'Sister Mariel');
    });

    await waitFor(() => expect(result.current.outgoing).toHaveLength(1));
    expect(result.current.outgoing[0]).toMatchObject({
      campaignId: TEST_CAMPAIGN_ID,
      sourceType: 'note',
      sourceId: 'note-1',
      targetType: 'npc',
      targetId: 'npc-1',
      relationshipType: 'mentions',
      metadata: { label: 'Sister Mariel', sourceLabel: 'A Secret' },
    });
  });

  it('addLink: defaults relationshipType to "mentions" when not given one', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useEntityLinks(repository, noteRef, TEST_CAMPAIGN_ID));
    await waitFor(() => expect(result.current.links).toEqual([]));

    await act(async () => {
      await result.current.addLink(npcRef, 'Sister Mariel', 'ally');
    });

    await waitFor(() => expect(result.current.outgoing).toHaveLength(1));
    expect(result.current.outgoing[0].relationshipType).toBe('ally');
  });

  it('removeLink: deletes exactly that link', async () => {
    const linkToRemove = makeEntityLink({ id: 'link-remove', sourceType: 'note', sourceId: 'note-1' });
    const linkToKeep = makeEntityLink({ id: 'link-keep', sourceType: 'note', sourceId: 'note-1', targetId: 'npc-2' });
    const repository = createFakeRepository({ links: [linkToRemove, linkToKeep] });
    const { result } = renderHook(() => useEntityLinks(repository, noteRef, TEST_CAMPAIGN_ID));
    await waitFor(() => expect(result.current.outgoing).toHaveLength(2));

    await act(async () => {
      await result.current.removeLink('link-remove');
    });

    await waitFor(() => expect(result.current.outgoing).toEqual([linkToKeep]));
  });
});
