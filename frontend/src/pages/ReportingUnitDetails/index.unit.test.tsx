import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useReportingUnitBlocksQuery } from '@/config/react-query/hooks';
import { renderWithApp } from '@/config/tests/renderWithApp';
import { Role } from '@/context/auth/types';
import * as useAuthModule from '@/context/auth/useAuth';
import * as envModule from '@/env';

import ReportingUnitDetailsPage from './index';

import type { ReportingUnitDto } from '@/services/types';

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

vi.mock('@/config/react-query/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/react-query/hooks')>();
  return { ...actual, useReportingUnitBlocksQuery: vi.fn() };
});

vi.mock('@/components/core/Tags/LegacyDataTag', () => ({
  default: () => <span data-testid="legacy-data-tag">Legacy data</span>,
}));

vi.mock('@/components/waste/ReportingUnits/BlockCreateAction', () => ({
  default: (props: { ruId: number; blockRule?: { maxBlocks: number }; samplingCode?: string }) => (
    <div data-testid="block-create-props">
      {`${props.ruId}|${props.blockRule?.maxBlocks ?? 'none'}|${props.samplingCode ?? 'none'}`}
    </div>
  ),
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
  return renderWithApp(<ReportingUnitDetailsPage />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReportingUnitDetailsPage', () => {
  beforeEach(() => {
    mockLoaderData = undefined;
    vi.mocked(useReportingUnitBlocksQuery).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useReportingUnitBlocksQuery>);
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: {
        userName: 'testuser',
        displayName: 'Test User',
        idpProvider: 'IDIR',
        roles: [{ role: Role.IDIR, clients: [] }],
        privileges: {},
      },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
      getClients: vi.fn(),
    });
  });

  describe('page title and header', () => {
    it('renders the reporting unit ID in the page title', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Reporting Unit No. 12345');
      });
    });

    it('renders the page subtitle', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('View reporting unit details')).toBeDefined();
      });
    });

    it('renders with a different reporting unit ID', async () => {
      renderPage({ ...defaultData, id: 99999 });
      await waitFor(() => {
        screen.getByText('Reporting Unit No. 99999');
      });
    });
  });

  describe('client fields', () => {
    it('renders the client name', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Forest Client Ltd.');
      });
    });

    it('renders the client number', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('00001001');
      });
    });

    it('renders the client status description', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Active');
      });
    });
  });

  describe('district field', () => {
    it('renders district code and description together', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('DCR - Campbell River');
      });
    });

    it('renders a different district correctly', async () => {
      renderPage({
        ...defaultData,
        district: { code: 'DKA', description: 'Kalum' },
      });
      await waitFor(() => {
        screen.getByText('DKA - Kalum');
      });
    });
  });

  describe('grade field', () => {
    it('renders the grade description', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Grade 1');
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
        screen.getByText('S2 - Ground Sampling');
      });
    });

    it('renders a different sampling option correctly', async () => {
      renderPage({
        ...defaultData,
        sampling: { code: 'S3', description: 'Cruise' },
      });
      await waitFor(() => {
        screen.getByText('S3 - Cruise');
      });
    });
  });

  describe('field labels', () => {
    it('renders the "Client name" label', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Client name');
      });
    });

    it('renders the "Client number" label', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Client number');
      });
    });

    it('renders the "Client status" label', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Client status');
      });
    });

    it('renders the "District" label', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('District');
      });
    });

    it('renders the "Grades" label', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Grades');
      });
    });

    it('renders the "Sampling option" label', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Sampling option');
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
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      renderPage();
      await waitFor(() => {
        screen.getByText('Reporting Unit No. 12345');
      });
    });

    it('renders page content when user is undefined', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: undefined,
        isLoggedIn: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      renderPage();
      await waitFor(() => {
        screen.getByText('Reporting Unit No. 12345');
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
        screen.getByText('Reporting Unit No. 1');
        screen.getByText('A Client');
        screen.getByText('Inactive');
      });
    });

    it('renders all six field values in a single pass', async () => {
      renderPage();
      await waitFor(() => {
        screen.getByText('Forest Client Ltd.');
        screen.getByText('00001001');
        screen.getByText('Active');
        screen.getByText('DCR - Campbell River');
        screen.getByText('Grade 1');
        screen.getByText('S2 - Ground Sampling');
      });
    });
  });

  describe('tombstone integration', () => {
    it('passes loader data to the tombstone component', async () => {
      renderPage({
        ...defaultData,
        client: { code: '00009999', description: 'Integration Corp.' },
        district: { code: 'DTI', description: 'Test District' },
      });
      await waitFor(() => {
        screen.getByText('Integration Corp.');
        screen.getByText('DTI - Test District');
      });
    });
  });

  describe('blocks list feature flag', () => {
    const originalFlag = envModule.featureFlags['reporting-unit-block-details-enabled'];

    afterEach(() => {
      envModule.featureFlags['reporting-unit-block-details-enabled'] = originalFlag;
    });

    it('does not render the blocks list when the flag is disabled', async () => {
      envModule.featureFlags['reporting-unit-block-details-enabled'] = false;
      renderPage();
      await waitFor(() => {
        screen.getByText('Reporting Unit No. 12345');
      });
      expect(screen.queryByRole('table')).toBeNull();
    });

    it('renders the blocks list when the flag is enabled', async () => {
      envModule.featureFlags['reporting-unit-block-details-enabled'] = true;
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('No results')).toBeDefined();
      });
      expect(useReportingUnitBlocksQuery).toHaveBeenCalledWith(12345, { enabled: true });
    });

    it('keeps the blocks query disabled when loader data is missing', async () => {
      envModule.featureFlags['reporting-unit-block-details-enabled'] = true;
      mockLoaderData = undefined;

      renderWithApp(<ReportingUnitDetailsPage />);

      expect(await screen.findByText('Reporting Unit not found')).toBeTruthy();
      expect(useReportingUnitBlocksQuery).toHaveBeenCalledWith(0, { enabled: false });
    });
  });

  describe('legacy-source marker', () => {
    it.each([
      { isLegacy: false, grade: { code: '', description: '' }, showsLegacy: false },
      { isLegacy: true, grade: { code: 'IN', description: 'Interior' }, showsLegacy: true },
      { isLegacy: undefined, grade: { code: '', description: '' }, showsLegacy: true },
      { isLegacy: undefined, grade: { code: 'IN', description: 'Interior' }, showsLegacy: false },
    ])(
      'uses explicit isLegacy before the grade fallback: $isLegacy / $grade.code',
      async (testCase) => {
        renderPage({ ...defaultData, isLegacy: testCase.isLegacy, grade: testCase.grade });

        expect(await screen.findByText('Reporting Unit No. 12345')).toBeTruthy();
        expect(screen.queryByTestId('legacy-data-tag') !== null).toBe(testCase.showsLegacy);
      },
    );
  });

  it('passesSamplingCodeAndServerBlockRuleToCreationAction', async () => {
    renderPage({
      ...defaultData,
      sampling: { code: 'AVG', description: 'District Average' },
      blockRule: { maxBlocks: 1, blockType: 'DISTRICT_AVERAGE' },
    });

    await waitFor(() =>
      expect(screen.getByTestId('block-create-props').textContent).toBe('12345|1|AVG'),
    );
  });
});
