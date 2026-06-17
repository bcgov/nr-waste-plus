import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DistrictVolumeTable from './DistrictVolumeTable';

import type { InteriorData, CoastData } from '@/services/districtvolumes.types';

const interiorData: InteriorData = {
  type: 'INTERIOR',
  formulas: {},
  zones: [
    {
      name: 'Dry belt',
      districts: [
        {
          code: 'DCC',
          avoidableSawlog: 2.04,
          avoidableGrade4: 7.05,
          unavoidableGrade4: 0.08,
          total: 9.17,
        },
      ],
    },
    {
      name: 'Transition zone',
      districts: [
        {
          code: 'DNI',
          avoidableSawlog: 5.0,
          avoidableGrade4: 1.0,
          unavoidableGrade4: 0.5,
          total: 6.5,
        },
      ],
    },
    {
      name: 'Wet belt',
      districts: [],
    },
  ],
};

const coastData: CoastData = {
  type: 'COASTAL',
  formulas: {},
  sections: [
    {
      name: 'Mature',
      districts: [
        {
          code: 'DCK',
          avoidableSawlog: 16.19,
          avoidableHembalGradeU: 8.87,
          avoidableGradeY: 5.24,
          unavoidable: 1.18,
          total: 31.48,
        },
      ],
    },
    {
      name: 'Immature',
      districts: [],
    },
  ],
};

describe('DistrictVolumeTable', () => {
  it('renders interior zone tables', () => {
    render(<DistrictVolumeTable data={interiorData} />);
    expect(screen.getByText('Dry belt')).toBeTruthy();
    expect(screen.getByText('Transition zone')).toBeTruthy();
    expect(screen.getByText('Wet belt')).toBeTruthy();
  });

  it('renders interior district rows with values', () => {
    render(<DistrictVolumeTable data={interiorData} />);
    expect(screen.getByText('DCC')).toBeTruthy();
    expect(screen.getByText('2.04')).toBeTruthy();
  });

  it('renders "No data" for empty interior zone', () => {
    render(<DistrictVolumeTable data={interiorData} />);
    const tables = screen.getAllByRole('table');
    // Wet belt is the third table and has no districts
    const wetBeltTable = tables[2];
    expect(wetBeltTable.textContent).toContain('No data');
  });

  it('renders coast section tables', () => {
    render(<DistrictVolumeTable data={coastData} />);
    expect(screen.getByText('Mature')).toBeTruthy();
    expect(screen.getByText('Immature')).toBeTruthy();
  });

  it('renders coast district rows with values', () => {
    render(<DistrictVolumeTable data={coastData} />);
    expect(screen.getByText('DCK')).toBeTruthy();
    expect(screen.getByText('16.19')).toBeTruthy();
  });

  it('renders "No data" for empty coast section', () => {
    render(<DistrictVolumeTable data={coastData} />);
    const tables = screen.getAllByRole('table');
    const immatureTable = tables[1];
    expect(immatureTable.textContent).toContain('No data');
  });

  it('renders interior headers', () => {
    render(<DistrictVolumeTable data={interiorData} />);
    // 'Avoidable Sawlog (m³/ha)' appears in each zone table header
    expect(screen.getAllByText('Avoidable Sawlog (m³/ha)')).toHaveLength(3);
    // Interior-only header
    expect(screen.getAllByText('Avoidable Grade Y/4 (m³/ha)')).toHaveLength(3);
  });

  it('renders coast headers', () => {
    render(<DistrictVolumeTable data={coastData} />);
    expect(screen.getAllByText('Avoidable 0.25 (m³/ha)')).toHaveLength(2);
    expect(screen.getAllByText('Avoidable Grade Y (m³/ha)')).toHaveLength(2);
  });
});
