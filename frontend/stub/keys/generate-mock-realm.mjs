/**
 * Generates the mock standard-realm crypto material for local and CI testing.
 *
 * Outputs (all committed — the keypair is test-only material, never a real
 * secret):
 *   - stub/__files/oidc/jwks.json          — JWKS served by the WireMock realm
 *   - stub/__files/oidc/token-idir.json    — token-endpoint response (IDIR user)
 *   - stub/__files/oidc/token-bceid.json   — token-endpoint response (BCeID user)
 *   - stub/__files/oidc/session-idir.json  — full oidc-client-ts storage value
 *   - stub/__files/oidc/session-bceid.json — (injected into sessionStorage)
 *   - stub/keys/mock-realm-private.pem     — private key, for re-signing only
 *
 * The issuer matches `buildMockAuthority()` in `src/services/keycloak.ts`
 * exactly: the VITE_BACKEND_URL host with port 8080 swapped for the WireMock
 * port 8181. Run from `frontend/`:
 *
 *   node stub/keys/generate-mock-realm.mjs
 */
import { createSign, generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ISSUER = 'http://localhost:8181/realms/standard';
const CLIENT_ID = 'waste-waste-plus-6729';
/** Fixed far-future expiry (2030-01-01) so fixture sessions never renew mid-run. */
const EXP = 1893456000;
const IAT = 1750000000;
const KID = 'mock-realm-key-1';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, '..', '__files', 'oidc');
const KEYS_DIR = HERE;

const b64url = (input) => Buffer.from(input).toString('base64url');

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' });
const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' });

const signJwt = (payload) => {
  const header = { alg: 'RS256', typ: 'JWT', kid: KID };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(privatePem, 'base64url');
  return `${signingInput}.${signature}`;
};

const userClaims = {
  idir: {
    fid: 'mock-idir',
    sub: 'b5ecdb09-4dfb-4149-a6a8-445a01a96bf0',
    identity_provider: 'azureidir',
    idir_username: 'JRYAN',
    display_name: 'Ryan, Jack Admin CIA:IN',
    email: 'jack.ryan@gov.bc.ca',
    given_name: 'Jack',
    family_name: 'Ryan',
    idir_user_guid: 'B5ECDB094DFB4149A6A8445A01A96BF0',
    preferred_username: 'b5ecdb094dfb4149a6a8445a01a96bf0@azureidir',
    client_roles: ['WASTE_PLUS_ADMIN', 'FAM:EXPIRES:2026-09-30:WASTE_PLUS_ADMIN'],
  },
  bceid: {
    fid: 'mock-bceid',
    sub: '0c5d8ec2-7ff2-4a3e-9f4b-8c2a5d1e7b31',
    identity_provider: 'bceidbusiness',
    idir_username: 'uattest',
    display_name: 'Uat Test',
    email: 'uattest@gov.bc.ca',
    given_name: 'Uat',
    family_name: 'Test',
    bceid_user_guid: '0C5D8EC27FF24A3E9F4B8C2A5D1E7B31',
    preferred_username: '0c5d8ec2-7ff2-4a3e-9f4b-8c2a5d1e7b31@bceidbusiness',
    client_roles: [
      'WASTE_PLUS_VIEWER_00147603',
      'WASTE_PLUS_SUBMITTER_00010005',
      'WASTE_PLUS_SUBMITTER_00011457',
      'WASTE_PLUS_SUBMITTER_00001271',
    ],
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const jwks = {
  keys: [
    {
      kty: publicJwk.kty,
      use: 'sig',
      alg: 'RS256',
      kid: KID,
      n: publicJwk.n,
      e: publicJwk.e,
    },
  ],
};
fs.writeFileSync(path.join(OUT_DIR, 'jwks.json'), `${JSON.stringify(jwks, null, 2)}\n`);

for (const [name, claims] of Object.entries(userClaims)) {
  const base = { iss: ISSUER, aud: CLIENT_ID, azp: CLIENT_ID, exp: EXP, iat: IAT };
  // `fid` stays the first key of the access-token payload: its base64url
  // prefix is a stable marker the WireMock API mappings match on to tell the
  // two mock users apart without parsing JWTs.
  const accessPayload = { fid: claims.fid, ...base, jti: `mock-${name}-access`, ...claims };
  const idPayload = { ...base, jti: `mock-${name}-id`, ...claims };

  const accessToken = signJwt(accessPayload);
  const idToken = signJwt(idPayload);

  const tokenResponse = {
    access_token: accessToken,
    id_token: idToken,
    refresh_token: `mock-refresh-${name}`,
    token_type: 'Bearer',
    expires_in: 28800,
    scope: 'openid profile email',
  };
  fs.writeFileSync(
    path.join(OUT_DIR, `token-${name}.json`),
    `${JSON.stringify(tokenResponse, null, 2)}\n`,
  );

  // Full oidc-client-ts storage value — key is `user:<authority>:<client_id>`
  // (see UserManager._userStoreKey) and the shape mirrors the User constructor.
  const session = {
    id_token: idToken,
    session_state: null,
    access_token: accessToken,
    refresh_token: `mock-refresh-${name}`,
    token_type: 'Bearer',
    scope: 'openid profile email',
    profile: idPayload,
    expires_at: EXP,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, `session-${name}.json`),
    `${JSON.stringify(session, null, 2)}\n`,
  );

  const payloadPrefix = b64url(JSON.stringify(accessPayload)).slice(0, 26);
  console.log(`${name}: authorization-marker = ${payloadPrefix}`);
}

fs.writeFileSync(path.join(KEYS_DIR, 'mock-realm-private.pem'), `${privatePem}\n`);

console.log(`\nstorage key: oidc.user:${ISSUER}:${CLIENT_ID}`);
console.log("(v3 WebStorageStateStore applies its default `oidc.` prefix to `user:<authority>:<client>`)");
console.log(`issuer:      ${ISSUER}`);
console.log(`wrote fixtures to ${path.relative(process.cwd(), OUT_DIR)}`);
