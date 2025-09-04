import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { ThemeContext, type ThemeContextData } from '@/context/theme/ThemeContext';

import ThemeToggle from './index';

import type { CarbonTheme } from '@/context/preference/types';

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

const renderWithProviders = async (ctx: ThemeContextData = mockCtxLight) => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <ThemeContext.Provider value={ctx}>
            <ThemeToggle />
          </ThemeContext.Provider>
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('ThemeToggle', () => {
  it('renders with light icon when theme is white', async () => {
    await renderWithProviders();
    expect(screen.getByRole('button')).toBeInTheDocument();
    // LightFilled icon should be present
    expect(document.querySelector('.icon')).toBeInTheDocument();
    expect(document.querySelector('.icon')).toHaveClass('icon light');
  });

  it('renders with asleep icon when theme is not white', async () => {
    await renderWithProviders(mockCtxDark);
    expect(document.querySelector('.icon')).toBeInTheDocument();
    expect(document.querySelector('.icon')).toHaveClass('icon dark');
  });

  it('calls toggleTheme on click', async () => {
    const spy = vi.spyOn(mockCtxLight, 'toggleTheme');
    await renderWithProviders();
    fireEvent.click(screen.getByRole('button'));
    expect(spy).toHaveBeenCalled();
  });

  it('calls toggleTheme on Enter key', async () => {
    const spy = vi.spyOn(mockCtxLight, 'toggleTheme');
    await renderWithProviders();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(spy).toHaveBeenCalled();
  });

  it('calls toggleTheme on Space key', async () => {
    const spy = vi.spyOn(mockCtxLight, 'toggleTheme');
    await renderWithProviders();
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(spy).toHaveBeenCalled();
  });
});
