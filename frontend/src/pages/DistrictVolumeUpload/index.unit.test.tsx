import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DistrictVolumeUploadPage from './index';

import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

vi.mock('@/env', () => ({
  env: {
    VITE_APP_NAME: 'test',
    VITE_BACKEND_URL: 'http://localhost:8080',
    VITE_BCEID_HELP: 'help',
    VITE_CLIENT_BASE_URL: 'http://localhost',
    VITE_FAM_DOMAIN: 'fam',
    VITE_IDIR_HELP: 'help',
    VITE_LEGACY_BASE_URL: 'http://localhost',
    VITE_NODE_ENV: 'test',
    VITE_USER_POOLS_ID: 'pool',
    VITE_USER_POOLS_WEB_CLIENT_ID: 'client',
    VITE_ZONE: 'zone',
    VITE_FRONTEND_URL: 'http://localhost',
  },
  featureFlags: {},
}));

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PageTitleProvider>
        <DistrictVolumeUploadPage />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

describe('DistrictVolumeUploadPage', () => {
  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Upload District Average Waste Volume Table')).toBeTruthy();
  });

  it('renders both radio buttons', () => {
    renderPage();
    expect(screen.getByLabelText('Interior')).toBeTruthy();
    expect(screen.getByLabelText('Coast')).toBeTruthy();
  });

  it('renders the file upload drop zone', () => {
    renderPage();
    expect(screen.getAllByText(/Drag and drop files/).length).toBeGreaterThan(0);
  });

  it('defaults to Interior selected', () => {
    renderPage();
    const interior = screen.getByLabelText('Interior') as HTMLInputElement;
    expect(interior.checked).toBe(true);
  });

  it('toggles to Coast when Coast radio is clicked', async () => {
    renderPage();
    const user = userEvent.setup();
    const coast = screen.getByLabelText('Coast') as HTMLInputElement;
    await user.click(coast);
    expect(coast.checked).toBe(true);
    const interior = screen.getByLabelText('Interior') as HTMLInputElement;
    expect(interior.checked).toBe(false);
  });

  it('toggles back to Interior after clicking Interior again', async () => {
    renderPage();
    const user = userEvent.setup();
    const coast = screen.getByLabelText('Coast') as HTMLInputElement;
    await user.click(coast);
    const interior = screen.getByLabelText('Interior') as HTMLInputElement;
    await user.click(interior);
    expect(interior.checked).toBe(true);
    expect(coast.checked).toBe(false);
  });
});
