#!/usr/bin/env bash
#
# remove-oracle-pr.sh — Remove and verify a PR's Oracle pluggable database.
# Usage: bash remove-oracle-pr.sh <namespace> <pr-number>
# Requires an authenticated `oc` context for the target cluster.

set -uo pipefail

usage() {
  printf 'Usage: bash %s <namespace> <pr-number>\n' "${0##*/}" >&2
}

oc_exec_retry() {
  local attempt out rc
  for attempt in 1 2 3 4 5 6; do
    out=$(oc exec "$@" 2>&1)
    rc=$?
    printf '%s\n' "${out}"
    if [ "${rc}" -eq 0 ]; then
      return 0
    fi
    if printf '%s' "${out}" | grep -qiE 'connection to the server|connection refused|i/o timeout|unable to connect|TLS handshake|error dialing|request canceled'; then
      if [ "${attempt}" -lt 6 ]; then
        echo "API connection problem (attempt ${attempt}/6); retrying in $((attempt * 5))s..."
        sleep $((attempt * 5))
      fi
      continue
    fi
    return "${rc}"
  done
  echo "The OpenShift API stayed unreachable after 6 attempts."
  return 1
}

pdb_exists() {
  local pod_name="$1"
  local pr="$2"
  oc_exec_retry "${pod_name}" -- bash -c \
    "printf 'set heading off feedback off pagesize 0\\nselect count(*) from dba_pdbs where pdb_name = '\''PR_${pr}'\'';\\nexit;\\n' | sqlplus -s / as sysdba" \
    | grep -E '^[[:space:]]*[0-9]+[[:space:]]*$' | tail -1 | tr -d '[:space:]'
}

find_oracle_pod() {
  local namespace="$1"
  local attempt
  local out
  local listed=0
  POD_NAME=""
  for attempt in 1 2 3 4 5 6 7 8; do
    if out=$(oc get pods -n "${namespace}" -l app=nr-waste-plus-tools \
      -l deployment=nr-waste-plus-tools-legacydb -o name 2>&1); then
      POD_NAME=$(printf '%s\n' "${out}" | head -1)
      listed=1
      break
    fi
    echo "Could not list the Oracle pods (attempt ${attempt}/8); retrying..."
    sleep $(( attempt * 5 > 30 ? 30 : attempt * 5 ))
  done
  if [ "${listed}" -ne 1 ]; then
    echo "::error::Could not reach the OpenShift API to find the Oracle pod."
    return 1
  fi
  if [ -z "${POD_NAME}" ]; then
    echo "The Oracle database is not deployed; nothing to remove."
    return 2
  fi
  POD_NAME="${POD_NAME#pod/}"
  echo "Oracle pod: ${POD_NAME}"
}

main() {
  if [ "$#" -ne 2 ] || [ -z "$1" ] || [ -z "$2" ]; then
    usage
    return 2
  fi
  local namespace="$1"
  local pr="$2"
  local exists
  local result

  find_oracle_pod "${namespace}"
  result=$?
  if [ "${result}" -eq 2 ]; then
    return 0
  elif [ "${result}" -ne 0 ]; then
    return "${result}"
  fi

  exists=$(pdb_exists "${POD_NAME}" "${pr}")
  case "${exists}" in
    0)
      echo "Pluggable database PR_${pr} does not exist; nothing to remove."
      return 0
      ;;
    1) ;;
    *)
      echo "::error::Could not determine whether PR_${pr} exists."
      return 1
      ;;
  esac

  oc_exec_retry "${POD_NAME}" -- /opt/oracle/removeDatabase "THE" "PR_${pr}" \
    || echo "::warning::removeDatabase reported a failure for PR_${pr}; verifying."
  if [ "$(pdb_exists "${POD_NAME}" "${pr}")" != "0" ]; then
    echo "::error::The pluggable database PR_${pr} still exists after removeDatabase."
    return 1
  fi
  echo "Pluggable database PR_${pr} removed."
}

main "$@"
