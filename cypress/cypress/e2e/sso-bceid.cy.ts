/** Debug spec: Business BCeID login from the exported session. */
describe("SSO BCeID login via command", () => {
  it("reaches the authenticated app", () => {
    cy.loginViaBceid();
    cy.get(".cds--header__name", { timeout: 12_000 }).should("be.visible");
  });

  it("profile shows the BCeID identity", () => {
    cy.loginViaBceid();
    cy.get('[data-testid="profile-action"]', { timeout: 12_000 }).click();
    cy.get('[data-testid="header-panel"]', { timeout: 12_000 }).should("contain.text", "BCEIDBUSINESS");
  });
});
