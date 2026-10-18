import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignSessionPlanner, type CampaignSessionPlannerNavProps } from './CampaignSessionPlanner';
import { createFakeHostAdapter, createFakeRepository, makeScene, makeSession, TEST_CAMPAIGN_ID } from '../test/fixtures';

vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());

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

describe('CampaignSessionPlanner field customization', () => {
  it('renderFields.note reaches NoteEditor; other kinds keep their shipped fields', async () => {
    const user = userEvent.setup();
    render(
      <CampaignSessionPlanner
        campaignId={TEST_CAMPAIGN_ID}
        repository={createFakeRepository()}
        hostAdapter={createFakeHostAdapter()}
        renderFields={{
          note: ({ defaultFields }) => (
            <>
              {defaultFields}
              <input aria-label="Extra Note Field" />
            </>
          ),
        }}
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'New Note' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'New Note' }));
    await waitFor(() => expect(screen.getByLabelText('Extra Note Field')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '← Back to Notes' }));
    await user.click(screen.getByRole('button', { name: 'NPCs' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'New NPC' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'New NPC' }));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeInTheDocument());
    expect(screen.queryByLabelText('Extra Note Field')).not.toBeInTheDocument();
  });
});

describe('CampaignSessionPlanner: saving a brand-new entry', () => {
  it('note: a direct Save click (no autosave in play) stays on the editor, not the list, so [[ / @ linking becomes available immediately', async () => {
    const user = userEvent.setup();
    render(
      <CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={createFakeRepository()} hostAdapter={createFakeHostAdapter()} />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'New Note' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'New Note' }));

    // Before the first save, this Note has no id yet — linking (the
    // `[[`/`@` picker inside the content field, and "Add Link" below)
    // isn't possible. That's the real constraint; the bug was that
    // saving — the only way to lift it — *also* threw the GM back out
    // to the list, right when they'd want to start linking.
    expect(screen.queryByRole('button', { name: '+ Add Link' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'A Secret');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));
    await user.click(screen.getByRole('button', { name: 'Save Note' }));

    // Still the Note editor, now showing the real, saved Note: Delete
    // is available, the title survived the round-trip, and — the
    // actual fix — linking is now on.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Note' })).toBeInTheDocument());
    expect(screen.getByLabelText('Title')).toHaveValue('A Secret');
    expect(screen.getByRole('button', { name: '+ Add Link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Note' })).not.toBeInTheDocument();
  });

  it('note: when a background autosave creates the record *before* the explicit Save click, that click is still the first moment this view reveals linking', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={createFakeRepository()} hostAdapter={createFakeHostAdapter()} />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'New Note' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'New Note' }));

    await user.type(screen.getByLabelText('Title'), 'A Secret');
    // Let the debounced autosave fire and create the real record in
    // the background — this view (CampaignSessionPlanner's own
    // `view.id`) never learns about it, so linking still isn't shown
    // yet even though the row genuinely exists now.
    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.queryByRole('button', { name: '+ Add Link' })).not.toBeInTheDocument();

    // The explicit Save click now updates that already-autosaved
    // record (not a second, duplicate create) — but it's still the
    // first time *this view* has ever shown linking, so it must still
    // stay open and reveal it, not close.
    await user.click(screen.getByRole('button', { name: 'Save Note' }));

    expect(screen.getByRole('button', { name: '+ Add Link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Note' })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('npc: same fix applies to every other top-level kind, not just Notes', async () => {
    const user = userEvent.setup();
    render(
      <CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={createFakeRepository()} hostAdapter={createFakeHostAdapter()} />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'NPCs' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'NPCs' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'New NPC' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'New NPC' }));

    expect(screen.queryByRole('button', { name: '+ Add Link' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'Sister Mariel');
    await user.click(screen.getByRole('button', { name: 'Save NPC' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete NPC' })).toBeInTheDocument());
    expect(screen.getByLabelText('Name')).toHaveValue('Sister Mariel');
    expect(screen.getByRole('button', { name: '+ Add Link' })).toBeInTheDocument();
  });

  it('editing an existing Note still returns to the list after save (only a record new to this view stays)', async () => {
    const user = userEvent.setup();
    const note = {
      id: 'note-1',
      campaignId: TEST_CAMPAIGN_ID,
      title: 'Existing',
      type: null,
      status: null,
      content: [],
      tags: [],
      createdAt: 'x',
      updatedAt: 'x',
    };
    const repository = createFakeRepository({ notes: [note] });
    render(<CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await waitFor(() => expect(screen.getByText('Existing')).toBeInTheDocument());
    await user.click(screen.getByText('Existing'));
    await waitFor(() => expect(screen.getByRole('button', { name: '+ Add Link' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Save Note' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'New Note' })).toBeInTheDocument());
  });
});

describe('CampaignSessionPlanner: Scenes have their own top-level tab', () => {
  it('lists every Scene across every Session, showing which Session each belongs to', async () => {
    const user = userEvent.setup();
    const sessionA = makeSession({ id: 'session-a', title: 'Session A' });
    const sessionB = makeSession({ id: 'session-b', title: 'Session B' });
    const sceneA = makeScene({ id: 'scene-a', sessionId: 'session-a', title: 'Arrival' });
    const sceneB = makeScene({ id: 'scene-b', sessionId: 'session-b', title: 'Ambush' });
    const repository = createFakeRepository({ sessions: [sessionA, sessionB], scenes: [sceneA, sceneB] });

    render(<CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Scenes' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Scenes' }));

    await waitFor(() => expect(screen.getByText('Arrival')).toBeInTheDocument());
    expect(screen.getByText('Ambush')).toBeInTheDocument();
    expect(screen.getByText('Session A')).toBeInTheDocument();
    expect(screen.getByText('Session B')).toBeInTheDocument();
  });

  it('creating a new Scene from its own tab requires picking a Session, then stays open and reveals linking like any other new record', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 'session-1', title: 'The Sunken Temple' });
    const repository = createFakeRepository({ sessions: [session] });

    render(<CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Scenes' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Scenes' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'New Scene' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'New Scene' }));

    await user.type(screen.getByLabelText('Title'), 'Arrival at the Temple');
    await user.click(screen.getByRole('button', { name: 'Save Scene' }));
    expect(screen.getByText('Session is required.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add Link' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Session'), 'session-1');
    await user.click(screen.getByRole('button', { name: 'Save Scene' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Scene' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '+ Add Link' })).toBeInTheDocument();

    const saved = await repository.getScenes('session-1');
    expect(saved).toMatchObject([{ title: 'Arrival at the Temple', sessionId: 'session-1', order: 0 }]);
  });

  it('editing an existing Scene from its own tab returns to the Scenes list after Save', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 'session-1' });
    const scene = makeScene({ id: 'scene-1', sessionId: 'session-1', title: 'Arrival' });
    const repository = createFakeRepository({ sessions: [session], scenes: [scene] });

    render(<CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Scenes' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Scenes' }));
    await waitFor(() => expect(screen.getByText('Arrival')).toBeInTheDocument());
    await user.click(screen.getByText('Arrival'));

    await waitFor(() => expect(screen.getByRole('button', { name: '+ Add Link' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Save Scene' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'New Scene' })).toBeInTheDocument());
  });

  it('a Scene added inline from within its Session shows up in the top-level Scenes tab too (one shared source of truth)', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 'session-1', title: 'The Sunken Temple' });
    const repository = createFakeRepository({ sessions: [session] });

    render(<CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={repository} hostAdapter={createFakeHostAdapter()} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sessions' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Sessions' }));
    await waitFor(() => expect(screen.getByText('The Sunken Temple')).toBeInTheDocument());
    await user.click(screen.getByText('The Sunken Temple'));

    await waitFor(() => expect(screen.getByRole('button', { name: '+ Add Scene' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '+ Add Scene' }));
    await user.type(screen.getByLabelText('Title'), 'Arrival at the Temple');
    await user.click(screen.getByRole('button', { name: 'Save Scene' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Scene' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '← Back to Scenes' }));
    await user.click(screen.getByRole('button', { name: '← Back to Sessions' }));
    await user.click(screen.getByRole('button', { name: 'Scenes' }));

    await waitFor(() => expect(screen.getByText('Arrival at the Temple')).toBeInTheDocument());
    expect(screen.getByText('The Sunken Temple')).toBeInTheDocument();
  });
});
