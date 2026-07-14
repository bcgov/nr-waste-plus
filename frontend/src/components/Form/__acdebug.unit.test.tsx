import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import AutoCompleteInput from './AutoCompleteInput';

import APIs from '@/services/APIs';

vi.mock('@/services/APIs', () => ({
  default: { forestclient: { searchForestClients: vi.fn().mockResolvedValue([]) } },
}));

describe('ac-direct', () => {
  it('renders testid?', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AutoCompleteInput
          id="x"
          data-testid="forestclient-client-ac"
          titleText="Client"
          onAutoCompleteChange={async () => []}
          onSelect={() => {}}
        />
      </QueryClientProvider>,
    );
    await new Promise((r) => setTimeout(r, 50));
    try {
      const el = screen.getByTestId('forestclient-client-ac');
      console.log('AC_FOUND:' + (el?.tagName ?? 'none'));
    } catch {
      console.log('AC_NOTFOUND');
    }
    try {
      const el2 = screen.getByTestId('select-client-btn');
      console.log('BTN_FOUND');
    } catch {
      console.log('BTN_NOTFOUND');
    }
  });
});
