import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import TooltipRedirectLinkTag from './index.tsx';

vi.mock('@/components/core/Tags/RedirectLinkTag', () => ({
  default: ({
    text,
    url,
    sameTab,
    clearSearch,
    tooltip,
  }: {
    text: string;
    url: string;
    sameTab?: boolean;
    clearSearch?: boolean;
    tooltip?: string;
  }) => (
    <a
      href={url}
      target={sameTab ? '_self' : '_blank'}
      data-testid="redirect-link-tag"
      data-clear-search={clearSearch}
      data-tooltip={tooltip}
    >
      {text}
    </a>
  ),
}));

describe('TooltipRedirectLinkTag', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shouldForwardTooltipToRedirectLinkTag_whenTooltipIsProvided', () => {
    render(
      <TooltipRedirectLinkTag
        tooltip="Click to open link"
        text="Click here"
        url="https://example.com"
      />,
    );

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag).toBeTruthy();
    expect(linkTag).toHaveProperty('href', 'https://example.com/');
    expect((linkTag as HTMLAnchorElement).dataset['tooltip']).toBe('Click to open link');
  });

  it('shouldPassTextPropToRedirectLinkTag', () => {
    render(
      <TooltipRedirectLinkTag
        tooltip="Helpful tooltip"
        text="My Custom Link"
        url="https://example.com"
      />,
    );

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag.textContent).toBe('My Custom Link');
  });

  it('shouldPassUrlPropToRedirectLinkTag', () => {
    const testUrl = 'https://specific-domain.com/path';

    render(<TooltipRedirectLinkTag tooltip="Visit site" text="Link text" url={testUrl} />);

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag).toHaveProperty('href', testUrl);
  });

  it('shouldOpenInNewTabByDefault_whenSameTabIsNotSet', () => {
    render(
      <TooltipRedirectLinkTag
        tooltip="Opens in new tab"
        text="Link text"
        url="https://example.com"
      />,
    );

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag).toHaveProperty('target', '_blank');
  });

  it('shouldOpenInSameTab_whenSameTabIsTrue', () => {
    render(
      <TooltipRedirectLinkTag
        tooltip="Opens in same tab"
        text="Link text"
        url="https://example.com"
        sameTab={true}
      />,
    );

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect(linkTag).toHaveProperty('target', '_self');
  });

  it('shouldForwardEveryTooltipValue_whenTooltipIsProvided', () => {
    const tooltipText = 'This is a detailed explanation';

    render(<TooltipRedirectLinkTag tooltip={tooltipText} text="Link" url="https://example.com" />);

    const linkTag = screen.getByTestId('redirect-link-tag');
    expect((linkTag as HTMLAnchorElement).dataset['tooltip']).toBe(tooltipText);
  });

  it('shouldNotRenderNestedInteractiveWrapper_whenTooltipIsProvided', () => {
    render(
      <TooltipRedirectLinkTag tooltip="Help text" text="Click me" url="https://example.com" />,
    );

    // The tooltip must be attached to the link itself. Carbon's DefinitionTooltip
    // renders a `button.cds--definition-term` trigger that nests the anchor and
    // violates the axe `nested-interactive` rule.
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('redirect-link-tag')).toBeTruthy();
  });

  it('shouldForwardClearSearchTrue_whenClearSearchPropIsTrue', () => {
    render(<TooltipRedirectLinkTag tooltip="Help" text="Link" url="/path" sameTab clearSearch />);
    const link = screen.getByTestId('redirect-link-tag');
    expect((link as HTMLAnchorElement).dataset['clearSearch']).toBe('true');
  });

  it('shouldForwardClearSearchFalse_whenClearSearchPropIsFalse', () => {
    render(
      <TooltipRedirectLinkTag tooltip="Help" text="Link" url="/path" sameTab clearSearch={false} />,
    );
    const link = screen.getByTestId('redirect-link-tag');
    expect((link as HTMLAnchorElement).dataset['clearSearch']).toBe('false');
  });

  it('shouldNotSetClearSearchAttribute_whenClearSearchIsNotProvided', () => {
    render(<TooltipRedirectLinkTag tooltip="Help" text="Link" url="/path" />);
    const link = screen.getByTestId('redirect-link-tag');
    expect((link as HTMLAnchorElement).dataset['clearSearch']).toBeUndefined();
  });
});
