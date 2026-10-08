/**
 * Middleware composition engine.
 *
 * Implements Koa-style middleware chaining: each middleware receives
 * `(ctx, next)` and `await next()` passes control to the next middleware
 * (or the transport).  Responses bubble back through the stack in reverse
 * order, allowing post-processing.
 *
 * @module http/compose
 */

import type { Middleware, RequestContext, ResponseContext, Transport } from './types';

/**
 * Composes an array of middlewares and a transport into a single
 * {@link Transport} function.
 *
 * Execution order:
 * 1. `middlewares[0]` → calls `next()` →
 * 2. `middlewares[1]` → calls `next()` →
 * 3. … → `middlewares[N-1]` → calls `next()` →
 * 4. `transport(ctx)` returns a `ResponseContext`
 * 5. Response bubbles back: `middlewares[N-1]` → … → `middlewares[0]`
 *
 * A middleware that does **not** call `next()` short-circuits the pipeline
 * and must return its own `ResponseContext` (e.g. a cache hit).
 *
 * @throws {Error} If `next()` is called more than once inside a single
 *   middleware — this indicates a logic error that would break the chain.
 */
export const compose = (middlewares: Middleware[], transport: Transport): Transport => {
  return async (ctx: RequestContext): Promise<ResponseContext> => {
    let index = -1;

    const dispatch = async (i: number): Promise<ResponseContext> => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      // End of middleware chain — hand off to transport.
      if (i >= middlewares.length) {
        return transport(ctx);
      }

      const middleware = middlewares[i];
      return middleware(ctx, () => dispatch(i + 1));
    };

    return dispatch(0);
  };
};
