import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DESELECT_CLIENT } from '../constants';

import DistrictItem from './index';

import type { ForestClientDto } from '@/services/types';

const mockClient = {
  clientNumber: '00000001',
  clientName: 'COMPANY ONE',
  clientStatusCode: { code: 'ACT', description: 'Active' },
  clientTypeCode: { code: 'C', description: 'Corporation' },
  acronym: 'CORP',
} as ForestClientDto;

describe('DistrictItem', () => {
  it('renders client info and avatar', () => {
    render(<DistrictItem client={mockClient} isSelected={false} isLoading={false} />);
    expect(screen.getByText('COMPANY ONE')).toBeDefined();
    expect(screen.getByText('ID 00000001')).toBeDefined();
    expect(screen.getByTestId('client-icon')).toBeDefined();
  });
  it('renders selected client info and avatar', () => {
    render(<DistrictItem client={mockClient} isSelected={true} isLoading={false} />);
    expect(screen.getByText('COMPANY ONE')).toBeDefined();
    expect(screen.getByText('ID 00000001')).toBeDefined();
    expect(screen.getByTestId('selected-icon')).toBeDefined();
  });
  it('renders loading', () => {
    render(<DistrictItem client={mockClient} isSelected={true} isLoading={true} />);
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
    expect(screen.queryByText('COMPANY ONE')).toBeNull();
    expect(screen.queryByText('ID 00000001')).toBeNull();
    expect(screen.queryByTestId('selected-icon')).toBeNull();
  });
  it('renders no client', () => {
    render(<DistrictItem client={DESELECT_CLIENT} isSelected={true} isLoading={false} />);
    expect(screen.queryByTestId('loading-skeleton')).toBeNull();
    expect(screen.queryByText('No district selected')).toBeDefined();
    expect(screen.queryByTestId('selected-icon')).toBeDefined();
  });
  it('renders default help icon', () => {
    render(
      <DistrictItem
        client={{ ...mockClient, clientTypeCode: { code: 'D', description: 'Defined' } }}
        isSelected={false}
        isLoading={true}
      />,
    );
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
    expect(screen.queryByText('COMPANY ONE')).toBeNull();
    expect(screen.queryByText('ID 00000001')).toBeNull();
    expect(screen.queryByTestId('default-icon')).toBeNull();
  });
});
