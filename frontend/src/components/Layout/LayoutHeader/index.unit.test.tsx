import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock, beforeAll } from 'vitest';

import { LayoutHeader } from '@/components/Layout/LayoutHeader';
import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
import APIs from '@/services/APIs';

let mockBreakpoint = 'md';
vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
      },
    },
  };
});

vi.mock('@/hooks/useBreakpoint', () => ({
  default: () => mockBreakpoint,
}));

const renderWithProviders = () =>
  renderWithAppAsync(
    <LayoutProvider>
      <LayoutHeader />
    </LayoutProvider>,
  );

describe('LayoutHeader', () => {
  beforeEach(() => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
  });

  it('shouldRenderHeaderAndTitle_whenBreakpointIsLg', async () => {
    mockBreakpoint = 'lg';

    await renderWithProviders();
    const header = await screen.findByRole('banner');
    expect(header).toBeDefined();

    const title = await screen.findByText(/Waste Plus/i);
    expect(title).toBeDefined();
  });

  describe('when VITE_NODE_ENV starts with "openshift-"', () => {
    describe('and VITE_NODE_ENV ends with "prod"', () => {
      beforeAll(async () => {
        const { env } = await import('@/env');
        env.VITE_NODE_ENV = 'openshift-prod';
      });

      it('shouldHideEnvLabel_whenNodeEnvIsOpenshiftProd', async () => {
        await renderWithProviders();

        expect(screen.queryByText(/Env/i)).toBeNull();
      });
    });

    describe('and VITE_NODE_ENV doesn\'t end with "prod"', () => {
      beforeAll(async () => {
        const { env } = await import('@/env');
        env.VITE_NODE_ENV = 'openshift-test';
      });

      it('shouldRenderEnvLabel_whenNodeEnvIsOpenshiftTest', async () => {
        await renderWithProviders();

        expect(screen.queryByText(/Env/i)).not.toBeNull();

        const envLabel = await screen.findByText('Env. Test');
        expect(envLabel).toBeDefined();
      });
    });
  });

  describe('when VITE_NODE_ENV doesn\'t start with "openshift-"', () => {
    beforeAll(async () => {
      const { env } = await import('@/env');
      env.VITE_NODE_ENV = 'bogus-test';
    });

    it('shouldRenderEnvLabelWithoutName_whenNodeEnvDoesNotStartWithOpenshift', async () => {
      await renderWithProviders();

      expect(screen.queryByText(/Env/i)).not.toBeNull();

      const envLabel = await screen.findByText('Env.');
      expect(envLabel).toBeDefined();

      expect(screen.queryByText(/Bogus/i)).toBeNull();
      expect(screen.queryByText(/Test/i)).toBeNull();
    });
  });
});
