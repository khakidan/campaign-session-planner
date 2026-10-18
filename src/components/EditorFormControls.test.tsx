import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field, Section, AutosaveIndicator, SelectField } from './EditorFormControls';

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

describe('SelectField', () => {
  it('renders a labeled select with a blank option plus each given option, and reports the chosen one', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SelectField id="npc-status" label="Status" value="" onChange={onChange} options={['Alive', 'Dead', 'Missing', 'Unknown']} />);

    expect(screen.getByLabelText('Status').tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Unspecified' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alive' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), 'Dead');
    expect(onChange).toHaveBeenCalledWith('Dead');
  });

  it('reflects the given value as the selected option', () => {
    render(<SelectField id="npc-status" label="Status" value="Missing" onChange={vi.fn()} options={['Alive', 'Dead', 'Missing', 'Unknown']} />);
    expect(screen.getByLabelText('Status')).toHaveValue('Missing');
  });

  it('shows helperText when given, and renders nothing extra when omitted', () => {
    const { container, rerender } = render(<SelectField id="x" label="X" value="" onChange={vi.fn()} options={['A']} />);
    expect(container.querySelector('p')).toBeNull();

    rerender(<SelectField id="x" label="X" value="" onChange={vi.fn()} options={['A']} helperText="What this field is for." />);
    expect(screen.getByText('What this field is for.')).toBeInTheDocument();
  });

  it('a value outside the given options never triggers onChange on its own — nothing silently clears or rewrites it just by rendering', () => {
    const onChange = vi.fn();
    render(<SelectField id="npc-status" label="Status" value="Some Old Value" onChange={onChange} options={['Alive', 'Dead', 'Missing', 'Unknown']} />);
    expect(onChange).not.toHaveBeenCalled();
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
