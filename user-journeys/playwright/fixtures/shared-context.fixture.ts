import type { BrowserContext } from "@playwright/test";
import { test as base } from "playwright-bdd";

import { baseURL } from "../env.ts";
import {
  hasAuthState,
  seedSessionStorage,
  statePath,
  type AuthKind,
} from "../auth/session.ts";
import { connectionBudget } from "./connection-budget.ts";

export type ContextKind = "anonymous" | AuthKind;

type SharedContextFixtures = {
  context: BrowserContext;
};

type SharedContextWorkerFixtures = {
  sharedContexts: SharedContexts;
};

export interface SharedContexts {
  get(kind: ContextKind): Promise<BrowserContext>;
}

export function kindFromTags(tags: readonly string[]): ContextKind {
  if (tags.includes("@loginAsIDIR")) return "idir";
  if (tags.includes("@loginAsBCeID")) return "bceid";
  return "anonymous";
}

const appOrigin = new URL(baseURL).origin;

export const test = base.extend<
  SharedContextFixtures,
  SharedContextWorkerFixtures
>({
  sharedContexts: [
    async ({ browser }, use) => {
      const contexts = new Map<ContextKind, BrowserContext>();

      await use({
        async get(kind) {
          const existing = contexts.get(kind);
          if (existing) return existing;

          if (kind !== "anonymous" && !hasAuthState(kind)) {
            throw new Error(`Auth state for ${kind} not found; run the setup project`);
          }

          await connectionBudget.beforeNewContext();
          const context = await browser.newContext(
            kind === "anonymous" ? {} : { storageState: statePath(kind) },
          );

          if (kind === "anonymous") {
            await context.addInitScript(() => {
              try {
                // The marker must be a literal: Playwright serializes this
                // function, so module-scope constants are not in its closure.
                // A new page has no marker yet, so it clears the shared
                // context's localStorage before the app boots; reloads do not.
                if (window.sessionStorage.getItem("__s1bStorageReset") === null) {
                  window.localStorage.clear();
                  window.sessionStorage.setItem("__s1bStorageReset", "1");
                }
              } catch {
                // Storage is unavailable on opaque origins; nothing to reset.
              }
            });
          } else {
            await seedSessionStorage(context, kind, appOrigin);
          }

          contexts.set(kind, context);
          return context;
        },
      });

      await Promise.all([...contexts.values()].map((context) => context.close()));
    },
    { scope: "worker" },
  ],

  context: async ({ sharedContexts, $tags }, use) => {
    await connectionBudget.beforePageLoad();
    const kind = kindFromTags($tags);
    const context = await sharedContexts.get(kind);
    if (kind === "anonymous") {
      // An authenticated context must keep the cookies captured by setup.
      await context.clearCookies();
      await context.clearPermissions();
      await context.unrouteAll({ behavior: "ignoreErrors" });
    }
    await use(context);
  },
});
