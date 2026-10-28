#!/usr/bin/env bash
#
# manage-deployment.sh — Scale an OpenShift Deployment up or down.
# Usage: bash manage-deployment.sh <start|stop> <namespace> <deployment-name> [--wait] [--after-stop-delay seconds]
# Arguments:
#   action          start to scale to one replica, or stop to scale to zero
#   namespace       OpenShift namespace containing the Deployment
#   deployment-name Deployment to scale
#   --wait          Wait until the requested replica count is available
#   --after-stop-delay seconds to sleep after stop completes
#
# Requires an authenticated `oc` context for the target cluster.

set -uo pipefail

usage() {
  printf 'Usage: bash %s <start|stop> <namespace> <deployment-name> [--wait]\n' "${0##*/}" >&2
}

deployment_exists() {
  local namespace="$1"
  local deployment="$2"
  local attempt
  local out
  local exists=""

  # Only NotFound means the application has never been deployed. API failures
  # are retried instead of being mistaken for an absent Deployment.
  for attempt in 1 2 3 4 5 6; do
    if out=$(oc get "deployment/${deployment}" -n "${namespace}" -o name 2>&1); then
      exists="yes"
      break
    fi
    if printf '%s' "${out}" | grep -qi 'NotFound'; then
      exists="no"
      break
    fi
    echo "Could not check ${deployment} (attempt ${attempt}/6); retrying..."
    sleep $((attempt * 5))
  done

  if [ -z "${exists}" ]; then
    echo "::error::Could not reach the OpenShift API to check ${deployment}."
    return 1
  fi
  if [ "${exists}" = "no" ]; then
    return 2
  fi
  return 0
}

scale_deployment() {
  local namespace="$1"
  local deployment="$2"
  local replicas="$3"
  local direction="$4"
  local attempt

  for attempt in 1 2 3 4 5 6; do
    if oc scale "deployment/${deployment}" "--replicas=${replicas}" -n "${namespace}"; then
      return 0
    fi
    echo "Could not scale ${deployment} (attempt ${attempt}/6); retrying..."
    sleep $((attempt * 5))
  done

  echo "::error::Could not scale ${deployment} ${direction}."
  return 1
}

wait_for_replicas() {
  local namespace="$1"
  local deployment="$2"
  local target="$3"
  local deadline
  local available

  deadline=$(( $(date +%s) + 300 ))
  while [ "$(date +%s)" -lt "${deadline}" ]; do
    if available=$(oc get "deployment/${deployment}" -n "${namespace}" \
      -o jsonpath='{.status.availableReplicas}' 2>/dev/null); then
      available="${available:-0}"
      if [ "${target}" -eq 0 ] && [ "${available}" -eq 0 ]; then
        echo "Deployment ${deployment} is stopped."
        return 0
      fi
      if [ "${target}" -gt 0 ] && [ "${available}" -ge "${target}" ]; then
        echo "Deployment ${deployment} is available (${available} replica(s))."
        return 0
      fi
      echo "Waiting for ${deployment} (${available} available; target ${target})..."
    else
      echo "Could not read ${deployment}; retrying..."
    fi
    sleep 5
  done

  echo "::error::Deployment ${deployment} did not reach ${target} available replica(s) within 5 minutes."
  return 1
}

stop_deployment() {
  local namespace="$1"
  local deployment="$2"
  local wait="$3"
  local after_stop_delay="$4"

  if deployment_exists "${namespace}" "${deployment}"; then
    :
  else
    local result=$?
    if [ "${result}" -eq 2 ]; then
      echo "Deployment ${deployment} does not exist yet; nothing to stop."
      return 0
    fi
    return "${result}"
  fi

  scale_deployment "${namespace}" "${deployment}" 0 down || return 1
  if [ "${wait}" = "yes" ]; then
    wait_for_replicas "${namespace}" "${deployment}" 0 || return 1
  fi
  if [ "${after_stop_delay}" -gt 0 ]; then
    echo "Waiting ${after_stop_delay}s for terminating pods to release resources..."
    sleep "${after_stop_delay}"
  fi
}

start_deployment() {
  local namespace="$1"
  local deployment="$2"
  local wait="$3"

  if deployment_exists "${namespace}" "${deployment}"; then
    :
  else
    local result=$?
    if [ "${result}" -eq 2 ]; then
      echo "Deployment ${deployment} does not exist yet; the PR workflow will start it."
      return 0
    fi
    return "${result}"
  fi

  scale_deployment "${namespace}" "${deployment}" 1 "back up" || return 1
  if [ "${wait}" = "yes" ]; then
    wait_for_replicas "${namespace}" "${deployment}" 1
  fi
}

main() {
  if [ "$#" -lt 3 ] || [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    usage
    return 2
  fi

  local action="$1"
  local namespace="$2"
  local deployment="$3"
  local wait="no"
  local after_stop_delay=0
  shift 3

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --wait)
        wait="yes"
        shift
        ;;
      --after-stop-delay)
        if [ "$#" -lt 2 ] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
          usage
          return 2
        fi
        after_stop_delay="$2"
        shift 2
        ;;
      *)
        usage
        return 2
        ;;
    esac
  done

  case "${action}" in
    start) start_deployment "${namespace}" "${deployment}" "${wait}" ;;
    stop) stop_deployment "${namespace}" "${deployment}" "${wait}" "${after_stop_delay}" ;;
    *) usage; return 2 ;;
  esac
}

main "$@"
