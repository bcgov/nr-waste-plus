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

  it('renders the section heading "District average criteria"', () => {
    render(<ConfigurationPage />);
    screen.getByText('District average criteria');
  });

  it('renders the district volume card title', () => {
    render(<ConfigurationPage />);
    screen.getByText('District average waste volumes');
  });

  it('renders the card description', () => {
    render(<ConfigurationPage />);
    screen.getByText(
      'Volume tables used to calculate volumes when district averages are used for waste assessment',
    );
  });

  it('renders the card action link for district waste volumes', () => {
    render(<ConfigurationPage />);
    const links = screen.getAllByText('View or update tables');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('calls navigateInTree with correct path when first card link is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const links = screen.getAllByText('View or update tables');
    await user.click(links[0]);

    expect(navigateInTree).toHaveBeenCalledOnce();
    expect(navigateInTree).toHaveBeenCalledWith(
      mockNavigate,
      '/configuration/district-volume-tables',
    );
  });

  it('renders the species composition card title', () => {
    render(<ConfigurationPage />);
    screen.getByText('District level species composition');
  });

  it('renders the species composition card description', () => {
    render(<ConfigurationPage />);
    screen.getByText(
      'Species composition table used to calculate volumes when HBS mark monthly billing report is not available',
    );
  });

  it('species composition card link calls navigateInTree when clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const links = screen.getAllByText('View or update tables');
    // links[1] is the species composition card (second card)
    await user.click(links[1]);

    expect(navigateInTree).toHaveBeenCalledOnce();
    expect(navigateInTree).toHaveBeenCalledWith(mockNavigate, '/configuration/species-composition');
  });
});
