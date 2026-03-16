import { createContext, type ReactNode } from 'react';

/**
 * Describes the toast payload rendered by the notification provider.
 */
export type NotificationContent = {
  caption?: string;
  kind: 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt' | undefined;
  onClose?: () => void;
  onCloseButtonClick?: () => void;
  subtitle?: string;
  timeout: number;
  title: string;
  children?: ReactNode;
};

/**
 * Shape of the notification context API.
 */
export type NotificationContextData = {
  display: (content: NotificationContent) => void;
};

/**
 * React context for application toast notifications.
 */
export const NotificationContext = createContext<NotificationContextData | undefined>(undefined);
