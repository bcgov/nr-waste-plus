import assert from "node:assert/strict";
import test from "node:test";

import { parseEvent, SCHEMA_VERSION } from "./schema.ts";

const base = {
  schemaVersion: SCHEMA_VERSION,
  feature: "screen-load.feature",
  scenario: "the page loads",
  attempt: 0,
  recordedAt: "2026-11-26T12:00:00.000Z",
};

const a11y = {
  ...base,
  kind: "a11y",
  url: "http://localhost:3000/",
  violationCount: 0,
  violations: [],
};

const uiux = {
  ...base,
  kind: "uiux",
  event: "check",
  type: "token",
  taxonomy: "spacing",
  property: "margin",
  expected: "1rem",
  actual: "1rem",
  element: "main",
  selector: "#root",
};

const lighthouse = {
  ...base,
  kind: "lighthouse",
  type: "metric",
  id: "largest-contentful-paint",
  name: "LCP",
  value: 1200,
  threshold: 2500,
  comparison: "<=",
  passed: true,
  severity: "info",
  taxonomy: "web-vitals",
  url: "http://localhost:3000/",
  lighthouseOptions: { formFactor: "mobile", screenEmulation: null },
  lighthouseConfigSettings: {},
};

test("parseEvent accepts each valid kind and preserves the discriminator", () => {
  assert.equal(parseEvent(a11y).kind, "a11y");
  assert.equal(parseEvent(uiux).kind, "uiux");
  assert.equal(parseEvent(lighthouse).kind, "lighthouse");
});

test("parseEvent rejects a missing required field", () => {
  assert.throws(() => parseEvent({ ...a11y, violationCount: undefined }));
  assert.throws(() => parseEvent({ ...uiux, actual: undefined }));
  assert.throws(() => parseEvent({ ...lighthouse, threshold: undefined }));
});

test("parseEvent rejects the wrong schemaVersion", () => {
  assert.throws(() => parseEvent({ ...a11y, schemaVersion: 2 }));
});

test("parseEvent rejects an ISO timestamp without a timezone", () => {
  assert.throws(() => parseEvent({ ...a11y, recordedAt: "2026-11-26T12:00:00" }));
});

test("parseEvent rejects an unknown kind", () => {
  assert.throws(() => parseEvent({ ...a11y, kind: "performance" }));
});

test("parseEvent rejects a negative attempt", () => {
  assert.throws(() => parseEvent({ ...a11y, attempt: -1 }));
});
