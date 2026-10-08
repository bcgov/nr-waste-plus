import { screen, waitFor } from '@testing-library/react';
import { describe, it } from 'vitest';

import { renderWithApp } from '@/config/tests/renderWithApp';

import NotFoundPage from './index';

describe('NotFoundPage', () => {
  it('should render not found message when rendered', async () => {
    renderWithApp(<NotFoundPage />);
    await waitFor(() => {
      screen.getByText('Content Not Found');
      screen.getByText('The page you are looking for does not exist.');
    });
  });
});
