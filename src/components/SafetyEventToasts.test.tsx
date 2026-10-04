import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SafetyEventToasts } from './SafetyEventToasts';
import { createFakeRepository, makeSession, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { SAFETY_EVENT_NOTE_TYPE, buildSafetyEventTags } from '../lib/safetyEvents';

describe('SafetyEventToasts', () => {
  it('renders nothing when no Safety Event has fired', () => {
    const repository = createFakeRepository({ sessions: [makeSession({ id: 's1', status: 'Running' })] });
    const { container } = render(<SafetyEventToasts repository={repository} campaignId={TEST_CAMPAIGN_ID} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a toast naming the tool and who triggered it, and dismisses on click', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 's1', title: 'The Sunken Temple', status: 'Running' });
    const repository = createFakeRepository({ sessions: [session] });
    let notifyChange: (() => void) | undefined;
    repository.subscribeToChanges = (onChange) => {
      notifyChange = onChange;
      return () => {
        notifyChange = undefined;
      };
    };

    render(<SafetyEventToasts repository={repository} campaignId={TEST_CAMPAIGN_ID} />);
    await new Promise((r) => setTimeout(r, 10));

    await repository.saveNote({
      campaignId: TEST_CAMPAIGN_ID,
      title: 'X-Card — The Sunken Temple',
      type: SAFETY_EVENT_NOTE_TYPE,
      status: null,
      content: [],
      tags: buildSafetyEventTags('X-Card', 's1', 'Alice'),
    });
    notifyChange?.();

    const toast = await screen.findByRole('button', { name: /X-Card triggered by Alice/ });
    expect(toast).toBeInTheDocument();

    await user.click(toast);
    expect(screen.queryByRole('button', { name: /X-Card triggered/ })).not.toBeInTheDocument();
  });

  it('falls back to "by a player" when no triggeredBy was recorded', async () => {
    const session = makeSession({ id: 's1', title: 'The Sunken Temple', status: 'Running' });
    const repository = createFakeRepository({ sessions: [session] });
    let notifyChange: (() => void) | undefined;
    repository.subscribeToChanges = (onChange) => {
      notifyChange = onChange;
      return () => {
        notifyChange = undefined;
      };
    };

    render(<SafetyEventToasts repository={repository} campaignId={TEST_CAMPAIGN_ID} />);
    await new Promise((r) => setTimeout(r, 10));

    await repository.saveNote({
      campaignId: TEST_CAMPAIGN_ID,
      title: 'Pause — The Sunken Temple',
      type: SAFETY_EVENT_NOTE_TYPE,
      status: null,
      content: [],
      tags: buildSafetyEventTags('Pause', 's1'),
    });
    notifyChange?.();

    await waitFor(() => expect(screen.getByRole('button', { name: /Pause triggered by a player/ })).toBeInTheDocument());
  });
});
