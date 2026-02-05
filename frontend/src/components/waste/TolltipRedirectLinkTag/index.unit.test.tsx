import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import TolltipRedirectLinkTag from './index';

vi.mock('@/components/waste/RedirectLinkTag', () => ({
  default: ({ text, url, sameTab }: { text: string; url: string; sameTab?: boolean }) => (
    <a href={url} target={sameTab ? '_self' : '_blank'} data-testid="redirect-link-tag">
      {text}
    </a>
  ),
}));

describe('TolltipRedirectLinkTag', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders link with tooltip', () => {
    render(
      <TolltipRedirectLinkTag
        tooltip="Click to open link"
        text="Click here"
        url="https://example.com"
      />,
    );

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag).toBeTruthy();
    expect(linkTag).toHaveProperty('href', 'https://example.com/');

    // Check that tooltip text is present
    const tooltipText = screen.getByText('Click to open link');
    expect(tooltipText).toBeTruthy();
  });

  it('passes text prop to link', () => {
    render(
      <TolltipRedirectLinkTag
        tooltip="Helpful tooltip"
        text="My Custom Link"
        url="https://example.com"
      />,
    );

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag.textContent).toBe('My Custom Link');
  });

  it('passes url prop to link', () => {
    const testUrl = 'https://specific-domain.com/path';

    render(<TolltipRedirectLinkTag tooltip="Visit site" text="Link text" url={testUrl} />);

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag).toHaveProperty('href', testUrl);
  });

  it('respects sameTab prop - opens in new tab by default', () => {
    render(
      <TolltipRedirectLinkTag
        tooltip="Opens in new tab"
        text="Link text"
        url="https://example.com"
      />,
    );

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag).toHaveProperty('target', '_blank');
  });

  it('respects sameTab prop - opens in same tab when specified', () => {
    render(
      <TolltipRedirectLinkTag
        tooltip="Opens in same tab"
        text="Link text"
        url="https://example.com"
        sameTab={true}
      />,
    );

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag).toHaveProperty('target', '_self');
  });

  it('renders tooltip with correct definition text', () => {
    const tooltipText = 'This is a detailed explanation';

    render(<TolltipRedirectLinkTag tooltip={tooltipText} text="Link" url="https://example.com" />);

    const tooltip = screen.getByText(tooltipText);
    expect(tooltip).toBeTruthy();
  });

  it('renders tooltip wrapper around link', () => {
    const { container } = render(
      <TolltipRedirectLinkTag tooltip="Help text" text="Click me" url="https://example.com" />,
    );

    // DefinitionTooltip from Carbon should be in the component tree
    const tooltipWrapper = container.firstChild;
    expect(tooltipWrapper).toBeTruthy();
  });
});
