import { useNavigate } from '@tanstack/react-router';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
import { useLayout } from '@/context/layout/useLayout';
import useBreakpoint from '@/hooks/useBreakpoint';
import APIs from '@/services/APIs';

import Layout from './index';

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

vi.mock('@/hooks/useBreakpoint', () => ({ default: vi.fn() }));

const mockBreakpoint = vi.mocked(useBreakpoint);

// Dummy child component for testing
const DummyChild = () => <div data-testid="dummy-child">Hello Child</div>;

/** Renders the Layout with mocked route/API dependencies. */
const renderLayout = async () => {
  (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });

  return renderWithAppAsync(
    <LayoutProvider>
      <Layout>
        <DummyChild />
      </Layout>
    </LayoutProvider>,
  );
};

describe('Layout', () => {
  it('shouldRenderHeaderGridAndChildren_whenRendered', async () => {
    await renderLayout();

    // Header
    screen.getByRole('banner');
    // Content body
    screen.getByRole('main');
    // Grid
    screen.getByTestId('layout-grid');
    // Children
    screen.getByText('Hello Child');
  });

  it('shouldTargetSingleMainLandmarkWithSkipLinkId_whenRendered', async () => {
    await renderLayout();

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]?.id).toBe('main-content');
    // tabIndex=-1 keeps the landmark out of the tab order while still allowing
    // fragment navigation to move focus onto it (R-1386-5).
    expect(mains[0]?.getAttribute('tabindex')).toBe('-1');
  });

  it('shouldResolveSkipLinkHrefToMainLandmark_whenSkipLinkRendered', async () => {
    await renderLayout();

    // The header skip link's href must resolve to an element that exists (R-1386-2).
    const skipLink = document.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();

    const target = document.querySelector('#main-content');
    expect(target).not.toBeNull();
    expect(target?.tagName).toBe('MAIN');
    expect(target).toBe(screen.getByRole('main'));
  });
});

// ── Side-nav reset on navigation (file-based router: one persistent Layout) ───

/** Renders the Layout with a probe exposing nav state, a toggle, and a nav button. */
const renderLayoutProbe = async (route = '/a') => {
  (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });

  return renderWithAppAsync(
    <Layout>
      <NavStateProbe />
    </Layout>,
    { route },
  );
};

/**
 * Exposes the layout context state plus a programmatic navigation button, so
 * tests can assert the shell state across an in-app navigation without
 * remounting the Layout (the root test route matches every path).
 */
function NavStateProbe() {
  const { isSideNavExpanded, toggleSideNav } = useLayout();
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="dummy-child">Hello Child</div>
      <button type="button" data-testid="nav-toggle" onClick={toggleSideNav}>
        toggle
      </button>
      <button type="button" data-testid="nav-go-b" onClick={() => void navigate({ href: '/b' })}>
        go-b
      </button>
      <span data-testid="nav-expanded">{String(isSideNavExpanded)}</span>
    </>
  );
}

describe('Layout side-nav reset on navigation', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockBreakpoint.mockReturnValue('lg');
  });

  it('closes the mobile side nav after navigating to another page', async () => {
    mockBreakpoint.mockReturnValue('sm');
    await renderLayoutProbe('/a');

    // Mobile default: collapsed.
    expect(screen.getByTestId('nav-expanded').textContent).toBe('false');

    // Open the hamburger menu.
    await user.click(screen.getByTestId('nav-toggle'));
    expect(screen.getByTestId('nav-expanded').textContent).toBe('true');

    // Select another page — the menu must close over the new page (legacy
    // remount parity; the persistent Layout must reset the manual toggle).
    await user.click(screen.getByTestId('nav-go-b'));
    await waitFor(() => {
      expect(screen.getByTestId('nav-expanded').textContent).toBe('false');
    });
  });

  it('keeps the desktop side nav expanded across navigation (breakpoint-derived)', async () => {
    await renderLayoutProbe('/a');

    // Desktop default: expanded rail; manual toggling is ignored on lg, so the
    // reset-on-navigation must never force-collapse it either.
    expect(screen.getByTestId('nav-expanded').textContent).toBe('true');

    await user.click(screen.getByTestId('nav-go-b'));
    await waitFor(() => {
      expect(screen.getByTestId('nav-expanded').textContent).toBe('true');
    });
  });
});
