#!/usr/bin/env bash
#
# run-postgres-lifecycle.sh — Remove, create, and migrate a PR PostgreSQL database.
# Usage: bash run-postgres-lifecycle.sh <namespace> <pr-number> <branch> <run-attempt>
# Requires an authenticated `oc` context for the target cluster.

set -uo pipefail

usage() {
  printf 'Usage: bash %s <namespace> <pr-number> <branch> <run-attempt>\n' "${0##*/}" >&2
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

run_job() {
  local namespace="$1"
  local pr="$2"
  local escaped_branch="$3"
  local run_attempt="$4"
  local stage="$5"
  local cronjob="nr-waste-plus-pr${pr}-${stage}"
  local job
  job="${stage}-pr${pr}-${run_attempt}-$(date +%s)"
  local rendered
  local created=0
  local attempt

  for attempt in 1 2 3 4 5 6 7 8; do
    if rendered=$(oc create job --from="cronjob/${cronjob}" "${job}" \
      --dry-run=client -o yaml) \
      && printf '%s\n' "${rendered}" \
        | sed "s/value: \"0\"/value: \"${pr}\"/g" \
        | sed "s/value: main/value: ${escaped_branch}/g" \
        | oc apply -n "${namespace}" -f -; then
      created=1
      break
    fi
    echo "Could not create job ${job} (attempt ${attempt}/8); retrying..."
    sleep $(( attempt * 5 > 30 ? 30 : attempt * 5 ))
  done
  if [ "${created}" -ne 1 ]; then
    echo "::error::Could not create job ${job}."
    return 1
  fi

  wait_for_job "${namespace}" "${job}" 900
  echo "--- logs for ${job} ---"
  oc logs "job/${job}" -n "${namespace}" --tail=200 || true
  if [ "${succeeded}" -lt 1 ]; then
    echo "--- description of ${job} ---"
    oc describe "job/${job}" -n "${namespace}" || true
    echo "::error::Job ${job} failed (succeeded=${succeeded}, failed=${failed})."
    return 1
  fi
}

main() {
  if [ "$#" -ne 4 ] || [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
    usage
    return 2
  fi
  local namespace="$1"
  local pr="$2"
  local branch="$3"
  local run_attempt="$4"
  local escaped_branch
  escaped_branch=$(printf '%s' "${branch}" | sed 's/[\/&]/\\&/g')

  run_job "${namespace}" "${pr}" "${escaped_branch}" "${run_attempt}" removepg || return 1
  run_job "${namespace}" "${pr}" "${escaped_branch}" "${run_attempt}" createpg || return 1
  run_job "${namespace}" "${pr}" "${escaped_branch}" "${run_attempt}" migratepg
}

main "$@"
