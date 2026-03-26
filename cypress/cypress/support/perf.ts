interface LighthouseRawEvent {
  type: "lighthouse:record";
  id: string;              // audit ID
  name: string;            // human-friendly name
  value: number | null;    // numericValue
  category?: string;       // performance, seo, etc.
  taxonomy: string;        // web-vitals, timing, layout, etc.
  severity: string;        // info/minor/major/critical
  url: string;
  timestamp: string;
};

export interface LighthouseAssertionEvent extends LighthouseRawEvent{  
  threshold: number;          // user-provided threshold
  comparison: "gte" | "lte";  // ≥ or ≤
  passed: boolean;  
  scenario: string;
};

export interface LighthouseReport {
  url: string;
  categories: Record<string, number | null>;
  metrics: Record<string, number | null>;
  raw: any;
};

export const getLighthouseTaxonomy = (id: string): string => {
  if (["largest-contentful-paint", "first-contentful-paint", "cumulative-layout-shift"].includes(id)) {
    return "web-vitals";
  }
  if (id.includes("response") || id.includes("network")) {
    return "network";
  }
  if (id.includes("paint") || id.includes("render")) {
    return "rendering";
  }
  if (id.includes("layout") || id.includes("shift")) {
    return "layout";
  }
  return "other";
};

export const getLighthouseSeverity = (id: string, value: number | null): string => {
  if (value == null) return "info";

  if (id === "largest-contentful-paint") {
    if (value > 6000) return "critical";
    if (value > 4000) return "major";
  }

  if (id === "cumulative-layout-shift") {
    if (value > 0.25) return "critical";
  }

  if (id === "server-response-time") {
    if (value > 600) return "minor";
  }

  return "info";
};

export const recordEvent = (url: string, report: LighthouseReport) => {
  const timestamp = new Date().toISOString();
  const lighthouseEvents : LighthouseRawEvent[] = [];

  for (const [id, value] of Object.entries(report.metrics)) {
    lighthouseEvents.push({
      type: "lighthouse:record",
      id,
      name: report.raw.audits[id]?.title ?? id,
      value,
      taxonomy: getLighthouseTaxonomy(id),
      severity: getLighthouseSeverity(id, value),
      url,
      timestamp,
    });
  }

  for (const [category, score] of Object.entries(report.categories)) {
    lighthouseEvents.push({
      type: "lighthouse:record",
      id: category,
      name: category,
      value: score,
      taxonomy: category,
      severity: "info",
      url,
      timestamp,
    });
  }

  return cy.task("lighthouse:record", lighthouseEvents);

};

export const recordLighthouseAssertion = (
  event: LighthouseAssertionEvent
) => {
  return cy.task("lighthouse:record", [event]);
};
