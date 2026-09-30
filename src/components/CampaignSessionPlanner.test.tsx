import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignSessionPlanner, type CampaignSessionPlannerNavProps } from './CampaignSessionPlanner';
import { createFakeHostAdapter, createFakeRepository, TEST_CAMPAIGN_ID } from '../test/fixtures';

vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: unknown[]) => void }) => (
    <button type="button" onClick={() => onChange([])}>
      Simulate typing content
    </button>
  ),
}));

describe('CampaignSessionPlanner nav customization', () => {
  it('renders the default tab bar (kind labels as clickable tabs) when renderNav is omitted', async () => {
    render(
      <CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={createFakeRepository()} hostAdapter={createFakeHostAdapter()} />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Notes' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'NPCs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Templates' })).toBeInTheDocument();
  });

  it('renderNav fully replaces the default tab bar with the host\'s own UI', async () => {
    render(
      <CampaignSessionPlanner
        campaignId={TEST_CAMPAIGN_ID}
        repository={createFakeRepository()}
        hostAdapter={createFakeHostAdapter()}
        renderNav={() => <div>Custom Sidebar Nav</div>}
      />
    );

    await waitFor(() => expect(screen.getByText('Custom Sidebar Nav')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Notes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Templates' })).not.toBeInTheDocument();
  });

  it('passes every browsable kind, its label, the active kind, and working callbacks to renderNav', async () => {
    const user = userEvent.setup();
    const repository = createFakeRepository();
    let capturedProps: CampaignSessionPlannerNavProps | null = null;

    render(
      <CampaignSessionPlanner
        campaignId={TEST_CAMPAIGN_ID}
        repository={repository}
        hostAdapter={createFakeHostAdapter()}
        renderNav={(props) => {
          capturedProps = props;
          return (
            <div>
              {props.kinds.map((kind) => (
                <button key={kind} onClick={() => props.onSelectKind(kind)}>
                  {props.labels[kind]}
                </button>
              ))}
              <button onClick={props.onOpenTemplateSettings}>Open Settings</button>
            </div>
          );
        }}
      />
    );

    await waitFor(() => expect(capturedProps).not.toBeNull());
    expect(capturedProps!.activeKind).toBe('note');
    expect(capturedProps!.kinds).toContain('thread');
    expect(capturedProps!.labels.thread).toBe('Threads');

    await user.click(screen.getByRole('button', { name: 'Threads' }));
    await waitFor(() => expect(screen.getByPlaceholderText('Search threads…')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Open Settings' }));
    await waitFor(() => expect(screen.getByText('Starter Templates')).toBeInTheDocument());
  });
});
