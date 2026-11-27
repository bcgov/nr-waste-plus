import type { Response } from "@playwright/test";

import { test as base } from "./auth.fixture.ts";

type ConsoleRecord = { type: "warning" | "error"; text: string };
type HttpRecord = { status: number; url: string };
type Diagnostics = {
  console: ConsoleRecord[];
  pageErrors: string[];
  httpErrors: HttpRecord[];
};

/** ResizeObserver loop notices are browser layout noise, not app failures. */
const IGNORED = /ResizeObserver/i;
const MAX_CONSOLE_TEXT = 2_000;

/** Drop query strings and fragments: they can carry tokens (guide §1). */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const data: Diagnostics = { console: [], pageErrors: [], httpErrors: [] };

      page.on("console", (message) => {
        if (message.type() !== "warning" && message.type() !== "error") return;
        const text = message.text();
        if (IGNORED.test(text)) return;
        data.console.push({
          type: message.type() as ConsoleRecord["type"],
          text: text.slice(0, MAX_CONSOLE_TEXT),
        });
      });
      page.on("pageerror", (error) => {
        if (IGNORED.test(error.message)) return;
        data.pageErrors.push(error.message.slice(0, MAX_CONSOLE_TEXT));
      });
      page.on("response", (response: Response) => {
        if (response.status() < 400) return;
        data.httpErrors.push({
          status: response.status(),
          url: redactUrl(response.url()),
        });
      });

      await use();

      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach("diagnostics.json", {
          body: JSON.stringify(data, null, 2),
          contentType: "application/json",
        });
      }
    },
    { auto: true },
  ],
});
