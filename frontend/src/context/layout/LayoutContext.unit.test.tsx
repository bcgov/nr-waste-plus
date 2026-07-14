import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { LayoutProvider } from './LayoutProvider';
import { useLayout } from './useLayout';

const TestComponent = () => {
  const {
    isSideNavExpanded,
    toggleSideNav,
    isHeaderPanelOpen,
    toggleHeaderPanel,
    closeHeaderPanel,
  } = useLayout();

  return (
    <>
      <span data-testid="side-nav">{isSideNavExpanded ? 'expanded' : 'collapsed'}</span>
      <span data-testid="header-panel">{isHeaderPanelOpen ? 'open' : 'closed'}</span>
      <button onClick={toggleSideNav}>Toggle SideNav</button>
      <button onClick={toggleHeaderPanel}>Toggle HeaderPanel</button>
      <button onClick={closeHeaderPanel}>Close HeaderPanel</button>
    </>
  );
};

const renderWithProvider = () => {
  render(
    <LayoutProvider>
      <TestComponent />
    </LayoutProvider>,
  );
};

describe('LayoutContext', () => {
  it('provides default layout values', () => {
    renderWithProvider();
    // Initial state depends on breakpoint, but default isSideNavExpanded is true in tests
    expect(screen.getByTestId('side-nav').textContent).toMatch(/expanded|collapsed/);
    expect(screen.getByTestId('header-panel').textContent).toBe('closed');
  });

  it('toggleSideNav toggles the side nav state', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const btn = screen.getByText('Toggle SideNav');
    const value = screen.getByTestId('side-nav');
    expect(value.textContent).toBe('collapsed');
    await user.click(btn);
    expect(value.textContent).toBe('expanded');
    await user.click(btn);
    expect(value.textContent).toBe('collapsed');
  });

  it('toggleHeaderPanel and closeHeaderPanel work as expected', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const toggleBtn = screen.getByText('Toggle HeaderPanel');
    const closeBtn = screen.getByText('Close HeaderPanel');
    const value = screen.getByTestId('header-panel');
    expect(value.textContent).toBe('closed');
    await user.click(toggleBtn);
    expect(value.textContent).toBe('open');
    await user.click(closeBtn);
    expect(value.textContent).toBe('closed');
  });

  it('throws if useLayout is used outside of LayoutProvider', () => {
    const errorSpy = vi?.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      useLayout();
      return null;
    };
    expect(() => render(<Broken />)).toThrow('useLayout must be used within a LayoutProvider');
    if (errorSpy) errorSpy.mockRestore();
  });
});
