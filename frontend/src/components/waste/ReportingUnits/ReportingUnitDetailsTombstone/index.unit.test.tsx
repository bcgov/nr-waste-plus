import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ReportingUnitDetailsTombstone from './index';

import type { ReportingUnitDto } from '@/services/reportingUnit.types';

import { Role } from '@/context/auth/types';
import * as useAuthModule from '@/context/auth/useAuth';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock(import('@/env'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: {
      ...actual.env,
      VITE_CLIENT_BASE_URL: 'https://clients.example.com',
    },
  };
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const defaultData: ReportingUnitDto = {
  id: 12345,
  client: { code: '00001001', description: 'Forest Client Ltd.' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'G1', description: 'Grade 1' },
  sampling: { code: 'S2', description: 'Ground Sampling' },
  district: { code: 'DCR', description: 'Campbell River' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderTombstone(data: ReportingUnitDto = defaultData) {
  return render(<ReportingUnitDetailsTombstone data={data} />);
}

function mockIdirUser() {
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
}

function mockNonIdirUser() {
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
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReportingUnitDetailsTombstone', () => {
  beforeEach(() => {
    mockIdirUser();
  });

  describe('client fields', () => {
    it('renders the client name', () => {
      renderTombstone();
      screen.getByText('Forest Client Ltd.');
    });

    it('renders the client number', () => {
      renderTombstone();
      screen.getByText('00001001');
    });

    it('renders a link to client details for IDIR users', () => {
      renderTombstone();
      const link = screen.getByRole('link', { name: '00001001' });
      // link is defined; getBy* throws if not found
      expect((link as HTMLAnchorElement).href).toContain('/clients/details/00001001');
    });

    it('does not render a link for non-IDIR users', () => {
      mockNonIdirUser();
      renderTombstone();
      expect(screen.queryByRole('link', { name: '00001001' })).toBeNull();
    });

    it('renders the client status description', () => {
      renderTombstone();
      screen.getByText('Active');
    });

    it('renders different client data correctly', () => {
      renderTombstone({
        ...defaultData,
        client: { code: '00002002', description: 'Another Corp.' },
        clientStatus: { code: 'INA', description: 'Inactive' },
      });
      screen.getByText('Another Corp.');
      screen.getByText('00002002');
      screen.getByText('Inactive');
    });
  });

  describe('district field', () => {
    it('renders district code and description together', () => {
      renderTombstone();
      screen.getByText('DCR - Campbell River');
    });

    it('renders a different district correctly', () => {
      renderTombstone({
        ...defaultData,
        district: { code: 'DKA', description: 'Kalum' },
      });
      screen.getByText('DKA - Kalum');
    });
  });

  describe('grade field', () => {
    it('renders the grade description', () => {
      renderTombstone();
      screen.getByText('Grade 1');
    });

    it('renders an empty value tag when grade description is empty', () => {
      renderTombstone({ ...defaultData, grade: { code: '', description: '' } });
      expect(screen.queryByText('Grade 1')).toBeNull();
    });
  });

  describe('sampling field', () => {
    it('renders sampling code and description together', () => {
      renderTombstone();
      screen.getByText('S2 - Ground Sampling');
    });

    it('renders a different sampling option correctly', () => {
      renderTombstone({
        ...defaultData,
        sampling: { code: 'S3', description: 'Cruise' },
      });
      screen.getByText('S3 - Cruise');
    });
  });

  describe('field labels', () => {
    it('renders the "Client name" label', () => {
      renderTombstone();
      screen.getByText('Client name');
    });

    it('renders the "Client number" label', () => {
      renderTombstone();
      screen.getByText('Client number');
    });

    it('renders the "Client status" label', () => {
      renderTombstone();
      screen.getByText('Client status');
    });

    it('renders the "District" label', () => {
      renderTombstone();
      screen.getByText('District');
    });

    it('renders the "Grades" label', () => {
      renderTombstone();
      screen.getByText('Grades');
    });

    it('renders the "Sampling option" label', () => {
      renderTombstone();
      screen.getByText('Sampling option');
    });
  });

  describe('null-safe rendering', () => {
    it('renders without crashing when code fields are null', () => {
      renderTombstone({
        ...defaultData,
        client: { code: null, description: 'Null Code Corp.' },
        district: { code: null, description: 'Unknown District' },
        sampling: { code: null, description: 'No Sampling' },
      });
      screen.getByText('Null Code Corp.');
    });

    it('renders without crashing when description fields are null', () => {
      renderTombstone({
        ...defaultData,
        client: { code: '00001001', description: null },
        clientStatus: { code: 'ACT', description: null },
      });
      // Should not throw; null renders as empty string in React
      screen.getByText('Client name');
    });
  });
});
