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
      req.on("response", (res) => {
        const body = res.body;
        if (typeof body === "string" && body.includes("iframe-request-id")) {
          res.body = body
            .replace(/e\.self===e\.self/g, "true")
            .replace(/!i\.allowFrame/g, "false");
        }
      });
    });

    cy.contains("button", "Log in with IDIR", { timeout: 12_000 }).click();
    cy.url({ timeout: 12_000 }).should("include", "login.microsoftonline.com");
    cy.location("href").then((href) =>
      cy.task(
        "log:debug",
        `MS URL prompt param: ${new URL(href).searchParams.get("prompt") ?? "absent"}`,
        { log: false },
      ),
    );
    cy.location("href").then((msUrl) => {
      cy.origin(
        "login.microsoftonline.com",
        { args: { msUrl } },
        ({ msUrl: url }) => {
          cy.visit(url, {
            onBeforeLoad(win) {
              // Entra's frame-busting script checks $Config.allowFrame.
              (win as Window & { $Config?: { allowFrame?: boolean } }).$Config = {
                allowFrame: true,
              };
            },
          });
          cy.location("href").should("not.contain", "iframe-request-id");
          cy.get('input[type="email"]', { timeout: 12_000 }).should("be.visible");
        },
      );
    });
    cy.task("log:debug", `authorize requests seen: ${authorizeCount}`, { log: false });
  });
});
