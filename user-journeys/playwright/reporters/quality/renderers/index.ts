import type { QualitySummary } from "../aggregate.ts";

import { renderA11y } from "./a11y.ts";
import { renderFailures } from "./failures.ts";
import { renderLighthouse } from "./lighthouse.ts";
import { renderSummary } from "./summary.ts";
import { renderUiux } from "./uiux.ts";

export const SECTION_ORDER = [
  "summary",
  "a11y",
  "lighthouse",
  "uiux",
  "failures",
] as const;

export type SectionName = (typeof SECTION_ORDER)[number];

export const renderers: Record<SectionName, (data: QualitySummary) => string> = {
  summary: renderSummary,
  a11y: renderA11y,
  lighthouse: renderLighthouse,
  uiux: renderUiux,
  failures: renderFailures,
};

export function renderQualityMarkdown(data: QualitySummary): string {
  return SECTION_ORDER.map((name) => renderers[name](data))
    .filter((section) => section.length > 0)
    .join("\n\n");
}
