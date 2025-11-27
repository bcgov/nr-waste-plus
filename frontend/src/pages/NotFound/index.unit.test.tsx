import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import NotFoundPage from './index';

import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

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
