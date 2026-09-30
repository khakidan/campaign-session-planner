import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityListView, type EntityListItem } from './EntityListView';

function baseProps() {
  return {
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    createLabel: 'New Note',
    emptyLabel: 'No notes yet — create one to get started.',
    searchPlaceholder: 'Search notes…',
  };
}

describe('EntityListView', () => {
  it('shows a loading state while items is null', () => {
    render(<EntityListView {...baseProps()} items={null} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the given empty-state label when there are no items at all', () => {
    render(<EntityListView {...baseProps()} items={[]} />);
    expect(screen.getByText('No notes yet — create one to get started.')).toBeInTheDocument();
  });

  it('renders each item\'s title, badge, subtitle, and tags', () => {
    const items: EntityListItem[] = [
      { id: 'note-1', title: 'A Secret', badge: 'Secret', subtitle: 'Session 4', tags: ['ebon-sigil'] },
    ];
    render(<EntityListView {...baseProps()} items={items} />);

    expect(screen.getByText('A Secret')).toBeInTheDocument();
    expect(screen.getByText('Secret')).toBeInTheDocument();
    expect(screen.getByText('Session 4')).toBeInTheDocument();
    expect(screen.getByText('ebon-sigil')).toBeInTheDocument();
  });

  it('clicking an item calls onSelect with its id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const items: EntityListItem[] = [{ id: 'note-1', title: 'A Secret' }];
    render(<EntityListView {...baseProps()} items={items} onSelect={onSelect} />);

    await user.click(screen.getByText('A Secret'));

    expect(onSelect).toHaveBeenCalledWith('note-1');
  });

  it('clicking the create button calls onCreate', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<EntityListView {...baseProps()} items={[]} onCreate={onCreate} />);

    await user.click(screen.getByRole('button', { name: 'New Note' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('search filters by title (case-insensitive)', async () => {
    const user = userEvent.setup();
    const items: EntityListItem[] = [{ id: 'note-1', title: 'A Secret' }, { id: 'note-2', title: 'Village Lore' }];
    render(<EntityListView {...baseProps()} items={items} />);

    await user.type(screen.getByPlaceholderText('Search notes…'), 'secret');

    expect(screen.getByText('A Secret')).toBeInTheDocument();
    expect(screen.queryByText('Village Lore')).not.toBeInTheDocument();
  });

  it('search also matches by tag, not just title', async () => {
    const user = userEvent.setup();
    const items: EntityListItem[] = [
      { id: 'note-1', title: 'A Secret', tags: ['ebon-sigil'] },
      { id: 'note-2', title: 'Village Lore', tags: [] },
    ];
    render(<EntityListView {...baseProps()} items={items} />);

    await user.type(screen.getByPlaceholderText('Search notes…'), 'ebon');

    expect(screen.getByText('A Secret')).toBeInTheDocument();
    expect(screen.queryByText('Village Lore')).not.toBeInTheDocument();
  });

  it('shows "No matches." (not the empty-campaign label) when a search excludes every item', async () => {
    const user = userEvent.setup();
    const items: EntityListItem[] = [{ id: 'note-1', title: 'A Secret' }];
    render(<EntityListView {...baseProps()} items={items} />);

    await user.type(screen.getByPlaceholderText('Search notes…'), 'nonexistent');

    expect(screen.getByText('No matches.')).toBeInTheDocument();
    expect(screen.queryByText('No notes yet — create one to get started.')).not.toBeInTheDocument();
  });
});
