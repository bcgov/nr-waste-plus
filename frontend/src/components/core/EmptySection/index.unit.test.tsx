import { ErrorFilled } from '@carbon/icons-react';
import { Airplane } from '@carbon/pictograms-react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import EmptySection from './index';

describe('EmptySection Component', () => {
  it('should render the empty section with icon', () => {
    render(<EmptySection icon={ErrorFilled} title="Test Title" description="Test Description" />);
    screen.getByText('Test Title');
    screen.getByText('Test Description');
    screen.getByTestId('empty-section-icon');
  });

  it('should render the empty section with pictogram', () => {
    render(
      <EmptySection
        pictogram={Airplane}
        title="Airplane Title"
        description="Airplane Description"
      />,
    );
    screen.getByText('Airplane Title');
    screen.getByText('Airplane Description');
    screen.getByTestId('empty-section-icon');
  });

  it('should render the empty section with description as ReactNode', () => {
    const description = <span>Test Description</span>;
    render(<EmptySection icon={ErrorFilled} title="Test Title" description={description} />);
    screen.getByText('Test Title');
    screen.getByText('Test Description');
  });
});
