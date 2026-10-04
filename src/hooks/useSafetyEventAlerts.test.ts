import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, makeNote, makeSession, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { useSafetyEventAlerts } from './useSafetyEventAlerts';
import { buildSafetyEventTags, SAFETY_EVENT_NOTE_TYPE } from '../lib/safetyEvents';

describe('useSafetyEventAlerts', () => {
  it('does not alert for a Safety Event Note that already existed before the hook first loaded', async () => {
    const session = makeSession({ id: 's1', title: 'The Sunken Temple', status: 'Running' });
    const existing = makeNote({ id: 'note-1', type: SAFETY_EVENT_NOTE_TYPE, tags: buildSafetyEventTags('Pause', 's1') });
    const repository = createFakeRepository({ sessions: [session], notes: [existing] });
    const onSafetyEvent = vi.fn();

    renderHook(() => useSafetyEventAlerts(repository, TEST_CAMPAIGN_ID, onSafetyEvent));

    // Give the hook's effects a tick to run its initial seed.
    await new Promise((r) => setTimeout(r, 10));
    expect(onSafetyEvent).not.toHaveBeenCalled();
  });

  it('alerts once for a Safety Event Note created after the hook is already watching, via subscribeToChanges', async () => {
    const session = makeSession({ id: 's1', title: 'The Sunken Temple', status: 'Running' });
    const repository = createFakeRepository({ sessions: [session] });
    let notifyChange: (() => void) | undefined;
    repository.subscribeToChanges = (onChange) => {
      notifyChange = onChange;
      return () => {
        notifyChange = undefined;
      };
    };
    const onSafetyEvent = vi.fn();

    renderHook(() => useSafetyEventAlerts(repository, TEST_CAMPAIGN_ID, onSafetyEvent));

    await new Promise((r) => setTimeout(r, 10));
    expect(onSafetyEvent).not.toHaveBeenCalled();

    await repository.saveNote({
      campaignId: TEST_CAMPAIGN_ID,
      title: 'X-Card — The Sunken Temple',
      type: SAFETY_EVENT_NOTE_TYPE,
      status: null,
      content: [],
      tags: buildSafetyEventTags('X-Card', 's1', 'Alice'),
    });
    notifyChange?.();

    await waitFor(() => expect(onSafetyEvent).toHaveBeenCalledTimes(1));
    expect(onSafetyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'X-Card', triggeredBy: 'Alice', sessionId: 's1', sessionTitle: 'The Sunken Temple' })
    );
  });

  it('ignores a Safety Event Note tagged for a different Session', async () => {
    const session = makeSession({ id: 's1', status: 'Running' });
    const otherSessionNote = makeNote({
      id: 'note-1',
      type: SAFETY_EVENT_NOTE_TYPE,
      tags: buildSafetyEventTags('Pause', 's2'),
    });
    const repository = createFakeRepository({ sessions: [session], notes: [otherSessionNote] });
    const onSafetyEvent = vi.fn();

    renderHook(() => useSafetyEventAlerts(repository, TEST_CAMPAIGN_ID, onSafetyEvent));

    await new Promise((r) => setTimeout(r, 10));
    expect(onSafetyEvent).not.toHaveBeenCalled();
  });

  it('never alerts when no Session is Running', async () => {
    const existing = makeNote({ id: 'note-1', type: SAFETY_EVENT_NOTE_TYPE, tags: buildSafetyEventTags('Pause', 's1') });
    const repository = createFakeRepository({ notes: [existing] });
    const onSafetyEvent = vi.fn();

    renderHook(() => useSafetyEventAlerts(repository, TEST_CAMPAIGN_ID, onSafetyEvent));

    await new Promise((r) => setTimeout(r, 10));
    expect(onSafetyEvent).not.toHaveBeenCalled();
  });
});
