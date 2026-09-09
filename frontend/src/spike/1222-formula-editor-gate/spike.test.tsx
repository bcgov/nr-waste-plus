import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppSpike } from './AppSpike';

describe('1222 Formula Editor Spike', () => {
  it('renders AppSpike without crashing', () => {
    const { container } = render(<AppSpike />);
    expect(container).toBeTruthy();
  });
});
