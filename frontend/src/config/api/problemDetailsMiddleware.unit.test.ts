/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';

import { isProblemDetails, problemDetailsMiddleware } from './problemDetailsMiddleware';

import type { ProblemDetails } from './types';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

describe('isProblemDetails', () => {
  it('returns true for valid ProblemDetails object', () => {
    const validProblemDetails: ProblemDetails = {
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource was not found',
      instance: '/api/users/123',
    };
    expect(isProblemDetails(validProblemDetails)).toBe(true);
  });

  it('returns true for minimal valid ProblemDetails (only title and status)', () => {
    const minimalProblemDetails = {
      title: 'Error',
      status: 500,
    };
    expect(isProblemDetails(minimalProblemDetails)).toBe(true);
  });

  it('returns false for null or undefined', () => {
    expect(isProblemDetails(null)).toBe(false);
    expect(isProblemDetails(undefined)).toBe(false);
  });

  it('returns false for non-object types', () => {
    expect(isProblemDetails('string')).toBe(false);
    expect(isProblemDetails(123)).toBe(false);
    expect(isProblemDetails(true)).toBe(false);
  });

  it('returns false for object missing title', () => {
    const missingTitle = {
      status: 404,
      detail: 'Some detail',
    };
    expect(isProblemDetails(missingTitle)).toBe(false);
  });

  it('returns false for object missing status', () => {
    const missingStatus = {
      title: 'Error',
      detail: 'Some detail',
    };
    expect(isProblemDetails(missingStatus)).toBe(false);
  });

  it('returns false for object with wrong title type', () => {
    const wrongTitleType = {
      title: 123,
      status: 404,
    };
    expect(isProblemDetails(wrongTitleType)).toBe(false);
  });

  it('returns false for object with wrong status type', () => {
    const wrongStatusType = {
      title: 'Error',
      status: '404',
    };
    expect(isProblemDetails(wrongStatusType)).toBe(false);
  });
});

describe('problemDetailsMiddleware', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe('when error has response (4xx, 5xx errors)', () => {
    it('passes through error unchanged when already in ProblemDetails format', async () => {
      const problemDetails: ProblemDetails = {
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: '/api/users/123',
      };

      const error: AxiosError<ProblemDetails> = {
        config: { url: '/api/users/123' } as InternalAxiosRequestConfig,
        response: {
          status: 404,
          statusText: 'Not Found',
          data: problemDetails,
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 404',
      };

      const middleware = problemDetailsMiddleware();

      await expect(middleware.failure!(error)).rejects.toEqual(error);
    });

    it('wraps non-ProblemDetails response in ProblemDetails format', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/users/123' } as InternalAxiosRequestConfig,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Something went wrong' },
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 500',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data).toEqual({
          type: 'about:blank',
          title: 'Internal Server Error',
          status: 500,
          detail: 'Something went wrong',
          instance: '/api/users/123',
        });
      }
    });

    it('extracts detail from string response data', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: 'Invalid input provided',
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.detail).toBe('Invalid input provided');
      }
    });

    it('extracts detail from various error message properties', async () => {
      const testCases = [
        { data: { detail: 'Detail message' }, expected: 'Detail message' },
        { data: { message: 'Message property' }, expected: 'Message property' },
        { data: { error: 'Error property' }, expected: 'Error property' },
        { data: { errorMessage: 'ErrorMessage property' }, expected: 'ErrorMessage property' },
      ];

      for (const testCase of testCases) {
        const error: AxiosError<any> = {
          config: { url: '/api/test' } as InternalAxiosRequestConfig,
          response: {
            status: 400,
            statusText: 'Bad Request',
            data: testCase.data,
            headers: {},
            config: {} as InternalAxiosRequestConfig,
          },
          isAxiosError: true,
          toJSON: () => ({}),
          name: 'AxiosError',
          message: 'Request failed',
        };

        const middleware = problemDetailsMiddleware();

        try {
          await middleware.failure!(error);
          expect.fail('Should have thrown an error');
        } catch (thrownError: any) {
          expect(thrownError.response.data.detail).toBe(testCase.expected);
        }
      }
    });

    it('stringifies object response data when no message properties found', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { foo: 'bar', baz: 'qux' },
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.detail).toBe('{"foo":"bar","baz":"qux"}');
      }
    });

    it('truncates long stringified object response data', async () => {
      const longString = 'x'.repeat(600);
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { longField: longString },
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.detail?.endsWith('...')).toBe(true);
        expect(thrownError.response.data.detail?.length).toBeLessThanOrEqual(503); // 500 + "..."
      }
    });

    it('uses default title when statusText is missing', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        response: {
          status: 500,
          statusText: '',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.title).toBe('HTTP Error');
      }
    });
  });

  describe('when error has no response (network errors)', () => {
    it('creates ProblemDetails for ERR_NETWORK error', async () => {
      const error: AxiosError<any> = {
        config: {
          url: '/api/test',
          baseURL: 'https://api.example.com',
        } as InternalAxiosRequestConfig,
        code: 'ERR_NETWORK',
        message: 'Network Error',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data).toEqual({
          type: 'about:blank',
          title: 'Network Connection Failed',
          status: 0,
          detail:
            'Unable to connect to the server. Please check your internet connection and try again.',
          instance: '/api/test',
        });
      }
    });

    it('creates ProblemDetails for ERR_BAD_REQUEST error', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        code: 'ERR_BAD_REQUEST',
        message: 'Bad Request',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.title).toBe('Invalid Request');
        expect(thrownError.response.data.detail).toBe(
          'The request could not be understood by the server due to malformed syntax.',
        );
      }
    });

    it('creates ProblemDetails for ECONNABORTED error', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.title).toBe('Request Timeout');
        expect(thrownError.response.data.detail).toBe(
          'The request took too long to complete. Please try again.',
        );
      }
    });

    it('creates ProblemDetails for ERR_CANCELED error', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        code: 'ERR_CANCELED',
        message: 'canceled',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.title).toBe('Request Cancelled');
        expect(thrownError.response.data.detail).toBe(
          'The request was cancelled before it could complete.',
        );
      }
    });

    it('creates ProblemDetails for ETIMEDOUT error', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        code: 'ETIMEDOUT',
        message: 'timeout',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.title).toBe('Connection Timeout');
        expect(thrownError.response.data.detail).toBe(
          'The connection to the server timed out. Please try again.',
        );
      }
    });

    it('creates generic ProblemDetails for unknown error code', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        code: 'UNKNOWN_ERROR',
        message: 'Some unknown error occurred',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.title).toBe('Network Error');
        expect(thrownError.response.data.detail).toBe('Some unknown error occurred');
        expect(thrownError.response.data.status).toBe(0);
      }
    });

    it('handles error without config.url', async () => {
      const error: AxiosError<any> = {
        config: {} as InternalAxiosRequestConfig,
        code: 'ERR_NETWORK',
        message: 'Network Error',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.instance).toBeUndefined();
      }
    });

    it('removes baseURL from instance path', async () => {
      const error: AxiosError<any> = {
        config: {
          url: 'https://api.example.com/api/users',
          baseURL: 'https://api.example.com',
        } as InternalAxiosRequestConfig,
        code: 'ERR_NETWORK',
        message: 'Network Error',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.instance).toBe('/api/users');
      }
    });

    it('uses error message as detail when no error code mapping exists', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        message: 'Custom error message',
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.detail).toBe('Custom error message');
      }
    });

    it('uses fallback detail when no error code or message', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: '',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.detail).toBe('A network error occurred');
      }
    });
  });

  describe('edge cases', () => {
    it('handles error with response but no data', async () => {
      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: undefined,
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.detail).toBeUndefined();
      }
    });

    it('handles circular reference in response data', async () => {
      const circularObj: any = { foo: 'bar' };
      circularObj.self = circularObj;

      const error: AxiosError<any> = {
        config: { url: '/api/test' } as InternalAxiosRequestConfig,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: circularObj,
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      };

      const middleware = problemDetailsMiddleware();

      try {
        await middleware.failure!(error);
        expect.fail('Should have thrown an error');
      } catch (thrownError: any) {
        expect(thrownError.response.data.detail).toBeUndefined();
      }
    });
  });
});
