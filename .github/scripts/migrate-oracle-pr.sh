#!/usr/bin/env bash
#
# migrate-oracle-pr.sh — Reset a PR Oracle database and run its migration job.
# Usage: bash migrate-oracle-pr.sh <namespace> <pr-number> <branch> <run-attempt>
# Requires an authenticated `oc` context and ORACLEDB_PASSWORD in the environment.

set -uo pipefail

usage() {
  printf 'Usage: bash %s <namespace> <pr-number> <branch> <run-attempt>\n' "${0##*/}" >&2
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

wait_for_job() {
  local namespace="$1"
  local job="$2"
  local timeout="$3"
  local deadline=$(( $(date +%s) + timeout ))
  local counts
  local succeeded_count
  local failed_count
  local poll_interval=2
  succeeded=0
  failed=0
  while [ "$(date +%s)" -lt "${deadline}" ]; do
    if ! counts=$(oc --request-timeout=15s get "job/${job}" -n "${namespace}" \
      -o jsonpath='{.status.succeeded}/{.status.failed}' 2>/dev/null); then
      echo "Could not read job ${job} status; retrying..."
      sleep 2
      continue
    fi
    succeeded_count="${counts%%/*}"
    failed_count="${counts##*/}"
    succeeded_count="${succeeded_count:-0}"
    failed_count="${failed_count:-0}"
    if [ "${succeeded_count}" -ge 1 ] || [ "${failed_count}" -ge 1 ]; then
      succeeded="${succeeded_count}"
      failed="${failed_count}"
      return 0
    fi
    poll_interval=$(( poll_interval < 10 ? poll_interval * 2 : 10 ))
    echo "Waiting for job ${job} (succeeded=${succeeded_count}, failed=${failed_count})..."
    sleep "${poll_interval}"
  done
  echo "::error::Timed out waiting for job ${job} after ${timeout}s."
}

main() {
  if [ "$#" -ne 4 ] || [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
    usage
    return 2
  fi
  : "${ORACLEDB_PASSWORD:?ORACLEDB_PASSWORD is required}"

  local namespace="$1"
  local pr="$2"
  local branch="$3"
  local run_attempt="$4"
  local pod_name=""
  local attempt
  local escaped_branch
  local job_name
  local created=0

  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    pod_name=$(oc get pods -n "${namespace}" -l app=nr-waste-plus-tools \
      -l deployment=nr-waste-plus-tools-legacydb \
      -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    if [ -n "${pod_name}" ]; then
      echo "Legacy database pod found: ${pod_name}"
      break
    fi
    echo "Legacy database pod not found, retrying in 10 seconds... (${attempt}/10)"
    sleep 10
  done
  if [ -z "${pod_name}" ]; then
    echo "::error::The legacy database pod never appeared, so PR_${pr} could not be reset."
    return 1
  fi

  oc_exec_retry "${pod_name}" -- /opt/oracle/removeDatabase "THE" "PR_${pr}" \
    || echo "::warning::Could not remove PR_${pr}; it may not exist yet."
  oc_exec_retry "${pod_name}" -- /opt/oracle/createDatabase "PR_${pr}" \
    || echo "::warning::createDatabase reported a failure for PR_${pr}; checking whether it exists."

  if [ "$(pdb_exists "${pod_name}" "${pr}")" != "1" ]; then
    echo "::error::The pluggable database PR_${pr} does not exist after the create step."
    return 1
  fi
  echo "Pluggable database PR_${pr} exists."

  oc_exec_retry "${pod_name}" -- /opt/oracle/createAppUser "THE" "${ORACLEDB_PASSWORD}" "PR_${pr}" \
    || echo "::warning::createAppUser reported a failure for PR_${pr}; the migration will fail if the user is missing."

  escaped_branch=$(printf '%s' "${branch}" | sed 's/[\/&]/\\&/g')
  job_name="migrate-pr${pr}-${run_attempt}-$(date +%s)"
  for attempt in 1 2 3 4 5 6 7 8; do
    if oc create job --from=cronjob/nr-waste-plus-tools-migratedb "${job_name}" \
      --dry-run=client -o yaml \
      | sed "s/value: main/value: ${escaped_branch}/" \
      | sed "s/value: \"0\"/value: \"${pr}\"/" \
      | oc apply -n "${namespace}" -f -; then
      created=1
      break
    fi
    echo "Could not create job ${job_name} (attempt ${attempt}/8); retrying..."
    sleep $(( attempt * 5 > 30 ? 30 : attempt * 5 ))
  done
  if [ "${created}" -ne 1 ]; then
    echo "::error::Could not create the Oracle migration job ${job_name}."
    return 1
  fi

  wait_for_job "${namespace}" "${job_name}" 900
  echo "--- logs for ${job_name} ---"
  oc logs "job/${job_name}" -n "${namespace}" --tail=200 || true
  if [ "${succeeded}" -lt 1 ]; then
    oc describe "job/${job_name}" -n "${namespace}" || true
    echo "::error::The Oracle migration failed for PR ${pr} (succeeded=${succeeded}, failed=${failed})."
    return 1
  fi
}

main "$@"
