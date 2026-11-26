import * as dotenv from "dotenv";

dotenv.config();

export const baseURL =
  process.env.CYPRESS_baseUrl ??
  process.env.E2E_BASE_URL ??
  "http://localhost:3000";

export const VIEWPORT = { width: 1600, height: 900 };

/** Fails fast for callers that need a value, without ever logging it. */
export function requireValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function credentials() {
  return {
    idir: {
      username:
        process.env.CYPRESS_IDIR_USERNAME ??
        process.env.IDIR_USERNAME ??
        process.env.idir_username ??
        process.env.CYPRESS_idir_username ??
        process.env.idir_username2,
      password:
        process.env.CYPRESS_IDIR_PASSWORD ??
        process.env.IDIR_PASSWORD ??
        process.env.idir_password ??
        process.env.CYPRESS_idir_password ??
        process.env.idir_password2,
      totpSecret:
        process.env.CYPRESS_IDIR_TOTP_SECRET ??
        process.env.IDIR_TOTP_SECRET ??
        process.env.idir_totp_secret ??
        process.env.CYPRESS_idir_totp_secret,
    },
    bceid: {
      username: process.env.bceid_username ?? process.env.CYPRESS_bceid_username,
      password: process.env.bceid_password ?? process.env.CYPRESS_bceid_password,
    },
  };
}
