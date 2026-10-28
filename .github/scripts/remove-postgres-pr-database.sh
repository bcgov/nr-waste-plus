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
  local remaining ok_pid fail_pid counts
  succeeded=0
  failed=0

  while [ "$(date +%s)" -lt "${deadline}" ]; do
    remaining=$(( deadline - $(date +%s) ))
    oc wait --for=condition=complete "job/${job}" -n "${namespace}" \
      --timeout="${remaining}s" >/dev/null 2>&1 &
    ok_pid=$!
    oc wait --for=condition=failed "job/${job}" -n "${namespace}" \
      --timeout="${remaining}s" >/dev/null 2>&1 &
    fail_pid=$!
    while kill -0 "${ok_pid}" 2>/dev/null && kill -0 "${fail_pid}" 2>/dev/null; do
      sleep 1
    done
    kill "${ok_pid}" "${fail_pid}" 2>/dev/null || true
    wait "${ok_pid}" "${fail_pid}" 2>/dev/null || true
    counts=$(oc get "job/${job}" -n "${namespace}" \
      -o jsonpath='{.status.succeeded}/{.status.failed}' 2>/dev/null || true)
    succeeded="${counts%%/*}"
    failed="${counts##*/}"
    succeeded="${succeeded:-0}"
    failed="${failed:-0}"
    if [ "${succeeded}" -ge 1 ] || [ "${failed}" -ge 1 ]; then
      return 0
    fi
    echo "Waiting for job ${job} (succeeded=${succeeded}, failed=${failed})..."
    sleep 2
  done
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
