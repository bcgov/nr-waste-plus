import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import {
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

import { baseURL } from "../env.ts";

export type AuthKind = "idir" | "bceid";

/** Both halves of the session: storageState covers cookies/localStorage only. */
export type SessionSnapshot = {
  session: Record<string, string>;
  local: Record<string, string>;
};

export const AUTH_DIR = ".auth";

const SESSION_PROBE_PATH = "/api/users/preferences";
const CONFIG_PATH = "/data/config.js";

/** Upper bound for each token-persistence call in teardown. */
const TEARDOWN_STEP_MS = 5_000;

export function statePath(kind: AuthKind): string {
  return `${AUTH_DIR}/${kind}.storage.json`;
}

export function sessionPath(kind: AuthKind): string {
  return `${AUTH_DIR}/${kind}.session.json`;
}

export function hasAuthState(kind: AuthKind): boolean {
  return existsSync(statePath(kind)) && existsSync(sessionPath(kind));
}

export function readSession(kind: AuthKind): SessionSnapshot | null {
  try {
    return JSON.parse(readFileSync(sessionPath(kind), "utf8")) as SessionSnapshot;
  } catch {
    return null;
  }
}

export function writeSession(kind: AuthKind, snapshot: SessionSnapshot): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(sessionPath(kind), JSON.stringify(snapshot, null, 2));
}

/** Read both storage areas from a live page without logging their contents. */
export async function snapshotFromPage(page: Page): Promise<SessionSnapshot> {
  return page.evaluate(() => {
    const session: Record<string, string> = {};
    const local: Record<string, string> = {};
    for (const [storage, target] of [
      [window.sessionStorage, session],
      [window.localStorage, local],
    ] as const) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key !== null) target[key] = storage.getItem(key) ?? "";
      }
    }
    return { session, local };
  });
}

/** `oidc-client-ts` stores its signed-in user under this sessionStorage prefix. */
export function findOidcKey(session: Record<string, string>): string | undefined {
  return Object.keys(session).find((key) => key.startsWith("oidc.user:"));
}

export function accessTokenFrom(snapshot: SessionSnapshot): string {
  const key = findOidcKey(snapshot.session);
  if (!key) {
    throw new Error(
      "No OIDC user found in sessionStorage: the snapshot was taken before the OAuth callback stored the tokens.",
    );
  }
  const user = JSON.parse(snapshot.session[key]) as { access_token?: string };
  if (!user.access_token) {
    throw new Error("The stored OIDC user has no access token.");
  }
  return user.access_token;
}

/** Resolved once per run; `/data/config.js` is injected at deploy time. */
let backendOriginCache: string | undefined;

/**
 * The backend is not proxied through the frontend origin, so its hostname is
 * read from the deploy-time runtime config (see logins.hooks.ts in Cypress).
 */
export async function resolveBackendOrigin(request: APIRequestContext): Promise<string> {
  if (backendOriginCache) return backendOriginCache;

  const response = await request.get(new URL(CONFIG_PATH, baseURL).toString(), {
    timeout: 20_000,
  });
  const body = await response.text();
  const match = /VITE_BACKEND_URL:\s*['"]([^'"]+)['"]/.exec(body);
  // The stock local config.js has no VITE_BACKEND_URL; deployed previews do.
  backendOriginCache = match ? match[1].replace(/\/+$/, "") : "http://localhost:8080";
  return backendOriginCache;
}

/** A frontend route answers 200 anonymously; the API cannot. */
export async function assertBackendAccepts(
  request: APIRequestContext,
  backendOrigin: string,
  accessToken: string,
): Promise<void> {
  const response = await request.get(`${backendOrigin}${SESSION_PROBE_PATH}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 20_000,
  });
  expect(response.status(), "backend accepted the session token").toBe(200);
}

/**
 * Playwright's storageState never captures sessionStorage, so seed it before
 * any page script runs — on the app origin only, and never over an OIDC user
 * that a live callback has already stored.
 */
export async function seedSessionStorage(
  context: BrowserContext,
  kind: AuthKind,
  appOrigin: string,
): Promise<void> {
  const snapshot = readSession(kind);
  if (!snapshot) {
    throw new Error(`Auth state for ${kind} not found; run the setup project`);
  }
  if (Object.keys(snapshot.session).length === 0) return;

  await context.addInitScript(
    ({ origin, entries }: { origin: string; entries: Record<string, string> }) => {
      if (window.location.origin !== origin) return;
      try {
        for (const key of Object.keys(window.sessionStorage)) {
          if (key.startsWith("oidc.user:")) return;
        }
        for (const [key, value] of Object.entries(entries)) {
          window.sessionStorage.setItem(key, value);
        }
      } catch {
        // Storage is unavailable on opaque origins; nothing to seed.
      }
    },
    { origin: appOrigin, entries: snapshot.session },
  );
}

/** Bounded so a wedged page cannot turn a 30 s scenario into a 1 m teardown. */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/** Best-effort write-back of tokens rotated during a scenario. */
export async function persistSession(page: Page, kind: AuthKind): Promise<void> {
  try {
    // A blank page (no app boot) or a post-logout page (tokens revoked) has no
    // OIDC user. Overwriting the saved snapshot with either would invalidate
    // every later scenario, so keep the last known good state instead.
    if (page.url() === "about:blank") return;
    const snapshot = await withTimeout(snapshotFromPage(page), TEARDOWN_STEP_MS);
    if (!findOidcKey(snapshot.session)) return;
    writeSession(kind, snapshot);
  } catch {
    // A closed or wedged page keeps the previous snapshot; never fail the run.
  }
}
