import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithApp } from '@/config/tests/renderWithApp';

import ReportingUnitBlocksList from './index';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Renders the component inside the full app provider stack (TableResource's
 * toolbar hook requires `PreferenceProvider`) and flushes the initial render.
 */
async function renderBlocksList() {
  const result = renderWithApp(<ReportingUnitBlocksList />);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ReportingUnitBlocksList', () => {
  describe('section heading', () => {
    it('renders the "Blocks" section heading', async () => {
      await renderBlocksList();

      expect(screen.getByRole('heading', { level: 2, name: 'Blocks' })).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('renders the built-in "No results" empty state', async () => {
      await renderBlocksList();

      expect(screen.getByTestId('empty-section-title').textContent).toBe('No results');
      expect(
        screen.getByText('Consider adjusting your search term(s) and try again.'),
      ).toBeTruthy();
    });

    it('renders no table rows or toolbar', async () => {
      await renderBlocksList();

      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.queryByTestId('table-toolbar')).toBeNull();
    });
  });
});
