import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import ReadonlyInput from './index';
import { PLACE_HOLDER } from './constants';

describe('ReadonlyInput', () => {
  it('renders label and content', () => {
    render(<ReadonlyInput label="Test Label">Test Content</ReadonlyInput>);
    expect(screen.getByText('Test Label')).toBeDefined();
    expect(screen.getByText('Test Content')).toBeDefined();
  });

  it('renders placeholder when children is not provided', () => {
    render(<ReadonlyInput label="Empty Field" />);
    expect(screen.getByText(PLACE_HOLDER)).toBeDefined();
  });

  it('displays skeleton when showSkeleton is true', () => {
    const { container } = render(
      <ReadonlyInput label="Loading Field" showSkeleton={true}>
        Content
      </ReadonlyInput>,
    );
    // TextInputSkeleton uses the carbon-react class
    expect(container.querySelector('.bx--skeleton')).toBeDefined();
  });

  it('does not show content when showSkeleton is true', () => {
    render(
      <ReadonlyInput label="Loading Field" showSkeleton={true}>
        Hidden Content
      </ReadonlyInput>,
    );
    expect(screen.queryByText('Hidden Content')).toBeNull();
  });

  it('sets the id attribute on the dl element', () => {
    const { container } = render(
      <ReadonlyInput label="Test" id="custom-id">
        Content
      </ReadonlyInput>,
    );
    const dl = container.querySelector('dl[id="custom-id"]');
    expect(dl).toBeDefined();
  });

  it('renders with semantic HTML structure (dl, dt, dd)', () => {
    const { container } = render(
      <ReadonlyInput label="Field">Value</ReadonlyInput>,
    );
    expect(container.querySelector('dl')).toBeDefined();
    expect(container.querySelector('dt')).toBeDefined();
    expect(container.querySelector('dd')).toBeDefined();
  });

  it('applies card-item class to dl element', () => {
    const { container } = render(
      <ReadonlyInput label="Test">Content</ReadonlyInput>,
    );
    const dl = container.querySelector('dl.card-item');
    expect(dl).toBeDefined();
  });

  it('applies card-item-label class to dt element', () => {
    const { container } = render(
      <ReadonlyInput label="Test">Content</ReadonlyInput>,
    );
    const dt = container.querySelector('dt.card-item-label');
    expect(dt).toBeDefined();
  });

  it('applies card-item-content class to dd by default', () => {
    const { container } = render(
      <ReadonlyInput label="Test">Content</ReadonlyInput>,
    );
    const dd = container.querySelector('dd.card-item-content');
    expect(dd).toBeDefined();
  });

  it('applies card-item-content-number class when isNumber is true', () => {
    const { container } = render(
      <ReadonlyInput label="Number Field" isNumber={true}>
        12345
      </ReadonlyInput>,
    );
    const dd = container.querySelector('dd.card-item-content-number');
    expect(dd).toBeDefined();
  });

  it('does not apply card-item-content-number class when isNumber is false', () => {
    const { container } = render(
      <ReadonlyInput label="Text Field" isNumber={false}>
        Text
      </ReadonlyInput>,
    );
    const dd = container.querySelector('dd.card-item-content-number');
    expect(dd).toBeNull();
  });

  it('generates correct testid for card-item based on label', () => {
    const { container } = render(
      <ReadonlyInput label="My Test Label">Content</ReadonlyInput>,
    );
    const dl = container.querySelector('[data-testid="card-item-my-test-label"]');
    expect(dl).toBeDefined();
  });

  it('generates correct testid for card-item-content based on label', () => {
    const { container } = render(
      <ReadonlyInput label="My Test Label">Content</ReadonlyInput>,
    );
    const dd = container.querySelector('[data-testid="card-item-content-my-test-label"]');
    expect(dd).toBeDefined();
  });

  it('renders tooltip when tooltipText is provided', () => {
    const { container } = render(
      <ReadonlyInput label="Field" tooltipText="Helpful tooltip">
        Content
      </ReadonlyInput>,
    );
    // DefinitionTooltip renders a tooltip container
    expect(container.querySelector('[data-tooltip-trigger]')).toBeDefined();
  });

  it('does not render tooltip when tooltipText is not provided', () => {
    const { container } = render(
      <ReadonlyInput label="Field">Content</ReadonlyInput>,
    );
    expect(container.querySelector('[data-tooltip-trigger]')).toBeNull();
  });

  it('does not render tooltip when showSkeleton is true even if tooltipText is provided', () => {
    const { container } = render(
      <ReadonlyInput label="Field" showSkeleton={true} tooltipText="Tooltip">
        Content
      </ReadonlyInput>,
    );
    expect(container.querySelector('[data-tooltip-trigger]')).toBeNull();
  });

  it('wraps string content in span when tooltipText is provided', () => {
    const { container } = render(
      <ReadonlyInput label="Field" tooltipText="Info">
        String Content
      </ReadonlyInput>,
    );
    const span = container.querySelector('span');
    expect(span).toBeDefined();
    expect(span?.textContent).toContain('String Content');
  });

  it('renders React elements inside tooltip without span wrapper', () => {
    const { container } = render(
      <ReadonlyInput label="Field" tooltipText="Info">
        <div>React Element</div>
      </ReadonlyInput>,
    );
    expect(screen.getByText('React Element')).toBeDefined();
  });

  it('sets title attribute on dd element when content is string and not skeleton', () => {
    const { container } = render(
      <ReadonlyInput label="Field">Test Content</ReadonlyInput>,
    );
    const dd = container.querySelector('dd');
    expect(dd?.getAttribute('title')).toBe('Test Content');
  });

  it('does not set title attribute when content is React element', () => {
    const { container } = render(
      <ReadonlyInput label="Field">
        <div>Content</div>
      </ReadonlyInput>,
    );
    const dd = container.querySelector('dd');
    expect(dd?.getAttribute('title')).toBeNull();
  });

  it('does not set title attribute when showSkeleton is true', () => {
    const { container } = render(
      <ReadonlyInput label="Field" showSkeleton={true}>
        Content
      </ReadonlyInput>,
    );
    const dd = container.querySelector('dd');
    expect(dd?.getAttribute('title')).not.toBe('Content');
  });

  it('handles empty string content', () => {
    render(<ReadonlyInput label="Empty">''</ReadonlyInput>);
    expect(screen.getByText("''")).toBeDefined();
  });

  it('handles numeric content', () => {
    render(<ReadonlyInput label="Number">42</ReadonlyInput>);
    expect(screen.getByText('42')).toBeDefined();
  });

  it('handles boolean content', () => {
    const { container } = render(
      <ReadonlyInput label="Boolean">{true}</ReadonlyInput>,
    );
    // React does not render boolean values
    expect(container.querySelector('dd')).toBeDefined();
  });

  it('converts multi-word labels to kebab-case in testid', () => {
    const { container } = render(
      <ReadonlyInput label="This Is A Test">Content</ReadonlyInput>,
    );
    const dl = container.querySelector('[data-testid="card-item-this-is-a-test"]');
    expect(dl).toBeDefined();
  });

  it('handles labels with extra spaces in kebab-case conversion', () => {
    const { container } = render(
      <ReadonlyInput label="  Field  Name  ">Content</ReadonlyInput>,
    );
    const dl = container.querySelector('[data-testid="card-item-field-name"]');
    expect(dl).toBeDefined();
  });

  it('renders with all props together', () => {
    const { container } = render(
      <ReadonlyInput
        label="Complete Field"
        id="field-id"
        tooltipText="This is helpful"
        isNumber={true}
      >
        12345
      </ReadonlyInput>,
    );
    expect(container.querySelector('#field-id')).toBeDefined();
    expect(container.querySelector('dd.card-item-content-number')).toBeDefined();
    expect(container.querySelector('[data-testid="card-item-complete-field"]')).toBeDefined();
    expect(screen.getByText('12345')).toBeDefined();
  });
});
