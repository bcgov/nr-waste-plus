import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import GlobalErrorPage from './index';

import { renderWithApp } from '@/config/tests/renderWithApp';

const renderPage = (error?: unknown) => renderWithApp(<GlobalErrorPage error={error} />);

describe('GlobalErrorPage', () => {
  it('should render fallback message when no error provided', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('An unexpected error has occurred. Please try again later.'),
      ).toBeDefined();
    });
  });

  it('should render error message when error is error instance', async () => {
    renderPage(new Error('Boom goes the dynamite'));
    await waitFor(() => {
      screen.getByText('Global Error');
      screen.getByText('Boom goes the dynamite');
    });
  });

  it('should render error message when error is string', async () => {
    renderPage('String error');
    await waitFor(() => {
      screen.getByText('Global Error');
      screen.getByText('String error');
    });
  });

  it('should render status text when error object has status text', async () => {
    renderPage({ message: 'Another error', statusText: 'This is not a drill' });
    await waitFor(() => {
      screen.getByText('Global Error');
      screen.getByText('This is not a drill');
    });
  });

  it('should fall back to message when status text is empty', async () => {
    renderPage({ message: 'That Error', statusText: '' });
    await waitFor(() => {
      screen.getByText('Global Error');
      screen.getByText('That Error');
    });
  });
});
