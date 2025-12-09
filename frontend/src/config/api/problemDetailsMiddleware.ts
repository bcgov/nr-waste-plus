import type { ApiMiddleware, ProblemDetails } from '@/config/api/types';
import type { AxiosError } from 'axios';

/**
 * Map of Axios error codes to user-friendly messages.
 * @see https://github.com/axios/axios#handling-errors
 */
const AXIOS_ERROR_MESSAGES: Record<string, { title: string; detail: string }> = {
  ERR_NETWORK: {
    title: 'Network Connection Failed',
    detail: 'Unable to connect to the server. Please check your internet connection and try again.',
  },
  ERR_BAD_REQUEST: {
    title: 'Invalid Request',
    detail: 'The request could not be understood by the server due to malformed syntax.',
  },
  ERR_BAD_RESPONSE: {
    title: 'Invalid Server Response',
    detail: 'The server returned an invalid response. Please try again later.',
  },
  ECONNABORTED: {
    title: 'Request Timeout',
    detail: 'The request took too long to complete. Please try again.',
  },
  ERR_CANCELED: {
    title: 'Request Cancelled',
    detail: 'The request was cancelled before it could complete.',
  },
  ERR_DEPRECATED: {
    title: 'Deprecated Feature',
    detail: 'This feature is deprecated and may not work as expected.',
  },
  ERR_FR_TOO_MANY_REDIRECTS: {
    title: 'Too Many Redirects',
    detail: 'The request failed due to too many redirects.',
  },
  ETIMEDOUT: {
    title: 'Connection Timeout',
    detail: 'The connection to the server timed out. Please try again.',
  },
};

/**
 * Type guard to check if an object conforms to RFC 7807 Problem Details format.
 *
 * @param data - The data to check
 * @returns True if the data is a valid Problem Details object
 *
 * @example
 * ```typescript
 * if (isProblemDetails(error.response.data)) {
 *   console.log(error.response.data.title, error.response.data.detail);
 * }
 * ```
 */
export const isProblemDetails = (data: unknown): data is ProblemDetails => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;

  // RFC 7807 requires at minimum: title, and status
  return typeof obj.title === 'string' && typeof obj.status === 'number';
};

/**
 * Helper function to extract a meaningful detail message from various response data formats.
 *
 * @param data - The response data
 * @returns A detail string or undefined
 */
const extractDetailFromResponse = (data: unknown): string | undefined => {
  // If data is a string, return it directly
  if (typeof data === 'string') {
    return data;
  }

  // If data is an object, look for common error message properties
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // Check for common error message properties (in priority order)
    const messageProp = obj.detail || obj.message || obj.error || obj.errorMessage;
    if (typeof messageProp === 'string') {
      return messageProp;
    }

    // Try to stringify the object (truncate if too long)
    try {
      const str = JSON.stringify(data);
      return str.length > 500 ? `${str.substring(0, 500)}...` : str;
    } catch {
      return undefined;
    }
  }

  return undefined;
};

/**
 * Middleware that normalizes all errors to RFC 7807 Problem Details format.
 *
 * This middleware is idempotent - if the backend already sends errors in Problem Details
 * format, they pass through unchanged. Otherwise, errors are wrapped in the Problem Details
 * structure.
 *
 * **Important**: This middleware should typically be placed first in the middleware array
 * to ensure all errors are normalized before other middleware processes them.
 *
 * @returns An ApiMiddleware object with failure handler
 *
 * @example
 * ```typescript
 * import { problemDetailsMiddleware } from '@/config/api/problemDetailsMiddleware';
 * const options: ApiRequestOptions = {
 *   method: 'GET',
 *   url: '/api/endpoint',
 *   middleware: [
 *     problemDetailsMiddleware(), // Should be first
 *     // ... other middleware
 *   ],
 * };
 * ```
 */
export const problemDetailsMiddleware = (): ApiMiddleware => ({
  async failure(error: AxiosError<unknown>): Promise<unknown> {
    // Case 1: Error WITH response (4xx, 5xx from backend)
    if (error.response) {
      // Check if already in Problem Details format (idempotent behavior)
      if (isProblemDetails(error.response.data)) {
        // Already in correct format - pass through unchanged
        throw error;
      }

      // Not in Problem Details format - wrap it
      const problemDetail: ProblemDetails = {
        type: 'about:blank', // Default URI for generic errors per RFC 7807
        title: error.response.statusText || 'HTTP Error',
        status: error.response.status,
        detail: extractDetailFromResponse(error.response.data),
        instance: error.config?.url || undefined,
      };

      // Modify the error response to contain Problem Details
      const modifiedError = { ...error };
      modifiedError.response = {
        ...error.response,
        data: problemDetail,
      };

      throw modifiedError;
    }

    // Case 2: Error WITHOUT response (network errors, timeouts, cancelled requests)
    // Check if we have a user-friendly message for this error code
    const errorCode = error.code || '';
    const errorMapping = AXIOS_ERROR_MESSAGES[errorCode];

    const problemDetail: ProblemDetails = {
      type: 'about:blank',
      title: errorMapping?.title || 'Network Error',
      status: 0, // No HTTP status for network errors
      detail: errorMapping?.detail || error.message || 'A network error occurred',
      instance: error.config?.url?.replace(error.config.baseURL || '', '') || undefined,
    };

    // Create a synthetic response with Problem Details
    const modifiedError = {
      ...error,
      response: {
        data: problemDetail,
        status: 0,
        statusText: '',
        headers: {},
        config: error.config!,
      },
    };

    throw modifiedError;
  },
});
