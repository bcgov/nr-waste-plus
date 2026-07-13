import { render, screen } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import SpeciesCompositionDetailPage from './index';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: '1' }),
  };
});

vi.mock('@/context/pageTitle/usePageTitle', () => ({
  usePageTitle: () => ({
    setPageTitle: vi.fn(),
  }),
}));

describe('SpeciesCompositionDetailPage', () => {
  it('renders the page title with the id', () => {
    render(<SpeciesCompositionDetailPage />);
    screen.getByRole('heading', { name: 'Species composition: 1' });
  });

  it('renders the subtitle', () => {
    render(<SpeciesCompositionDetailPage />);
    screen.getByText('View species composition table details');
  });
});
