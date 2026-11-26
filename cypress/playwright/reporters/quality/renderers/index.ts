import type { QualitySummary } from "../aggregate.ts";

import { renderA11y } from "./a11y.ts";
import { renderFailures } from "./failures.ts";
import { renderLighthouse } from "./lighthouse.ts";
import { renderSummary } from "./summary.ts";
import { renderUiux } from "./uiux.ts";

export const renderers: Record<string, (data: QualitySummary) => string> = {
  summary: renderSummary,
  a11y: renderA11y,
  uiux: renderUiux,
  lighthouse: renderLighthouse,
  failures: renderFailures,
};
