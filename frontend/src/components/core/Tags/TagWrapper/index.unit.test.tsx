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
    screen.getByText('Content');
  });

  it('shouldRenderTag', () => {
    render(
      <TagWrapper tag={<span data-testid="the-tag">MyTag</span>}>
        <span>Content</span>
      </TagWrapper>,
    );
    screen.getByTestId('the-tag');
  });

  it('shouldApplyTagWrapperClass', () => {
    render(
      <TagWrapper tag={<span>Tag</span>}>
        <span data-testid="child">Content</span>
      </TagWrapper>,
    );
    expect(screen.getByText('Content')).toBeTruthy();
    expect(screen.getByText('Tag')).toBeTruthy();
  });

  it('shouldRenderTagAfterChildren_whenPositionIsRight', () => {
    render(
      <TagWrapper tag={<span data-testid="tag">Tag</span>} position="right">
        <span data-testid="child">Child</span>
      </TagWrapper>,
    );
    const child = screen.getByText('Child');
    const tag = screen.getByText('Tag');
    expect(child.compareDocumentPosition(tag) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shouldRenderTagBeforeChildren_whenPositionIsLeft', () => {
    render(
      <TagWrapper tag={<span data-testid="tag">Tag</span>} position="left">
        <span data-testid="child">Child</span>
      </TagWrapper>,
    );
    const child = screen.getByText('Child');
    const tag = screen.getByText('Tag');
    expect(tag.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shouldDefaultPositionToRight_whenPositionOmitted', () => {
    render(
      <TagWrapper tag={<span data-testid="tag">Tag</span>}>
        <span data-testid="child">Child</span>
      </TagWrapper>,
    );
    const child = screen.getByText('Child');
    const tag = screen.getByText('Tag');
    expect(child.compareDocumentPosition(tag) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
