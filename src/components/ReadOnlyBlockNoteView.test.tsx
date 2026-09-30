import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadOnlyBlockNoteView } from './ReadOnlyBlockNoteView';
import type { Block } from '../types';

describe('ReadOnlyBlockNoteView', () => {
  it('shows a placeholder for an empty document instead of an empty editor', () => {
    render(<ReadOnlyBlockNoteView blocks={[]} />);
    expect(screen.getByText('Nothing written here yet.')).toBeInTheDocument();
  });

  it('renders real content as non-editable', () => {
    const blocks = [{ type: 'paragraph', content: [{ type: 'text', text: 'The Duke is hiding something.', styles: {} }] }] as unknown as Block[];
    render(<ReadOnlyBlockNoteView blocks={blocks} />);

    expect(screen.getByText('The Duke is hiding something.')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'false');
  });
});
