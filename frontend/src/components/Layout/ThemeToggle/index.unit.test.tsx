import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';

import ThemeToggle from './index';

import type { CarbonTheme } from '@/context/preference/types';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import { ThemeContext, type ThemeContextData } from '@/context/theme/ThemeContext';

const mockCtxLight: ThemeContextData = {
  theme: 'g10' as CarbonTheme,
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
};

const mockCtxDark: ThemeContextData = {
  theme: 'g100' as CarbonTheme,
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
};

const renderWithProviders = (ctx: ThemeContextData = mockCtxLight) =>
  renderWithAppAsync(
    <ThemeContext.Provider value={ctx}>
      <ThemeToggle />
    </ThemeContext.Provider>,
  );

describe('ThemeToggle', () => {
  it('renders with light icon when theme is white', async () => {
    await renderWithProviders();
    screen.getByRole('button');
    screen.getByRole('img', { name: /light/i });
  });

  it('renders with asleep icon when theme is not white', async () => {
    await renderWithProviders(mockCtxDark);
    screen.getByRole('button');
    screen.getByRole('img', { name: /dark/i });
  });

  it('calls toggleTheme on click', async () => {
    const user = await userEvent.setup();
    const spy = vi.spyOn(mockCtxLight, 'toggleTheme');
    await renderWithProviders();
    await user.click(screen.getByRole('button'));
    expect(spy).toHaveBeenCalled();
  });

  it('calls toggleTheme on Enter key', async () => {
    const user = await userEvent.setup();
    const spy = vi.spyOn(mockCtxLight, 'toggleTheme');
    await renderWithProviders();
    const button = screen.getByRole('button');
    await user.click(button);
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenCalled();
  });

  it('calls toggleTheme on Space key', async () => {
    const user = await userEvent.setup();
    const spy = vi.spyOn(mockCtxLight, 'toggleTheme');
    await renderWithProviders();
    const button = screen.getByRole('button');
    await user.click(button);
    await user.keyboard(' ');
    expect(spy).toHaveBeenCalled();
  });
});
