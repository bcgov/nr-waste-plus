import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SpeciesCompositionDetailHeader from './SpeciesCompositionDetailHeader.tsx';

describe('SpeciesCompositionDetailHeader', () => {
  const defaultProps = {
    startDate: '2026-06-01',
    endDate: null,
    uploadedBy: 'jsmith@gov.bc.ca',
    dateOfUpload: '2026-05-15T14:23:00Z',
  } satisfies {
    startDate: string;
    endDate: string | null;
    uploadedBy: string;
    dateOfUpload: string;
  };

  it('renders all four metadata fields', () => {
    render(<SpeciesCompositionDetailHeader {...defaultProps} />);

    expect(screen.getByTestId('card-item-content-start-date').textContent).toBe('June 01, 2026');
    expect(screen.getByTestId('card-item-content-end-date').textContent).toBe('Open-ended');
    expect(screen.getByTestId('card-item-content-uploaded-by').textContent).toBe(
      'jsmith@gov.bc.ca',
    );
    expect(screen.getByTestId('card-item-content-date-of-upload').textContent).toContain('2026');
  });

  it('renders the end date as a formatted date when present', () => {
    render(<SpeciesCompositionDetailHeader {...defaultProps} endDate="2026-12-31" />);

    expect(screen.getByTestId('card-item-content-end-date').textContent).toContain(
      'December 31, 2026',
    );
  });
});
