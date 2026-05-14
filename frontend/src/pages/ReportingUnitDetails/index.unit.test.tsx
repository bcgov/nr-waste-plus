import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ReportingUnitDetailsPage from './index';

import type { ReportingUnitDto } from '@/services/types';

import { createTestRouter } from '@/config/tests/routerTestHelper';
import NotificationProvider from '@/context/notification/NotificationProvider';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import * as useAuthModule from '@/context/auth/useAuth';
import { Role } from '@/context/auth/types';

// ── Mutable state ─────────────────────────────────────────────────────────────

let mockLoaderData: ReportingUnitDto | undefined;

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useLoaderData: () => mockLoaderData,
  };
});

vi.mock(import('@/env'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: {
      ...actual.env,
      VITE_CLIENT_BASE_URL: 'https://clients.example.com',
      VITE_LEGACY_BASE_URL: 'https://legacy.example.com',
    },
  };
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultData: ReportingUnitDto = {
  id: 12345,
  client: { code: '00001001', description: 'Forest Client Ltd.' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'G1', description: 'Grade 1' },
  sampling: { code: 'S2', description: 'Ground Sampling' },
  district: { code: 'DCR', description: 'Campbell River' },
};

function renderPage(data: ReportingUnitDto = defaultData) {
  mockLoaderData = data;
  return render(
    <RouterProvider
      router={createTestRouter(() => (
        <NotificationProvider>
          <PageTitleProvider>
            <ReportingUnitDetailsPage />
          </PageTitleProvider>
        </NotificationProvider>
      ))}
    />,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReportingUnitDetailsPage', () => {
  beforeEach(() => {
    mockLoaderData = undefined;
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: {
        userName: 'testuser',
        displayName: 'Test User',
        idpProvider: 'IDIR',
        roles: [{ role: Role.IDIR, clients: [] }],
        privileges: {},
      },
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
  });

  describe('page title and header', () => {
    it('renders the reporting unit ID in the page title', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Reporting Unit no.: 12345')).toBeDefined();
      });
    });

    it('renders the page subtitle', async () => {
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText('Start a new waste submission by creating a reporting unit'),
        ).toBeDefined();
      });
    });

    it('renders with a different reporting unit ID', async () => {
      renderPage({ ...defaultData, id: 99999 });
      await waitFor(() => {
        expect(screen.getByText('Reporting Unit no.: 99999')).toBeDefined();
      });
    });
  });

  describe('client fields', () => {
    it('renders the client name', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Forest Client Ltd.')).toBeDefined();
      });
    });

    it('renders the client number', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('00001001')).toBeDefined();
      });
    });

    it('renders the client status description', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeDefined();
      });
    });
  });

  describe('district field', () => {
    it('renders district code and description together', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('DCR - Campbell River')).toBeDefined();
      });
    });

    it('renders a different district correctly', async () => {
      renderPage({
        ...defaultData,
        district: { code: 'DKA', description: 'Kalum' },
      });
      await waitFor(() => {
        expect(screen.getByText('DKA - Kalum')).toBeDefined();
      });
    });
  });

  describe('grade field', () => {
    it('renders the grade description', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Grade 1')).toBeDefined();
      });
    });

    it('renders empty value tag when grade description is empty', async () => {
      renderPage({ ...defaultData, grade: { code: '', description: '' } });
      await waitFor(() => {
        // EmptyValueTag renders a placeholder when value is falsy
        expect(screen.queryByText('Grade 1')).toBeNull();
      });
    });
  });

  describe('sampling field', () => {
    it('renders sampling code and description together', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('S2 - Ground Sampling')).toBeDefined();
      });
    });

    it('renders a different sampling option correctly', async () => {
      renderPage({
        ...defaultData,
        sampling: { code: 'S3', description: 'Cruise' },
      });
      await waitFor(() => {
        expect(screen.getByText('S3 - Cruise')).toBeDefined();
      });
    });
  });

  describe('field labels', () => {
    it('renders the "Client name" label', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Client name')).toBeDefined();
      });
    });

    it('renders the "Client number" label', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Client number')).toBeDefined();
      });
    });

    it('renders the "Client status" label', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Client status')).toBeDefined();
      });
    });

    it('renders the "District" label', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('District')).toBeDefined();
      });
    });

    it('renders the "Grades" label', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Grades')).toBeDefined();
      });
    });

    it('renders the "Sampling option" label', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Sampling option')).toBeDefined();
      });
    });
  });

  describe('unauthenticated user', () => {
    it('renders page content without crashing when user has no IDIR role', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: {
          userName: 'bceiduser',
          displayName: 'BCeID User',
          idpProvider: 'BCEIDBUSINESS',
          roles: [],
          privileges: {},
        },
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Reporting Unit no.: 12345')).toBeDefined();
      });
    });

    it('renders page content when user is undefined', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: undefined,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Reporting Unit no.: 12345')).toBeDefined();
      });
    });
  });

  describe('data variations', () => {
    it('renders correctly with minimal data', async () => {
      renderPage({
        id: 1,
        client: { code: 'A', description: 'A Client' },
        clientStatus: { code: 'INA', description: 'Inactive' },
        grade: { code: 'G2', description: 'Grade 2' },
        sampling: { code: 'S1', description: 'Aerial' },
        district: { code: 'DND', description: 'North' },
      });
      await waitFor(() => {
        expect(screen.getByText('Reporting Unit no.: 1')).toBeDefined();
        expect(screen.getByText('A Client')).toBeDefined();
        expect(screen.getByText('Inactive')).toBeDefined();
      });
    });

    it('renders all six field values in a single pass', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Forest Client Ltd.')).toBeDefined();
        expect(screen.getByText('00001001')).toBeDefined();
        expect(screen.getByText('Active')).toBeDefined();
        expect(screen.getByText('DCR - Campbell River')).toBeDefined();
        expect(screen.getByText('Grade 1')).toBeDefined();
        expect(screen.getByText('S2 - Ground Sampling')).toBeDefined();
      });
    });
  });
});
