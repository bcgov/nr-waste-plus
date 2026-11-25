/** Verifies cy.loginViaIdir() reaches the authenticated app and correct profile. */
describe("SSO login via command", () => {
  it("reaches the authenticated app", () => {
    cy.loginViaIdir();
    cy.get(".cds--header__name", { timeout: 12_000 }).should("be.visible");
  });

  it("profile shows the configured account", () => {
    cy.loginViaIdir();
    cy.get('[data-testid="profile-action"]', { timeout: 12_000 }).click();
    cy.env(["idir_username"]).then((env) => {
      cy.get('[data-testid="header-panel"]', { timeout: 12_000 }).should(
        "contain.text",
        `Email: ${env.idir_username}`,
      );
    });
  });
});
