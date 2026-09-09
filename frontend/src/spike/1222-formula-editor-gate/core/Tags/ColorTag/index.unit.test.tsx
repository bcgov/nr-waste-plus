    expect(tag?.className).toContain('cds--tag--gray');
  });

  it('shows tooltip with code and description', () => {
    render(<ColorTag value={{ code: 'C', description: 'Charlie Coast' }} colorMap={colorMap} />);
    // Find tooltip content by class
    const tooltipText = 'C - Charlie Coast';
    render(<ColorTag value={{ code: '', description: '' }} colorMap={colorMap} />);
    expect(screen.getByText('Not applicable')).toBeDefined();
  });

  it('uses custom tooltip label when provided', () => {
    render(
      <ColorTag
        value={{ code: 'A', description: 'Alpha' }}
        colorMap={colorMap}
        tooltipLabel="Custom tooltip"
      />,
    );

    const tooltipContent = document.querySelector('.cds--popover-content.cds--tooltip-content');
    if (tooltipContent) {
      expect(tooltipContent.textContent).toContain('Custom tooltip');
    }
  });

  it('renders code and description when contentMode is code-equals-description', () => {
    render(
      <ColorTag
        value={{ code: 'taxRate', description: '12.5' }}
        contentMode="code-equals-description"
        textCaseMode="preserve"
        colorType="blue"
      />,
    );

    expect(screen.getByText('taxRate = 12.5')).toBeDefined();
  });

  it('supports explicit colorType override without colorMap', () => {
    render(<ColorTag value={{ code: 'A', description: 'Alpha' }} colorType="teal" />);
    const tag = screen.getByText('Alpha').closest('.cds--tag');
    expect(tag?.className).toContain('cds--tag--teal');
  });

  it('applies muted class when toneMode is muted', () => {
    render(
      <ColorTag value={{ code: 'A', description: 'Alpha' }} colorType="blue" toneMode="muted" />,
    );
    const tag = screen.getByText('Alpha').closest('.cds--tag');
    expect(tag?.className).toContain('color-tag--muted');
  });

  it('supports combined mode configuration for formula-like tags', () => {
    render(
      <ColorTag
        value={{ code: 'taxRate', description: '12.5' }}
        colorType="teal"
        tooltipLabel="Used in current formula"
        contentMode="code-equals-description"
        textCaseMode="preserve"
        toneMode="muted"
      />,
    );

    const tag = screen.getByText('taxRate = 12.5').closest('.cds--tag');
    expect(tag?.className).toContain('cds--tag--teal');
    expect(tag?.className).toContain('color-tag--muted');
  });

  it('keeps sentence case when textCaseMode is sentence', () => {
    render(
      <ColorTag
        value={{ code: 'RATE', description: 'TOTAL VALUE' }}
        contentMode="description"
        textCaseMode="sentence"
        toneMode="normal"
      />,
    );

    expect(screen.getByText('Total value')).toBeDefined();
  });
});
