/**
 * Minimal SSO debug spec. One variable at a time.
 * Experiment 2: experimentalModifyObstructiveThirdPartyCode = true +
 * prompt=login injected by cy.intercept (test-only, not an app toggle).
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

    let entraPrompt = "not-seen";
    cy.intercept("GET", "**/oauth2/v2.0/authorize*", (req) => {
      entraPrompt = new URL(req.url).searchParams.get("prompt") ?? "absent";
    });

    cy.contains("button", "Log in with IDIR", { timeout: 30_000 }).click();

    cy.location("href", { timeout: 20_000 }).then((href) =>
      cy.task("log:debug", `after click: ${href.slice(0, 180)}`, { log: false }),
    );
    cy.get("body", { timeout: 20_000 }).then(($body) => {
      const text = $body.text().replace(/\s+/g, " ").slice(0, 200);
      cy.task("log:debug", `body: ${text}`, { log: false });
      cy.task("log:debug", `entra prompt param: ${entraPrompt}`, { log: false });
      cy.get('input[name="loginfmt"], #i0116', { timeout: 20_000 }).should("be.visible");
    });
  });
});
