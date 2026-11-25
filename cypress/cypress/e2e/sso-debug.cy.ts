/**
 * Minimal SSO debug: one variable at a time.
 * Current: experimentalModifyObstructiveThirdPartyCode + prompt=login intercept.
 * Every wait is <= 12 s; no timeout increases.
 */
describe("SSO loop debug", () => {
  it("clicking IDIR reaches the Microsoft email form", () => {
    cy.task("session:clear", null, { log: false });
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit("/", { onBeforeLoad: (win) => win.sessionStorage.clear() });

    cy.intercept("GET", "**/protocol/openid-connect/auth*", (req) => {
      const url = new URL(req.url);
      if (!url.searchParams.has("prompt")) {
        url.searchParams.set("prompt", "login");
        req.redirect(url.toString());
      }
    });

    let authorizeCount = 0;
    cy.intercept("GET", "**/oauth2/v2.0/authorize*", (req) => {
      authorizeCount += 1;
    });

    cy.contains("button", "Log in with IDIR", { timeout: 12_000 }).click();
    cy.location("href", { timeout: 12_000 }).then((href) =>
      cy.task("log:debug", `after click: ${href.slice(0, 180)}`, { log: false }),
    );
    cy.get('input[name="loginfmt"], #i0116', { timeout: 12_000 }).should("be.visible");
    cy.task("log:debug", `authorize requests seen: ${authorizeCount}`, { log: false });
  });
});
