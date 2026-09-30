import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionSafetyControls } from './SessionSafetyControls';
import { createFakeRepository, makeSession, TEST_CAMPAIGN_ID } from '../test/fixtures';

describe('SessionSafetyControls', () => {
  it('renders nothing when no Session is Running', () => {
    const repository = createFakeRepository({ sessions: [makeSession({ id: 's1', status: 'Draft' })] });
    const { container } = render(<SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the safety controls once a Session is Running', async () => {
    const repository = createFakeRepository({ sessions: [makeSession({ id: 's1', status: 'Running' })] });
    render(<SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} />);

    await waitFor(() => expect(screen.getByRole('group', { name: 'Session safety controls' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'X-Card' })).toBeInTheDocument();
  });

  it('clicking a tool writes a Safety Event Note linked to the running Session', async () => {
    const user = userEvent.setup();
    const runningSession = makeSession({ id: 's1', title: 'The Sunken Temple', status: 'Running' });
    const repository = createFakeRepository({ sessions: [runningSession] });

    render(<SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'X-Card' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'X-Card' }));

    await waitFor(async () => {
      const notes = await repository.getNotes(TEST_CAMPAIGN_ID);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({ type: 'Safety Event', title: 'X-Card — The Sunken Temple' });

      const links = await repository.getLinks({ type: 'session', id: 's1', source: 'planner' });
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({ sourceType: 'note', sourceId: notes[0].id, targetType: 'session', targetId: 's1' });
    });

    expect(screen.getByText('X-Card recorded')).toBeInTheDocument();
  });
});
