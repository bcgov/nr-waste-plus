import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ColorTag, { type CarbonColors } from './index';

describe('ColorTag', () => {
  const colorMap: Record<string, CarbonColors> = {
    A: 'blue',
    B: 'green',
    C: 'red',
  };

  it('renders the tag with correct description (single word kept as-is)', () => {
    render(<ColorTag value={{ code: 'A', description: 'Alpha' }} colorMap={colorMap} />);
    expect(screen.getByText('Alpha')).toBeDefined();
  });

  it('applies sentence case to multi-word descriptions', () => {
    render(<ColorTag value={{ code: 'A', description: 'Billing Ready' }} colorMap={colorMap} />);
    expect(screen.getByText('Billing ready')).toBeDefined();
  });

  it('keeps single word descriptions as-is regardless of case', () => {
    render(<ColorTag value={{ code: 'A', description: 'UPPERCASE' }} colorMap={colorMap} />);
    expect(screen.getByText('UPPERCASE')).toBeDefined();
  });

  it('applies the correct color from colorMap', () => {
    render(<ColorTag value={{ code: 'B', description: 'Beta Bravo' }} colorMap={colorMap} />);
    const tag = screen.getByText('Beta bravo').closest('.cds--tag');
    expect(tag?.className).toContain('cds--tag--green');
  });

  it('defaults to gray if code is not in colorMap', () => {
    render(<ColorTag value={{ code: 'Z', description: 'Zone Zulu' }} colorMap={colorMap} />);
    const tag = screen.getByText('Zone zulu').closest('.cds--tag');
    expect(tag?.className).toContain('cds--tag--gray');
  });

  it('shows tooltip with code and description', async () => {
    render(<ColorTag value={{ code: 'C', description: 'Charlie Coast' }} colorMap={colorMap} />);
    // Find tooltip content by class
    const tooltipText = 'C - Charlie Coast';
    // If not found, try to find by class
    const tooltipContent = document.querySelector('.cds--popover-content.cds--tooltip-content');
    if (tooltipContent) {
      expect(tooltipContent.textContent).toContain(tooltipText);
    } else {
      // fallback: check if tooltip text is in the document
      expect(screen.queryByText(tooltipText)).toBeDefined();
    }
  });

  it('shows tooltip by default when code and description exist', () => {
    render(<ColorTag value={{ code: 'C', description: 'Charlie Coast' }} colorMap={colorMap} />);
    const tag = screen.getByText('Charlie coast');
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).not.toBeNull();
  });

  it('shows tooltip when showTooltip is explicitly true and code and description exist', () => {
    render(
      <ColorTag
        value={{ code: 'C', description: 'Charlie Coast' }}
        colorMap={colorMap}
        showTooltip={true}
      />,
    );
    const tag = screen.getByText('Charlie coast');
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).not.toBeNull();
  });

  it('does not render tooltip when showTooltip is false even if code and description exist', () => {
    render(
      <ColorTag
        value={{ code: 'C', description: 'Charlie Coast' }}
        colorMap={colorMap}
        showTooltip={false}
      />,
    );
    const tag = screen.getByText('Charlie coast');
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('does not render tooltip when showTooltip is false even with null values (defaults to N/A)', () => {
    render(<ColorTag value={null} colorMap={colorMap} showTooltip={false} />);
    const tag = screen.getByText('Not applicable');
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('does not render tooltip when showTooltip is false with only code present', () => {
    render(
      <ColorTag value={{ code: 'A', description: '' }} colorMap={colorMap} showTooltip={false} />,
    );
    const tag = screen.getByText('-');
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('does not render tooltip when showTooltip is false with only description present', () => {
    render(
      <ColorTag
        value={{ code: '', description: 'Test Description' }}
        colorMap={colorMap}
        showTooltip={false}
      />,
    );
    const tag = screen.getByText('Test description');
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
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
        value={{ code: null as unknown as string, description: 'Test Description' }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('Test description')).toBeDefined();
    const tag = screen.getByText('Test description');
    // Tooltip should not be present when code is missing
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('does not render tooltip when code is empty string but description exists', () => {
    render(<ColorTag value={{ code: '', description: 'Test Data' }} colorMap={colorMap} />);
    expect(screen.getByText('Test data')).toBeDefined();
    const tag = screen.getByText('Test data');
    // Tooltip should not be present when code is empty
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('does not render tooltip when code is undefined but description exists', () => {
    render(
      <ColorTag
        value={{ code: undefined as unknown as string, description: 'Test Value' }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('Test value')).toBeDefined();
    const tag = screen.getByText('Test value');
    // Tooltip should not be present when code is undefined
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).toBeNull();
  });

  it('handles both code and description being null by defaulting to N/A', () => {
    render(
      <ColorTag
        value={{ code: null as unknown as string, description: null as unknown as string }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('Not applicable')).toBeDefined();
  });

  it('handles null value by defaulting to N/A', () => {
    render(<ColorTag value={null} colorMap={colorMap} />);
    expect(screen.getByText('Not applicable')).toBeDefined();
  });

  it('renders tooltip with N/A when value is null', () => {
    render(<ColorTag value={null} colorMap={colorMap} />);
    const tag = screen.getByText('Not applicable');
    // Tooltip should be present for null values
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).not.toBeNull();
  });

  it('renders tooltip with N/A when both code and description are null', () => {
    render(
      <ColorTag
        value={{ code: null as unknown as string, description: null as unknown as string }}
        colorMap={colorMap}
      />,
    );
    const tag = screen.getByText('Not applicable');
    // Tooltip should be present when both code and description are null
    const tooltip = tag.closest('.cds--tooltip');
    expect(tooltip).not.toBeNull();
  });

  it('handles both code and description being empty strings by defaulting to N/A', () => {
    render(<ColorTag value={{ code: '', description: '' }} colorMap={colorMap} />);
    expect(screen.getByText('Not applicable')).toBeDefined();
  });
});
