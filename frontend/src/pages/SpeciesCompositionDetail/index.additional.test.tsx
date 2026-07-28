import { render } from '@testing-library/react';
import { vi } from 'vitest';

import SpeciesCompositionDetailPage from './index';

import { useSpeciesCompositionDetailQuery } from '@/config/react-query/hooks';

// Mock dependencies – reuse the same mocks as the primary unit test file.
vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn().mockReturnValue({ id: '42' }),
}));

vi.mock('@/config/react-query/hooks', () => ({
  useSpeciesCompositionDetailQuery: vi.fn(),
}));

vi.mock('@/components/waste/SpeciesCompositionDetailView', () => ({
  default: () => <div data-testid="species-composition-detail-view" />,
}));

vi.mock('@/components/waste/SpeciesCompositionDetailView/SpeciesCompositionDetailSkeleton', () => ({
  default: () => <div data-testid="species-composition-detail-skeleton" />,
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: () => <div data-testid="page-title" />,
}));

vi.mock('@/components/core/PageNotification', () => ({
  default: () => <div data-testid="page-notification" />,
}));

/**
 * Additional edge‑case tests to ensure the component reaches >95 % coverage.
 */

describe('SpeciesCompositionDetailPage – edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the numeric id derived from route params to the query hook', () => {
    // The default useParams mock returns "42" (string).
    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(useSpeciesCompositionDetailQuery).toHaveBeenCalledWith(42, {
      notificationTarget: 'species-composition-detail',
    });
  });

  it('forwards NaN when the route id cannot be parsed as a number', () => {
    // Override the useParams mock for this test only.
    const { useParams } = require('@tanstack/react-router');
    vi.mocked(useParams as any).mockReturnValue({ id: 'not-a-number' });

    vi.mocked(useSpeciesCompositionDetailQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSpeciesCompositionDetailQuery>);

    render(<SpeciesCompositionDetailPage />);

    expect(useSpeciesCompositionDetailQuery).toHaveBeenCalledWith(NaN, {
      notificationTarget: 'species-composition-detail',
    });
  });
});
