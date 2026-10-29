#!/usr/bin/env bash
#
# remove-minio-pr-bucket.sh — Remove and verify a PR MinIO bucket.
# Usage: bash remove-minio-pr-bucket.sh <namespace> <bucket-name>
# Requires an authenticated `oc` context for the target cluster.

set -uo pipefail

usage() {
  printf 'Usage: bash %s <namespace> <bucket-name>\n' "${0##*/}" >&2
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

find_minio_pod() {
  local namespace="$1"
  local attempt
  local out
  local listed=0
  POD_NAME=""
  for attempt in 1 2 3 4 5 6 7 8; do
    if out=$(oc get pods -n "${namespace}" -l app=nr-waste-plus-tools \
      -l deployment=nr-waste-plus-tools-minio -o name 2>&1); then
      POD_NAME=$(printf '%s\n' "${out}" | head -1)
      listed=1
      break
    fi
    echo "Could not list the MinIO pods (attempt ${attempt}/8); retrying..."
    sleep $(( attempt * 5 > 30 ? 30 : attempt * 5 ))
  done
  if [ "${listed}" -ne 1 ]; then
    echo "::error::Could not reach the OpenShift API to find the MinIO pod."
    return 1
  fi
  if [ -z "${POD_NAME}" ]; then
    echo "MinIO is not deployed; nothing to clean up."
    return 2
  fi
  POD_NAME="${POD_NAME#pod/}"
}

main() {
  if [ "$#" -ne 2 ] || [ -z "$1" ] || [ -z "$2" ]; then
    usage
    return 2
  fi
  local namespace="$1"
  local bucket="$2"
  local result

  find_minio_pod "${namespace}"
  result=$?
  if [ "${result}" -eq 2 ]; then
    return 0
  elif [ "${result}" -ne 0 ]; then
    return "${result}"
  fi

  # Exit 3 means MinIO could not be reached; exit 4 means the bucket remains.
  # shellcheck disable=SC2016
  oc_exec_retry "${POD_NAME}" -c minio-init -- sh -c '
    mc --config-dir /tmp/.mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1 || exit 3
    if mc --config-dir /tmp/.mc ls local/"$1" >/dev/null 2>&1; then
      mc --config-dir /tmp/.mc rm --recursive --force local/"$1" >/dev/null 2>&1 || true
      mc --config-dir /tmp/.mc rb --force local/"$1" >/dev/null 2>&1 || true
      if mc --config-dir /tmp/.mc ls local/"$1" >/dev/null 2>&1; then
        exit 4
      fi
      echo "Removed bucket $1."
    else
      echo "Bucket $1 does not exist; nothing to remove."
    fi
  ' _ "${bucket}"
  result=$?
  case "${result}" in
    0) ;;
    3)
      echo "::error::Could not connect to MinIO while removing ${bucket}."
      return 1
      ;;
    4)
      echo "::error::MinIO bucket ${bucket} still exists after the remove attempt."
      return 1
      ;;
    *)
      echo "::error::Could not remove the MinIO bucket ${bucket} (exit ${result})."
      return 1
      ;;
  esac
}

main "$@"
