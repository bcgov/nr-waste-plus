import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ConfigurationPage from './index';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

vi.mock('@/context/pageTitle/usePageTitle', () => ({
  usePageTitle: () => ({
    setPageTitle: vi.fn(),
  }),
}));

import { navigateInTree } from '@/routes/inTreePaths';

describe('ConfigurationPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(navigateInTree).mockClear();
  });

  it('renders the page heading', () => {
    render(<ConfigurationPage />);
    screen.getByRole('heading', { name: 'Configuration' });
  });

  it('renders the subtitle', () => {
    render(<ConfigurationPage />);
    screen.getByText('Check and manage configuration data');
  });

  it('renders the district volume card title', () => {
    render(<ConfigurationPage />);
    screen.getByText('District average waste volumes');
  });

  it('renders the card description', () => {
    render(<ConfigurationPage />);
    screen.getByText(
      'Tables used to calculate volumes when district averages are used for waste assessment',
    );
  });

  it('renders the card action button', () => {
    render(<ConfigurationPage />);
    screen.getByRole('button', { name: 'View or update tables →' });
  });

  it('calls navigateInTree with correct path when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await user.click(screen.getByRole('button', { name: 'View or update tables →' }));

    expect(navigateInTree).toHaveBeenCalledOnce();
    expect(navigateInTree).toHaveBeenCalledWith(
      mockNavigate,
      '/configuration/district-volume-tables',
    );
  });
});
