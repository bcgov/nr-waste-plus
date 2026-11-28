const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

type TextModule = {
  textPattern(text: string): RegExp;
  exactTextPattern(text: string): RegExp;
};

// This package is CommonJS, so compile the pure helper to CJS before testing it.
function loadText(): TextModule {
  const file = path.join(__dirname, "text.ts");
  const source = fs.readFileSync(file, "utf8");
  const js: string = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  const loaded: { exports: TextModule } = { exports: {} as TextModule };
  new Function("module", "exports", js)(loaded, loaded.exports);
  return loaded.exports;
}

const { textPattern, exactTextPattern } = loadText();

test("textPattern treats regex metacharacters as literal text", () => {
  const hint = "Consider adjusting your search term(s) and try again.";
  const pattern = textPattern(hint);

  assert.equal(pattern.test(`prefix ${hint} suffix`), true);
  assert.equal(
    pattern.test("Consider adjusting your search terms and try again."),
    false,
  );
});

test("textPattern stays case-sensitive to match Cypress cy.contains", () => {
  const pattern = textPattern("Waste Plus");

  assert.equal(pattern.test("Waste Plus"), true);
  assert.equal(pattern.test("waste plus"), false);
});

test("exactTextPattern does not match a longer name containing the term", () => {
  const pattern = exactTextPattern("Search");

  assert.equal(pattern.test("Search"), true);
  assert.equal(pattern.test("Clear search input"), false);
  assert.equal(pattern.test("Search results"), false);
});
