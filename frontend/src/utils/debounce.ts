/**
 * Returns a debounced version of `fn` that delays invoking it until `ms`
 * milliseconds have elapsed since the last call.
 *
 * Unlike the `useDebounce` React hook (which debounces a value in component
 * state), this is a plain function suitable for use outside the React render
 * cycle — e.g. inside TanStack Form validator callbacks.
 *
 * Each call to `debounce()` produces an independent debounced function with
 * its own timer, so multiple validators can run concurrently without
 * interfering with one another. The returned function correctly handles both
 * synchronous and asynchronous `fn` by returning a `Promise` of the resolved
 * value (`Awaited<TReturn>`).
 *
 * @template TArgs - Argument tuple of the wrapped function.
 * @template TReturn - Return type of the wrapped function (sync or async).
 * @param fn - The function to debounce.
 * @param ms - Delay in milliseconds.
 * @returns A function that returns a `Promise<Awaited<TReturn>>` resolved
 * after the debounce delay with the wrapped function's result.
 * @example
 * // Debounce a synchronous function
 * const debounced = debounce((n: number) => n * 2, 200);
 * await debounced(3); // resolves to 6 after ~200ms
 */
export function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  ms: number,
): (...args: TArgs) => Promise<Awaited<TReturn>> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function run(args: TArgs, resolve: (v: Awaited<TReturn>) => void, reject: (e: unknown) => void) {
    try {
      Promise.resolve(fn(...args))
        .then(resolve)
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  }

  return (...args) =>
    new Promise<Awaited<TReturn>>((resolve, reject) => {
      clearTimeout(timer);
      timer = setTimeout(() => run(args, resolve, reject), ms);
    });
}
