import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ConfigurationDistrictVolumeListPage from './index';

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

vi.mock('@/components/waste/DistrictAverage/DistrictVolumeListTable', () => ({
  default: () => <div data-testid="district-volume-list-table" />,
}));

describe('ConfigurationDistrictVolumeListPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the page heading', () => {
    render(<ConfigurationDistrictVolumeListPage />);
    screen.getByRole('heading', { name: 'District average waste volumes' });
  });

  it('renders the subtitle', () => {
    render(<ConfigurationDistrictVolumeListPage />);
    screen.getByText(
      'View tables used to calculate volumes when district average waste assessment is used',
    );
  });

  it('renders the breadcrumb back to Configuration', () => {
    render(<ConfigurationDistrictVolumeListPage />);
    screen.getByText('Configuration');
  });

  it('renders the upload button', () => {
    render(<ConfigurationDistrictVolumeListPage />);
    screen.getByRole('button', { name: /Upload new volumes table/i });
  });

  it('renders the DistrictVolumeListTable component', () => {
    render(<ConfigurationDistrictVolumeListPage />);
    screen.getByTestId('district-volume-list-table');
  });

  it('navigates to the upload page when the upload button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigurationDistrictVolumeListPage />);

    await user.click(screen.getByRole('button', { name: /Upload new volumes table/i }));

    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/configuration/district-volume-tables/upload',
    });
  });
});
