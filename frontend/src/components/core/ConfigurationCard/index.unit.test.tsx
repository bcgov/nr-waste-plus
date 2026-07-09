import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfigurationCard } from './index';

describe('ConfigurationCard', () => {
  it('renders title', () => {
    render(<ConfigurationCard title="District average waste volumes" />);
    screen.getByText('District average waste volumes');
  });

  it('renders description as string', () => {
    render(<ConfigurationCard title="Title" description="Some body text" />);
    screen.getByText('Some body text');
  });

  it('renders ReactNode description as-is without wrapping paragraph', () => {
    render(
      <ConfigurationCard
        title="Title"
        description={<span data-testid="rich-desc">Rich content</span>}
      />,
    );
    const node = screen.getByTestId('rich-desc');
    expect(node).toBeDefined();
    expect(node.tagName.toLowerCase()).toBe('span');
  });

  it('renders children instead of description when both provided', () => {
    render(
      <ConfigurationCard title="Title" description="Should not appear">
        <span>Custom children</span>
      </ConfigurationCard>,
    );
    screen.getByText('Custom children');
    expect(screen.queryByText('Should not appear')).toBeNull();
  });

  it('renders button when buttonLabel and onButtonClick provided', () => {
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="View or update tables"
        onButtonClick={onButtonClick}
      />,
    );
    screen.getByRole('button', { name: 'View or update tables' });
  });

  it('calls onButtonClick when button is clicked', async () => {
    const user = userEvent.setup();
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="View or update tables"
        onButtonClick={onButtonClick}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'View or update tables' }));
    expect(onButtonClick).toHaveBeenCalledOnce();
  });

  it('does not render button when onButtonClick is undefined', () => {
    render(<ConfigurationCard title="Title" buttonLabel="View or update tables" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('does not render button when buttonLabel is undefined', () => {
    const onButtonClick = vi.fn();
    render(<ConfigurationCard title="Title" onButtonClick={onButtonClick} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders button with default ghost kind when kind is not provided', () => {
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard title="Title" buttonLabel="Default kind" onButtonClick={onButtonClick} />,
    );
    const button = screen.getByRole('button', { name: 'Default kind' });
    expect(button.classList.contains('cds--btn--ghost')).toBe(true);
  });

  it('renders button with custom kind', () => {
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="Primary action"
        onButtonClick={onButtonClick}
        kind="primary"
      />,
    );
    const button = screen.getByRole('button', { name: 'Primary action' });
    expect(button).toBeDefined();
    expect(button.classList.contains('cds--btn--primary')).toBe(true);
  });

  it('renders button as disabled when disabled prop is true', () => {
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="Disabled action"
        onButtonClick={onButtonClick}
        disabled
      />,
    );
    const button = screen.getByRole('button', { name: 'Disabled action' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders icon when icon prop is provided', () => {
    render(<ConfigurationCard title="Title" icon={<svg data-testid="card-icon" />} />);
    expect(screen.getByTestId('card-icon')).toBeDefined();
  });

  it('does not render icon container when icon prop is absent', () => {
    const { container } = render(<ConfigurationCard title="Title" />);
    expect(container.firstChild).not.toHaveClass('configuration-card__icon');
  });

  it('renders a link element (not a button) when linkVariant is true', () => {
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="View or update tables"
        onButtonClick={onButtonClick}
        linkVariant
      />,
    );
    expect(screen.queryByRole('button', { name: 'View or update tables' })).toBeNull();
    const link = screen.getByText('View or update tables').closest('.cds--link');
    expect(link).toBeDefined();
  });

  it('renders linkIcon inside the link when linkVariant and linkIcon are provided', () => {
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="View or update tables"
        onButtonClick={vi.fn()}
        linkVariant
        linkIcon={<svg data-testid="link-icon" />}
      />,
    );
    expect(screen.getByTestId('link-icon')).toBeDefined();
  });

  it('does not call onButtonClick when linkVariant link is disabled', async () => {
    const user = userEvent.setup();
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="View or update tables"
        onButtonClick={onButtonClick}
        linkVariant
        disabled
      />,
    );
    const linkText = screen.getByText('View or update tables');
    await user.click(linkText);
    expect(onButtonClick).not.toHaveBeenCalled();
  });
});
