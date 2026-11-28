import type { QualitySummary } from "../aggregate.ts";

export function renderFailures(data: QualitySummary): string {
  if (data.failures.length === 0) return "";

  const lines = ["## Other failed tests", ""];
  for (const failure of data.failures) {
    lines.push(`- **${failure.title}** (${failure.file}) - ${failure.durationMs}ms`);
    lines.push(`  - ${failure.error}`, "");
  }
  return lines.join("\n").trimEnd();
}
