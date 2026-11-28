const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

type A11yPure = {
  AXE_TAGS: readonly string[];
  normalizeSpace(value: string): string;
  regionSelectorCandidates(region: string): string[];
  headingHierarchyError(tags: readonly string[], region: string): string | null;
  toRecordedViolations(violations: readonly {
    id: string;
    impact?: string | null;
    nodes: readonly unknown[];
    help: string;
    helpUrl: string;
  }[]): { id: string; impact: string; nodes: number; help: string; helpUrl: string }[];
  violationDetails(violations: readonly { id: string; impact: string; nodes: number }[]): string;
};

// This package is CommonJS; compile the dependency-free helper to CJS so
// node:test exercises the same source Playwright loads.
function loadPure(): A11yPure {
  const file = path.join(__dirname, "a11y-pure.ts");
  const source = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  const loaded: { exports: A11yPure } = { exports: {} as A11yPure };
  new Function("module", "exports", js)(loaded, loaded.exports);
  return loaded.exports;
}

const {
  AXE_TAGS,
  normalizeSpace,
  regionSelectorCandidates,
  headingHierarchyError,
  toRecordedViolations,
  violationDetails,
} = loadPure();

test("axe scope stays at wcag2a + wcag2aa (D-009)", () => {
  assert.deepEqual([...AXE_TAGS], ["wcag2a", "wcag2aa"]);
});

test("normalizeSpace collapses all whitespace runs", () => {
  assert.equal(normalizeSpace("  Dark \n mode \t enabled  "), "Dark mode enabled");
  assert.equal(normalizeSpace(""), "");
});

test("named main region resolves to .layout-grid before literal candidates", () => {
  assert.deepEqual(regionSelectorCandidates(" main "), [
    ".layout-grid",
    "main",
    "[aria-label='main']",
    "[data-testid='main']",
    "[role='region'][aria-label='main']",
  ]);
});

test("unknown region falls back to literal selectors only", () => {
  assert.deepEqual(regionSelectorCandidates("app-announcer"), [
    "app-announcer",
    "[aria-label='app-announcer']",
    "[data-testid='app-announcer']",
    "[role='region'][aria-label='app-announcer']",
  ]);
});

test("heading hierarchy accepts equal and descending levels", () => {
  assert.equal(headingHierarchyError(["H1", "H2", "H2", "H3"], "main"), null);
});

test("heading hierarchy reports skips with the Cypress message", () => {
  assert.equal(
    headingHierarchyError(["H1", "H3"], "main"),
    'Invalid heading order in region "main": h3 appears after h1.',
  );
});

test("heading hierarchy reports a region with no headings", () => {
  assert.equal(headingHierarchyError([], "main"), 'No headings found in region "main".');
});

test("axe violations are mapped to the event shape with node counts", () => {
  const recorded = toRecordedViolations([
    {
      id: "color-contrast",
      impact: "serious",
      nodes: [{}, {}],
      help: "Elements must have sufficient color contrast",
      helpUrl: "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    },
    { id: "region", nodes: [], help: "All page content should be contained by landmarks", helpUrl: "u" },
  ]);

  assert.deepEqual(recorded, [
    {
      id: "color-contrast",
      impact: "serious",
      nodes: 2,
      help: "Elements must have sufficient color contrast",
      helpUrl: "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    },
    { id: "region", impact: "unknown", nodes: 0, help: "All page content should be contained by landmarks", helpUrl: "u" },
  ]);
  assert.equal(
    violationDetails(recorded),
    "color-contrast (serious, nodes: 2); region (unknown, nodes: 0)",
  );
});
