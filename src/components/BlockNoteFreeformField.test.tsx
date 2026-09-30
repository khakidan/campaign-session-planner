import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import type { Block } from '../types';

const template = [
  { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: 'Motivation', styles: {} }] },
] as unknown as Parameters<typeof BlockNoteFreeformField>[0]['template'];

// A thin, real (not mocked) smoke-test layer over BlockNote itself — per
// ROADMAP.md, this package's own logic here (the starter-template
// button's visibility/apply behavior, undo/redo wiring) is worth
// verifying directly; BlockNote's own editing/rendering internals
// (ProseMirror) are the third-party engine, not this package's code,
// and are deliberately not re-tested here.
function Controlled({ initial = [], template: t }: { initial?: Block[]; template?: typeof template }) {
  const [value, setValue] = useState<Block[]>(initial);
  return <BlockNoteFreeformField value={value} onChange={setValue} template={t} />;
}

describe('BlockNoteFreeformField (smoke)', () => {
  it('renders an empty document without throwing', () => {
    render(<BlockNoteFreeformField value={[]} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('offers "+ Use starter template" only when a template is given and the document is still empty', () => {
    const { rerender } = render(<BlockNoteFreeformField value={[]} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: '+ Use starter template' })).not.toBeInTheDocument();

    rerender(<BlockNoteFreeformField value={[]} onChange={() => {}} template={template} />);
    expect(screen.getByRole('button', { name: '+ Use starter template' })).toBeInTheDocument();
  });

  it('does not offer the starter template once the document already has content', () => {
    const existing: Block[] = [{ type: 'paragraph', content: [{ type: 'text', text: 'Already written.', styles: {} }] } as never];
    render(<BlockNoteFreeformField value={existing} onChange={() => {}} template={template} />);

    expect(screen.queryByRole('button', { name: '+ Use starter template' })).not.toBeInTheDocument();
  });

  it('clicking "+ Use starter template" replaces the document and reports the new blocks via onChange', async () => {
    const user = userEvent.setup();
    render(<Controlled template={template} />);

    await user.click(screen.getByRole('button', { name: '+ Use starter template' }));

    expect(screen.getByText('Motivation')).toBeInTheDocument();
    // The button is single-use per document — applying the template
    // itself counts as "the document now has content."
    expect(screen.queryByRole('button', { name: '+ Use starter template' })).not.toBeInTheDocument();
  });

  it('provides working Undo/Redo controls that do not throw', async () => {
    const user = userEvent.setup();
    render(<BlockNoteFreeformField value={[]} onChange={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await user.click(screen.getByRole('button', { name: 'Redo' }));
  });

  it('renders without a linking prop, with no [[/@ suggestion wiring', () => {
    render(<BlockNoteFreeformField value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
