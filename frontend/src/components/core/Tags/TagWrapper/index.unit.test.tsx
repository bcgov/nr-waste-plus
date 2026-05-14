import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import TagWrapper from './index';

describe('TagWrapper', () => {
  it('shouldRenderChildren', () => {
    render(
      <TagWrapper tag={<span>Tag</span>}>
        <span>Content</span>
      </TagWrapper>,
    );
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('shouldRenderTag', () => {
    render(
      <TagWrapper tag={<span data-testid="the-tag">MyTag</span>}>
        <span>Content</span>
      </TagWrapper>,
    );
    expect(screen.getByTestId('the-tag')).toBeDefined();
  });

  it('shouldApplyTagWrapperClass', () => {
    render(
      <TagWrapper tag={<span>Tag</span>}>
        <span data-testid="child">Content</span>
      </TagWrapper>,
    );
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper?.className).toContain('tag-wrapper');
  });

  it('shouldRenderTagAfterChildren_whenPositionIsRight', () => {
    render(
      <TagWrapper tag={<span data-testid="tag">Tag</span>} position="right">
        <span data-testid="child">Child</span>
      </TagWrapper>,
    );
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper?.firstChild).toBe(screen.getByTestId('child'));
    expect(wrapper?.lastChild).toBe(screen.getByTestId('tag'));
  });

  it('shouldRenderTagBeforeChildren_whenPositionIsLeft', () => {
    render(
      <TagWrapper tag={<span data-testid="tag">Tag</span>} position="left">
        <span data-testid="child">Child</span>
      </TagWrapper>,
    );
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper?.firstChild).toBe(screen.getByTestId('tag'));
    expect(wrapper?.lastChild).toBe(screen.getByTestId('child'));
  });

  it('shouldDefaultPositionToRight_whenPositionOmitted', () => {
    render(
      <TagWrapper tag={<span data-testid="tag">Tag</span>}>
        <span data-testid="child">Child</span>
      </TagWrapper>,
    );
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper?.firstChild).toBe(screen.getByTestId('child'));
    expect(wrapper?.lastChild).toBe(screen.getByTestId('tag'));
  });
});
