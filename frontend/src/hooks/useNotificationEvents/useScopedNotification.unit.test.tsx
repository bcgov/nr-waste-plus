import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import NotificationProvider from '@/context/notification/NotificationProvider';

import useScopedNotification from './useScopedNotification';

import useNotificationEvents from './index';

import type { GlobalEvent } from '@/types/notification.types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

const makeEvent = (overrides: Partial<GlobalEvent> = {}): GlobalEvent => ({
  title: 'Test',
  description: 'Test description',
  eventType: 'info',
  eventTarget: 'page-a',
  displayMode: 'inline',
  ...overrides,
});

describe('useScopedNotification', () => {
  it('sets notification when event matches target and displayMode is not toast', () => {
    const { result } = renderHook(
      () => ({
        scoped: useScopedNotification('page-a'),
        events: useNotificationEvents(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.events.sendInlineEvent(makeEvent({ eventTarget: 'page-a', title: 'Hello' }));
    });

    expect(result.current.scoped.eventNotification?.title).toBe('Hello');
  });

  it('ignores events for different eventTarget', () => {
    const { result } = renderHook(
      () => ({
        scoped: useScopedNotification('page-a'),
        events: useNotificationEvents(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.events.sendInlineEvent(makeEvent({ eventTarget: 'page-b', title: 'Other' }));
    });

    expect(result.current.scoped.eventNotification).toBeUndefined();
  });

  it('ignores toast events', () => {
    const { result } = renderHook(
      () => ({
        scoped: useScopedNotification('page-a'),
        events: useNotificationEvents(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.events.sendToastEvent(makeEvent({ eventTarget: 'page-a', title: 'Toast' }));
    });

    expect(result.current.scoped.eventNotification).toBeUndefined();
  });

  it('clears notification on clear-events', () => {
    const { result } = renderHook(
      () => ({
        scoped: useScopedNotification('page-a'),
        events: useNotificationEvents(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.events.sendInlineEvent(makeEvent({ eventTarget: 'page-a', title: 'Hello' }));
    });
    expect(result.current.scoped.eventNotification?.title).toBe('Hello');

    act(() => {
      result.current.events.clearEvents('page-a');
    });

    expect(result.current.scoped.eventNotification).toBeUndefined();
  });

  it('clearNotification clears manually', () => {
    const { result } = renderHook(
      () => ({
        scoped: useScopedNotification('page-a'),
        events: useNotificationEvents(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.events.sendInlineEvent(makeEvent({ eventTarget: 'page-a', title: 'Hello' }));
    });
    expect(result.current.scoped.eventNotification?.title).toBe('Hello');

    act(() => {
      result.current.scoped.clearNotification();
    });

    expect(result.current.scoped.eventNotification).toBeUndefined();
  });

  it('handles warning and error event types', () => {
    const { result } = renderHook(
      () => ({
        scoped: useScopedNotification('page-a'),
        events: useNotificationEvents(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.events.sendInlineEvent(
        makeEvent({ eventTarget: 'page-a', eventType: 'warning', title: 'Warn' }),
      );
    });
    expect(result.current.scoped.eventNotification?.title).toBe('Warn');

    act(() => {
      result.current.events.sendInlineEvent(
        makeEvent({ eventTarget: 'page-a', eventType: 'error', title: 'Err' }),
      );
    });
    expect(result.current.scoped.eventNotification?.title).toBe('Err');
  });
});
