import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ApiError } from '@/config/api/types';
import { NextRouterHarness } from '@/config/tests/nextRouterTestHelper';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { Role } from '@/types/auth.types';

import type { FamLoginUser, FamRole } from '@/types/auth.types';
import type { ReportingUnitDto } from '@/types/reportingUnit.types';

// ── Mutable module-mock state ────────────────────────────────────────────────

const state = vi.hoisted(() => ({
  user: undefined as import('@/types/auth.types').FamLoginUser | undefined,
  flags: {
    'offline-mode-enabled': false,
    'bookmark-ru-enabled': true,
    'reporting-unit-details-enabled': true,
    'reporting-unit-create-enabled': true,
    'reporting-unit-block-details-enabled': true,
    'block-creation-enabled': true,
    'configuration-enabled': true,
  } as Record<string, boolean>,
  getReportingUnit: vi.fn(),
  login: vi.fn(),
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    user: state.user,
    isLoading: false,
    isLoggedIn: !!state.user,
    login: state.login,
    logout: state.login,
    getClients: () =>
      state.user?.roles
        ?.flatMap((assignment: { clients?: string[] }) => assignment.clients ?? [])
        .filter(
          (client: string, index: number, self: string[]) => index === self.indexOf(client),
        ) ?? [],
  }),
}));

vi.mock('@/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/env')>();
  return { ...actual, featureFlags: state.flags as typeof actual.featureFlags };
});

vi.mock('@/services/APIs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/APIs')>();
  return {
    default: {
      ...actual.default,
      reportingUnit: {
        ...actual.default.reportingUnit,
        getReportingUnit: state.getReportingUnit,
      },
    },
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const role = (value: Role, clients: string[] = ['c1']): FamRole => ({ role: value, clients });

const user = (roles: FamRole[], idpProvider?: string): FamLoginUser =>
  ({ roles, idpProvider, privileges: [] }) as unknown as FamLoginUser;

const adminUser = () => user([role(Role.ADMIN)]);
const viewerUser = () => user([role(Role.VIEWER, ['00000001'])]);

const makeApiError = (status: number): ApiError =>
  new ApiError(
    { method: 'GET', url: '/api/reporting-units/123' },
    { url: '/api/reporting-units/123', ok: false, status, statusText: 'Error', body: null },
    'Error',
  );

const minimalReportingUnit = {
  id: 123,
  client: { code: '00000001', description: 'Client One' },
  clientStatus: { code: 'ACTIVE', description: 'Active' },
  grade: { code: 'COASTAL', description: 'Coastal' },
  sampling: { code: 'ABC', description: 'Sampling ABC' },
  district: { code: 'DFN', description: 'Downtown Forest District' },
} as unknown as ReportingUnitDto;

let capturedRouter: ReturnType<(typeof import('@/router'))['createAppRouter']> | undefined;

const renderAt = (path: string) =>
  render(
    <PageTitleProvider>
      <NextRouterHarness
        initialEntries={[path]}
        onRouter={(router) => {
          capturedRouter = router;
        }}
      />
    </PageTitleProvider>,
  );

const expectOneShell = () => {
  // Authenticated pages render exactly one application shell (Layout):
  // one header banner + one main landmark (DEC-012 / T-16).
  expect(screen.getAllByRole('banner')).toHaveLength(1);
  expect(screen.getAllByRole('main')).toHaveLength(1);
};

const expectNoShell = () => {
  // Status/public pages render outside `_authenticated` — no Layout shell.
  expect(screen.queryByRole('banner')).toBeNull();
};

beforeEach(() => {
  state.user = adminUser();
  state.flags['reporting-unit-details-enabled'] = true;
  state.flags['reporting-unit-create-enabled'] = true;
  state.flags['configuration-enabled'] = true;
  state.getReportingUnit.mockReset();
  sessionStorage.removeItem('redirectAfterLogin');
  capturedRouter = undefined;
});

// ── A. Public and entry routes ───────────────────────────────────────────────

describe('public and entry routes', () => {
  it('anonymous / renders the public landing page (no shell)', async () => {
    state.user = undefined;
    renderAt('/');
    // Landing is a standalone page with its own header markup (not the
    // application shell) — assert the landing hero renders.
    expect(await screen.findByTestId('landing-title')).toBeTruthy();
    // Legacy title parity: "<app name> - Landing" via staticData.
    expect(document.title).toContain('Landing');
  });

  it('authenticated / redirects through dashboard to the search page', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Waste search' })).toBeTruthy();
    expectOneShell();
  });

  it('anonymous /search persists the full path and lands on the landing page', async () => {
    state.user = undefined;
    renderAt('/search?district=DFN');
    expect(await screen.findByTestId('landing-title')).toBeTruthy();
    expect(sessionStorage.getItem('redirectAfterLogin')).toBe('/search?district=DFN');
  });

  it('anonymous unknown URL lands on the landing page without persisting a redirect', async () => {
    state.user = undefined;
    renderAt('/does-not-exist');
    expect(await screen.findByTestId('landing-title')).toBeTruthy();
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
  });
});

// ── B. DashboardRedirect (T-06) ───────────────────────────────────────────────

describe('DashboardRedirect', () => {
  it('navigates to a stored safe target and clears storage', async () => {
    sessionStorage.setItem('redirectAfterLogin', '/search?district=DFN');
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Waste search' })).toBeTruthy();
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
    expect(capturedRouter?.state.location.pathname).toBe('/search');
  });

  it('falls back to /search on an OAuth callback', async () => {
    renderAt('/dashboard?code=abc&state=xyz');
    expect(await screen.findByRole('heading', { name: 'Waste search' })).toBeTruthy();
    expect(capturedRouter?.state.location.pathname).toBe('/search');
  });

  it('never targets /dashboard (loop guard) and passes non-OAuth params through', async () => {
    sessionStorage.setItem('redirectAfterLogin', '/dashboard');
    renderAt('/dashboard?a=1&b=two');
    expect(await screen.findByRole('heading', { name: 'Waste search' })).toBeTruthy();
    expect(capturedRouter?.state.location.pathname).toBe('/search');
    // The #1238 search-param codec decodes numeric-looking values as numbers.
    expect(capturedRouter?.state.location.search).toMatchObject({ a: 1, b: 'two' });
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
  });
});

// ── C. Status redirects (T-03) ────────────────────────────────────────────────

describe('status redirects', () => {
  it('redirects a no-role user to /no-role (outside the shell)', async () => {
    state.user = user([]);
    renderAt('/search');
    expect(
      await screen.findByText("You don't have FAM authorization to access this system"),
    ).toBeTruthy();
    expectNoShell();
  });

  it('redirects an IDIR multi-role user to /unauthorized with the reason code', async () => {
    state.user = user([role(Role.VIEWER), role(Role.ADMIN)], 'IDIR');
    renderAt('/search');
    expect(
      await screen.findByText('This account is not permitted to have multiple roles.'),
    ).toBeTruthy();
    expectNoShell();
  });

  it('renders /unauthorized without re-redirecting (loop guard)', async () => {
    state.user = user([role(Role.VIEWER), role(Role.ADMIN)], 'IDIR');
    renderAt('/unauthorized?reason=IDIR_MULTIPLE_ROLES');
    expect(
      await screen.findByText('This account is not permitted to have multiple roles.'),
    ).toBeTruthy();
  });

  it('renders /no-role for a no-role user without redirecting (self-correction parity)', async () => {
    state.user = user([]);
    renderAt('/no-role');
    expect(
      await screen.findByText("You don't have FAM authorization to access this system"),
    ).toBeTruthy();
    expectNoShell();
  });
});

// ── D. Role tiers (T-04, T-05) ───────────────────────────────────────────────

describe('role tiers', () => {
  it('allows VIEWER on /clients inside one shell', async () => {
    state.user = viewerUser();
    renderAt('/clients');
    expect(await screen.findByRole('heading', { name: 'My clients' })).toBeTruthy();
    expectOneShell();
  });

  it('denies ADMIN on /clients (client-access tier) with the shell-less 401 page', async () => {
    state.user = adminUser();
    renderAt('/clients');
    expect(await screen.findByText('Unauthorized Access')).toBeTruthy();
    expectNoShell();
  });

  it('allows ADMIN on /configuration inside one shell', async () => {
    renderAt('/configuration');
    expect(await screen.findByRole('heading', { name: 'Configuration' })).toBeTruthy();
    expectOneShell();
  });

  it('denies VIEWER on /configuration (admin tier)', async () => {
    state.user = viewerUser();
    renderAt('/configuration');
    expect(await screen.findByText('Unauthorized Access')).toBeTruthy();
    expectNoShell();
  });
});

// ── E. Flag gates (T-11) ─────────────────────────────────────────────────────

describe('feature-flag beforeLoad gates', () => {
  it('404s /reporting-units/create when reporting-unit-create-enabled is off (one shell)', async () => {
    state.flags['reporting-unit-create-enabled'] = false;
    renderAt('/reporting-units/create');
    expect(await screen.findByRole('heading', { name: 'Content Not Found' })).toBeTruthy();
    expectOneShell();
  });

  it('404s /configuration when configuration-enabled is off (subtree gate)', async () => {
    state.flags['configuration-enabled'] = false;
    renderAt('/configuration');
    expect(await screen.findByRole('heading', { name: 'Content Not Found' })).toBeTruthy();
    expectOneShell();
  });

  it('404s RU details before the loader when reporting-unit-details-enabled is off', async () => {
    state.flags['reporting-unit-details-enabled'] = false;
    renderAt('/reporting-units/123');
    expect(await screen.findByRole('heading', { name: 'Content Not Found' })).toBeTruthy();
    expectOneShell();
    expect(state.getReportingUnit).not.toHaveBeenCalled();
  });
});

// ── F. Catch-all and static precedence (T-17) ─────────────────────────────────

describe('unknown URLs and static precedence', () => {
  it('renders the catch-all 404 inside exactly one shell for an authenticated user', async () => {
    renderAt('/does-not-exist');
    expect(await screen.findByRole('heading', { name: 'Content Not Found' })).toBeTruthy();
    expectOneShell();
  });

  it('renders the 404 for a no-role user on an unknown URL (no status redirect)', async () => {
    state.user = user([]);
    renderAt('/does-not-exist');
    // Legacy parity: the 404 rendered for ANY authenticated user; no-role /
    // role-error redirects only applied to known routes.
    expect(await screen.findByRole('heading', { name: 'Content Not Found' })).toBeTruthy();
    expectOneShell();
    expect(screen.queryByText("You don't have FAM authorization")).toBeNull();
  });

  it('static /reporting-units/create outranks $ruId', async () => {
    renderAt('/reporting-units/create');
    expect(await screen.findByRole('heading', { name: 'Create reporting unit' })).toBeTruthy();
  });

  it('static district-volume-tables/upload outranks $id', async () => {
    renderAt('/configuration/district-volume-tables/upload');
    // Upload pages import heavy spreadsheet tooling — allow extra load time.
    expect(
      await screen.findByRole('heading', { name: 'Upload new volumes table' }, { timeout: 5000 }),
    ).toBeTruthy();
  });

  it('static formulas/new outranks $id', async () => {
    renderAt('/configuration/formulas/new');
    // The create form imports heavy editor tooling — allow extra load time.
    expect(
      await screen.findByRole('heading', { name: 'Create new formula set' }, { timeout: 5000 }),
    ).toBeTruthy();
  });
});

// ── G. Reporting-unit loader (T-10 integration, T-16 error shell) ─────────────

describe('reportingUnitLoader via the router', () => {
  it('404s a non-numeric ruId', async () => {
    renderAt('/reporting-units/abc');
    expect(await screen.findByRole('heading', { name: 'Content Not Found' })).toBeTruthy();
    expectOneShell();
  });

  it('404s an API 404', async () => {
    state.getReportingUnit.mockRejectedValue(makeApiError(404));
    renderAt('/reporting-units/123');
    expect(await screen.findByRole('heading', { name: 'Content Not Found' })).toBeTruthy();
    expectOneShell();
  });

  it('404s an API 403 (reported as not-found)', async () => {
    state.getReportingUnit.mockRejectedValue(makeApiError(403));
    renderAt('/reporting-units/123');
    expect(await screen.findByRole('heading', { name: 'Content Not Found' })).toBeTruthy();
    expectOneShell();
  });

  it('renders the loader error page inside exactly one shell on an API 500 (T-16)', async () => {
    state.getReportingUnit.mockRejectedValue(makeApiError(500));
    renderAt('/reporting-units/123');
    // `_authenticated.errorComponent` renders Layout + GlobalErrorPage.
    expect(await screen.findByRole('heading', { name: 'Global Error' })).toBeTruthy();
    expectOneShell();
  });

  it('renders the details heading from loaded data', async () => {
    state.getReportingUnit.mockResolvedValue(minimalReportingUnit);
    renderAt('/reporting-units/123');
    expect(await screen.findByRole('heading', { name: 'Reporting Unit No. 123' })).toBeTruthy();
    expectOneShell();
  });
});

// ── H. Remaining URL surface smoke (T-12 breadth) ─────────────────────────────

describe('configuration subsections and remaining URLs', () => {
  it.each([
    ['/configuration/district-volume-tables', 'District average waste volumes'],
    ['/configuration/district-volume-tables/42', 'District Volume Table not found'],
    ['/configuration/species-composition', 'District level species composition'],
    ['/configuration/species-composition/upload', 'Upload new species composition table'],
    ['/configuration/species-composition/42', 'Species composition not found'],
    ['/configuration/formulas', 'Formula Configuration'],
    ['/configuration/formulas/42', 'Formula set not found'],
  ])('renders %s (heading: %s)', async (path, heading) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy();
    expectOneShell();
  });

  it('renders block details via the $ruId/$blockId route', async () => {
    renderAt('/reporting-units/123/456');
    expect(
      await screen.findByRole('heading', { name: 'Reporting Unit Block not found' }),
    ).toBeTruthy();
    expectOneShell();
  });

  it('renders /search for a VIEWER inside one shell', async () => {
    state.user = viewerUser();
    renderAt('/search');
    expect(await screen.findByRole('heading', { name: 'Waste search' })).toBeTruthy();
    expectOneShell();
  });
});
