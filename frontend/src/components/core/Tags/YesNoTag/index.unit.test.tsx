import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import YesNoTag from './index';

describe('YesNoTag', () => {
  describe('boolean values', () => {
    it('renders "Yes" for true', () => {
      render(<YesNoTag value={true} />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "No" for false', () => {
      render(<YesNoTag value={false} />);
      expect(screen.getByText('No')).toBeDefined();
    });
  });

  describe('number values', () => {
    it('renders "Yes" for positive numbers', () => {
      render(<YesNoTag value={1} />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "Yes" for large numbers', () => {
      render(<YesNoTag value={100} />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "No" for zero', () => {
      render(<YesNoTag value={0} />);
      expect(screen.getByText('No')).toBeDefined();
    });

    it('renders "No" for negative numbers', () => {
      render(<YesNoTag value={-1} />);
      expect(screen.getByText('No')).toBeDefined();
    });
  });

  describe('string values', () => {
    it('renders "Yes" for "true" (lowercase)', () => {
      render(<YesNoTag value="true" />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "Yes" for "TRUE" (uppercase)', () => {
      render(<YesNoTag value="TRUE" />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "Yes" for "True" (mixed case)', () => {
      render(<YesNoTag value="True" />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "Yes" for "t"', () => {
      render(<YesNoTag value="t" />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "Yes" for "y"', () => {
      render(<YesNoTag value="y" />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "Yes" for "yes"', () => {
      render(<YesNoTag value="yes" />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "Yes" for "YES"', () => {
      render(<YesNoTag value="YES" />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "Yes" for "  true  " (with whitespace)', () => {
      render(<YesNoTag value="  true  " />);
      expect(screen.getByText('Yes')).toBeDefined();
    });

    it('renders "No" for "false"', () => {
      render(<YesNoTag value="false" />);
      expect(screen.getByText('No')).toBeDefined();
    });

    it('renders "No" for "no"', () => {
      render(<YesNoTag value="no" />);
      expect(screen.getByText('No')).toBeDefined();
    });

    it('renders "No" for "f"', () => {
      render(<YesNoTag value="f" />);
      expect(screen.getByText('No')).toBeDefined();
    });

    it('renders "No" for "n"', () => {
      render(<YesNoTag value="n" />);
      expect(screen.getByText('No')).toBeDefined();
    });

    it('renders "No" for empty string', () => {
      render(<YesNoTag value="" />);
      expect(screen.getByText('No')).toBeDefined();
    });

    it('renders "No" for random string', () => {
      render(<YesNoTag value="random" />);
      expect(screen.getByText('No')).toBeDefined();
    });
  });

  describe('null and undefined values', () => {
    it('renders "No" for null', () => {
      render(<YesNoTag value={null} />);
      expect(screen.getByText('No')).toBeDefined();
    });

    it('renders "No" for undefined', () => {
      render(<YesNoTag value={undefined} />);
      expect(screen.getByText('No')).toBeDefined();
    });
  });
});
