import { Given, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("I visit {string}", (url: string) => {
  // Content assertions remain responsible for waiting on React Query rendering. Cypress
  // already waits for the document load event, so adding a second load listener here cannot
  // help when the document itself fails to load.
  cy.visit(url);
});

Then("the client filter for {string} should be visible", (clientNumber: string) => {
  cy.get(`[data-testid="dt-clientNumbers-${clientNumber}"]`).should("be.visible");
});

/**
 * Stubs the reporting-unit details endpoint with a fully-populated District
 * Average unit so the block details page can render without a backend.
 *
 * The grade is what selects the submission-details twin (D3): the Interior
 * grade resolves to the interior variant and the Coast grade to the coast
 * variant (`resolveSubmissionVariant` matches the grade code `COASTAL` or a
 * `coast`/`coastal` description). Field values mirror the frontend's
 * `reportingUnitPayload` fixture.
 *
 * @param reportingUnitId - The reporting unit id in the request path.
 * @param grade - "Interior" or "Coast".
 */
Given(
  "the reporting unit API for {string} returns the {string} district average unit",
  (reportingUnitId: string, grade: string) => {
    const isCoast = grade.toLowerCase() === "coast";
    cy.intercept("GET", `**/api/reporting-units/${reportingUnitId}`, {
      body: {
        id: Number(reportingUnitId),
        client: { code: "00002022", description: "Canadian Forest Products Ltd." },
        clientStatus: { code: "ACT", description: "Active" },
        grade: isCoast
          ? { code: "COASTAL", description: "Coast" }
          : { code: "IN", description: "Interior" },
        sampling: { code: "DA", description: "District Average" },
        district: { code: "DKM", description: "Coast Mountains District" },
      },
    });
  },
);

/**
 * Stubs the block details endpoint. The URL pattern is the literal request
 * path, e.g. `"468/12"` for `GET /api/reporting-units/468/12`, so it never
 * collides with the reporting-unit stub above.
 *
 * A `draft` block is editable (`isLegacy: false`, no PLC date) and a `legacy`
 * block renders read-only with the legacy PLC date. Field names mirror the
 * frontend's `blockDetailsPayload` fixture.
 *
 * @param blockPath - `{ruId}/{blockId}` path segment of the request URL.
 * @param state - "draft" or "legacy".
 */
Given(
  "the block details API for {string} returns the {string} block",
  (blockPath: string, state: string) => {
    const [ruId, blockId] = blockPath.split("/");
    const isLegacy = state === "legacy";
    cy.intercept("GET", `**/api/reporting-units/${blockPath}`, {
      body: {
        id: Number(blockId),
        reportingUnitId: Number(ruId),
        blockType: "DISTRICT_AVERAGE",
        draft: !isLegacy,
        plcDate: isLegacy ? "2024-05-01" : null,
        revision: isLegacy ? 3 : 1,
        isLegacy,
      },
    });
  },
);

Given(
  "the reporting unit API for {string} returns no grade",
  (reportingUnitId: string) => {
    cy.intercept(
      "GET",
      `**/api/reporting-units/${reportingUnitId}`,
      (request) => {
        request.continue((response) => {
          if (typeof response.body !== "object" || response.body === null) {
            return;
          }

          const body = response.body as Record<string, unknown>;
          body.grade = { code: null, description: null, areas: [] };
          response.body = body;
        });
      },
    );
  },
);
