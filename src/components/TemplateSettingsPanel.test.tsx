import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSettingsPanel } from './TemplateSettingsPanel';
import { TEMPLATE_DEFAULTS } from '../lib/entityTemplates';
import type { Block, PlannerTemplate } from '../types';

const EDITED_BLOCKS = [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited content', styles: {} }] }] as unknown as Block[];

vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ value, onChange }: { value: Block[]; onChange: (blocks: Block[]) => void }) => (
    <div>
      <pre data-testid="blocknote-value">{JSON.stringify(value)}</pre>
      <button type="button" onClick={() => onChange(EDITED_BLOCKS)}>
        Simulate typing content
      </button>
    </div>
  ),
}));

function baseProps() {
  return {
    templates: [] as PlannerTemplate[],
    error: null,
    saveTemplate: vi.fn().mockResolvedValue({ id: 't1', campaignId: 'c1', entityKind: 'npc', blocks: [], updatedAt: 'x' }),
    deleteTemplate: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };
}

describe('TemplateSettingsPanel', () => {
  it('defaults to the NPC tab, loaded with the shipped default template', () => {
    render(<TemplateSettingsPanel {...baseProps()} />);

    expect(screen.getByRole('button', { name: 'NPC' })).toBeInTheDocument();
    expect(screen.getByTestId('blocknote-value')).toHaveTextContent(JSON.stringify(TEMPLATE_DEFAULTS.npc));
  });

  it('marks a customized kind with a dot, and loads its saved override instead of the shipped default', () => {
    const override: PlannerTemplate = { id: 't1', campaignId: 'c1', entityKind: 'npc', blocks: EDITED_BLOCKS, updatedAt: 'x' };
    render(<TemplateSettingsPanel {...baseProps()} templates={[override]} />);

    expect(screen.getByRole('button', { name: 'NPC •' })).toBeInTheDocument();
    expect(screen.getByTestId('blocknote-value')).toHaveTextContent(JSON.stringify(EDITED_BLOCKS));
  });

  it('switching kinds loads that kind\'s own effective blocks, not the previous kind\'s draft', async () => {
    const user = userEvent.setup();
    render(<TemplateSettingsPanel {...baseProps()} />);

    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));
    expect(screen.getByTestId('blocknote-value')).toHaveTextContent(JSON.stringify(EDITED_BLOCKS));

    await user.click(screen.getByRole('button', { name: 'Thread' }));

    expect(screen.getByTestId('blocknote-value')).toHaveTextContent(JSON.stringify(TEMPLATE_DEFAULTS.thread));
  });

  it('Reset to Default is disabled until the selected kind actually has a saved override', () => {
    render(<TemplateSettingsPanel {...baseProps()} />);
    expect(screen.getByRole('button', { name: 'Reset to Default' })).toBeDisabled();
  });

  it('Save Template: calls saveTemplate with the selected kind and the edited blocks', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<TemplateSettingsPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));
    await user.click(screen.getByRole('button', { name: 'Save Template' }));

    expect(props.saveTemplate).toHaveBeenCalledWith('npc', EDITED_BLOCKS);
  });

  it('Reset to Default: calls deleteTemplate for the selected kind and restores the shipped default in the editor', async () => {
    const user = userEvent.setup();
    const override: PlannerTemplate = { id: 't1', campaignId: 'c1', entityKind: 'npc', blocks: EDITED_BLOCKS, updatedAt: 'x' };
    const props = baseProps();
    render(<TemplateSettingsPanel {...props} templates={[override]} />);

    await user.click(screen.getByRole('button', { name: 'Reset to Default' }));

    expect(props.deleteTemplate).toHaveBeenCalledWith('npc');
    await waitFor(() => expect(screen.getByTestId('blocknote-value')).toHaveTextContent(JSON.stringify(TEMPLATE_DEFAULTS.npc)));
  });

  it('shows the error message when given one', () => {
    render(<TemplateSettingsPanel {...baseProps()} error="Failed to load templates." />);
    expect(screen.getByText('Failed to load templates.')).toBeInTheDocument();
  });

  it('"Back to Campaign Planner" calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TemplateSettingsPanel {...baseProps()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '← Back to Campaign Planner' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
