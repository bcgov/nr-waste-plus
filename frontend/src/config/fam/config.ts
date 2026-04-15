import { env } from '@/env';

/**
 * Whether mock authentication mode is enabled for local or test environments.
 */
const isMockAuthEnabled = env.VITE_MOCK_AUTH === 'true';

/**
 * OAuth response mode used by the FAM identity flow.
 */
const verificationMethod: 'code' | 'token' = 'code';

/**
 * Normalized deployment zone used to derive environment-specific endpoints.
 */
const zone = env.VITE_ZONE?.toLowerCase() ?? 'dev';

/**
 * Whether the application is running against the production identity endpoints.
 */
const isProductionZone = zone === 'prod';

/**
 * Current browser origin used as the base for OAuth redirect URIs.
 */
const appOrigin = window.location.origin;

/**
 * Backend URL used when mock authentication rewrites the OAuth domain locally.
 */
const backendUrl = env.VITE_BACKEND_URL;

/**
 * Cognito/FAM logout CGI host for the active deployment zone.
 */
const logoutDomain = isProductionZone ? 'https://logon7.gov.bc.ca' : 'https://logontest7.gov.bc.ca';

/**
 * Login proxy realm host prefix. Non-production environments use the `dev.` realm.
 */
const loginProxySubdomain = isProductionZone ? '' : 'test.';

/**
 * Fully qualified redirect URI used after the hosted login flow completes.
 */
const redirectSignInUrl = `${appOrigin}/dashboard`;

/**
 * Builds the intermediary login-proxy logout URL that ultimately returns the user to the app.
 *
 * @returns The login-proxy logout URL with its `redirect_uri` query parameter applied.
 */
const buildLoginProxyLogoutUrl = (): string => {
  const loginProxyLogoutUrl = new URL(
    `https://${loginProxySubdomain}loginproxy.gov.bc.ca/auth/realms/standard/protocol/openid-connect/logout`,
  );

  loginProxyLogoutUrl.searchParams.set('redirect_uri', `${appOrigin}/`);

  return loginProxyLogoutUrl.toString();
};

/**
 * Builds the final sign-out URL used by FAM/Cognito.
 *
 * The logout flow first hits the government logoff CGI endpoint, which then redirects through
 * the login proxy before returning the browser to the application origin.
 *
 * @returns The final sign-out URL passed to Amplify and used by the auth provider.
 */
const buildSignOutUrl = (): string => {
  const cognitoLogoutUrl = new URL(`${logoutDomain}/clp-cgi/logoff.cgi`);

  cognitoLogoutUrl.searchParams.set('retnow', '1');
  cognitoLogoutUrl.searchParams.set('returl', buildLoginProxyLogoutUrl());

  return cognitoLogoutUrl.toString();
};

/**
 * OAuth domain used by Amplify. In mock-auth mode the backend host is rewritten to the local
 * mock FAM port so the rest of the auth flow can remain unchanged.
 */
const oauthDomain = isMockAuthEnabled
  ? backendUrl.replace('http://', '').replace(':8080', ':8181')
  : env.VITE_FAM_DOMAIN;

/**
 * Fully qualified sign-out URL used by the hosted logout flow.
 */
export const signOutUrl = buildSignOutUrl();

/**
 * Amplify authentication configuration for the FAM identity flow.
 */
const amplifyconfig = {
  Auth: {
    Cognito: {
      userPoolId: env.VITE_USER_POOLS_ID,
      userPoolClientId: env.VITE_USER_POOLS_WEB_CLIENT_ID,
      signUpVerificationMethod: verificationMethod,
      loginWith: {
        oauth: {
          domain: oauthDomain,
          scopes: ['openid', 'profile', 'email'],
          redirectSignIn: [redirectSignInUrl],
          redirectSignOut: [signOutUrl],
          responseType: verificationMethod,
        },
      },
    },
  },
};

export default amplifyconfig;
