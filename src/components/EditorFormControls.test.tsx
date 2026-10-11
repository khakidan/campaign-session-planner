import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field, Section, AutosaveIndicator } from './EditorFormControls';

function ControlledField() {
  const [value, setValue] = useState('');
  return <Field id="npc-name" label="Name" value={value} onChange={setValue} />;
}

describe('Field', () => {
  it('renders a labeled text input by default and reports the complete typed value', async () => {
    const user = userEvent.setup();
    render(<ControlledField />);

    await user.type(screen.getByLabelText('Name'), 'Sister Mariel');

    expect(screen.getByLabelText('Name')).toHaveValue('Sister Mariel');
    expect(screen.getByLabelText('Name').tagName).toBe('INPUT');
  });

  it('renders a textarea when multiline is set', () => {
    render(<Field id="npc-notes" label="Notes" value="" onChange={vi.fn()} multiline />);
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA');
  });

  it('reflects the given value', () => {
    render(<Field id="npc-name" label="Name" value="Sister Mariel" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Sister Mariel');
  });
});

describe('Section', () => {
  it('renders its title as the legend and its children inside', () => {
    render(
      <Section title="Linked Entities">
        <p>Nothing linked yet.</p>
      </Section>
    );

    expect(screen.getByText('Linked Entities')).toBeInTheDocument();
    expect(screen.getByText('Nothing linked yet.')).toBeInTheDocument();
  });
});

describe('AutosaveIndicator', () => {
  it('renders nothing for idle', () => {
    const { container } = render(<AutosaveIndicator status="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "Saving…" while saving', () => {
    render(<AutosaveIndicator status="saving" />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('shows "Saved" once saved', () => {
    render(<AutosaveIndicator status="saved" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('renders nothing for error — a silent background failure is not worth alarming over mid-edit', () => {
    const { container } = render(<AutosaveIndicator status="error" />);
    expect(container).toBeEmptyDOMElement();
  });
});
