import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ReportingUnitDetailsTombstone from './index';

import type { ReportingUnitDto } from '@/services/reportingUnit.types';

import * as useAuthModule from '@/context/auth/useAuth';
import { Role } from '@/context/auth/types';

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
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
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
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
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
      expect(screen.getByText('Forest Client Ltd.')).toBeDefined();
    });

    it('renders the client number', () => {
      renderTombstone();
      expect(screen.getByText('00001001')).toBeDefined();
    });

    it('renders a link to client details for IDIR users', () => {
      renderTombstone();
      const link = screen.getByRole('link', { name: '00001001' });
      expect(link).toBeDefined();
      expect((link as HTMLAnchorElement).href).toContain(
        '/clients/details/00001001',
      );
    });

    it('does not render a link for non-IDIR users', () => {
      mockNonIdirUser();
      renderTombstone();
      expect(screen.queryByRole('link', { name: '00001001' })).toBeNull();
    });

    it('renders the client status description', () => {
      renderTombstone();
      expect(screen.getByText('Active')).toBeDefined();
    });

    it('renders different client data correctly', () => {
      renderTombstone({
        ...defaultData,
        client: { code: '00002002', description: 'Another Corp.' },
        clientStatus: { code: 'INA', description: 'Inactive' },
      });
      expect(screen.getByText('Another Corp.')).toBeDefined();
      expect(screen.getByText('00002002')).toBeDefined();
      expect(screen.getByText('Inactive')).toBeDefined();
    });
  });

  describe('district field', () => {
    it('renders district code and description together', () => {
      renderTombstone();
      expect(screen.getByText('DCR - Campbell River')).toBeDefined();
    });

    it('renders a different district correctly', () => {
      renderTombstone({
        ...defaultData,
        district: { code: 'DKA', description: 'Kalum' },
      });
      expect(screen.getByText('DKA - Kalum')).toBeDefined();
    });
  });

  describe('grade field', () => {
    it('renders the grade description', () => {
      renderTombstone();
      expect(screen.getByText('Grade 1')).toBeDefined();
    });

    it('renders an empty value tag when grade description is empty', () => {
      renderTombstone({ ...defaultData, grade: { code: '', description: '' } });
      expect(screen.queryByText('Grade 1')).toBeNull();
    });
  });

  describe('sampling field', () => {
    it('renders sampling code and description together', () => {
      renderTombstone();
      expect(screen.getByText('S2 - Ground Sampling')).toBeDefined();
    });

    it('renders a different sampling option correctly', () => {
      renderTombstone({
        ...defaultData,
        sampling: { code: 'S3', description: 'Cruise' },
      });
      expect(screen.getByText('S3 - Cruise')).toBeDefined();
    });
  });

  describe('field labels', () => {
    it('renders the "Client name" label', () => {
      renderTombstone();
      expect(screen.getByText('Client name')).toBeDefined();
    });

    it('renders the "Client number" label', () => {
      renderTombstone();
      expect(screen.getByText('Client number')).toBeDefined();
    });

    it('renders the "Client status" label', () => {
      renderTombstone();
      expect(screen.getByText('Client status')).toBeDefined();
    });

    it('renders the "District" label', () => {
      renderTombstone();
      expect(screen.getByText('District')).toBeDefined();
    });

    it('renders the "Grades" label', () => {
      renderTombstone();
      expect(screen.getByText('Grades')).toBeDefined();
    });

    it('renders the "Sampling option" label', () => {
      renderTombstone();
      expect(screen.getByText('Sampling option')).toBeDefined();
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
      expect(screen.getByText('Null Code Corp.')).toBeDefined();
    });

    it('renders without crashing when description fields are null', () => {
      renderTombstone({
        ...defaultData,
        client: { code: '00001001', description: null },
        clientStatus: { code: 'ACT', description: null },
      });
      // Should not throw; null renders as empty string in React
      expect(screen.getByText('Client name')).toBeDefined();
    });
  });
});
