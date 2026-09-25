import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import FormulaConfigurationListPage from './index';

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

vi.mock('@/components/waste/Formula/FormulaConfigurationListTable', () => ({
  default: () => <div data-testid="formula-configuration-list-table" />,
}));

import { navigateInTree } from '@/routes/inTreePaths';

describe('FormulaConfigurationListPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(navigateInTree).mockClear();
  });

  it('renders the page heading', () => {
    render(<FormulaConfigurationListPage />);
    screen.getByRole('heading', { name: 'Formula Configuration' });
  });

  it('renders the subtitle', () => {
    render(<FormulaConfigurationListPage />);
    screen.getByText(
      'Manage formula sets with date-effective lifecycle for district average calculations',
    );
  });

  it('renders the breadcrumb back to Configuration', () => {
    render(<FormulaConfigurationListPage />);
    screen.getByText('Configuration');
  });

  it('renders the create formula set button', () => {
    render(<FormulaConfigurationListPage />);
    screen.getByRole('button', { name: /Create formula set/i });
  });

  it('renders the FormulaConfigurationListTable component', () => {
    render(<FormulaConfigurationListPage />);
    screen.getByTestId('formula-configuration-list-table');
  });

  it('calls navigateInTree with the create path when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<FormulaConfigurationListPage />);

    await user.click(screen.getByRole('button', { name: /Create formula set/i }));

    expect(navigateInTree).toHaveBeenCalledOnce();
    expect(navigateInTree).toHaveBeenCalledWith(mockNavigate, '/configuration/formulas/new');
  });

  it('wraps the page content in the formula-set-list-column header class', () => {
    const { container } = render(<FormulaConfigurationListPage />);

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector('.formula-set-list-column__header')).toBeTruthy();
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector('.configuration-column__header')).toBeNull();
  });
});
