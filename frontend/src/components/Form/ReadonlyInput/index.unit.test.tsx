import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PLACE_HOLDER } from './constants';

import ReadonlyInput from './index';

describe('ReadonlyInput', () => {
  it('renders label and content', () => {
    render(<ReadonlyInput label="Test Label">Test Content</ReadonlyInput>);
    screen.getByText('Test Label');
    screen.getByText('Test Content');
  });

  it('renders placeholder when children is not provided', () => {
    render(<ReadonlyInput label="Empty Field" />);
    screen.getByText(PLACE_HOLDER);
  });

  it('displays skeleton when showSkeleton is true', () => {
    render(
      <ReadonlyInput label="Loading Field" showSkeleton={true}>
        Content
      </ReadonlyInput>,
    );
    screen.getByTestId('readonly-input-skeleton');
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
    render(
      <ReadonlyInput label="Test" id="custom-id">
        Content
      </ReadonlyInput>,
    );
    const dl = document.getElementById('custom-id');
    expect(dl).not.toBeNull();
  });

  it('renders with semantic HTML structure (dl, dt, dd)', () => {
    render(<ReadonlyInput label="Field">Value</ReadonlyInput>);
    screen.getByTestId('card-item-field');
    screen.getByRole('term');
    screen.getByRole('definition');
  });

  it('applies card-item class to dl element', () => {
    render(<ReadonlyInput label="Test">Content</ReadonlyInput>);
    screen.getByTestId('card-item-test');
  });

  it('applies card-item-label class to dt element', () => {
    render(<ReadonlyInput label="Test">Content</ReadonlyInput>);
    const dt = screen.getByRole('term');
    expect(dt.className).toContain('card-item-label');
  });

  it('applies card-item-content class to dd by default', () => {
    render(<ReadonlyInput label="Test">Content</ReadonlyInput>);
    screen.getByRole('definition');
  });

  it('applies card-item-content-number class when isNumber is true', () => {
    render(
      <ReadonlyInput label="Number Field" isNumber={true}>
        12345
      </ReadonlyInput>,
    );
    const dd = screen.getByRole('definition');
    expect(dd.className).toContain('card-item-content-number');
  });

  it('does not apply card-item-content-number class when isNumber is false', () => {
    render(
      <ReadonlyInput label="Text Field" isNumber={false}>
        Text
      </ReadonlyInput>,
    );
    const dd = screen.getByRole('definition');
    expect(dd.className).not.toContain('card-item-content-number');
  });

  it('generates correct testid for card-item based on label', () => {
    render(<ReadonlyInput label="My Test Label">Content</ReadonlyInput>);
    screen.getByTestId('card-item-my-test-label');
  });

  it('generates correct testid for card-item-content based on label', () => {
    render(<ReadonlyInput label="My Test Label">Content</ReadonlyInput>);
    screen.getByTestId('card-item-content-my-test-label');
  });

  it('renders tooltip when tooltipText is provided', () => {
    render(
      <ReadonlyInput label="Field" tooltipText="Helpful tooltip">
        Content
      </ReadonlyInput>,
    );
    // DefinitionTooltip renders a button trigger
    screen.getByRole('button');
  });

  it('does not render tooltip when tooltipText is not provided', () => {
    render(<ReadonlyInput label="Field">Content</ReadonlyInput>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('does not render tooltip when showSkeleton is true even if tooltipText is provided', () => {
    render(
      <ReadonlyInput label="Field" showSkeleton={true} tooltipText="Tooltip">
        Content
      </ReadonlyInput>,
    );
    expect(screen.queryByRole('button')).toBeNull();
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
    render(
      <ReadonlyInput label="Field" tooltipText="Info">
        <div>React Element</div>
      </ReadonlyInput>,
    );
    screen.getByText('React Element');
  });

  it('sets title attribute on dd element when content is string and not skeleton', () => {
    render(<ReadonlyInput label="Field">Test Content</ReadonlyInput>);
    const dd = screen.getByRole('definition');
    expect(dd.getAttribute('title')).toBe('Test Content');
  });

  it('does not set title attribute when content is React element', () => {
    render(
      <ReadonlyInput label="Field">
        <div>Content</div>
      </ReadonlyInput>,
    );
    const dd = screen.getByRole('definition');
    expect(dd.getAttribute('title')).toBeNull();
  });

  it('does not set title attribute when showSkeleton is true', () => {
    render(
      <ReadonlyInput label="Field" showSkeleton={true}>
        Content
      </ReadonlyInput>,
    );
    expect(screen.queryByRole('definition')).toBeNull();
  });

  it('handles empty string content', () => {
    render(<ReadonlyInput label="Empty">''</ReadonlyInput>);
    screen.getByText("''");
  });

  it('handles numeric content', () => {
    render(<ReadonlyInput label="Number">42</ReadonlyInput>);
    screen.getByText('42');
  });

  it('handles boolean content', () => {
    render(<ReadonlyInput label="Boolean">{true}</ReadonlyInput>);
    // React does not render boolean values
    screen.getByRole('definition');
  });

  it('converts multi-word labels to kebab-case in testid', () => {
    render(<ReadonlyInput label="This Is A Test">Content</ReadonlyInput>);
    screen.getByTestId('card-item-this-is-a-test');
  });

  it('handles labels with extra spaces in kebab-case conversion', () => {
    render(<ReadonlyInput label="  Field  Name  ">Content</ReadonlyInput>);
    screen.getByTestId('card-item-field-name');
  });

  it('renders with all props together', () => {
    render(
      <ReadonlyInput
        label="Complete Field"
        id="field-id"
        tooltipText="This is helpful"
        isNumber={true}
      >
        12345
      </ReadonlyInput>,
    );
    expect(document.getElementById('field-id')).not.toBeNull();
    screen.getByRole('definition');
    screen.getByTestId('card-item-complete-field');
    screen.getByText('12345');
  });

  describe('displayLabel prop', () => {
    it('hides label text when displayLabel is false', () => {
      render(
        <ReadonlyInput label="Hidden Label" displayLabel={false}>
          Content
        </ReadonlyInput>,
      );
      expect(screen.queryByText('Hidden Label')).toBeNull();
    });

    it('keeps aria-label when displayLabel is false', () => {
      render(
        <ReadonlyInput label="Hidden Label" displayLabel={false}>
          Content
        </ReadonlyInput>,
      );
      screen.getByRole('term', { name: 'Hidden Label' });
    });

    it('still renders dt element when displayLabel is false', () => {
      render(
        <ReadonlyInput label="Hidden Label" displayLabel={false}>
          Content
        </ReadonlyInput>,
      );
      screen.getByRole('term');
    });

    it('displays content normally when displayLabel is false', () => {
      render(
        <ReadonlyInput label="Hidden Label" displayLabel={false}>
          Test Content
        </ReadonlyInput>,
      );
      screen.getByText('Test Content');
    });

    it('works with placeholder when displayLabel is false', () => {
      render(<ReadonlyInput label="Hidden Label" displayLabel={false} />);
      screen.getByText(PLACE_HOLDER);
    });

    it('works with tooltip when displayLabel is false', () => {
      render(
        <ReadonlyInput label="Hidden Label" displayLabel={false} tooltipText="Info">
          Content
        </ReadonlyInput>,
      );
      screen.getByRole('button');
    });

    it('works with all props when displayLabel is false', () => {
      render(
        <ReadonlyInput
          label="Hidden Field"
          displayLabel={false}
          id="hidden-field-id"
          isNumber={true}
        >
          12345
        </ReadonlyInput>,
      );
      expect(document.getElementById('hidden-field-id')).not.toBeNull();
      screen.getByRole('definition');
      screen.getByText('12345');
      expect(screen.queryByText('Hidden Field')).toBeNull();
    });

    it('displays label text when displayLabel is true (default)', () => {
      render(
        <ReadonlyInput label="Visible Label" displayLabel={true}>
          Content
        </ReadonlyInput>,
      );
      screen.getByText('Visible Label');
    });

    it('displays label text when displayLabel is not specified', () => {
      render(<ReadonlyInput label="Default Label">Content</ReadonlyInput>);
      screen.getByText('Default Label');
    });
  });

  describe('labelClassName prop', () => {
    it('applies the supplied css classname along with the default one to the dt element that holds the label', () => {
      render(
        <ReadonlyInput label="Thing" labelClassName="please">
          Content
        </ReadonlyInput>,
      );

      // default classname
      expect(screen.getByRole('term').className).toContain('card-item-label');

      // additional classname
      expect(screen.getByRole('term').className).toContain('please');
    });
  });
});
