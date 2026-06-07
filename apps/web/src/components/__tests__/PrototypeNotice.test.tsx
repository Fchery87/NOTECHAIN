import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PrototypeNotice } from '../PrototypeNotice';

describe('PrototypeNotice', () => {
  it('renders visible launch posture copy for prototype surfaces', () => {
    render(
      <PrototypeNotice title="Prototype surface">
        This area is available for preview while trust gates are still being hardened.
      </PrototypeNotice>
    );

    expect(screen.getByText('Prototype surface')).toBeInTheDocument();
    expect(screen.getByText(/trust gates/i)).toBeInTheDocument();
  });
});
