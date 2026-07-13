import { screen } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import SpeciesCompositionUploadPage from './index';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

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

describe('SpeciesCompositionUploadPage', () => {
  it('renders the page title', async () => {
    await renderWithAppAsync(<SpeciesCompositionUploadPage />);
    screen.getByRole('heading', { name: 'Upload new species composition table' });
  });

  it('renders the subtitle', async () => {
    await renderWithAppAsync(<SpeciesCompositionUploadPage />);
    screen.getByText('Load .xlsx file containing species composition data');
  });
});
