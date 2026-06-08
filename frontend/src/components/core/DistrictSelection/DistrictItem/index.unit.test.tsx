import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DESELECT_CLIENT } from '../constants';

import DistrictItem from './index';

import type { DistrictType } from '../types';

const mockClient = {
  id: '00000001',
  name: 'COMPANY ONE',
  kind: 'C',
} as DistrictType;

describe('DistrictItem', () => {
  it('renders client info and avatar', () => {
    render(<DistrictItem client={mockClient} isSelected={false} isLoading={false} />);
    screen.getByText('COMPANY ONE');
    screen.getByText('ID 00000001');
    screen.getByTestId('client-icon');
  });
  it('renders selected client info and avatar', () => {
    render(<DistrictItem client={mockClient} isSelected={true} isLoading={false} />);
    screen.getByText('COMPANY ONE');
    screen.getByText('ID 00000001');
    screen.getByTestId('selected-icon');
  });
  it('renders loading', () => {
    render(<DistrictItem client={mockClient} isSelected={true} isLoading={true} />);
    screen.getByTestId('loading-skeleton');
    expect(screen.queryByText('COMPANY ONE')).toBeNull();
    expect(screen.queryByText('ID 00000001')).toBeNull();
    expect(screen.queryByTestId('selected-icon')).toBeNull();
  });
  it('renders no client', () => {
    render(<DistrictItem client={DESELECT_CLIENT} isSelected={true} isLoading={false} />);
    expect(screen.queryByTestId('loading-skeleton')).toBeNull();
    screen.getByText('Select none');
    expect(screen.queryByTestId('selected-icon')).not.toBeNull();
  });
  it('renders default help icon', () => {
    render(
      <DistrictItem client={{ ...mockClient, kind: 'D' }} isSelected={false} isLoading={true} />,
    );
    screen.getByTestId('loading-skeleton');
    expect(screen.queryByText('COMPANY ONE')).toBeNull();
    expect(screen.queryByText('ID 00000001')).toBeNull();
    expect(screen.queryByTestId('default-icon')).toBeNull();
  });
});
