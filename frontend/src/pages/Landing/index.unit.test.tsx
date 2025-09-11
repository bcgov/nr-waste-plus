import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach, type Mock } from 'vitest';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { ThemeProvider } from '@/context/theme/ThemeProvider';
import APIs from '@/services/APIs';

import LandingPage from './index';

const renderWithProps = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <PreferenceProvider>
            <ThemeProvider>
              <LandingPage />
            </ThemeProvider>
          </PreferenceProvider>
        </AuthProvider>
      </QueryClientProvider>,
    ),
  );
};

const loginMock: ReturnType<typeof vi.fn> = vi.fn();
let mockBreakpoint = 'md';
let mockTheme = 'g100';

vi.mock('@/hooks/useBreakpoint', () => ({
  default: () => mockBreakpoint,
}));

vi.mock('@/context/theme/useTheme', () => ({
  useTheme: () => ({
    theme: mockTheme,
  }),
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

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

describe('LandingPage', () => {
  beforeEach(() => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
  });

  it('renders button container with single-row class for max breakpoint', async () => {
    mockBreakpoint = 'max';
    await renderWithProps();
    expect(screen.getByTestId('landing-button__idir').parentElement?.className).toContain(
      'single-row',
    );
  });

  it('sets correct gap style for md breakpoint', async () => {
    mockBreakpoint = 'md';
    await renderWithProps();
    const wrapper = screen
      .getByTestId('landing-title')
      .closest('.landing-content-wrapper') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.gap).toBe('3rem');
  });

  it('renders button container with two-rows class for sm breakpoint', async () => {
    mockBreakpoint = 'sm';
    await renderWithProps();
    expect(screen.getByTestId('landing-button__idir').parentElement?.className).toContain(
      'two-rows',
    );
  });

  it('renders logo_rev when theme is g100', async () => {
    mockTheme = 'g100';
    await renderWithProps();
    const logoImg = screen.getByAltText('BCGov Logo');
    expect(logoImg.getAttribute('src')).toMatch(/bc-gov-logo-rev\.png$/);
  });

  it('renders logo when theme is not g100', async () => {
    mockTheme = 'g10';
    await renderWithProps();
    const logoImg = screen.getByAltText('BCGov Logo');
    expect(logoImg.getAttribute('src')).toMatch(/bc-gov-logo\.png$/);
  });

  it('renders the title and subtitle', async () => {
    await renderWithProps();
    expect(screen.getByTestId('landing-title').textContent).toBe('Waste Plus');
    expect(screen.getByTestId('landing-subtitle').textContent).toBe(
      'Report logging waste and residue data for billing and cut control',
    );
  });

  it('renders both login buttons', async () => {
    await renderWithProps();
    expect(screen.getByTestId('landing-button__idir')).toBeDefined();
    expect(screen.getByTestId('landing-button__bceid')).toBeDefined();
  });

  it('calls login with correct provider when IDIR button is clicked', async () => {
    await renderWithProps();
    await act(async () => fireEvent.click(screen.getByTestId('landing-button__idir')));
    expect(loginMock).toHaveBeenCalledWith('IDIR');
  });

  it('calls login with correct provider when BCeID button is clicked', async () => {
    await renderWithProps();
    await act(async () => fireEvent.click(screen.getByTestId('landing-button__bceid')));
    expect(loginMock).toHaveBeenCalledWith('BCEIDBUSINESS');
  });

  it('renders the landing image', async () => {
    await renderWithProps();
    expect(screen.getByAltText('Landing cover')).toBeDefined();
  });

  afterEach(() => {
    mockBreakpoint = 'md';
    mockTheme = 'g100';
  });
});
