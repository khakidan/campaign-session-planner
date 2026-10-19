import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionEditor } from './SessionEditor';
import {
  createFakeHostAdapter,
  createFakeRepository,
  makeEntityLink,
  makeNote,
  makeScene,
  makeSession,
  TEST_CAMPAIGN_ID,
} from '../test/fixtures';
import { MOCK_TYPED_CONTENT } from '../test/mocks/blockNote';

vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());
vi.mock('./ReadOnlyBlockNoteView', async () => (await import('../test/mocks/blockNote')).mockReadOnlyBlockNoteView());

function baseProps() {
  return {
    repository: createFakeRepository(),
    campaignId: TEST_CAMPAIGN_ID,
    hostAdapter: createFakeHostAdapter(),
    plannerItems: [],
    onCancel: vi.fn(),
    onOpenPlannerEntity: vi.fn(),
  };
}

describe('SessionEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SessionEditor session={null} onSave={onSave} {...baseProps()} />);

    await user.type(screen.getByLabelText('Title'), 'The Sunken Temple');
    await user.type(screen.getByLabelText('Session Number'), '4');
    await user.type(screen.getByLabelText('Status'), 'Draft');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Session' }));

    expect(onSave).toHaveBeenCalledWith(
      {
        title: 'The Sunken Temple',
        sessionNumber: '4',
        date: '',
        status: 'Draft',
        details: MOCK_TYPED_CONTENT,
        debrief: [],
      },
      null
    );
  });

  it('rejects saving with an empty title', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SessionEditor session={null} onSave={onSave} {...baseProps()} />);

    await user.click(screen.getByRole('button', { name: 'Save Session' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('shows the Debrief field only once Status is "Completed"', async () => {
    const user = userEvent.setup();
    render(<SessionEditor session={null} onSave={vi.fn()} {...baseProps()} />);

    expect(screen.queryByText('Debrief')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Status'), 'Completed');

    expect(screen.getByText('Debrief')).toBeInTheDocument();
  });

  it('"Mark Completed" sets Status in one click and reveals the Debrief field, same as typing it', async () => {
    const user = userEvent.setup();
    render(<SessionEditor session={null} onSave={vi.fn()} {...baseProps()} />);

    expect(screen.getByText('Set to "Completed" to unlock this Session\'s Debrief below.')).toBeInTheDocument();
    expect(screen.queryByText('Debrief')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark Completed' }));

    expect(screen.getByLabelText('Status')).toHaveValue('Completed');
    expect(screen.getByText('Debrief')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark Completed' })).not.toBeInTheDocument();
    expect(screen.queryByText('Set to "Completed" to unlock this Session\'s Debrief below.')).not.toBeInTheDocument();
  });

  it('disables "+ Add Scene" until the Session itself has been saved', () => {
    render(<SessionEditor session={null} onSave={vi.fn()} {...baseProps()} />);

    expect(screen.getByRole('button', { name: '+ Add Scene' })).toBeDisabled();
    expect(screen.getByText('Save this Session before adding Scenes.')).toBeInTheDocument();
  });

  it('adding a Scene: saves it under the current Session, and stays in the editor (not the list) rather than closing it', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 'session-1' });
    const props = baseProps();

    render(<SessionEditor session={session} onSave={vi.fn()} {...props} />);

    await user.click(screen.getByRole('button', { name: '+ Add Scene' }));
    // Before the first save, this Scene has no id yet — linking isn't
    // possible, the exact bug being fixed: it shouldn't *also* throw
    // the GM back out to the list the moment that first save happens.
    expect(screen.queryByRole('button', { name: '+ Add Link' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Arrival at the Temple');
    await user.click(screen.getByRole('button', { name: 'Save Scene' }));

    // Still on the Scene editor — not back on the Scenes list — now
    // showing the real, saved Scene: Delete is available, and so is
    // linking, which only ever turns on once a `scene` with a real id
    // exists.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Scene' })).toBeInTheDocument());
    expect(screen.getByLabelText('Title')).toHaveValue('Arrival at the Temple');
    expect(screen.getByRole('button', { name: '+ Add Link' })).toBeInTheDocument();

    const savedScenes = await props.repository.getScenes('session-1');
    expect(savedScenes).toMatchObject([{ title: 'Arrival at the Temple', sessionId: 'session-1', order: 0 }]);
  });

  it('a new Scene autosaves in the background — the data survives even if Save is never clicked', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 'session-1' });
    const props = baseProps();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<SessionEditor session={session} onSave={vi.fn()} {...props} />);

    await user.click(screen.getByRole('button', { name: '+ Add Scene' }));
    await user.type(screen.getByLabelText('Title'), 'Arrival at the Temple');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(screen.getByText('Saved')).toBeInTheDocument();
    const savedScenes = await props.repository.getScenes('session-1');
    expect(savedScenes).toMatchObject([{ title: 'Arrival at the Temple', sessionId: 'session-1', order: 0 }]);
    vi.useRealTimers();
  });

  it('never autosaves a blank new Scene — stays disabled until Title is non-empty', async () => {
    const session = makeSession({ id: 'session-1' });
    const user = userEvent.setup();
    const props = baseProps();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<SessionEditor session={session} onSave={vi.fn()} {...props} />);

    await user.click(screen.getByRole('button', { name: '+ Add Scene' }));
    await user.type(screen.getByLabelText('Scene Number'), '1');
    await vi.advanceTimersByTimeAsync(5000);

    const savedScenes = await props.repository.getScenes('session-1');
    expect(savedScenes).toEqual([]);
    vi.useRealTimers();
  });

  it('when a background autosave creates the Scene before the explicit Save click, that click updates it rather than creating a duplicate, and still reveals linking for the first time', async () => {
    const session = makeSession({ id: 'session-1' });
    const user = userEvent.setup();
    const props = baseProps();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<SessionEditor session={session} onSave={vi.fn()} {...props} />);

    await user.click(screen.getByRole('button', { name: '+ Add Scene' }));
    await user.type(screen.getByLabelText('Title'), 'Arrival at the Temple');
    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.queryByRole('button', { name: '+ Add Link' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), 'Running');
    await user.click(screen.getByRole('button', { name: 'Save Scene' }));

    expect(screen.getByRole('button', { name: '+ Add Link' })).toBeInTheDocument();
    const savedScenes = await props.repository.getScenes('session-1');
    expect(savedScenes).toHaveLength(1);
    expect(savedScenes[0]).toMatchObject({ title: 'Arrival at the Temple', status: 'Running' });
    vi.useRealTimers();
  });

  it('reordering Scenes: "move down" swaps this Scene\'s order with its neighbor, not just their positions on screen', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 'session-1' });
    const sceneA = makeScene({ id: 'scene-a', sessionId: 'session-1', title: 'Scene A', order: 0 });
    const sceneB = makeScene({ id: 'scene-b', sessionId: 'session-1', title: 'Scene B', order: 1 });
    const repository = createFakeRepository({ scenes: [sceneA, sceneB] });

    render(<SessionEditor session={session} onSave={vi.fn()} {...baseProps()} repository={repository} />);

    await waitFor(() => expect(screen.getByText('Scene A')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Move Scene A down' }));

    await waitFor(async () => {
      const updatedA = await repository.getScene('scene-a');
      const updatedB = await repository.getScene('scene-b');
      expect(updatedA?.order).toBe(1);
      expect(updatedB?.order).toBe(0);
    });
  });

  it('shows the "Previously Established" briefing while creating a new Session', () => {
    render(<SessionEditor session={null} onSave={vi.fn()} {...baseProps()} />);

    expect(screen.getByText('Previously Established')).toBeInTheDocument();
  });

  it('keeps showing the briefing for a Draft/Prepared Session, but hides it once Completed', () => {
    const completed = makeSession({ id: 'session-1', status: 'Completed' });
    render(<SessionEditor session={completed} onSave={vi.fn()} {...baseProps()} />);

    expect(screen.queryByText('Previously Established')).not.toBeInTheDocument();
  });

  it('shows Session Readiness alongside the briefing, and hides it once Completed', () => {
    const { rerender } = render(<SessionEditor session={null} onSave={vi.fn()} {...baseProps()} />);
    expect(screen.getByText('Session Readiness')).toBeInTheDocument();

    const completed = makeSession({ id: 'session-1', status: 'Completed' });
    rerender(<SessionEditor session={completed} onSave={vi.fn()} {...baseProps()} />);
    expect(screen.queryByText('Session Readiness')).not.toBeInTheDocument();
  });

  it('shows "What Changed Since Last Session" only for a brand-new Session created after a prior dated one exists', async () => {
    const props = baseProps();
    const priorSession = makeSession({ id: 'session-1', date: '2024-01-01T00:00:00.000Z' });
    props.repository = createFakeRepository({ sessions: [priorSession] });

    render(<SessionEditor session={null} onSave={vi.fn()} {...props} />);

    await waitFor(() => expect(screen.getByText('What Changed Since Last Session')).toBeInTheDocument());
  });

  it('hides "What Changed Since Last Session" when no prior Session has a date, or when editing an existing Session', async () => {
    const props = baseProps();
    const undatedPrior = makeSession({ id: 'session-1', date: null });
    props.repository = createFakeRepository({ sessions: [undatedPrior] });

    render(<SessionEditor session={null} onSave={vi.fn()} {...props} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Session' })).toBeInTheDocument());
    expect(screen.queryByText('What Changed Since Last Session')).not.toBeInTheDocument();

    const existing = makeSession({ id: 'session-2' });
    render(<SessionEditor session={existing} onSave={vi.fn()} {...baseProps()} />);
    expect(screen.queryByText('What Changed Since Last Session')).not.toBeInTheDocument();
  });

  it('renderFields: replaces the Session\'s own default field block, and defaultFields lets a host wrap instead of replace', () => {
    render(
      <SessionEditor
        session={null}
        onSave={vi.fn()}
        {...baseProps()}
        renderFields={({ defaultFields }) => (
          <div data-testid="wrapper">
            {defaultFields}
            <input aria-label="Extra Field" />
          </div>
        )}
      />
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Extra Field')).toBeInTheDocument();
  });

  it('renderSceneFields: forwarded into the nested SceneEditor for adding/editing a Scene', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 'session-1' });

    render(
      <SessionEditor
        session={session}
        onSave={vi.fn()}
        {...baseProps()}
        renderSceneFields={({ defaultFields }) => (
          <div data-testid="scene-wrapper">
            {defaultFields}
            <input aria-label="Extra Scene Field" />
          </div>
        )}
      />
    );

    await user.click(screen.getByRole('button', { name: '+ Add Scene' }));

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Extra Scene Field')).toBeInTheDocument();
  });

  describe('"Last Session" recap', () => {
    it('surfaces the most recent prior Session\'s Debrief and linked Recap Highlights when creating a new Session', async () => {
      const priorSession = makeSession({
        id: 'session-1',
        title: 'The Sunken Temple',
        date: '2024-01-01T00:00:00.000Z',
        status: 'Completed',
        debrief: [{ type: 'paragraph', content: [{ type: 'text', text: 'The vault collapsed.', styles: {} }] }] as never,
      });
      const highlight = makeNote({ id: 'note-1', title: 'The vault collapsed', type: 'Recap Highlight' });
      const repository = createFakeRepository({
        sessions: [priorSession],
        notes: [highlight],
        links: [makeEntityLink({ id: 'link-1', sourceType: 'session', sourceId: 'session-1', targetType: 'note', targetId: 'note-1' })],
      });

      render(<SessionEditor session={null} onSave={vi.fn()} {...baseProps()} repository={repository} />);

      await waitFor(() => expect(screen.getByText('The vault collapsed.')).toBeInTheDocument());
      // The Debrief (synchronous, read straight off `mostRecentPriorSession`)
      // and the Recap Highlights (async — resolved via its own
      // `useEntityLinks` fetch) can land a tick apart; wait for each.
      await waitFor(() => expect(screen.getByText('The vault collapsed', { selector: 'button' })).toBeInTheDocument());
      expect(screen.getByText('Last Session')).toBeInTheDocument();
      expect(screen.getByText('Recap Highlights')).toBeInTheDocument();
    });

    it('never treats the Session currently being edited as its own "most recent prior Session"', async () => {
      // Regression: without excluding `session` itself, this Draft
      // Session (dated after the real prior one) would otherwise sort
      // to the top of `allSessions` and recap itself.
      const actualPrior = makeSession({
        id: 'session-1',
        date: '2024-01-01T00:00:00.000Z',
        status: 'Completed',
        debrief: [{ type: 'paragraph', content: [{ type: 'text', text: 'The real prior recap.', styles: {} }] }] as never,
      });
      const beingEdited = makeSession({
        id: 'session-2',
        date: '2024-06-01T00:00:00.000Z',
        status: 'Draft',
        debrief: [{ type: 'paragraph', content: [{ type: 'text', text: 'Should never show as its own recap.', styles: {} }] }] as never,
      });
      const repository = createFakeRepository({ sessions: [actualPrior, beingEdited] });

      render(<SessionEditor session={beingEdited} onSave={vi.fn()} {...baseProps()} repository={repository} />);

      await waitFor(() => expect(screen.getByText('The real prior recap.')).toBeInTheDocument());
      expect(screen.getByText('Last Session')).toBeInTheDocument();
      expect(screen.queryByText('Should never show as its own recap.')).not.toBeInTheDocument();
    });
  });
});
