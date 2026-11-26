import type { TestInfo } from "@playwright/test";
import type { UiuxEvent } from "../reporters/quality/schema.ts" with { "resolution-mode": "import" };

import { attachQuality, loadQualitySchema, qualityBase } from "./quality.ts";

export type UiuxRecorderInput = Pick<
  UiuxEvent,
  | "event"
  | "type"
  | "taxonomy"
  | "severity"
  | "property"
  | "expected"
  | "actual"
  | "element"
  | "selector"
>;

export interface UiuxRecorder {
  record(event: UiuxRecorderInput): Promise<UiuxEvent>;
}

export function createUiuxRecorder(testInfo: TestInfo): UiuxRecorder {
  return {
    async record(event: UiuxRecorderInput): Promise<UiuxEvent> {
      const schema = await loadQualitySchema();
      const validated: UiuxEvent = schema.UiuxEventSchema.parse({
        ...qualityBase(schema, testInfo, "uiux"),
        ...event,
      });
      await attachQuality(testInfo, "uiux", validated);
      return validated;
    },
  };
}
