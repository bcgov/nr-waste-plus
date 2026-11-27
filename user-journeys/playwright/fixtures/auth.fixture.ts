import { persistSession } from "../auth/session.ts";
import { kindFromTags, test as base } from "./shared-context.fixture.ts";

type AuthFixtures = {
  persistRotatedTokens: void;
};

/**
 * S0 found rotating refresh tokens, so a scenario can leave the shared
 * snapshot stale. Write the live sessionStorage back after each authenticated
 * scenario — bounded and best-effort, since the workers remain serial.
 * Context creation itself lives in shared-context.fixture.ts (S1b); this file
 * only layers the persistence fixture over that single mechanism.
 */
export const test = base.extend<AuthFixtures>({
  persistRotatedTokens: [
    async ({ page, $tags }, use) => {
      await use();
      const kind = kindFromTags($tags);
      if (kind !== "anonymous") await persistSession(page, kind);
    },
    { auto: true },
  ],
});
