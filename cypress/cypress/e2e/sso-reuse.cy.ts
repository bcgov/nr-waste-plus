/** Companion spec: must reuse the cached cy.session without hitting Entra. */
describe("SSO session reuse", () => {
  it("reaches the app from the cached session", () => {
    const started = Date.now();
    cy.loginViaIdir();
    cy.get(".cds--header__name", { timeout: 30_000 }).should("be.visible");
    cy.task("log:debug", `session reuse took ${Date.now() - started}ms`, { log: false });
  });
});
