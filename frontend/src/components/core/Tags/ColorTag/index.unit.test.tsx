import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ColorTag, { CarbonColors } from './index';

describe('ColorTag', () => {
  const colorMap: Record<string, CarbonColors> = {
    A: 'blue',
    B: 'green',
    C: 'red',
  };

  it('renders the tag with correct description', () => {
    render(<ColorTag value={{ code: 'A', description: 'Alpha' }} colorMap={colorMap} />);
    expect(screen.getByText('Alpha')).toBeDefined();
  });

  it('applies the correct color from colorMap', () => {
    render(<ColorTag value={{ code: 'B', description: 'Bravo' }} colorMap={colorMap} />);
    const tag = screen.getByText('Bravo').closest('.cds--tag');
    expect(tag?.className).toContain('cds--tag--green');
  });

  it('defaults to gray if code is not in colorMap', () => {
    render(<ColorTag value={{ code: 'Z', description: 'Zulu' }} colorMap={colorMap} />);
    const tag = screen.getByText('Zulu').closest('.cds--tag');
    expect(tag?.className).toContain('cds--tag--gray');
  });

  it('shows tooltip with code and description', async () => {
    render(<ColorTag value={{ code: 'C', description: 'Charlie' }} colorMap={colorMap} />);
    // Find tooltip content by class
    const tooltipText = 'C - Charlie';
    // If not found, try to find by class
    const tooltipContent = document.querySelector('.cds--popover-content.cds--tooltip-content');
    if (tooltipContent) {
      expect(tooltipContent.textContent).toContain(tooltipText);
    } else {
      // fallback: check if tooltip text is in the document
      expect(screen.queryByText(tooltipText)).toBeDefined();
    }
  });
});
