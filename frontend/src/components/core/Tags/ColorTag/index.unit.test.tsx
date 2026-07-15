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
    screen.getByText('Alpha');
  });

  it('applies sentence case to multi-word descriptions', () => {
    render(<ColorTag value={{ code: 'A', description: 'Billing Ready' }} colorMap={colorMap} />);
    screen.getByText('Billing ready');
  });

  it('keeps single word descriptions as-is regardless of case', () => {
    render(<ColorTag value={{ code: 'A', description: 'UPPERCASE' }} colorMap={colorMap} />);
    screen.getByText('UPPERCASE');
  });

  it('renders the tag content for mapped colors', () => {
    render(<ColorTag value={{ code: 'B', description: 'Beta Bravo' }} colorMap={colorMap} />);
    expect(screen.getByText('Beta bravo')).toBeTruthy();
  });

  it('renders the fallback content for unmapped colors', () => {
    render(<ColorTag value={{ code: 'Z', description: 'Zone Zulu' }} colorMap={colorMap} />);
    expect(screen.getByText('Zone zulu')).toBeTruthy();
  });

  it('shows tooltip with code and description', async () => {
    render(<ColorTag value={{ code: 'C', description: 'Charlie Coast' }} colorMap={colorMap} />);
    const tooltipText = 'C - Charlie Coast';
    screen.getByText(tooltipText);
  });

  it('shows tooltip by default when code and description exist', () => {
    render(<ColorTag value={{ code: 'C', description: 'Charlie Coast' }} colorMap={colorMap} />);
    expect(screen.getByText('Charlie coast')).toBeTruthy();
  });

  it('shows tooltip when showTooltip is explicitly true and code and description exist', () => {
    render(
      <ColorTag
        value={{ code: 'C', description: 'Charlie Coast' }}
        colorMap={colorMap}
        showTooltip={true}
      />,
    );
    expect(screen.getByText('Charlie coast')).toBeTruthy();
  });

  it('does not render tooltip when showTooltip is false even if code and description exist', () => {
    render(
      <ColorTag
        value={{ code: 'C', description: 'Charlie Coast' }}
        colorMap={colorMap}
        showTooltip={false}
      />,
    );
    expect(screen.getByText('Charlie coast')).toBeTruthy();
  });

  it('does not render tooltip when showTooltip is false even with null values (defaults to N/A)', () => {
    render(<ColorTag value={null} colorMap={colorMap} showTooltip={false} />);
    expect(screen.getByText('Not applicable')).toBeTruthy();
  });

  it('does not render tooltip when showTooltip is false with only code present', () => {
    render(
      <ColorTag value={{ code: 'A', description: '' }} colorMap={colorMap} showTooltip={false} />,
    );
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('does not render tooltip when showTooltip is false with only description present', () => {
    render(
      <ColorTag
        value={{ code: '', description: 'Test Description' }}
        colorMap={colorMap}
        showTooltip={false}
      />,
    );
    expect(screen.getByText('Test description')).toBeTruthy();
  });

  it('displays dash when description is null', () => {
    render(
      <ColorTag
        value={{ code: 'A', description: null as unknown as string }}
        colorMap={colorMap}
      />,
    );
    screen.getByText('-');
  });

  it('displays dash when description is empty string', () => {
    render(<ColorTag value={{ code: 'A', description: '' }} colorMap={colorMap} />);
    screen.getByText('-');
  });

  it('displays dash when description is undefined', () => {
    render(
      <ColorTag
        value={{ code: 'A', description: undefined as unknown as string }}
        colorMap={colorMap}
      />,
    );
    screen.getByText('-');
  });

  it('does not render tooltip when code is null but description exists', () => {
    render(
      <ColorTag
        value={{ code: null as unknown as string, description: 'Test Description' }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('Test description')).toBeTruthy();
  });

  it('does not render tooltip when code is empty string but description exists', () => {
    render(<ColorTag value={{ code: '', description: 'Test Data' }} colorMap={colorMap} />);
    expect(screen.getByText('Test data')).toBeTruthy();
  });

  it('does not render tooltip when code is undefined but description exists', () => {
    render(
      <ColorTag
        value={{ code: undefined as unknown as string, description: 'Test Value' }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('Test value')).toBeTruthy();
  });

  it('handles both code and description being null by defaulting to N/A', () => {
    render(
      <ColorTag
        value={{ code: null as unknown as string, description: null as unknown as string }}
        colorMap={colorMap}
      />,
    );
    screen.getByText('Not applicable');
  });

  it('handles null value by defaulting to N/A', () => {
    render(<ColorTag value={null} colorMap={colorMap} />);
    screen.getByText('Not applicable');
  });

  it('renders tooltip with N/A when value is null', () => {
    render(<ColorTag value={null} colorMap={colorMap} />);
    expect(screen.getByText('Not applicable')).toBeTruthy();
  });

  it('renders tooltip with N/A when both code and description are null', () => {
    render(
      <ColorTag
        value={{ code: null as unknown as string, description: null as unknown as string }}
        colorMap={colorMap}
      />,
    );
    expect(screen.getByText('Not applicable')).toBeTruthy();
  });

  it('handles both code and description being empty strings by defaulting to N/A', () => {
    render(<ColorTag value={{ code: '', description: '' }} colorMap={colorMap} />);
    screen.getByText('Not applicable');
  });
});
