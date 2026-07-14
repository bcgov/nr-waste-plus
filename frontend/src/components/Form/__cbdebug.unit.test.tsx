import { ComboBox } from '@carbon/react';
import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';

describe('cb-testid', () => {
  it('forwards data-testid?', () => {
    const { container } = render(<ComboBox id="x" titleText="T" data-testid="my-cb" items={[]} />);
    console.log('CB_HTML_START');
    console.log(container.innerHTML.slice(0, 400));
    console.log('CB_HTML_END');
    try {
      const el = screen.getByTestId('my-cb');
      console.log('CB_FOUND:' + (el?.tagName ?? 'none'));
    } catch {
      console.log('CB_NOTFOUND');
    }
  });
});
