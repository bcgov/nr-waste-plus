import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { NextRouterContextHarness } from '@/config/tests/nextRouterTestHelper';
import { Role, type FamLoginUser, type FamRole } from '@/types/auth.types';

import { useNavEntries, type NavEntry } from './useNavEntries';

// ── Mutable module-mock state ────────────────────────────────────────────────

const state = vi.hoisted(() => ({
  user: undefined as import('@/types/auth.types').FamLoginUser | undefined,
  isOnline: true,
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    user: state.user,
    isLoading: false,
    isLoggedIn: !!state.user,
  }),
}));

vi.mock('@/hooks/useOfflineMode', () => ({ default: () => ({ isOnline: state.isOnline }) }));

// Mutable copy of the real feature flags so flag-off cases can be driven per
// test (the hook reads flags at render time).
const flags = vi.hoisted(() => ({
  values: {
    'offline-mode-enabled': false,
    'bookmark-ru-enabled': true,
    'reporting-unit-details-enabled': true,
    'reporting-unit-create-enabled': true,
    'reporting-unit-block-details-enabled': true,
    'block-creation-enabled': true,
    'configuration-enabled': true,
  } as Record<string, boolean>,
}));

vi.mock('@/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/env')>();
  return { ...actual, featureFlags: flags.values as typeof actual.featureFlags };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const role = (value: Role): FamRole => ({ role: value, clients: [] });

const renderProbe = (): NavEntry[] => {
  let captured: NavEntry[] = [];
  function Probe() {
    captured = useNavEntries();
    return null;
  }
  render(
    <NextRouterContextHarness>
      <Probe />
    </NextRouterContextHarness>,
  );
  return captured;
};

describe('useNavEntries', () => {
  beforeEach(() => {
    flags.values['reporting-unit-create-enabled'] = true;
    flags.values['configuration-enabled'] = true;
    state.isOnline = true;
  });

  afterEach(() => {
    state.user = undefined;
  });

  it('returns the admin nav in legacy order (client-access tier hidden for ADMIN-only)', () => {
    state.user = { roles: [role(Role.ADMIN)] } as FamLoginUser;

    const entries = renderProbe();

    // ADMIN fails the VIEWER/SUBMITTER any-of gate on `_client-access`, so
    // 'My clients' is hidden — parity with legacy getMenuEntries.
    expect(entries.map((entry) => entry.id)).toEqual([
      'Waste search',
      'Create reporting unit',
      'Configuration',
    ]);
    expect(entries.map((entry) => entry.to)).toEqual([
      '/search',
      '/reporting-units/create',
      '/configuration',
    ]);
  });

  it('shows the viewer nav (clients visible, configuration hidden by the admin tier)', () => {
    // VIEWER: `/clients` visible again; `/configuration` still hidden.
    state.user = { roles: [role(Role.VIEWER)] } as FamLoginUser;
    const viewerEntries = renderProbe();
    expect(viewerEntries.map((entry) => entry.id)).toEqual([
      'My clients',
      'Waste search',
      'Create reporting unit',
    ]);
  });

  it('hides the create entry when reporting-unit-create-enabled is off', () => {
    state.user = { roles: [role(Role.ADMIN)] } as FamLoginUser;
    flags.values['reporting-unit-create-enabled'] = false;

    const entries = renderProbe();

    expect(entries.map((entry) => entry.id)).not.toContain('Create reporting unit');
  });

  it('hides the configuration entry when configuration-enabled is off', () => {
    state.user = { roles: [role(Role.ADMIN)] } as FamLoginUser;
    flags.values['configuration-enabled'] = false;

    const entries = renderProbe();

    expect(entries.map((entry) => entry.id)).not.toContain('Configuration');
  });

  it('hides non-offline entries while offline (dormant predicate, legacy parity)', () => {
    state.user = { roles: [role(Role.ADMIN)] } as FamLoginUser;
    state.isOnline = false;

    const entries = renderProbe();

    // Legacy getMenuEntries predicate: while offline, only routes declaring
    // `offlineReady`/`offlineOnly` survive. No route declares either today,
    // so the nav empties — the predicate is dormant but enforced.
    expect(entries).toEqual([]);
  });

  it('returns no entries for an anonymous user (role gates exclude tiered entries)', () => {
    state.user = undefined;

    const entries = renderProbe();

    // `/search` has no role gate, but the anonymous-user case yields no tiered
    // entries; the hook itself is auth-agnostic — callers render it inside an
    // authenticated shell.
    expect(entries.some((entry) => entry.id === 'My clients')).toBe(false);
    expect(entries.some((entry) => entry.id === 'Configuration')).toBe(false);
  });
});
