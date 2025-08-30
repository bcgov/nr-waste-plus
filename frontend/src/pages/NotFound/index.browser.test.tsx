import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

import NotFoundPage from './index';

describe('NotFoundPage', () => {
  it('renders not found message', () => {
    render(
      <PageTitleProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <NotFoundPage />
        </MemoryRouter>
      </PageTitleProvider>,
    );
    expect(screen.getByText('Not Found')).toBeDefined();
    expect(screen.getByText('The page you are looking for does not exist.')).toBeDefined();
  });
});
