#!/usr/bin/env bash
#
# remove-postgres-pr-database.sh — Remove a PR PostgreSQL database via its CronJob.
# Usage: bash remove-postgres-pr-database.sh <namespace> <pr-number> <run-attempt>
# Requires an authenticated `oc` context for the target cluster.

set -uo pipefail

usage() {
  printf 'Usage: bash %s <namespace> <pr-number> <run-attempt>\n' "${0##*/}" >&2
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
      if [ "${succeeded_count}" -ge 1 ]; then
        succeeded=1
      fi
      return 0
    fi
    poll_interval=$(( poll_interval < 10 ? poll_interval * 2 : 10 ))
    echo "Waiting for job ${job} (succeeded=${succeeded_count}, failed=${failed_count})..."
    sleep "${poll_interval}"
  done
  echo "::error::Timed out waiting for job ${job} after ${timeout}s."
}

main() {
  if [ "$#" -ne 3 ] || [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    usage
    return 2
  fi
  local namespace="$1"
  local pr="$2"
  local run_attempt="$3"
  local cronjob="nr-waste-plus-pr${pr}-removepg"
  local job
  job="remove-pr${pr}-cleanup-${run_attempt}-$(date +%s)"
  local rendered
  local created=0
  local attempt

  ERROR_FILE=$(mktemp) || return 1
  trap 'rm -f "${ERROR_FILE}"' EXIT

  for attempt in 1 2 3 4 5 6 7 8; do
    if rendered=$(oc create job --from="cronjob/${cronjob}" "${job}" \
      --dry-run=client -o yaml 2>"${ERROR_FILE}"); then
      if printf '%s\n' "${rendered}" \
        | sed "s/value: \"0\"/value: \"${pr}\"/g" \
        | oc apply -n "${namespace}" -f -; then
        created=1
        break
      fi
    elif grep -qi 'NotFound' "${ERROR_FILE}"; then
      echo "CronJob ${cronjob} does not exist; no PostgreSQL database to remove."
      return 0
    fi
    echo "Could not create job ${job} (attempt ${attempt}/8); retrying..."
    sleep $(( attempt * 5 > 30 ? 30 : attempt * 5 ))
  done
  if [ "${created}" -ne 1 ]; then
    echo "::error::Could not create database removal job ${job}."
    return 1
  fi

  wait_for_job "${namespace}" "${job}" 300
  oc logs "job/${job}" -n "${namespace}" --tail=100 || true
  if [ "${succeeded}" -lt 1 ]; then
    oc describe "job/${job}" -n "${namespace}" || true
    echo "::error::PostgreSQL database removal failed for PR ${pr}."
    return 1
  fi
}

main "$@"
