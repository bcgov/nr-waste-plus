const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

type Tokens = {
  tokenVar(name: string): string;
  propertyFromToken(tokenName: string, currentToken: string): string;
  pickTokenVar(
    baseVar: string,
    property: string,
    values: Readonly<Record<string, string>>,
  ): string;
  emptyTokenVars(
    vars: readonly string[],
    values: Readonly<Record<string, string>>,
  ): string[];
  normalizeToPx(value: string, fontSize?: number): number;
  valuesMatch(tokenValue: string | null, elementValue: string, fontSize?: number): boolean;
  colorsMatch(color1: string, color2: string): boolean;
  hexToRgb(hex: string): { r: number; g: number; b: number } | null;
  getContrastRatio(color1: string, color2: string): number | null;
  getContrastLevel(ratio: number, isLargeText?: boolean): string;
  meetsContrastRequirement(ratio: number, level: string, isLargeText?: boolean): boolean;
  isTransparent(color: string): boolean;
  getTaxonomy(property: string): string;
  getSeverity(taxonomy: string, event: "check" | "violation"): string;
};

// This package is CommonJS; transpile the dependency-free parts of tokens.ts
// to CJS so node:test exercises the same source Playwright loads.
function loadTokens(): Tokens {
  const file = path.join(__dirname, "tokens.ts");
  const source = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  const loaded: { exports: Tokens } = { exports: {} as Tokens };
  new Function("module", "exports", "require", js)(loaded, loaded.exports, require);
  return loaded.exports;
}

const {
  tokenVar,
  propertyFromToken,
  pickTokenVar,
  emptyTokenVars,
  normalizeToPx,
  valuesMatch,
  colorsMatch,
  hexToRgb,
  getContrastRatio,
  getContrastLevel,
  meetsContrastRequirement,
  isTransparent,
  getTaxonomy,
  getSeverity,
} = loadTokens();

test("tokenVar maps Carbon feature names with the Cypress prefix rules", () => {
  assert.equal(tokenVar("$layout-04"), "--cds-layout-04");
  assert.equal(tokenVar("layout-04"), "--cds-layout-04");
  assert.equal(tokenVar("cds--btn--primary"), "--cds-btn--primary");
  assert.equal(tokenVar(" --cds-layout-04 "), "--cds-layout-04");
});

test("propertyFromToken strips only the token's own prefix", () => {
  assert.equal(propertyFromToken("$layout-04", "--cds-layout-04-height"), "height");
  assert.equal(propertyFromToken("$layout-04", "font-size"), "font-size");
});

test("pickTokenVar prefers a property-specific token and falls back to base", () => {
  assert.equal(
    pickTokenVar("--cds-layout-04", "height", { "--cds-layout-04-height": "1rem" }),
    "--cds-layout-04-height",
  );
  assert.equal(pickTokenVar("--cds-layout-04", "height", {}), "--cds-layout-04");
  assert.equal(
    pickTokenVar("--cds-layout-04", "height", { "--cds-layout-04-height": "  " }),
    "--cds-layout-04",
  );
});

test("missingTokens filters out tokens with an empty :root value", () => {
  assert.deepEqual(
    emptyTokenVars(["--cds-layout-04", "--cds-no-such-token"], {
      "--cds-layout-04": "3rem",
      "--cds-no-such-token": "  ",
    }),
    ["--cds-no-such-token"],
  );
  assert.deepEqual(emptyTokenVars([], {}), []);
});

test("normalizeToPx and valuesMatch keep rem/px parity", () => {
  assert.equal(normalizeToPx("3rem"), 48);
  assert.equal(normalizeToPx("0.875rem", 16), 14);
  assert.equal(valuesMatch("3rem", "48px"), true);
  assert.equal(valuesMatch(null, "48px"), false);
});

test("contrast math matches WCAG reference pairs", () => {
  assert.deepEqual(hexToRgb("#ffffff"), { r: 255, g: 255, b: 255 });
  assert.equal(getContrastRatio("#000000", "#ffffff"), 21);
  assert.equal(getContrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(getContrastRatio("not-a-color", "#ffffff"), null);
  assert.equal(colorsMatch("#ffffff", "rgb(255, 255, 255)"), true);
  assert.equal(isTransparent("rgba(0, 0, 0, 0)"), true);
  assert.equal(isTransparent("rgb(0, 0, 0)"), false);
});

test("AA/AAA thresholds are unchanged from tokens.helpers.ts", () => {
  assert.equal(getContrastLevel(21), "AAA");
  assert.equal(getContrastLevel(7), "AAA");
  assert.equal(getContrastLevel(4.5), "AA");
  assert.equal(getContrastLevel(3), "A");
  assert.equal(getContrastLevel(2.9), "fail");
  assert.equal(getContrastLevel(4.5, true), "AAA");
  assert.equal(meetsContrastRequirement(4.5, "AA"), true);
  assert.equal(meetsContrastRequirement(4.4, "AA"), false);
});

test("taxonomy and severity mapping is unchanged", () => {
  assert.equal(getTaxonomy("height"), "layout");
  assert.equal(getTaxonomy("font-size"), "typography");
  assert.equal(getTaxonomy("contrast"), "contrast");
  assert.equal(getTaxonomy("class"), "style");
  assert.equal(getSeverity("contrast", "violation"), "critical");
  assert.equal(getSeverity("color", "violation"), "critical");
  assert.equal(getSeverity("typography", "violation"), "major");
  assert.equal(getSeverity("spacing", "violation"), "minor");
  assert.equal(getSeverity("contrast", "check"), "info");
  assert.equal(getSeverity("unknown", "violation"), "major");
});
