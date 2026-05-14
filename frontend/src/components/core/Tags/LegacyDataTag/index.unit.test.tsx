import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import LegacyDataTag from './index';

import { createTestRouter } from '@/config/tests/routerTestHelper';

describe('LegacyDataTag', () => {
  it('shouldRenderLegacyDataLabel_byDefault', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <LegacyDataTag url="/some/path" />
        ))}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Legacy data')).toBeDefined();
    });
  });

  it('shouldRenderCustomLabel_whenLabelProvided', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <LegacyDataTag url="/some/path" label="Old system" />
        ))}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Old system')).toBeDefined();
    });
  });

  it('shouldRenderAsInternalLink_whenUrlStartsWithSlash', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <LegacyDataTag url="/legacy/record/42" />
        ))}
      />,
    );
    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe('/legacy/record/42');
      expect(link.getAttribute('target')).toBeNull();
    });
  });

  it('shouldRenderAsExternalAnchor_whenUrlIsAbsolute', () => {
    render(<LegacyDataTag url="https://legacy.example.com/record/42" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://legacy.example.com/record/42');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shouldRenderTooltip_withLegacySystemMessage', () => {
    render(<LegacyDataTag url="https://legacy.example.com/record/42" />);
    expect(screen.getByText(/this data originates from a legacy system/i)).toBeDefined();
  });
});
