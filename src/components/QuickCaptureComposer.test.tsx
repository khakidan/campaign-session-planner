import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickCaptureComposer } from './QuickCaptureComposer';
import { createFakeRepository, TEST_CAMPAIGN_ID } from '../test/fixtures';

describe('QuickCaptureComposer', () => {
  it('creates a Note of the selected type from the typed text, and clears the field', async () => {
    const user = userEvent.setup();
    const repository = createFakeRepository();

    render(<QuickCaptureComposer repository={repository} campaignId={TEST_CAMPAIGN_ID} />);

    await user.selectOptions(screen.getByLabelText('Note type'), 'Player Theory');
    await user.type(screen.getByLabelText('Quick capture text'), 'The duke is secretly working with the Fey');
    await user.click(screen.getByRole('button', { name: '+ Add' }));

    await waitFor(async () => {
      const notes = await repository.getNotes(TEST_CAMPAIGN_ID);
      expect(notes).toMatchObject([{ title: 'The duke is secretly working with the Fey', type: 'Player Theory' }]);
    });

    expect(screen.getByLabelText('Quick capture text')).toHaveValue('');
    expect(screen.getByText('Captured: "The duke is secretly working with the Fey"')).toBeInTheDocument();
  });

  it('pressing Enter captures too, without needing the button', async () => {
    const user = userEvent.setup();
    const repository = createFakeRepository();

    render(<QuickCaptureComposer repository={repository} campaignId={TEST_CAMPAIGN_ID} />);

    await user.type(screen.getByLabelText('Quick capture text'), 'Who left the flowers?{Enter}');

    await waitFor(async () => {
      const notes = await repository.getNotes(TEST_CAMPAIGN_ID);
      expect(notes).toHaveLength(1);
    });
  });

  it('does not capture an empty/whitespace-only entry', async () => {
    const user = userEvent.setup();
    const repository = createFakeRepository();

    render(<QuickCaptureComposer repository={repository} campaignId={TEST_CAMPAIGN_ID} />);

    expect(screen.getByRole('button', { name: '+ Add' })).toBeDisabled();

    await user.type(screen.getByLabelText('Quick capture text'), '   ');
    expect(screen.getByRole('button', { name: '+ Add' })).toBeDisabled();
  });

  it('defaults to "Unresolved Question" as the type', () => {
    const repository = createFakeRepository();
    render(<QuickCaptureComposer repository={repository} campaignId={TEST_CAMPAIGN_ID} />);

    expect(screen.getByLabelText('Note type')).toHaveValue('Unresolved Question');
  });
});
