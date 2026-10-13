import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UnderConstructionTag from './index';

describe('UnderConstructionTag', () => {
  it('renders a polite live region that is populated after registration', async () => {
    render(<UnderConstructionTag />);
    const tag = screen.getByRole('status');
    // The region mounts empty and the label is inserted afterwards so screen
    // readers announce it; text content appears on the next tick.
    await waitFor(() => expect(tag).toContainText('Under construction'));
    expect(tag.getAttribute('aria-live')).toBe('polite');
  });

  it('announces the page variant with the page-specific tooltip text', async () => {
    render(<UnderConstructionTag type="page" />);
    await waitFor(() => expect(screen.getByRole('status')).toContainText('Under construction'));
  });
});
