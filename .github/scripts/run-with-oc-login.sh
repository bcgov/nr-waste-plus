#!/usr/bin/env bash
#
# run-with-oc-login.sh — Run a command under an isolated oc login context.
# Usage: OC_SERVER=... OC_TOKEN=... OC_NAMESPACE=... bash run-with-oc-login.sh <command> [args...]
# Creates a temporary KUBECONFIG so any outer oc session remains unchanged.

set -euo pipefail

if [ "$#" -lt 1 ]; then
  printf 'Usage: %s <command> [args...]\n' "${0##*/}" >&2
  exit 2
fi

: "${OC_SERVER:?OC_SERVER is required}"
: "${OC_TOKEN:?OC_TOKEN is required}"
: "${OC_NAMESPACE:?OC_NAMESPACE is required}"

KUBECONFIG_FILE=$(mktemp)
trap 'rm -f "${KUBECONFIG_FILE}"' EXIT
export KUBECONFIG="${KUBECONFIG_FILE}"

attempt=1
max_attempts=8
while [ "${attempt}" -le "${max_attempts}" ]; do
  if oc --request-timeout=15s login --server="${OC_SERVER}" --token="${OC_TOKEN}" \
    && oc --request-timeout=15s project "${OC_NAMESPACE}"; then
    break
  fi
  if [ "${attempt}" -eq "${max_attempts}" ]; then
    echo "::error::Failed to log in to ${OC_SERVER} after ${max_attempts} attempts."
    exit 1
  fi
  delay=$(( attempt * 5 > 30 ? 30 : attempt * 5 ))
  echo "Login attempt ${attempt}/${max_attempts} failed; retrying in ${delay}s..."
  sleep "${delay}"
  attempt=$(( attempt + 1 ))
done

"$@"
