import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionRecapView } from './SessionRecapView';
import { createFakeRepository, makeEntityLink, makeNote, makeSession, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { RECAP_HIGHLIGHT_TYPE } from '../lib/sessionRecap';

vi.mock('./ReadOnlyBlockNoteView', async () => (await import('../test/mocks/blockNote')).mockReadOnlyBlockNoteView());

const paragraph = (text: string) => [{ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] }] as never;

describe('SessionRecapView', () => {
  it('renders nothing when the Session id does not resolve', () => {
    const repository = createFakeRepository();
    const { container } = render(
      <SessionRecapView repository={repository} campaignId={TEST_CAMPAIGN_ID} sessionId="missing" onOpenPlannerEntity={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the Session title/number/date and an empty-state message when there are no highlights', async () => {
    const session = makeSession({ id: 's1', title: 'The Sunken Temple', sessionNumber: 8, date: '2024-06-01T00:00:00.000Z' });
    const repository = createFakeRepository({ sessions: [session] });

    render(<SessionRecapView repository={repository} campaignId={TEST_CAMPAIGN_ID} sessionId="s1" onOpenPlannerEntity={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('The Sunken Temple')).toBeInTheDocument());
    expect(screen.getByText(/Session 8/)).toBeInTheDocument();
    expect(screen.getByText(/No recap highlights yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy as Text/ })).not.toBeInTheDocument();
  });

  it('renders each linked Recap Highlight Note\'s content, and hides unrelated/wrongly-typed Notes', async () => {
    const session = makeSession({ id: 's1', title: 'The Sunken Temple' });
    const highlight = makeNote({
      id: 'note-1',
      type: RECAP_HIGHLIGHT_TYPE,
      content: paragraph('The party found the sunken bell.'),
    });
    const otherNote = makeNote({ id: 'note-2', type: 'General', content: paragraph('GM-only planning notes.') });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'session', targetId: 's1' });
    const repository = createFakeRepository({ sessions: [session], notes: [highlight, otherNote], links: [link] });

    render(<SessionRecapView repository={repository} campaignId={TEST_CAMPAIGN_ID} sessionId="s1" onOpenPlannerEntity={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId('readonly-content')).toHaveTextContent('The party found the sunken bell.'));
    expect(screen.queryByText('GM-only planning notes.')).not.toBeInTheDocument();
  });

  describe('Copy as Text', () => {
    it('copies the Session title and every highlight\'s text, and shows transient confirmation', async () => {
      const user = userEvent.setup();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        writable: true,
        configurable: true,
      });
      const session = makeSession({ id: 's1', title: 'The Sunken Temple' });
      const highlight = makeNote({ id: 'note-1', type: RECAP_HIGHLIGHT_TYPE, content: paragraph('They found the relic.') });
      const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'session', targetId: 's1' });
      const repository = createFakeRepository({ sessions: [session], notes: [highlight], links: [link] });

      render(<SessionRecapView repository={repository} campaignId={TEST_CAMPAIGN_ID} sessionId="s1" onOpenPlannerEntity={vi.fn()} />);

      const button = await screen.findByRole('button', { name: 'Copy as Text' });
      await user.click(button);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('The Sunken Temple'));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('They found the relic.'));
      expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    });
  });
});
