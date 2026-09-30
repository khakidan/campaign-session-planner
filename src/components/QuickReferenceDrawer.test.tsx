import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickReferenceDrawerProvider, useQuickReferenceDrawer } from './QuickReferenceDrawer';
import { createFakeHostAdapter, createFakeRepository, makeEntityLink, makeNote, TEST_CAMPAIGN_ID } from '../test/fixtures';
import type { Npc } from '../types';

vi.mock('./ReadOnlyBlockNoteView', async () => (await import('../test/mocks/blockNote')).mockReadOnlyBlockNoteView());

const paragraph = (text: string) => [{ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] }] as never;

function Harness({ repository, hostAdapter }: { repository: ReturnType<typeof createFakeRepository>; hostAdapter: ReturnType<typeof createFakeHostAdapter> }) {
  return (
    <QuickReferenceDrawerProvider campaignId={TEST_CAMPAIGN_ID} repository={repository} hostAdapter={hostAdapter}>
      <OpenButtons />
    </QuickReferenceDrawerProvider>
  );
}

function OpenButtons() {
  const { open, closeAll } = useQuickReferenceDrawer();
  return (
    <div>
      <button onClick={() => open()}>Open Search</button>
      <button onClick={() => open({ type: 'note', id: 'note-1', source: 'planner' })}>Open Note Directly</button>
      <button onClick={closeAll}>Close All</button>
    </div>
  );
}

describe('QuickReferenceDrawer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('open(): shows the search panel with an empty Recent state when nothing has been viewed', async () => {
    const user = userEvent.setup();
    render(<Harness repository={createFakeRepository()} hostAdapter={createFakeHostAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Open Search' }));

    expect(await screen.findByRole('heading', { name: 'Quick Reference' })).toBeInTheDocument();
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Nothing viewed yet — search above.')).toBeInTheDocument();
  });

  it('typing a query filters the planner search index by label', async () => {
    const user = userEvent.setup();
    const note = makeNote({ id: 'note-1', title: 'A Secret' });
    const repository = createFakeRepository({ notes: [note] });
    render(<Harness repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Open Search' }));
    await user.type(screen.getByPlaceholderText(/Search Notes, NPCs/), 'secret');

    await waitFor(() => expect(screen.getByText('A Secret')).toBeInTheDocument());
    expect(screen.getByText('Results (1)')).toBeInTheDocument();
  });

  it('selecting a result shows its quick view: title, badges, content, and linked entities', async () => {
    const user = userEvent.setup();
    const note = makeNote({ id: 'note-1', title: 'A Secret', type: 'Secret', content: paragraph('The Duke is hiding something.') });
    const npc: Npc = { id: 'npc-1', campaignId: TEST_CAMPAIGN_ID, name: 'Sister Mariel', details: [], createdAt: 'x', updatedAt: 'x' };
    const link = makeEntityLink({
      sourceType: 'note',
      sourceId: 'note-1',
      targetType: 'npc',
      targetId: 'npc-1',
      metadata: { label: 'Sister Mariel' },
    });
    const repository = createFakeRepository({ notes: [note], npcs: [npc], links: [link] });
    render(<Harness repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Open Search' }));
    await user.type(screen.getByPlaceholderText(/Search Notes, NPCs/), 'secret');
    await waitFor(() => expect(screen.getByText('A Secret')).toBeInTheDocument());
    await user.click(screen.getByText('A Secret'));

    expect(await screen.findByRole('heading', { name: 'A Secret' })).toBeInTheDocument();
    expect(screen.getByText('Secret')).toBeInTheDocument();
    expect(screen.getByTestId('readonly-content')).toHaveTextContent('The Duke is hiding something.');
    expect(screen.getByRole('button', { name: 'Sister Mariel' })).toBeInTheDocument();
  });

  it('clicking a linked entity pushes a new stacked panel rather than replacing the current one', async () => {
    const user = userEvent.setup();
    const note = makeNote({ id: 'note-1', title: 'A Secret' });
    const npc: Npc = { id: 'npc-1', campaignId: TEST_CAMPAIGN_ID, name: 'Sister Mariel', details: paragraph('Protects the district.'), createdAt: 'x', updatedAt: 'x' };
    const link = makeEntityLink({
      sourceType: 'note',
      sourceId: 'note-1',
      targetType: 'npc',
      targetId: 'npc-1',
      metadata: { label: 'Sister Mariel' },
    });
    const repository = createFakeRepository({ notes: [note], npcs: [npc], links: [link] });
    render(<Harness repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Open Note Directly' }));
    await user.click(await screen.findByRole('button', { name: 'Sister Mariel' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: /A Secret|Sister Mariel/ })).toHaveLength(2));
    expect(screen.getByRole('heading', { name: 'A Secret' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sister Mariel' })).toBeInTheDocument();
  });

  it('"Back to search" returns to the search view without closing the panel', async () => {
    const user = userEvent.setup();
    const note = makeNote({ id: 'note-1', title: 'A Secret' });
    const repository = createFakeRepository({ notes: [note] });
    render(<Harness repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Open Note Directly' }));
    await screen.findByRole('heading', { name: 'A Secret' });

    await user.click(screen.getByRole('button', { name: 'Back to search' }));

    expect(await screen.findByRole('heading', { name: 'Quick Reference' })).toBeInTheDocument();
  });

  it('selecting an entity records it to Recent for the next time the drawer is opened fresh', async () => {
    const user = userEvent.setup();
    const note = makeNote({ id: 'note-1', title: 'A Secret' });
    const repository = createFakeRepository({ notes: [note] });
    render(<Harness repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Open Note Directly' }));
    await screen.findByRole('heading', { name: 'A Secret' });

    await user.click(screen.getByRole('button', { name: 'Close All' }));
    await user.click(screen.getByRole('button', { name: 'Open Search' }));

    expect(await screen.findByRole('button', { name: /A Secret/ })).toBeInTheDocument();
  });

  it('shows "Not found" when the referenced entity no longer exists', async () => {
    const user = userEvent.setup();
    render(<Harness repository={createFakeRepository()} hostAdapter={createFakeHostAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Open Note Directly' }));

    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
    expect(screen.getByText('This Note no longer exists.')).toBeInTheDocument();
  });

  it('Close removes the panel', async () => {
    const user = userEvent.setup();
    render(<Harness repository={createFakeRepository()} hostAdapter={createFakeHostAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Open Search' }));
    await screen.findByRole('heading', { name: 'Quick Reference' });

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Quick Reference' })).not.toBeInTheDocument());
  });
});
