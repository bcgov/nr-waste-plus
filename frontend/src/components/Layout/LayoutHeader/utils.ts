/**
 * Returns the env name formatted in sentence case, based on the supplied value of node env, which
 * should start with 'openshift-'. Otherwise, it returns an empty string.
 *
 * @param nodeEnv - the name of the node env, which should start with 'openshift-'
 * @returns the env name properly formatted or an empty string
 */
export const getFormattedEnvName = (nodeEnv: string) => {
  const envPrefix = 'openshift-';
  if (!nodeEnv.startsWith(envPrefix)) {
    return '';
  }
  const envName = nodeEnv.slice(envPrefix.length);
  const formattedEnvName = envName.charAt(0).toUpperCase() + envName.slice(1);
  return formattedEnvName;
};
