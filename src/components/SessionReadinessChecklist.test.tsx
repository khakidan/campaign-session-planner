import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionReadinessChecklist } from './SessionReadinessChecklist';

describe('SessionReadinessChecklist', () => {
  it('renders a checkmark for met checks and a warning for unmet ones', () => {
    render(
      <SessionReadinessChecklist
        checks={[
          { label: 'Session has at least one Scene', met: true },
          { label: 'At least one active Thread or Quest is linked', met: false },
        ]}
      />
    );

    const metItem = screen.getByText('Session has at least one Scene').closest('li');
    const unmetItem = screen.getByText('At least one active Thread or Quest is linked').closest('li');
    expect(metItem).toHaveTextContent('✓');
    expect(unmetItem).toHaveTextContent('⚠');
  });
});
