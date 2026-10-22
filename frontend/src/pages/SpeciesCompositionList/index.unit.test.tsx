import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SpeciesCompositionListPage from './index';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/context/pageTitle/usePageTitle', () => ({
  usePageTitle: () => ({
    setPageTitle: vi.fn(),
  }),
}));

vi.mock('@/components/waste/SpeciesComposition/SpeciesCompositionListTable', () => ({
  default: () => <div data-testid="species-composition-list-table" />,
}));

describe('SpeciesCompositionListPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the page heading', () => {
    render(<SpeciesCompositionListPage />);
    screen.getByRole('heading', { name: 'District level species composition' });
  });

  it('renders the subtitle', () => {
    render(<SpeciesCompositionListPage />);
    screen.getByText(
      'View tables used to calculate volumes when district average waste assessment is used',
    );
  });

  it('renders the breadcrumb back to Configuration', () => {
    render(<SpeciesCompositionListPage />);
    screen.getByText('Configuration');
  });

  it('renders the upload button', () => {
    render(<SpeciesCompositionListPage />);
    screen.getByRole('button', { name: /Upload Spreadsheet/i });
  });

  it('renders the SpeciesCompositionListTable component', () => {
    render(<SpeciesCompositionListPage />);
    screen.getByTestId('species-composition-list-table');
  });

  it('navigates to the upload page when the upload button is clicked', async () => {
    const user = userEvent.setup();
    render(<SpeciesCompositionListPage />);

    await user.click(screen.getByRole('button', { name: /Upload Spreadsheet/i }));

    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/configuration/species-composition/upload',
    });
  });
});
