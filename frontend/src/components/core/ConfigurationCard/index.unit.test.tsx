import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfigurationCard } from './index';

describe('ConfigurationCard', () => {
  it('renders title', () => {
    render(<ConfigurationCard title="District average waste volumes" />);
    expect(screen.getByText('District average waste volumes')).toBeDefined();
  });

  it('renders description as string', () => {
    render(
      <ConfigurationCard
        title="Title"
        description="Some body text"
      />,
    );
    expect(screen.getByText('Some body text')).toBeDefined();
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
      <ConfigurationCard
        title="Title"
        description="Should not appear"
      >
        <span>Custom children</span>
      </ConfigurationCard>,
    );
    expect(screen.getByText('Custom children')).toBeDefined();
    expect(screen.queryByText('Should not appear')).toBeNull();
  });

  it('renders button when buttonLabel and onButtonClick provided', () => {
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="View or update tables →"
        onButtonClick={onButtonClick}
      />,
    );
    expect(screen.getByRole('button', { name: 'View or update tables →' })).toBeDefined();
  });

  it('calls onButtonClick when button is clicked', async () => {
    const user = userEvent.setup();
    const onButtonClick = vi.fn();
    render(
      <ConfigurationCard
        title="Title"
        buttonLabel="View or update tables →"
        onButtonClick={onButtonClick}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'View or update tables →' }));
    expect(onButtonClick).toHaveBeenCalledOnce();
  });

  it('does not render button when onButtonClick is undefined', () => {
    render(<ConfigurationCard title="Title" buttonLabel="View or update tables →" />);
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
      <ConfigurationCard
        title="Title"
        buttonLabel="Default kind"
        onButtonClick={onButtonClick}
      />,
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
});
