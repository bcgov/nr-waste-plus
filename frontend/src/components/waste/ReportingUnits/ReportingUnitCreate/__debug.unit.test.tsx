import { RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';

import { createTestRouter } from '@/config/tests/routerTestHelper';

describe('router-flush', () => {
  it('finds trivial after waitFor', async () => {
    const router = createTestRouter(() => <div data-testid="trivial">hi</div>);
    render(<RouterProvider router={router} />);
    await screen
      .findByTestId('trivial', {}, { timeout: 3000 })
      .then((el) => console.log('FOUND_TRIVIAL:' + (el?.textContent ?? 'none')))
      .catch(() => console.log('NOTFOUND_TRIVIAL'));
  });
});
