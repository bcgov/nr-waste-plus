#!/usr/bin/env bash
#
# seed-minio-bucket.sh — Seed a PR MinIO bucket and verify presigned PUT/GET.
# Requires OC_SERVER, OC_TOKEN, OC_NAMESPACE, PR_NUMBER, OBJECT_STORAGE_BUCKET.
# OC_CLI_VERSION is optional and defaults to 4.18.

set -uo pipefail

OC_CLI_VERSION="${OC_CLI_VERSION:-4.18}"
OC=(oc --request-timeout=15s)
JOB_TEMPLATE="nr-waste-plus-tools-minio-presign"

retry() {
  local attempts="$1"
  shift
  local attempt=1
  until "$@"; do
    if [ "${attempt}" -ge "${attempts}" ]; then
      echo "::error::Command failed after ${attempts} attempt(s): $*"
      return 1
    fi
    echo "Attempt ${attempt}/${attempts} failed; retrying in $((attempt * 5))s..."
    sleep $((attempt * 5))
    attempt=$((attempt + 1))
  done
}

login() {
  "${OC[@]}" login --server="${OC_SERVER}" --token="${OC_TOKEN}"
}

create_job() {
  local rendered patched
  rendered=$("${OC[@]}" create job --from="cronjob/${JOB_TEMPLATE}" "${JOB_NAME}" \
    -n "${OC_NAMESPACE}" --dry-run=client -o yaml) || return 1
  patched=$(printf '%s\n' "${rendered}" \
    | sed "/name: PR_NUMBER/{n;s/value: \"0\"/value: \"${PR_NUMBER}\"/;}")
  printf '%s\n' "${patched}" | grep -q "value: \"${PR_NUMBER}\"" || {
    echo "::error::PR_NUMBER was not patched into the ${JOB_NAME} job template."
    return 1
  }
  printf '%s\n' "${patched}" | "${OC[@]}" apply -f -
}

remove_bucket() {
  local pod_name
  pod_name=$("${OC[@]}" get pods -n "${OC_NAMESPACE}" -l app=nr-waste-plus-tools \
    -l deployment=nr-waste-plus-tools-minio -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  if [ -z "${pod_name}" ]; then
    echo "MinIO pod not found; skipping bucket removal."
    return 0
  fi
  # shellcheck disable=SC2016
  "${OC[@]}" exec "${pod_name}" -n "${OC_NAMESPACE}" -c minio-init -- sh -c '
    mc --config-dir /tmp/.mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1 || exit 0
    mc --config-dir /tmp/.mc rm --recursive --force local/"$1" >/dev/null 2>&1 || true
    mc --config-dir /tmp/.mc rb --force local/"$1" >/dev/null 2>&1 || true
  ' _ "${OBJECT_STORAGE_BUCKET}" || true
  echo "Removed bucket ${OBJECT_STORAGE_BUCKET} (if it existed)."
}

wait_for_job() {
  local job="$1"
  local timeout="$2"
  local deadline=$(( $(date +%s) + timeout ))
  local counts
  local succeeded_count
  local failed_count
  local poll_interval=2
  succeeded=0
  failed=0

  while [ "$(date +%s)" -lt "${deadline}" ]; do
    if ! counts=$(oc --request-timeout=15s get job "${job}" -n "${OC_NAMESPACE}" \
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
  : "${OC_SERVER:?OC_SERVER is required}"
  : "${OC_TOKEN:?OC_TOKEN is required}"
  : "${OC_NAMESPACE:?OC_NAMESPACE is required}"
  : "${PR_NUMBER:?PR_NUMBER is required}"
  : "${OBJECT_STORAGE_BUCKET:?OBJECT_STORAGE_BUCKET is required}"
  JOB_NAME="minio-presign-pr${PR_NUMBER}-${GITHUB_RUN_ATTEMPT:-1}-$(date +%s)"

  if ! command -v oc >/dev/null 2>&1; then
    local url="https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable-${OC_CLI_VERSION}/openshift-client-linux.tar.gz"
    echo "Downloading OpenShift CLI from ${url}..."
    wget --timeout=15 --tries=3 "${url}" -qO oc.tar.gz || {
      echo "::error::Failed to download the OpenShift CLI."
      return 1
    }
    tar -xzf oc.tar.gz oc || {
      rm -f oc.tar.gz
      echo "::error::Failed to extract the OpenShift CLI."
      return 1
    }
    rm -f oc.tar.gz
    sudo mv oc /usr/local/bin/oc
  fi

  echo "Logging in to ${OC_SERVER}..."
  retry 8 login || return 1
  retry 2 remove_bucket || echo "::warning::Could not remove ${OBJECT_STORAGE_BUCKET}; continuing."

  echo "Creating in-cluster verification job ${JOB_NAME}..."
  retry 8 create_job || return 1
  wait_for_job "${JOB_NAME}" 300

  echo "--- job logs ---"
  "${OC[@]}" logs "job/${JOB_NAME}" -n "${OC_NAMESPACE}" --tail=100 || true
  if [ "${succeeded}" -lt 1 ]; then
    echo "--- job description ---"
    "${OC[@]}" describe "job/${JOB_NAME}" -n "${OC_NAMESPACE}" || true
  fi
  "${OC[@]}" delete "job/${JOB_NAME}" -n "${OC_NAMESPACE}" --ignore-not-found || true
  if [ "${succeeded}" -lt 1 ]; then
    echo "::error::Presigned PUT and GET verification failed for PR ${PR_NUMBER} (succeeded=${succeeded}, failed=${failed})."
    return 1
  fi
  echo "Presigned PUT and GET verified for PR ${PR_NUMBER}."
}

main "$@"
