import type { TestInfo } from "@playwright/test";
import type { A11yEvent } from "../reporters/quality/schema.ts" with { "resolution-mode": "import" };

import { attachQuality, loadQualitySchema, qualityBase } from "./quality.ts";

export type A11yRecorderInput = Pick<
  A11yEvent,
  "url" | "scope" | "violationCount" | "violations"
>;

export interface A11yRecorder {
  record(event: A11yRecorderInput): Promise<A11yEvent>;
}

export function createA11yRecorder(testInfo: TestInfo): A11yRecorder {
  return {
    async record(event: A11yRecorderInput): Promise<A11yEvent> {
      const schema = await loadQualitySchema();
      const validated: A11yEvent = schema.A11yEventSchema.parse({
        ...qualityBase(schema, testInfo, "a11y"),
        ...event,
      });
      await attachQuality(testInfo, "a11y", validated);
      return validated;
    },
  };
}
