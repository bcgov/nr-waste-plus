import { navigateTo } from './navigation';

describe('navigateTo', () => {
  const originalLocation = globalThis.location;

  afterEach(() => {
    // restore original location object
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('calls globalThis.location.assign with the provided URL', () => {
    // Replace globalThis.location with a controllable object
    // (jsdom's location may be non-writable/configurable in some environments)
    try {
      // delete first so we can redefine on some runtimes
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete (globalThis as Record<string, unknown>).location;
    } catch {
      // ignore if delete is not allowed
    }

    const assign = vi.fn<(s: string) => void>();
    Object.defineProperty(globalThis, 'location', {
      value: { assign },
      configurable: true,
    });

    navigateTo('/test-url');

    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/test-url');
  });
});
