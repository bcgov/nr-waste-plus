import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';

import YesNoTag from './index';

describe('YesNoTag', () => {
  describe('boolean values', () => {
    it('renders "Yes" for true', () => {
      render(<YesNoTag value={true} />);
      screen.getByText('Yes');
    });

    it('renders "No" for false', () => {
      render(<YesNoTag value={false} />);
      screen.getByText('No');
    });
  });

  describe('number values', () => {
    it('renders "Yes" for positive numbers', () => {
      render(<YesNoTag value={1} />);
      screen.getByText('Yes');
    });

    it('renders "Yes" for large numbers', () => {
      render(<YesNoTag value={100} />);
      screen.getByText('Yes');
    });

    it('renders "No" for zero', () => {
      render(<YesNoTag value={0} />);
      screen.getByText('No');
    });

    it('renders "No" for negative numbers', () => {
      render(<YesNoTag value={-1} />);
      screen.getByText('No');
    });
  });

  describe('string values', () => {
    it('renders "Yes" for "true" (lowercase)', () => {
      render(<YesNoTag value="true" />);
      screen.getByText('Yes');
    });

    it('renders "Yes" for "TRUE" (uppercase)', () => {
      render(<YesNoTag value="TRUE" />);
      screen.getByText('Yes');
    });

    it('renders "Yes" for "True" (mixed case)', () => {
      render(<YesNoTag value="True" />);
      screen.getByText('Yes');
    });

    it('renders "Yes" for "t"', () => {
      render(<YesNoTag value="t" />);
      screen.getByText('Yes');
    });

    it('renders "Yes" for "y"', () => {
      render(<YesNoTag value="y" />);
      screen.getByText('Yes');
    });

    it('renders "Yes" for "yes"', () => {
      render(<YesNoTag value="yes" />);
      screen.getByText('Yes');
    });

    it('renders "Yes" for "YES"', () => {
      render(<YesNoTag value="YES" />);
      screen.getByText('Yes');
    });

    it('renders "Yes" for "  true  " (with whitespace)', () => {
      render(<YesNoTag value="  true  " />);
      screen.getByText('Yes');
    });

    it('renders "No" for "false"', () => {
      render(<YesNoTag value="false" />);
      screen.getByText('No');
    });

    it('renders "No" for "no"', () => {
      render(<YesNoTag value="no" />);
      screen.getByText('No');
    });

    it('renders "No" for "f"', () => {
      render(<YesNoTag value="f" />);
      screen.getByText('No');
    });

    it('renders "No" for "n"', () => {
      render(<YesNoTag value="n" />);
      screen.getByText('No');
    });

    it('renders "No" for empty string', () => {
      render(<YesNoTag value="" />);
      screen.getByText('No');
    });

    it('renders "No" for random string', () => {
      render(<YesNoTag value="random" />);
      screen.getByText('No');
    });
  });

  describe('null and undefined values', () => {
    it('renders "No" for null', () => {
      render(<YesNoTag value={null} />);
      screen.getByText('No');
    });

    it('renders "No" for undefined', () => {
      render(<YesNoTag value={undefined} />);
      screen.getByText('No');
    });
  });
});
