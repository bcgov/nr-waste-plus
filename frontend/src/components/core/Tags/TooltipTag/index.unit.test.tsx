import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TooltipTag from './index';

describe('TooltipTag', () => {
  describe('with tooltip and element children', () => {
    it('renders the children', () => {
      render(
        <TooltipTag tooltip="Full description">
          <span data-testid="child-element">Code</span>
        </TooltipTag>,
      );

      expect(screen.getByTestId('child-element')).toBeTruthy();
      expect(screen.getByText('Code')).toBeTruthy();
    });

    it('renders the tooltip text in the accessibility tree', () => {
      render(
        <TooltipTag tooltip="Alder">
          <span>AL</span>
        </TooltipTag>,
      );

      const tooltipText = screen.getByText('Alder');
      expect(tooltipText).toBeTruthy();
    });

    it('renders complex children', () => {
      render(
        <TooltipTag tooltip="District description">
          <span>
            <strong>DKM</strong>
            <em>District Knowledge</em>
          </span>
        </TooltipTag>,
      );

      expect(screen.getByText('DKM')).toBeTruthy();
      expect(screen.getByText('District Knowledge')).toBeTruthy();
    });

    it('accepts custom alignment', () => {
      render(
        <TooltipTag tooltip="Bottom aligned" align="bottom">
          <span>Content</span>
        </TooltipTag>,
      );

      expect(screen.getByText('Bottom aligned')).toBeTruthy();
      expect(screen.getByText('Content')).toBeTruthy();
    });

    it('uses top alignment by default', () => {
      render(
        <TooltipTag tooltip="Default top">
          <span>Content</span>
        </TooltipTag>,
      );

      expect(screen.getByText('Default top')).toBeTruthy();
    });
  });

  describe('with tooltip and primitive children', () => {
    it('renders a string value wrapped in EmptyValueTag', () => {
      render(<TooltipTag tooltip="Alder">AL</TooltipTag>);

      expect(screen.getByText('AL')).toBeTruthy();
    });

    it('still shows the tooltip text', () => {
      render(<TooltipTag tooltip="Alder">AL</TooltipTag>);

      expect(screen.getByText('Alder')).toBeTruthy();
    });

    it('renders a numeric value', () => {
      render(<TooltipTag tooltip="Count">{42}</TooltipTag>);

      expect(screen.getByText('42')).toBeTruthy();
    });
  });

  describe('without tooltip', () => {
    it('renders element children directly without wrapping in Tooltip', () => {
      render(
        <TooltipTag>
          <span data-testid="bare">Content</span>
        </TooltipTag>,
      );

      expect(screen.getByTestId('bare')).toBeTruthy();
      expect(screen.getByText('Content')).toBeTruthy();
    });

    it('renders a string value via EmptyValueTag', () => {
      render(<TooltipTag>Value</TooltipTag>);

      expect(screen.getByText('Value')).toBeTruthy();
    });

    it('shows EmptyValueTag dash when children is absent', () => {
      render(<TooltipTag />);

      expect(screen.getByTestId('empty-value')).toBeTruthy();
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });
  });
});
