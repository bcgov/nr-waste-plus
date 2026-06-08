import { screen } from '@testing-library/react';
import { describe, it, vi, beforeEach } from 'vitest';

import { LayoutHeaderPanel } from './index';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

vi.mock('@/context/layout/useLayout', () => ({
  useLayout: () => ({
    isHeaderPanelOpen: true,
    closeHeaderPanel: vi.fn(),
  }),
}));

vi.mock('@/components/core/DistrictSelection/DistrictListing', () => ({
  default: () => <div data-testid="district-listing">District Listing</div>,
}));

vi.mock('@/components/core/DistrictSelection/ClientListing', () => ({
  default: () => <div data-testid="client-listing">Client Listing</div>,
}));

const renderWithProviders = () => renderWithAppAsync(<LayoutHeaderPanel />);

describe('LayoutHeaderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', async () => {
    await renderWithProviders();
    screen.getByTestId('header-panel');
  });
});
