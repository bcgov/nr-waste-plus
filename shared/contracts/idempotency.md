# Idempotency-Key Protocol Contract

This contract defines the client-server protocol for safe retries of mutating API endpoints using the `Idempotency-Key` HTTP header.

It governs frontend consumers (#1238b, #1241, #1245) and backend middleware (#1234, #1229).

---

## 1. Protocol Overview

Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) can be made idempotent by supplying a unique `Idempotency-Key` header. The backend coordinates key claims, canonical payload fingerprinting, response snapshot caching, and duplicate suppression.

```
Client                                                  Backend
  |                                                        |
  |--- POST /api/... [Idempotency-Key: <uuid>] ----------->|
  |    (Initial request)                                   |-- Claim key (IN_PROGRESS)
  |                                                        |-- Execute mutation
  |                                                        |-- Store status & snapshot (COMPLETED)
  |<-- 200/201/204 [Response payload] ---------------------|
  |                                                        |
  |--- POST /api/... [Idempotency-Key: <uuid>] ----------->|
  |    (Retry with identical payload)                      |-- Detect matching key & fingerprint
  |<-- 200/201/204 [Replayed verbatim from snapshot] ------| (No second mutation!)
  |                                                        |
  |--- POST /api/... [Idempotency-Key: <uuid>] ----------->|
  |    (Retry with DIFFERENT payload)                      |-- Detect fingerprint mismatch
  |<-- 409 Conflict [ProblemDetail] -----------------------| (Rejected!)
```

---

## 2. Frontend Consumer Contract

### Key Generation Timing
* The frontend generates **one UUID v4** string per logical user mutation using `crypto.randomUUID()`.
* The key must be generated at the point where the user triggers the action (e.g., clicking "Save Calculation", "Submit", or "Delete").

### Reuse-on-Retry-Only Rule
* **Reused ONLY for transport-level retries**: If a network failure, request timeout, connection drop, or transient 502/503/504 occurs, retry using the **exact same `Idempotency-Key`** and the identical request payload.
* **Never regenerate after an ambiguous response**: If the client does not know whether the backend received or processed the mutation, do NOT generate a new key. Reusing the original key allows safe replay if the server succeeded, or execution if it never reached the server.
* **Never reuse across different user actions**: A key is strictly bound to a single logical mutation. If the user edits inputs or triggers a new distinct operation, generate a brand-new UUID v4. Reusing a previous key with different data returns `409 Conflict`.

### Recovery via Status Lookup Guidance
When transport retries fail or an operation returns `202 Accepted` (pending confirmation):
1. **Lifecycle & Async Operations**: Look up operation progress via `GET /api/operations/{operationId}` before deciding whether to retry.
2. **Resource Re-read**: Query the resource state (e.g., `GET /api/reporting-units/{ruId}`) using ETag / revision verification to determine whether the mutation completed.
3. **User Feedback**: If an ambiguous or persistent network failure occurs, present a retry option that re-submits with the original key rather than resetting the form with a new key.

---

## 3. Backend Middleware Specification

### Header
* Header name: `Idempotency-Key` (case-insensitive).
* Maximum key length: 256 characters. Keys exceeding this length return `400 Bad Request`.
* Maximum request body size: 2 MB. Requests exceeding this limit return `413 Payload Too Large` (`application/problem+json`).
* Non-mutating methods (`GET`, `HEAD`, `OPTIONS`) ignore the header and pass through without claim or caching.

### Canonical Request Fingerprinting & Caller Binding
The request fingerprint is an SHA-256 digest (64 hex characters) computed from:
1. Authenticated caller identity (`userId`, or `sub`)
2. HTTP Method in uppercase (e.g., `POST`)
3. Path and query string (e.g., `/api/reporting-units/123/lifecycle-events?stage=final`)
4. Normalized request body:
   * JSON payloads are canonicalized by recursively sorting object keys alphabetically and formatting compactly without whitespace.
   * Non-JSON payloads are trimmed UTF-8 strings.
   * Empty payloads normalize to empty string `""`.

### Caller Authorization & Tenant Security
* Every idempotency claim is strictly bound to the authenticated caller identity (`created_by`).
* A replay request made by any caller other than the original claim owner is rejected with `403 Forbidden` (`application/problem+json`). Callers cannot observe or replay cached mutation snapshots belonging to other users or tenants.
* Replay requests re-verify endpoint and resource-level authorization before serving cached responses. For resource-scoped endpoints (e.g., reporting units), if the caller's permissions or client-number roles have been revoked since the original mutation, the replay is rejected with `403 Forbidden` (`application/problem+json`) to prevent data leakage.

### Middleware Lifecycle & Statuses
The database tracks keys in `hrs.idempotency_record`:
* **`IN_PROGRESS`**: Set upon initial claim within the shared database transaction.
* **`COMPLETED`**: Set upon successful completion (HTTP 2xx) along with `response_status`, endpoint-required response headers (such as `Location`), and `response_snapshot` (JSONB), committing atomically with the business mutation.

| Scenario | Condition | Backend Behavior |
| --- | --- | --- |
| **Initial Request** | Key not in DB | Key is claimed (`IN_PROGRESS`) in a shared transaction with the business mutation. On 2xx, the claim is completed with status code, endpoint response headers (`Location`), and body snapshot, committing atomically. |
| **Identical Retry** | Key in DB, `status = COMPLETED`, matching fingerprint and caller | Controller is skipped. The stored response status, endpoint response headers (`Location`), and JSON snapshot are replayed verbatim. |
| **Cross-Caller Replay** | Key in DB, caller does not match `created_by` | Returns `403 Forbidden` (`application/problem+json`). Unauthorized access attempt is logged. |
| **Mismatched Retry** | Key in DB, different fingerprint | Returns `409 Conflict` (`application/problem+json`). Client bug: key was reused for a different payload. |
| **Concurrent Duplicate** | Key in DB, `status = IN_PROGRESS` | Returns `409 Conflict` (`application/problem+json`). Mutation is running concurrently; client should wait or retry later. |
| **Failed Mutation** | Controller/service returns 4xx/5xx or throws exception | Shared transaction is rolled back, atomically discarding both the `IN_PROGRESS` claim and any partial business writes so the client can fix request errors and safely retry with the same key. |

