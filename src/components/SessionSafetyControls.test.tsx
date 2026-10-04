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

  it('gives every button a hover tooltip explaining what it does, before it is ever clicked', async () => {
    const repository = createFakeRepository({ sessions: [makeSession({ id: 's1', status: 'Running' })] });
    render(<SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'X-Card' })).toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('title', expect.stringMatching(/step out-of-character/));
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveAttribute('title', expect.stringMatching(/Resume play/));
    expect(screen.getByRole('button', { name: 'Rewind' })).toHaveAttribute('title', expect.stringMatching(/didn't happen/));
    expect(screen.getByRole('button', { name: 'Fast Forward' })).toHaveAttribute('title', expect.stringMatching(/without playing it out/));
    expect(screen.getByRole('button', { name: 'X-Card' })).toHaveAttribute('title', expect.stringMatching(/Stop or skip/));
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
      expect(notes[0].tags).toEqual(expect.arrayContaining(['safety-tool:X-Card', 'session-id:s1']));

      const links = await repository.getLinks({ type: 'session', id: 's1', source: 'planner' });
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({ sourceType: 'note', sourceId: notes[0].id, targetType: 'session', targetId: 's1' });
    });

    expect(screen.getByText('X-Card recorded')).toBeInTheDocument();
  });

  it('records the triggeredBy name as a tag when supplied', async () => {
    const user = userEvent.setup();
    const runningSession = makeSession({ id: 's1', title: 'The Sunken Temple', status: 'Running' });
    const repository = createFakeRepository({ sessions: [runningSession] });

    render(<SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} triggeredBy="Alice" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Pause' }));

    await waitFor(async () => {
      const notes = await repository.getNotes(TEST_CAMPAIGN_ID);
      expect(notes[0].tags).toContain('triggered-by:Alice');
    });
  });

  it('renders nothing when visible is explicitly false, even while a Session is Running', () => {
    const repository = createFakeRepository({ sessions: [makeSession({ id: 's1', status: 'Running' })] });
    const { container } = render(
      <SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} visible={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to the bottom-right corner', async () => {
    const repository = createFakeRepository({ sessions: [makeSession({ id: 's1', status: 'Running' })] });
    render(<SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} />);

    const group = await screen.findByRole('group', { name: 'Session safety controls' });
    expect(group.className).toContain('bottom-4');
    expect(group.className).toContain('right-4');
  });

  it('positions itself in the requested corner instead', async () => {
    const repository = createFakeRepository({ sessions: [makeSession({ id: 's1', status: 'Running' })] });
    render(<SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} position="top-left" />);

    const group = await screen.findByRole('group', { name: 'Session safety controls' });
    expect(group.className).toContain('top-4');
    expect(group.className).toContain('left-4');
  });
});
