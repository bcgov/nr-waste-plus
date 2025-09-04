import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

import GlobalErrorPage from './index';

const ThrowError: React.FC<{ error: unknown }> = ({ error }) => {
  throw error;
};

const ThrowStringError: React.FC = () => {
  throw 'String error';
};

const ThrowStatusTextError: React.FC = () => {
  throw {
    message: 'Another error',
    statusText: 'This is not a drill',
  };
};

const ThrowEmptyStatusTextError: React.FC = () => {
  throw {
    message: 'That Error',
    statusText: '',
  };
};

const routes = [
  {
    path: '/',
    element: <div>Dummy</div>,
    errorElement: (
      <PageTitleProvider>
        <GlobalErrorPage />
      </PageTitleProvider>
    ),
  },
  {
    path: '/a',
    element: <ThrowError error={new Error('Boom goes the dynamite')} />,
    errorElement: (
      <PageTitleProvider>
        <GlobalErrorPage />
      </PageTitleProvider>
    ),
  },
  {
    path: '/b',
    element: <ThrowStringError />,
    errorElement: (
      <PageTitleProvider>
        <GlobalErrorPage />
      </PageTitleProvider>
    ),
  },
  {
    path: '/c',
    element: <ThrowStatusTextError />,
    errorElement: (
      <PageTitleProvider>
        <GlobalErrorPage />
      </PageTitleProvider>
    ),
  },
  {
    path: '/d',
    element: <ThrowEmptyStatusTextError />,
    errorElement: (
      <PageTitleProvider>
        <GlobalErrorPage />
      </PageTitleProvider>
    ),
  },
];

const genRoute = (path: string) =>
  createMemoryRouter(routes, { initialEntries: [path], initialIndex: 0 });

describe('GlobalErrorPage', () => {
  it('renders default error message', () => {
    render(<RouterProvider router={genRoute('/')} />);
    expect(screen.queryByText('Global Error')).toBeNull();
    expect(
      screen.queryByText('An unexpected error has occurred. Please try again later.'),
    ).toBeNull();
  });

  it('renders error message from Error object', () => {
    render(<RouterProvider router={genRoute('/a')} />);
    expect(screen.getByText('Global Error')).toBeDefined();
    expect(screen.getByText('Boom goes the dynamite')).toBeDefined();
  });

  it('renders error message from string', () => {
    render(<RouterProvider router={genRoute('/b')} />);
    expect(screen.getByText('Global Error')).toBeDefined();
    expect(screen.getByText('String error')).toBeDefined();
  });

  it('renders error message from object with statusText', () => {
    render(<RouterProvider router={genRoute('/c')} />);
    expect(screen.getByText('Global Error')).toBeDefined();
    expect(screen.getByText('This is not a drill')).toBeDefined();
  });

  it('renders error message from object with empty statusText', () => {
    render(<RouterProvider router={genRoute('/d')} />);
    expect(screen.getByText('Global Error')).toBeDefined();
    expect(screen.getByText('That Error')).toBeDefined();
  });
});
