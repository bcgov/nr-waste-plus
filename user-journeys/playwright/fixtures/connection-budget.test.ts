const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { mock, test } = require("node:test");
const ts = require("typescript");

type Budget = {
  beforeNewContext(): Promise<void>;
  beforePageLoad(): Promise<void>;
};

type BudgetModule = {
  ConnectionBudget: new () => Budget;
  MIN_NEW_CONTEXT_INTERVAL_MS: number;
};

// The package is CommonJS while the fixture is ESM; compile just this module
// to CJS so node:test exercises the same source Playwright loads.
function loadBudget(): BudgetModule {
  const file = path.join(__dirname, "connection-budget.ts");
  const source = fs.readFileSync(file, "utf8");
  const js: string = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  const loaded: { exports: BudgetModule } = { exports: {} as BudgetModule };
  new Function("module", "exports", js)(loaded, loaded.exports);
  return loaded.exports;
}

const { ConnectionBudget, MIN_NEW_CONTEXT_INTERVAL_MS } = loadBudget();

function fakeClock(t: { after(fn: () => void): void }, now: number): void {
  mock.timers.enable({ apis: ["Date", "setTimeout"], now });
  t.after(() => mock.timers.reset());
}

test("the first context is created immediately", async (t: { after(fn: () => void): void }) => {
  fakeClock(t, 1_000);
  const budget = new ConnectionBudget();

  let resolved = false;
  await budget.beforeNewContext().then(() => {
    resolved = true;
  });

  assert.equal(resolved, true);
  assert.equal(Date.now(), 1_000);
});

test("a second context inside the interval waits out the remainder", async (t: { after(fn: () => void): void }) => {
  fakeClock(t, 1_000);
  const budget = new ConnectionBudget();
  await budget.beforeNewContext();

  mock.timers.setTime(2_000);
  let resolved = false;
  const pending = budget.beforeNewContext().then(() => {
    resolved = true;
  });

  assert.equal(resolved, false);
  mock.timers.tick(MIN_NEW_CONTEXT_INTERVAL_MS - 1_000 - 1);
  assert.equal(resolved, false);
  mock.timers.tick(1);
  await pending;

  assert.equal(resolved, true);
  assert.equal(Date.now(), 1_000 + MIN_NEW_CONTEXT_INTERVAL_MS);
});

test("a context after the interval is immediate", async (t: { after(fn: () => void): void }) => {
  fakeClock(t, 1_000);
  const budget = new ConnectionBudget();
  await budget.beforeNewContext();

  mock.timers.setTime(1_000 + MIN_NEW_CONTEXT_INTERVAL_MS);
  await budget.beforeNewContext();

  assert.equal(Date.now(), 1_000 + MIN_NEW_CONTEXT_INTERVAL_MS);
});

test("page-load and context slots share one timer", async (t: { after(fn: () => void): void }) => {
  fakeClock(t, 1_000);
  const budget = new ConnectionBudget();
  await budget.beforeNewContext();

  mock.timers.setTime(2_000);
  const pending = budget.beforePageLoad();
  mock.timers.tick(MIN_NEW_CONTEXT_INTERVAL_MS - 1_000);
  await pending;

  assert.equal(Date.now(), 1_000 + MIN_NEW_CONTEXT_INTERVAL_MS);
});
