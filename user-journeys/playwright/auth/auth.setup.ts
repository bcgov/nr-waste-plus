import { mkdirSync } from "node:fs";

import {
  devices,
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";

import { baseURL, credentials, VIEWPORT } from "../env.ts";
import { connectionBudget } from "../fixtures/connection-budget.ts";
import { fillSecret } from "./secrets.ts";
import {
  accessTokenFrom,
  assertBackendAccepts,
  AUTH_DIR,
  resolveBackendOrigin,
  snapshotFromPage,
  statePath,
  writeSession,
  type AuthKind,
} from "./session.ts";
import { freshTotp } from "./totp.ts";

const REJECTION = /account or password is incorrect|sign-in was blocked/i;
const MFA_FAILURE = /sorry, we're having trouble verifying your account|we couldn't verify your account/i;
const OTC_FIELD = 'input[name="otc"], #idTxtBx_SAOTCC_OTC';

const REJECTED_MESSAGE = "Entra rejected the IDIR credentials.";
const NO_TOTP_MESSAGE = "Entra MFA prompt present but idir_totp_secret is not configured.";
const MFA_FAILED_MESSAGE =
  "Entra could not verify the IDIR account: no verification-code control was offered at the MFA step.";
const MFA_STUCK_MESSAGE =
  "Entra MFA stage not recognised within 30 s: no verification-code field, alternate-method control, rejection or app redirect appeared.";

// Worst-case documented waits are ~30 s landing, 30 s OTC race, 30 s code
// entry, 60 s post-MFA prompts and 60 s app redirect; 90 s cannot cover them.
const IDIR_SETUP_TIMEOUT_MS = 240_000;

/** Records a reached IdP/app stage in the report without touching secret values. */
const reached = async (stage: string, action: () => Promise<void>): Promise<void> => {
  test.info().annotations.push({ type: "auth-stage", description: stage });
  await test.step(stage, action);
};

const assertNoEntraError = async (page: Page): Promise<void> => {
  if (await page.getByText(REJECTION).first().isVisible().catch(() => false)) {
    throw new Error(REJECTED_MESSAGE);
  }
  if (await page.getByText(MFA_FAILURE).first().isVisible().catch(() => false)) {
    throw new Error(MFA_FAILED_MESSAGE);
  }
};

/** Answers Entra's authenticator-app prompt with a fresh one-shot TOTP code. */
const completeTotpChallenge = async (
  page: Page,
  secret: string | undefined,
): Promise<void> => {
  const codeInput = page.locator(OTC_FIELD).first();
  const otherWay = page.locator("#signInAnotherWay").first();
  // Entra's failed push prompt offers this control instead of showing the OTC
  // field up front (reproduced locally at the 90 s timeout).
  const useCode = page.getByRole("button", { name: /use a verification code/i }).first();
  const rejection = page.getByText(REJECTION).first();
  const mfaFailure = page.getByText(MFA_FAILURE).first();
  const backToApp = page.waitForURL((url) => url.pathname.startsWith("/search"), {
    timeout: 30_000,
  });

  let stage = await Promise.race([
    rejection.waitFor({ state: "visible", timeout: 30_000 }).then(() => "rejected" as const),
    mfaFailure.waitFor({ state: "visible", timeout: 30_000 }).then(() => "mfa-failed" as const),
    codeInput.waitFor({ state: "visible", timeout: 30_000 }).then(() => "code" as const),
    otherWay.waitFor({ state: "visible", timeout: 30_000 }).then(() => "other" as const),
    useCode.waitFor({ state: "visible", timeout: 30_000 }).then(() => "use-code" as const),
    backToApp.then(() => "done" as const),
  ]).catch(() => "none" as const);
  backToApp.catch(() => undefined);

  if (stage === "rejected") throw new Error(REJECTED_MESSAGE);
  // A failed push prompt still has a deterministic code path; only fail fast
  // when that control is absent.
  if (stage === "mfa-failed") {
    if (await codeInput.isVisible().catch(() => false)) {
      stage = "code";
    } else if (await useCode.isVisible().catch(() => false)) {
      stage = "use-code";
    } else {
      throw new Error(MFA_FAILED_MESSAGE);
    }
  }
  if (stage === "done") {
    await reached("IDIR: MFA not required", async () => undefined);
    return;
  }
  if (stage === "none") throw new Error(MFA_STUCK_MESSAGE);

  if (!secret) throw new Error(NO_TOTP_MESSAGE);

  if (stage === "other") {
    await reached("IDIR: OTC picker (sign in another way)", async () => {
      await otherWay.click({ timeout: 30_000 });
      await page.locator('[data-value="PhoneAppOTP"]').first().click({ timeout: 30_000 });
      await codeInput.waitFor({ state: "visible", timeout: 30_000 });
    });
  } else if (stage === "use-code") {
    await reached("IDIR: OTC picker (verification code)", async () => {
      await useCode.click({ timeout: 30_000 });
      await codeInput.waitFor({ state: "visible", timeout: 30_000 });
    });
  }

  await reached("IDIR: OTC submitted", async () => {
    await fillSecret(codeInput, await freshTotp(secret));
    await page
      .locator('#idSubmit_SAOTCC_Continue, input[type="submit"], button[type="submit"]')
      .first()
      .click({ timeout: 30_000 });
  });
};

/** Clears the interstitials Entra shows between MFA and the app redirect. */
const finishPostMfaPrompts = async (page: Page, user: string): Promise<void> => {
  const localPart = user.split("\\").pop()!.split("@")[0];
  const escaped = localPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pickAccount = page.getByRole("heading", { name: /pick an account/i });
  const accountTile = page.getByText(new RegExp(`^${escaped}`, "i")).first();
  const staySignedIn = page.locator('input#idBtn_Back, input[value="No"]').first();

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await assertNoEntraError(page);
    if (new URL(page.url()).pathname.startsWith("/search")) return;
    if (await pickAccount.isVisible().catch(() => false)) {
      await accountTile.click();
      continue;
    }
    if (await staySignedIn.isVisible().catch(() => false)) {
      await staySignedIn.click();
      continue;
    }
    await page.waitForTimeout(500); // post-MFA interstitial poll (guide §1.2)
  }
  throw new Error(
    `Entra post-MFA prompts did not resolve within 60 s (last page: ${new URL(page.url()).pathname}).`,
  );
};

/**
 * One fresh context per provider: the setup project runs once per test run, so
 * the connectionBudget slot keeps its asset burst away from the journeys' loads.
 */
const login = async (
  kind: AuthKind,
  browser: Browser,
  request: APIRequestContext,
): Promise<void> => {
  const configured = credentials();
  const username = kind === "idir" ? configured.idir.username : configured.bceid.username;
  const password = kind === "idir" ? configured.idir.password : configured.bceid.password;
  const totpSecret = kind === "idir" ? configured.idir.totpSecret : undefined;

  test.skip(!username || !password, `${kind} credentials are not configured; skipping setup.`);

  mkdirSync(AUTH_DIR, { recursive: true });
  // Two slots: one for the fresh context, one for the landing page's asset
  // burst. Without the second, a setup following another setup loads the app
  // within the route's 3 s window and the SPA shell never appears (S0/S1b).
  await connectionBudget.beforeNewContext();
  await connectionBudget.beforePageLoad();
  const context = await browser.newContext({
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: VIEWPORT,
    ignoreHTTPSErrors: true,
  });

  try {
    const page = await context.newPage();

    await test.step("landing page and provider choice", async () => {
      await page.goto("/", { timeout: 30_000 });
      const loginButton = page.getByRole("button", {
        name: kind === "idir" ? /Log in with IDIR/i : /Log in with Business BCeID/i,
      });
      await expect(loginButton).toBeVisible({ timeout: 30_000 });
      await loginButton.click({ timeout: 30_000 });
      await page.waitForURL(
        kind === "idir" ? /loginproxy|microsoftonline|logon/i : /loginproxy|logon|clp-cgi|siteminder/i,
        { timeout: kind === "idir" ? 60_000 : 12_000 },
      );
    });

    if (kind === "idir") {
      await reached("IDIR credentials and MFA", async () => {
        await reached("IDIR: loginfmt submitted", async () => {
          await fillSecret(
            page.locator('input[name="loginfmt"], input[type="email"]').first(),
            username!,
          );
          await page
            .locator('input[type="submit"], button[type="submit"]')
            .first()
            .click({ timeout: 30_000 });
          await assertNoEntraError(page);
        });

        await reached("IDIR: passwd submitted", async () => {
          await fillSecret(
            page.locator('input[name="passwd"], input[type="password"]').first(),
            password!,
          );
          await page
            .locator('input[type="submit"], button[type="submit"]')
            .first()
            .click({ timeout: 30_000 });
        });

        await completeTotpChallenge(page, totpSecret);
        await reached("IDIR: post-MFA prompts", async () => {
          await finishPostMfaPrompts(page, username!);
        });
        await reached("IDIR: app redirect", async () => {
          await expect(page).toHaveURL(/\/search/, { timeout: 60_000 });
        });
      });
    } else {
      await test.step("BCeID credentials", async () => {
        await fillSecret(page.locator("#user").first(), username!);
        await fillSecret(page.locator("#password").first(), password!);
        await page.locator('input[type="submit"]').first().click({ timeout: 30_000 });

        await expect(page).toHaveURL(/\/search/, { timeout: 12_000 });
      });
    }

    await reached("app shell", async () => {
      // The OAuth callback loads the app again; record that burst so the next
      // setup project's landing page is spaced outside the route's 3 s window.
      await connectionBudget.beforePageLoad();
      await expect(page.getByRole("button", { name: "Profile settings" })).toBeVisible({
        timeout: 30_000,
      });
    });

    await reached("save validated session state", async () => {
      // The pathname can be /search while the OAuth callback is still exchanging
      // the code; a 200 from the API proves the tokens are actually stored.
      const captured = await snapshotFromPage(page);
      await assertBackendAccepts(
        request,
        await resolveBackendOrigin(request),
        accessTokenFrom(captured),
      );

      await context.storageState({ path: statePath(kind) });
      writeSession(kind, captured);
    });
  } finally {
    // A timed-out test has already closed the browser; never let teardown
    // replace the real failure with a secondary context.close error.
    await context.close().catch(() => undefined);
  }
};

test("authenticate IDIR", async ({ browser, request }) => {
  test.setTimeout(IDIR_SETUP_TIMEOUT_MS);
  await login("idir", browser, request);
});

test("authenticate BCeID", async ({ browser, request }) => {
  test.setTimeout(90_000);
  await login("bceid", browser, request);
});
