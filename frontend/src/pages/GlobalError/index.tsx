/* eslint-disable @typescript-eslint/no-explicit-any */
import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';

/** Props for the {@link GlobalErrorPage} component. */
type GlobalErrorPageProps = {
  /**
   * The caught error value. Accepts an `Error` instance, a string, an object with a
   * `statusText` or `message` field, or any unknown value. When omitted, a generic
   * fallback message is shown.
   */
  error?: unknown;
};

/**
 * Route-level error boundary fallback page.
 *
 * Displayed by TanStack Router when an unhandled error propagates to the root
 * error boundary (configured via `defaultErrorComponent` in `routeTree.tsx`).
 *
 * Message extraction priority:
 * 1. `Error.message` when `error` is an `Error` instance
 * 2. The string itself when `error` is a `string`
 * 3. `statusText ?? message` when `error` is an object with those fields
 * 4. A static fallback: "An unexpected error has occurred. Please try again later."
 *
 * A stack trace is rendered in a red `<pre>` block when `error.stack` is present.
 *
 * @param props - Component props.
 * @param props.error - The caught error value (optional).
 * @returns The error page column with a title and human-readable error description.
 */
const GlobalErrorPage: FC<GlobalErrorPageProps> = ({ error }) => {
  let message = 'An unexpected error has occurred. Please try again later.';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && error !== null && 'statusText' in error) {
    const statusError = error as Error & { statusText?: string };
    message = (statusError.statusText || statusError.message) ?? message;
  }

  return (
    <Column lg={16} md={8} sm={4} className="dashboard-column__banner">
      <PageTitle title="Global Error" subtitle={message} />
      {/* Optionally show stack trace or more details */}
      {error && (error as any).stack && (
        <pre style={{ color: 'red', marginTop: '1rem' }}>{(error as any).stack}</pre>
      )}
    </Column>
  );
};

export default GlobalErrorPage;
