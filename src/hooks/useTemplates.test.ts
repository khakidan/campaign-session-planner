import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { useTemplates } from './useTemplates';

describe('useTemplates', () => {
  it('only returns campaign-customized kinds — a missing kind means "use the shipped default"', async () => {
    const repository = createFakeRepository({
      templates: [{ id: 'tpl-1', campaignId: TEST_CAMPAIGN_ID, entityKind: 'npc', blocks: [], updatedAt: 'x' }],
    });

    const { result } = renderHook(() => useTemplates(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates?.[0].entityKind).toBe('npc');
  });

  it('saveTemplate: persists the exact blocks for the given entityKind', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useTemplates(repository, TEST_CAMPAIGN_ID));
    await waitFor(() => expect(result.current.templates).toEqual([]));

    const blocks = [{ type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: 'Custom Section', styles: {} }] }];
    await act(async () => {
      await result.current.saveTemplate('thread', blocks as never);
    });

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates?.[0]).toMatchObject({ campaignId: TEST_CAMPAIGN_ID, entityKind: 'thread', blocks });
  });

  it('deleteTemplate: reverts exactly that kind back to the shipped default (removes the override)', async () => {
    const repository = createFakeRepository({
      templates: [
        { id: 'tpl-1', campaignId: TEST_CAMPAIGN_ID, entityKind: 'npc', blocks: [], updatedAt: 'x' },
        { id: 'tpl-2', campaignId: TEST_CAMPAIGN_ID, entityKind: 'thread', blocks: [], updatedAt: 'x' },
      ],
    });
    const { result } = renderHook(() => useTemplates(repository, TEST_CAMPAIGN_ID));
    await waitFor(() => expect(result.current.templates).toHaveLength(2));

    await act(async () => {
      await result.current.deleteTemplate('npc');
    });

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates?.[0].entityKind).toBe('thread');
  });
});
