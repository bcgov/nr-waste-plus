import type { TestInfo } from "@playwright/test";
import type { QualityEvent } from "../reporters/quality/schema.ts" with { "resolution-mode": "import" };

const nodePath: typeof import("node:path") = require("node:path");

type QualitySchema = typeof import("../reporters/quality/schema.ts", { with: { "resolution-mode": "import" } });

export async function loadQualitySchema(): Promise<QualitySchema> {
  return import("../reporters/quality/schema.ts");
}

export function qualityBase(
  schema: QualitySchema,
  testInfo: TestInfo,
  kind: QualityEvent["kind"],
) {
  return {
    schemaVersion: schema.SCHEMA_VERSION,
    kind,
    feature: nodePath.basename(testInfo.file, nodePath.extname(testInfo.file)),
    scenario: testInfo.title,
    attempt: testInfo.retry,
    recordedAt: new Date().toISOString(),
  };
}

export async function attachQuality(
  testInfo: TestInfo,
  kind: QualityEvent["kind"],
  event: QualityEvent,
): Promise<void> {
  await testInfo.attach(`quality:${kind}`, {
    body: JSON.stringify(event),
    contentType: "application/json",
  });
}
