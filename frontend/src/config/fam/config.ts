import { env } from '@/env';

/**
 * Whether mock authentication mode is enabled for local or test environments.
 */
const mockAuth = env.VITE_MOCK_AUTH === 'true';

/**
 * Normalized deployment zone used to derive Cognito and logout endpoints.
 */
const ZONE = env.VITE_ZONE?.toLowerCase() ?? 'dev';

/**
 * Current application origin used for redirect URIs.
 */
const redirectUri = window.location.origin;

const isProd = ZONE === 'prod';

const logoutDomain = isProd ? 'https://logon7.gov.bc.ca' : 'https://logontest7.gov.bc.ca';

const returnUrlHost = isProd ? '' : `${ZONE}.`;

const retUrl = `https://${returnUrlHost}loginproxy.gov.bc.ca/auth/realms/standard/protocol/openid-connect/logout`;

const redirectSignOut = `${logoutDomain}/clp-cgi/logoff.cgi?retnow=1&returl=${retUrl}?redirect_uri=${redirectUri}/`;

const verificationMethods: 'code' | 'token' = 'code';

const backendUrl = env.VITE_BACKEND_URL;

/**
 * Amplify authentication configuration for the FAM identity flow.
 */
const amplifyconfig = {
  Auth: {
    Cognito: {
      userPoolId: env.VITE_USER_POOLS_ID,
      userPoolClientId: env.VITE_USER_POOLS_WEB_CLIENT_ID,
      signUpVerificationMethod: verificationMethods,
      loginWith: {
        oauth: {
          domain: mockAuth
            ? backendUrl.replace('http://', '').replace(':8080', ':8181')
            : env.VITE_FAM_DOMAIN,
          scopes: ['openid'],
          redirectSignIn: [`${redirectUri}/dashboard`],
          redirectSignOut: [redirectSignOut],
          responseType: verificationMethods,
        },
      },
    },
  },
};

export default amplifyconfig;
