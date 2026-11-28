// The HAProxy route limits new TCP connections per client IP (guide §0), so
// fresh browser contexts must be spaced out within a worker process.
const parsedInterval = Number(process.env.PW_MIN_LOAD_INTERVAL_MS);

/**
 * Minimum spacing between fresh contexts / page loads (route rate-limit, guide §0).
 * Default 3500 ms for production-like limits (rate-tcp 75 per 3 s); override with
 * PW_MIN_LOAD_INTERVAL_MS (e.g. 0 or 500 on PR/dev routes with raised limits).
 */
export const MIN_NEW_CONTEXT_INTERVAL_MS =
  process.env.PW_MIN_LOAD_INTERVAL_MS !== undefined &&
  Number.isFinite(parsedInterval) &&
  parsedInterval >= 0
    ? parsedInterval
    : 3_500;

export class ConnectionBudget {
  private lastSlotAt: number | undefined;

  async beforeNewContext(): Promise<void> {
    await this.takeSlot();
  }

  /** Each new page reopens the app's asset burst, so it needs the same gap. */
  async beforePageLoad(): Promise<void> {
    await this.takeSlot();
  }

  private async takeSlot(): Promise<void> {
    const now = Date.now();
    if (this.lastSlotAt !== undefined) {
      const remaining = MIN_NEW_CONTEXT_INTERVAL_MS - (now - this.lastSlotAt);
      if (remaining > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, remaining));
      }
    }
    this.lastSlotAt = Date.now();
  }
}

/** One instance per worker process; reusable by S2 setup projects. */
export const connectionBudget = new ConnectionBudget();
