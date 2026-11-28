import type { TestInfo } from "@playwright/test";
import type { LighthouseEvent } from "../reporters/quality/schema.ts" with { "resolution-mode": "import" };

import { attachQuality, loadQualitySchema, qualityBase } from "./quality.ts";

export type LighthouseRecorderInput = Pick<
  LighthouseEvent,
  | "type"
  | "id"
  | "name"
  | "value"
  | "threshold"
  | "comparison"
  | "passed"
  | "severity"
  | "taxonomy"
  | "url"
  | "finalUrl"
  | "documentTitle"
  | "lighthouseOptions"
  | "lighthouseConfigSettings"
>;

export interface LighthouseRecorder {
  record(event: LighthouseRecorderInput): Promise<LighthouseEvent>;
}

export function createLighthouseRecorder(testInfo: TestInfo): LighthouseRecorder {
  return {
    async record(event: LighthouseRecorderInput): Promise<LighthouseEvent> {
      const schema = await loadQualitySchema();
      const validated: LighthouseEvent = schema.LighthouseEventSchema.parse({
        ...qualityBase(schema, testInfo, "lighthouse"),
        ...event,
      });
      await attachQuality(testInfo, "lighthouse", validated);
      return validated;
    },
  };
}
