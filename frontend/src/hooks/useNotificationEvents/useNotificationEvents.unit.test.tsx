import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import NotificationProvider from '@/context/notification/NotificationProvider';

import { eventHandler } from './eventHandler';

import useNotificationEvents from './index';

import type { GlobalEvent, EventType } from '@/types/notification.types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

const makeEvent = (eventType: EventType, eventTarget?: string): GlobalEvent => ({
  title: 'Test',
  description: 'Test description',
  eventType,
  eventTarget,
});

describe('useNotificationEvents', () => {
  it('should allow subscribing and receiving events', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler = vi.fn();
    const event = makeEvent('info');

    act(() => {
      result.current.subscribe('info', handler);
    });

    act(() => {
      result.current.sendEvent(event);
    });

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should allow unsubscribing from events', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler = vi.fn();
    const event = makeEvent('error');

    let unsubscribe: () => void;
    act(() => {
      unsubscribe = result.current.subscribe('error', handler);
    });
    act(() => {
      unsubscribe();
    });

    act(() => {
      result.current.sendEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should support multiple listeners for the same event type', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const event = makeEvent('success');

    act(() => {
      result.current.subscribe('success', handler1);
      result.current.subscribe('success', handler2);
    });

    act(() => {
      result.current.sendEvent(event);
    });

    expect(handler1).toHaveBeenCalledWith(event);
    expect(handler2).toHaveBeenCalledWith(event);
  });

  it('should not call listeners for other event types', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler = vi.fn();
    const event = makeEvent('warning');

    act(() => {
      result.current.subscribe('info', handler);
    });

    act(() => {
      result.current.sendEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow direct unsubscribe via hook', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler = vi.fn();
    const event = makeEvent('info');

    act(() => {
      result.current.subscribe('info', handler);
      result.current.unsubscribe('info', handler);
    });

    act(() => {
      result.current.sendEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not throw or call listeners for invalid event type in dispatch', () => {
    expect(() =>
      // @ts-expect-error Argument of type '"not-an-event"' is not assignable to parameter of type 'EventType'.
      eventHandler.dispatch('not-an-event', {
        eventType: 'not-an-event',
        title: '',
        description: '',
      }),
    ).not.toThrow();
  });

  it('should include eventTarget in the event payload', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler = vi.fn();
    const event = makeEvent('info', 'test-target');

    act(() => {
      result.current.subscribe('info', handler);
    });

    act(() => {
      result.current.sendEvent(event);
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTarget: 'test-target',
      }),
    );
  });

  it('should work with events that have no eventTarget', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler = vi.fn();
    const event = makeEvent('warning');

    act(() => {
      result.current.subscribe('warning', handler);
    });

    act(() => {
      result.current.sendEvent(event);
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'warning',
        title: 'Test',
        description: 'Test description',
      }),
    );
    expect(handler).toHaveBeenCalledWith(
      expect.not.objectContaining({
        eventTarget: expect.anything(),
      }),
    );
  });

  it('should send toast events with displayMode set to toast', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler = vi.fn();

    act(() => {
      result.current.subscribe('info', handler);
    });

    act(() => {
      result.current.sendToastEvent({
        description: 'Toast payload',
        eventType: 'info',
        eventTarget: 'test-target',
        title: 'Toast title',
      });
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        displayMode: 'toast',
        title: 'Toast title',
      }),
    );
  });

  it('should send inline events with displayMode set to inline', () => {
    const { result } = renderHook(() => useNotificationEvents(), { wrapper });
    const handler = vi.fn();

    act(() => {
      result.current.subscribe('info', handler);
    });

    act(() => {
      result.current.sendInlineEvent({
        description: 'Inline payload',
        eventType: 'info',
        eventTarget: 'test-target',
        title: 'Inline title',
      });
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        displayMode: 'inline',
        title: 'Inline title',
      }),
    );
  });

  describe('clearEvents', () => {
    it('should dispatch a clear-events info event with eventTarget', () => {
      const { result } = renderHook(() => useNotificationEvents(), { wrapper });
      const handler = vi.fn();

      act(() => {
        result.current.subscribe('info', handler);
      });

      act(() => {
        result.current.clearEvents('test-target');
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          displayMode: 'inline',
          eventType: 'info',
          title: 'clear-events',
          description: 'test-target',
        }),
      );
    });

    it('should dispatch a clear-events info event without eventTarget', () => {
      const { result } = renderHook(() => useNotificationEvents(), { wrapper });
      const handler = vi.fn();

      act(() => {
        result.current.subscribe('info', handler);
      });

      act(() => {
        result.current.clearEvents();
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          displayMode: 'inline',
          eventType: 'info',
          title: 'clear-events',
          description: '',
        }),
      );
    });

    it('should only trigger info listeners when clearing events', () => {
      const { result } = renderHook(() => useNotificationEvents(), { wrapper });
      const infoHandler = vi.fn();
      const errorHandler = vi.fn();
      const successHandler = vi.fn();

      act(() => {
        result.current.subscribe('info', infoHandler);
        result.current.subscribe('error', errorHandler);
        result.current.subscribe('success', successHandler);
      });

      act(() => {
        result.current.clearEvents('test-target');
      });

      expect(infoHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).not.toHaveBeenCalled();
      expect(successHandler).not.toHaveBeenCalled();
    });

    it('should work alongside regular sendEvent calls', () => {
      const { result } = renderHook(() => useNotificationEvents(), { wrapper });
      const handler = vi.fn();

      act(() => {
        result.current.subscribe('info', handler);
      });

      act(() => {
        result.current.sendEvent(makeEvent('info', 'regular-event'));
      });

      act(() => {
        result.current.clearEvents('clear-target');
      });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          eventTarget: 'regular-event',
        }),
      );
      expect(handler).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          title: 'clear-events',
          description: 'clear-target',
        }),
      );
    });
  });
});

describe('eventHandler', () => {
  it('should dispatch when eventName matches payload.eventType and is valid', async () => {
    const eventBridge = await import('@/context/notification/eventBridge');
    const dispatchSpy = vi.spyOn(eventBridge, 'dispatchNotificationEvent');
    eventHandler.dispatch('info', makeEvent('info', 'target'));
    expect(dispatchSpy).toHaveBeenCalled();
    dispatchSpy.mockRestore();
  });

  it('should not dispatch when eventName does not match payload.eventType', async () => {
    const eventBridge = await import('@/context/notification/eventBridge');
    const dispatchSpy = vi.spyOn(eventBridge, 'dispatchNotificationEvent');
    eventHandler.dispatch('error', makeEvent('info', 'target'));
    expect(dispatchSpy).not.toHaveBeenCalled();
    dispatchSpy.mockRestore();
  });

  it('should not dispatch for invalid eventType', async () => {
    const eventBridge = await import('@/context/notification/eventBridge');
    const dispatchSpy = vi.spyOn(eventBridge, 'dispatchNotificationEvent');
    const invalidEvent = makeEvent('info');
    (invalidEvent as unknown as { eventType: EventType }).eventType = 'unknown' as EventType;
    eventHandler.dispatch('unknown' as EventType, invalidEvent as unknown as GlobalEvent);
    expect(dispatchSpy).not.toHaveBeenCalled();
    dispatchSpy.mockRestore();
  });
});

describe('eventIconDescription', () => {
  it('returns Error icon for error', async () => {
    const { eventIconDescription } = await import('./eventHandler');
    expect(eventIconDescription(makeEvent('error'))).toBe('Error icon');
  });

  it('returns Warning icon for warning', async () => {
    const { eventIconDescription } = await import('./eventHandler');
    expect(eventIconDescription(makeEvent('warning'))).toBe('Warning icon');
  });

  it('returns Info icon for info', async () => {
    const { eventIconDescription } = await import('./eventHandler');
    expect(eventIconDescription(makeEvent('info'))).toBe('Info icon');
  });

  it('returns Notification icon as default', async () => {
    const { eventIconDescription } = await import('./eventHandler');
    const evt = makeEvent('success');
    expect(eventIconDescription(evt)).toBe('Notification icon');
  });
});

describe('sendEvent helpers', () => {
  it('sendToastEvent sets displayMode toast', async () => {
    const { sendToastEvent } = await import('./eventHandler');
    const eventBridge = await import('@/context/notification/eventBridge');
    const dispatchSpy = vi.spyOn(eventBridge, 'dispatchNotificationEvent');
    sendToastEvent(makeEvent('info'));
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ displayMode: 'toast' }));
    dispatchSpy.mockRestore();
  });

  it('sendInlineEvent sets displayMode inline', async () => {
    const { sendInlineEvent } = await import('./eventHandler');
    const eventBridge = await import('@/context/notification/eventBridge');
    const dispatchSpy = vi.spyOn(eventBridge, 'dispatchNotificationEvent');
    sendInlineEvent(makeEvent('error'));
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ displayMode: 'inline' }));
    dispatchSpy.mockRestore();
  });

  it('clearEvents sends inline clear-events with provided eventTarget', async () => {
    const { clearEvents } = await import('./eventHandler');
    const eventBridge = await import('@/context/notification/eventBridge');
    const dispatchSpy = vi.spyOn(eventBridge, 'dispatchNotificationEvent');
    clearEvents('my-target');
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'clear-events',
        eventTarget: 'my-target',
        description: 'my-target',
      }),
    );
    dispatchSpy.mockRestore();
  });

  it('clearEvents uses empty string when eventTarget undefined', async () => {
    const { clearEvents } = await import('./eventHandler');
    const eventBridge = await import('@/context/notification/eventBridge');
    const dispatchSpy = vi.spyOn(eventBridge, 'dispatchNotificationEvent');
    clearEvents(undefined);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'clear-events', description: '', eventTarget: undefined }),
    );
    dispatchSpy.mockRestore();
  });
});
