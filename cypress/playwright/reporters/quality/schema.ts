import { z } from "zod";

export const SCHEMA_VERSION = 1;

const baseFields = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  feature: z.string(),
  scenario: z.string(),
  attempt: z.number().int().min(0),
  recordedAt: z.iso.datetime(),
};

export const BaseEventSchema = z.object(baseFields);

export const A11yViolationSchema = z.object({
  id: z.string(),
  impact: z.string(),
  nodes: z.number().int().min(0),
  help: z.string(),
  helpUrl: z.string(),
});

export const A11yEventSchema = z.object({
  ...baseFields,
  kind: z.literal("a11y"),
  url: z.string(),
  scope: z.string().optional(),
  violationCount: z.number().int().min(0),
  violations: z.array(A11yViolationSchema),
});

export const UiuxEventSchema = z.object({
  ...baseFields,
  kind: z.literal("uiux"),
  event: z.enum(["check", "violation"]),
  type: z.string(),
  taxonomy: z.string(),
  severity: z.enum(["info", "minor", "major"]).optional(),
  property: z.string(),
  expected: z.string().nullable(),
  actual: z.string(),
  element: z.string(),
  selector: z.string().optional(),
});

export const LighthouseOptionsSchema = z.object({
  formFactor: z.enum(["mobile", "desktop"]),
  screenEmulation: z
    .object({
      mobile: z.boolean().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      deviceScaleFactor: z.number().optional(),
      disabled: z.boolean().optional(),
    })
    .nullable(),
});

export const LighthouseEventSchema = z.object({
  ...baseFields,
  kind: z.literal("lighthouse"),
  type: z.enum(["category", "metric"]),
  id: z.string(),
  name: z.string(),
  value: z.number(),
  threshold: z.number(),
  comparison: z.enum([">=", "<="]),
  passed: z.boolean(),
  severity: z.string(),
  taxonomy: z.string(),
  url: z.string(),
  lighthouseOptions: LighthouseOptionsSchema,
  lighthouseConfigSettings: z.record(z.string(), z.unknown()),
});

export const QualityEventSchema = z.discriminatedUnion("kind", [
  A11yEventSchema,
  UiuxEventSchema,
  LighthouseEventSchema,
]);

export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type A11yViolation = z.infer<typeof A11yViolationSchema>;
export type A11yEvent = z.infer<typeof A11yEventSchema>;
export type UiuxEvent = z.infer<typeof UiuxEventSchema>;
export type LighthouseEvent = z.infer<typeof LighthouseEventSchema>;
export type QualityEvent = z.infer<typeof QualityEventSchema>;
export type QualityKind = QualityEvent["kind"];

export function parseEvent(json: unknown): QualityEvent {
  return QualityEventSchema.parse(json);
}
