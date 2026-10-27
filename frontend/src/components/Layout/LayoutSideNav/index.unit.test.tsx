import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NextRouterContextHarness } from '@/config/tests/nextRouterTestHelper';
import AnnouncerProvider from '@/context/announcer/AnnouncerProvider';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
import { Role } from '@/types/auth.types';

import { LayoutSideNav } from './index';

// ── Module mocks ──────────────────────────────────────────────────────────────

const state = vi.hoisted(() => ({
  user: undefined as
    { idpProvider?: string; roles?: { role: string; clients: string[] }[] } | undefined,
}));

vi.mock(import('@/env'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: {
      ...actual.env,
      VITE_IDIR_HELP: 'https://test-idir-help.example.com',
      VITE_BCEID_HELP: 'https://test-bceid-help.example.com',
    },
  };
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    user: state.user,
    isLoading: false,
    isLoggedIn: !!state.user,
    getClients: () => state.user?.roles?.flatMap((assignment) => assignment.clients ?? []) ?? [],
  }),
}));

vi.mock('@/hooks/useOfflineMode', () => ({ default: () => ({ isOnline: true }) }));

// ── Helpers ──────────────────────────────────────────────────────────────────

const renderNav = () =>
  render(
    <AnnouncerProvider>
      <NextRouterContextHarness>
        <LayoutProvider>
          <LayoutSideNav />
        </LayoutProvider>
      </NextRouterContextHarness>
    </AnnouncerProvider>,
  );

const navLink = (id: string) => screen.queryByTestId(`side-nav-link-${id}`);

beforeEach(() => {
  state.user = { idpProvider: 'IDIR', roles: [{ role: Role.VIEWER, clients: ['00000001'] }] };
});

describe('LayoutSideNav', () => {
  describe('nav entries (projected from route staticData)', () => {
    it('renders the viewer nav in order: clients, search, create reporting unit', () => {
      renderNav();

      expect(navLink('My clients')).toBeTruthy();
      expect(navLink('Waste search')).toBeTruthy();
      expect(navLink('Create reporting unit')).toBeTruthy();
      expect(navLink('Configuration')).toBeNull();

      // Order: clients (10) before search (20) before create (30).
      const ids = screen
        .getAllByTestId(/^side-nav-link-/)
        .filter((el) => el.getAttribute('data-testid') !== 'side-nav-link-help')
        .map((el) => el.getAttribute('data-testid')?.replace('side-nav-link-', ''));
      expect(ids).toEqual(['My clients', 'Waste search', 'Create reporting unit']);
    });

    it('renders the admin nav: search, create reporting unit, configuration (no clients)', () => {
      state.user = { idpProvider: 'IDIR', roles: [{ role: Role.ADMIN, clients: [] }] };
      renderNav();

      expect(navLink('My clients')).toBeNull();
      expect(navLink('Waste search')).toBeTruthy();
      expect(navLink('Create reporting unit')).toBeTruthy();
      expect(navLink('Configuration')).toBeTruthy();
    });

    it('renders icons for nav entries', () => {
      renderNav();
      // eslint-disable-next-line testing-library/no-node-access -- Carbon renders icons as raw <svg> with no queryable role
      expect(navLink('Waste search')?.querySelector('svg')).not.toBeNull();
    });
  });

  describe('help link', () => {
    it('uses the IDIR help URL for IDIR users', () => {
      renderNav();
      const helpLink = screen.getByRole('link', { name: 'Need Help?' });
      expect(helpLink.getAttribute('href')).toBe('https://test-idir-help.example.com');
    });

    it('uses the BCEIDBUSINESS help URL for BCEID users', () => {
      state.user = {
        idpProvider: 'BCEIDBUSINESS',
        roles: [{ role: Role.VIEWER, clients: ['00000001'] }],
      };
      renderNav();
      const helpLink = screen.getByRole('link', { name: 'Need Help?' });
      expect(helpLink.getAttribute('href')).toBe('https://test-bceid-help.example.com');
    });
  });
});
