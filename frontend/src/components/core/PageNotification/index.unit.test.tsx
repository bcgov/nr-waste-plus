import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import PageNotification from './index';

import type { GlobalEvent } from '@/hooks/useNotificationEvents/types';

import { eventIconDescription } from '@/hooks/useNotificationEvents/eventHandler';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockClearNotification = vi.fn();
const mockUseScopedNotification = vi.fn();

vi.mock('@/hooks/useNotificationEvents/useScopedNotification', () => ({
  default: (eventTarget: string) => mockUseScopedNotification(eventTarget),
}));

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  eventIconDescription: vi.fn().mockReturnValue('Notification icon'),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeEvent(overrides: Partial<GlobalEvent> = {}): GlobalEvent {
  return {
    title: 'Alert title',
    description: 'Alert description',
    eventType: 'error',
    eventTarget: 'page-scope',
    ...overrides,
  };
}

function setupHook(eventNotification: GlobalEvent | undefined) {
  mockUseScopedNotification.mockReturnValue({
    clearNotification: mockClearNotification,
    eventNotification,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('PageNotification', () => {
  beforeEach(() => {
    mockClearNotification.mockReset();
    vi.mocked(eventIconDescription).mockReset();
    vi.mocked(eventIconDescription).mockReturnValue('Notification icon');
    setupHook(undefined);
  });

  describe('null render', () => {
    it('shouldReturnNull_whenEventNotificationIsUndefined', () => {
      const { container } = render(<PageNotification eventTarget="scope" />);
      expect(container.firstChild).toBeNull();
    });

    it('shouldReturnNull_whenEventNotificationTitleIsEmptyString', () => {
      setupHook(makeEvent({ title: '' }));
      const { container } = render(<PageNotification eventTarget="scope" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('hook wiring', () => {
    it('shouldPassEventTarget_toUseScopedNotification', () => {
      render(<PageNotification eventTarget="my-feature-scope" />);
      expect(mockUseScopedNotification).toHaveBeenCalledWith('my-feature-scope');
    });
  });

  describe('notification render', () => {
    it('shouldRenderAlertRole_whenTitleIsPresent', () => {
      setupHook(makeEvent());
      render(<PageNotification eventTarget="scope" />);
      expect(screen.getByRole('alert')).toBeDefined();
    });

    it('shouldRenderTitle_fromEventNotification', () => {
      setupHook(makeEvent({ title: 'Something failed' }));
      render(<PageNotification eventTarget="scope" />);
      expect(screen.getByText('Something failed')).toBeDefined();
    });

    it('shouldRenderSubtitle_fromEventNotificationDescription', () => {
      setupHook(makeEvent({ description: 'Check your input and try again' }));
      render(<PageNotification eventTarget="scope" />);
      expect(screen.getByText('Check your input and try again')).toBeDefined();
    });

    it('shouldApplyClassName_whenProvided', () => {
      setupHook(makeEvent());
      render(<PageNotification eventTarget="scope" className="my-custom-class" />);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('my-custom-class');
    });

    it('shouldNotContainUndefined_inClassNameWhenClassNameOmitted', () => {
      setupHook(makeEvent());
      render(<PageNotification eventTarget="scope" />);
      const alert = screen.getByRole('alert');
      expect(alert.className).not.toContain('undefined');
    });

    it('shouldSetAriaLabel_containingEventType_onCloseButton', () => {
      setupHook(makeEvent({ eventType: 'warning' }));
      render(<PageNotification eventTarget="scope" />);
      const closeButton = screen.getByRole('button');
      expect(closeButton.getAttribute('aria-label')).toContain('warning');
    });

    it('shouldApplyKindClass_forError', () => {
      setupHook(makeEvent({ eventType: 'error' }));
      render(<PageNotification eventTarget="scope" />);
      expect(screen.getByRole('alert').className).toContain('error');
    });

    it('shouldApplyKindClass_forWarning', () => {
      setupHook(makeEvent({ eventType: 'warning' }));
      render(<PageNotification eventTarget="scope" />);
      expect(screen.getByRole('alert').className).toContain('warning');
    });

    it('shouldApplyKindClass_forInfo', () => {
      setupHook(makeEvent({ eventType: 'info' }));
      render(<PageNotification eventTarget="scope" />);
      expect(screen.getByRole('alert').className).toContain('info');
    });

    it('shouldCallEventIconDescription_withCurrentEvent', () => {
      const event = makeEvent({ eventType: 'error' });
      setupHook(event);
      render(<PageNotification eventTarget="scope" />);
      expect(vi.mocked(eventIconDescription)).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'error', title: event.title }),
      );
    });
  });

  describe('close interaction', () => {
    it('shouldCallClearNotification_whenCloseButtonClicked', () => {
      setupHook(makeEvent());
      render(<PageNotification eventTarget="scope" />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockClearNotification).toHaveBeenCalled();
    });
  });
});
