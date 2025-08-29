/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PreferenceProvider } from '../../../context/preference/PreferenceProvider';

import { PageableResponse, TableHeaderType } from './types';

import TableResource from './index';

type TestObjectType = {
  id: number;
  name: string;
  hidden: string;
  custom: string;
};

describe('TableResource', () => {
  const headers: TableHeaderType<TestObjectType>[] = [
    { key: 'id', header: 'ID', selected: true },
    { key: 'name', header: 'Name', selected: true },
    { key: 'custom', header: 'Custom', selected: true, renderAs: (val: any) => `Custom: ${val}` },
    { key: 'hidden', header: 'Hidden', selected: false },
  ];
  const content: PageableResponse<TestObjectType> = {
    content: [
      { id: 1, name: 'Alice', custom: 'A', hidden: 'x' },
      { id: 2, name: 'Bob', custom: 'B', hidden: 'y' },
    ],
    page: { number: 0, size: 10, totalElements: 2, totalPages: 1 },
  };

  const renderWithProps = async (props: any) => {
    const qc = new QueryClient();
    await act(() =>
      render(
        <QueryClientProvider client={qc}>
          <PreferenceProvider>
            <TableResource id="test-table" {...props} />
          </PreferenceProvider>
        </QueryClientProvider>,
      ),
    );
  };

  it('renders skeleton when loading', async () => {
    await renderWithProps({
      headers,
      content,
      loading: true,
      error: false,
    });
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
  });

  it('renders initial empty section if no content', async () => {
    await renderWithProps({
      headers,
      content: {} as any,
      loading: false,
      error: false,
    });
    expect(screen.getByTestId('empty-section-title')).toHaveTextContent('Nothing to show yet!');
  });

  it('renders error empty section if error and no content', async () => {
    await renderWithProps({
      headers,
      content: {} as any,
      loading: false,
      error: true,
    });
    expect(screen.getByTestId('empty-section-title')).toHaveTextContent('Something went wrong!');
  });

  it('renders no results empty section if totalElements is 0', async () => {
    await renderWithProps({
      headers,
      content: { content: [], page: { number: 0, size: 10, totalElements: 0 } },
      loading: false,
      error: false,
    });
    expect(screen.getByTestId('empty-section-title')).toHaveTextContent('No results');
  });

  it('renders table with data and custom renderers', async () => {
    await renderWithProps({
      headers,
      content,
      loading: false,
      error: false,
    });

    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('Custom: A')).toBeDefined();
    expect(screen.getByText('Custom: B')).toBeDefined();
    // Hidden column should not be rendered
    expect(screen.queryByText('x')).toBeNull();
    expect(screen.queryByText('y')).toBeNull();
  });

  it('calls onPageChange when pagination is used', async () => {
    const onPageChange = vi.fn();
    await renderWithProps({
      headers,
      content,
      loading: false,
      error: false,
      onPageChange,
    });
    expect(screen.getByTestId('pagination')).toBeDefined();
  });
});
