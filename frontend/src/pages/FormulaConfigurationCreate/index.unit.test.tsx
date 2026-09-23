import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import FormulaConfigurationCreatePage from './index';

vi.mock('@/context/pageTitle/usePageTitle', () => ({
  usePageTitle: () => ({
    setPageTitle: vi.fn(),
  }),
}));

vi.mock('@/components/core/PageNotification', () => ({
  default: ({ eventTarget }: { eventTarget: string }) => (
    <div data-testid="page-notification" data-event-target={eventTarget} />
  ),
}));

vi.mock('@/components/waste/Formula/FormulaConfigurationCreateForm', () => ({
  default: () => <div data-testid="formula-configuration-create-form" />,
}));

describe('FormulaConfigurationCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    render(<FormulaConfigurationCreatePage />);
    screen.getByRole('heading', { name: 'Create new formula set' });
  });

  it('renders the subtitle', () => {
    render(<FormulaConfigurationCreatePage />);
    screen.getByText('Define a new formula set for calculating waste volumes');
  });

  it('renders the breadcrumbs', () => {
    render(<FormulaConfigurationCreatePage />);
    screen.getByText('Configuration');
    screen.getByText('Formula sets');
  });

  it('renders the PageNotification with the upload-table event target', () => {
    render(<FormulaConfigurationCreatePage />);
    const notification = screen.getByTestId('page-notification');
    expect(notification.getAttribute('data-event-target')).toBe('upload-table');
  });

  it('renders the FormulaConfigurationCreateForm component', () => {
    render(<FormulaConfigurationCreatePage />);
    screen.getByTestId('formula-configuration-create-form');
  });
});
