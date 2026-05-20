import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import LegacyDataTag from './index';

vi.mock(import('@/env'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: {
      ...actual.env,
      VITE_LEGACY_BASE_URL: 'https://legacy.example.com',
    },
  };
});

describe('LegacyDataTag', () => {
  describe('label', () => {
    it('renders "Legacy data" by default when no label is provided', () => {
      render(<LegacyDataTag url="/record/1" />);
      expect(screen.getByText('Legacy data')).toBeDefined();
    });

    it('renders the custom label when the label prop is supplied', () => {
      render(<LegacyDataTag url="/record/1" label="Old system" />);
      expect(screen.getByText('Old system')).toBeDefined();
    });

    it('does not render "Legacy data" when a custom label is provided', () => {
      render(<LegacyDataTag url="/record/1" label="Custom" />);
      expect(screen.queryByText('Legacy data')).toBeNull();
    });
  });

  describe('href construction', () => {
    it('prepends VITE_LEGACY_BASE_URL to the url prop', () => {
      render(<LegacyDataTag url="/record/42" />);
      expect(screen.getByRole('link').getAttribute('href')).toBe(
        'https://legacy.example.com/record/42',
      );
    });

    it('normalizes base URL and path when path lacks leading slash', () => {
      render(<LegacyDataTag url="record/99" />);
      expect(screen.getByRole('link').getAttribute('href')).toBe(
        'https://legacy.example.com/record/99',
      );
    });

    it('always concatenates base URL and url regardless of url format', () => {
      render(<LegacyDataTag url="/deep/path/to/record" />);
      const href = screen.getByRole('link').getAttribute('href');
      expect(href).toBe('https://legacy.example.com/deep/path/to/record');
    });
  });

  describe('anchor attributes', () => {
    it('always opens the link in a new tab (target="_blank")', () => {
      render(<LegacyDataTag url="/record/1" />);
      expect(screen.getByRole('link').getAttribute('target')).toBe('_blank');
    });

    it('always sets rel="noopener noreferrer" for security', () => {
      render(<LegacyDataTag url="/record/1" />);
      expect(screen.getByRole('link').getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('applies the legacy-data-tag__link CSS class to the anchor', () => {
      render(<LegacyDataTag url="/record/1" />);
      expect(screen.getByRole('link').classList.contains('legacy-data-tag__link')).toBe(true);
    });
  });

  describe('tooltip', () => {
    it('renders the tooltip describing the legacy system source', () => {
      render(<LegacyDataTag url="/record/1" />);
      expect(screen.getByText(/this data originates from a legacy system/i)).toBeDefined();
    });

    it('includes a prompt to view the source record in the tooltip', () => {
      render(<LegacyDataTag url="/record/1" />);
      expect(screen.getByText(/click to view the source record/i)).toBeDefined();
    });

    it('positions the tooltip at the bottom', () => {
      render(<LegacyDataTag url="/record/1" />);
      const tooltipContent = document.querySelector('.cds--popover-content');
      expect(tooltipContent).not.toBeNull();
    });
  });

  describe('tag appearance', () => {
    it('applies the legacy-data-tag CSS class to the tag element', () => {
      render(<LegacyDataTag url="/record/1" />);
      const tag = document.querySelector('.legacy-data-tag');
      expect(tag).not.toBeNull();
    });

    it('renders a purple Carbon tag', () => {
      render(<LegacyDataTag url="/record/1" />);
      const tag = document.querySelector('.cds--tag--purple');
      expect(tag).not.toBeNull();
    });
  });
});
