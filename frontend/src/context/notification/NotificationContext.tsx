import { createContext, type ReactNode } from 'react';

import type { EventListener, EventType, GlobalEvent } from '@/hooks/useNotificationEvents/types';

/**
 * Describes the toast payload rendered by the notification provider.
 */
export type NotificationContent = {
  caption?: string;
  dedupeKey?: string;
  kind: 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt' | undefined;
  onClose?: () => void;
  onCloseButtonClick?: () => void;
  scope?: string;
  subtitle?: string;
  timeout: number;
  title: string;
  children?: ReactNode;
};

/**
 * Shape of the notification context API.
 */
export type NotificationContextData = {
  clearEvents: (eventTarget?: string) => void;
  display: (content: NotificationContent) => void;
  sendEvent: (event: GlobalEvent) => void;
  subscribe: (eventName: EventType, listener: EventListener) => () => void;
  unsubscribe: (eventName: EventType, listener: EventListener) => void;
};

/**
 * React context for application toast notifications.
 */
export const NotificationContext = createContext<NotificationContextData | undefined>(undefined);
