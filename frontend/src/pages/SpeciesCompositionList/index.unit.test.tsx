import { render, screen } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import SpeciesCompositionListPage from './index';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/context/pageTitle/usePageTitle', () => ({
  usePageTitle: () => ({
    setPageTitle: vi.fn(),
  }),
}));

describe('SpeciesCompositionListPage', () => {
  it('renders the page title', () => {
    render(<SpeciesCompositionListPage />);
    screen.getByRole('heading', { name: 'District level species composition' });
  });

  it('renders the subtitle', () => {
    render(<SpeciesCompositionListPage />);
    screen.getByText(
      'View tables used to calculate volumes when district average waste assessment is used',
    );
  });
});
