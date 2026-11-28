import { expect } from "@playwright/test";

import { Given, Then } from "../fixtures";
import { appReady } from "../fixtures/app-ready.ts";
import { connectionBudget } from "../fixtures/connection-budget.ts";

Given("I visit {string}", async ({ page }, path: string) => {
  // A document navigation reopens the app's asset burst, which the Silver
  // route rate-limits per client IP (guide §0). SPA route changes do not.
  await connectionBudget.beforePageLoad();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await appReady(page);
});

Then(
  "the client filter for {string} should be visible",
  async ({ page }, clientNumber: string) => {
    await expect(page.getByTestId(`dt-clientNumbers-${clientNumber}`)).toBeVisible({
      timeout: 30_000,
    });
  },
);

/**
 * The grade selects the submission-details twin: COASTAL/coast resolves to the
 * coast variant, everything else to the interior variant. Values mirror the
 * frontend's reportingUnitPayload fixture, as in the Cypress stub.
 */
Given(
  "the reporting unit API for {string} returns the {string} district average unit",
  async ({ page }, reportingUnitId: string, grade: string) => {
    const isCoast = grade.toLowerCase() === "coast";
    await page.route(`**/api/reporting-units/${reportingUnitId}`, (route) =>
      route.fulfill({
        json: {
          id: Number(reportingUnitId),
          client: {
            code: "00002022",
            description: "Canadian Forest Products Ltd.",
          },
          clientStatus: { code: "ACT", description: "Active" },
          grade: isCoast
            ? { code: "COASTAL", description: "Coast" }
            : { code: "IN", description: "Interior" },
          sampling: { code: "DA", description: "District Average" },
          district: { code: "DKM", description: "Coast Mountains District" },
        },
      }),
    );
  },
);

/** Stubs the block details endpoint by its literal `{ruId}/{blockId}` path. */
Given(
  "the block details API for {string} returns the {string} block",
  async ({ page }, blockPath: string, state: string) => {
    const [ruId, blockId] = blockPath.split("/");
    const isLegacy = state === "legacy";
    await page.route(`**/api/reporting-units/${blockPath}`, (route) =>
      route.fulfill({
        json: {
          id: Number(blockId),
          reportingUnitId: Number(ruId),
          blockType: "DISTRICT_AVERAGE",
          draft: !isLegacy,
          plcDate: isLegacy ? "2024-05-01" : null,
          revision: isLegacy ? 3 : 1,
          isLegacy,
        },
      }),
    );
  },
);

/** Mutates the real response instead of replacing it, as Cypress' continue did. */
Given(
  "the reporting unit API for {string} returns no grade",
  async ({ page }, reportingUnitId: string) => {
    await page.route(`**/api/reporting-units/${reportingUnitId}`, async (route) => {
      const response = await route.fetch();
      // Cypress left non-object response bodies untouched; do the same when the
      // backend answers with an error page or an empty body.
      if (!(response.headers()["content-type"] ?? "").includes("application/json")) {
        await route.fulfill({ response });
        return;
      }
      const parsed: unknown = await response.json().catch(() => null);
      if (typeof parsed !== "object" || parsed === null) {
        await route.fulfill({ response });
        return;
      }
      const body = parsed as Record<string, unknown>;
      body.grade = { code: null, description: null, areas: [] };
      await route.fulfill({ response, json: body });
    });
  },
);
