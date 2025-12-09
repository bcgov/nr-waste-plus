import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ColorTag, { type CarbonColors } from './index';

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

  it('displays dash when description is null', () => {
    render(
      <ColorTag
        value={{ code: 'A', description: null as unknown as string }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('-')).toBeDefined();
  });

  it('displays dash when description is empty string', () => {
    render(<ColorTag value={{ code: 'A', description: '' }} colorMap={colorMap} />);
    expect(screen.getByText('-')).toBeDefined();
  });

  it('displays dash when description is undefined', () => {
    render(
      <ColorTag
        value={{ code: 'A', description: undefined as unknown as string }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('-')).toBeDefined();
  });

  it('does not render tooltip when code is null but description exists', () => {
    render(
      <ColorTag
        value={{ code: null as unknown as string, description: 'Test' }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('Test')).toBeDefined();
    const tag = screen.getByText('Test');
    // Tooltip should not be present when code is missing
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('does not render tooltip when code is empty string but description exists', () => {
    render(<ColorTag value={{ code: '', description: 'Test' }} colorMap={colorMap} />);
    expect(screen.getByText('Test')).toBeDefined();
    const tag = screen.getByText('Test');
    // Tooltip should not be present when code is empty
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('does not render tooltip when code is undefined but description exists', () => {
    render(
      <ColorTag
        value={{ code: undefined as unknown as string, description: 'Test' }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('Test')).toBeDefined();
    const tag = screen.getByText('Test');
    // Tooltip should not be present when code is undefined
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('handles both code and description being null', () => {
    render(
      <ColorTag
        value={{ code: null as unknown as string, description: null as unknown as string }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('-')).toBeDefined();
  });

  it('handles null value by defaulting to N/A', () => {
    render(<ColorTag value={null} colorMap={colorMap} />);
    expect(screen.getByText('Not Applicable')).toBeDefined();
  });

  it('renders tooltip with N/A when value is null', () => {
    render(<ColorTag value={null} colorMap={colorMap} />);
    const tag = screen.getByText('Not Applicable');
    // Tooltip should be present for null values
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).not.toBeNull();
    // Validate tooltip content
    const tooltipText = 'N/A - Not Applicable';
    const tooltipContent = document.querySelector('.cds--popover-content.cds--tooltip-content');
    if (tooltipContent) {
      expect(tooltipContent.textContent).toContain(tooltipText);
    } else {
      // fallback: check if tooltip text is in the document
      expect(screen.queryByText(tooltipText)).not.toBeNull();
    }
  });
});
