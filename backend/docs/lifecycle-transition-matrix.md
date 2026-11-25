# Lifecycle Transition & Permission Matrix (Issue #1231)

> **Status:** Drafted from Issue #1231, #1229, #1552, and the existing #1229 policy implementation.  
> **Pending Sign-off:** Product/domain review against Figma nodes `51:14067`, `79:7691`, `190:21036`, `106:8810` and Confluence pages *Waste Plus - Block State Transition* and *Waste Plus - Reporting Unit State Transition*.

## 1. Block State Transition Matrix

Executable source of truth: [`backend/src/main/resources/lifecycle-matrix.yml`](../src/main/resources/lifecycle-matrix.yml).

| fromState | event | toState | roles | actor | conditions | commentRequired | confirmationRequired | externalStep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DRAFT` | `SUBMIT` | `SUBMITTED` | `SUBMITTER`, `ADMIN` | `USER` | Required fields present (`plcDate`), attachments `FINALIZED` & `CLEAN`, and hold condition is **false** | `false` | `false` | `—` |
| `DRAFT` | `SUBMIT` | `HOLD` | `SUBMITTER`, `ADMIN` | `USER` | Required fields present (`plcDate`), attachments `FINALIZED` & `CLEAN`, and hold condition is **true** (`submissionDate > plcDate + 12 months` or `RATIONALE_REQUIRED = yes` or `BURNT_PILES = yes`) | `false` | `false` | `—` |
| `DRAFT` | `CANCEL` | `CANCELLED` | `SUBMITTER`, `ADMIN` | `USER` | `—` | `true` | `true` | `—` |
| `SUBMITTED` | `HOLD` | `HOLD` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | `—` | `false` | `true` | `—` |
| `SUBMITTED` | `APPROVE` | `SUBMISSION_APPROVED` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | `—` | `false` | `true` | `—` |
| `SUBMITTED` | `AUTO_APPROVE` | `SUBMISSION_APPROVED` | `—` | `SYSTEM` | `AUTO_APPROVE_MONTHS` (default `12`) elapsed from submitted date | `false` | `false` | `—` |
| `SUBMITTED` | `REJECT` | `REJECTED` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | `—` | `true` | `true` | `—` |
| `SUBMITTED` | `CANCEL` | `CANCELLED` | `SUBMITTER`, `ADMIN` | `USER` | `—` | `true` | `true` | `—` |
| `HOLD` | `APPROVE` | `SUBMISSION_APPROVED` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | `—` | `false` | `true` | `—` |
| `HOLD` | `REJECT` | `REJECTED` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | `—` | `true` | `true` | `—` |
| `HOLD` | `UNHOLD` | `SUBMITTED` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | `—` | `false` | `true` | `—` |
| `REJECTED` | `SUBMIT` | `SUBMITTED` | `SUBMITTER`, `ADMIN` | `USER` | Required fields present (`plcDate`), attachments `FINALIZED` & `CLEAN`, and hold condition is **false** | `false` | `false` | `—` |
| `REJECTED` | `SUBMIT` | `HOLD` | `SUBMITTER`, `ADMIN` | `USER` | Required fields present (`plcDate`), attachments `FINALIZED` & `CLEAN`, and hold condition is **true** | `false` | `false` | `—` |
| `REJECTED` | `CANCEL` | `CANCELLED` | `SUBMITTER`, `ADMIN` | `USER` | `—` | `true` | `true` | `—` |
| `SUBMISSION_APPROVED` | `APPROVE_FOR_BILLING` | `BILLING_APPROVED` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | External HBS invoice post succeeds | `false` | `true` | `HBS_INVOICE_POST` |
| `SUBMISSION_APPROVED` | `AUTO_APPROVE_BILLING` | `BILLING_APPROVED` | `—` | `SYSTEM` | `BILLING_DELAY_MONTHS` (default `1`) elapsed from approval date (and `AUTO_APPROVE_MONTHS` from submitted date if applicable); HBS invoice post succeeds | `false` | `false` | `HBS_INVOICE_POST` |
| `SUBMISSION_APPROVED` | `HBS_OUTCOME_INDETERMINATE` | `ERROR` | `—` | `SYSTEM` | HBS post/lookup outcome undeterminable during `APPROVE_FOR_BILLING` or `AUTO_APPROVE_BILLING` (#1552) | `false` | `false` | `HBS_INVOICE_POST` |
| `ERROR` | `CONFIRM_BILLED` | `BILLING_APPROVED` | `ADMIN` | `USER` | HBS lookup confirms invoice exists (#1552) | `false` | `true` | `HBS_INVOICE_LOOKUP` |
| `ERROR` | `RETURN_TO_APPROVED` | `SUBMISSION_APPROVED` | `ADMIN` | `USER` | HBS lookup confirms no invoice exists (#1552) | `false` | `true` | `HBS_INVOICE_LOOKUP` |

## 2. Reporting Unit State Transition Matrix

| fromState | event | toState | roles | actor | conditions | commentRequired | confirmationRequired | externalStep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PLANNING` | `SUBMIT` | `STAFF_REVIEW` | `SUBMITTER`, `ADMIN` | `USER` | `—` | `false` | `false` | `—` |
| `SUBMISSION` | `SUBMIT` | `STAFF_REVIEW` | `SUBMITTER`, `ADMIN` | `USER` | `—` | `false` | `false` | `—` |
| `SUBMISSION` | `CANCEL` | `CANCELLED` | `SUBMITTER`, `ADMIN` | `USER` | `—` | `true` | `true` | `—` |
| `STAFF_REVIEW` | `APPROVE` | `CLOSED` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | `—` | `false` | `true` | `—` |
| `STAFF_REVIEW` | `REJECT` | `SUBMISSION` | `AREA`, `DISTRICT`, `ADMIN` | `USER` | `—` | `true` | `true` | `—` |

## 3. Edit Permission Matrix (`canEdit`)

| Role | Editable States | Denial Reason on Other States |
| --- | --- | --- |
| `VIEWER` | *(none)* | `ROLE_NOT_ALLOWED` |
| `SUBMITTER` | `DRAFT`, `REJECTED` | `STATE_NOT_EDITABLE` |
| `AREA` | `DRAFT`, `PLANNING`, `SUBMISSION`, `SUBMITTED`, `HOLD`, `SUBMISSION_APPROVED`, `STAFF_REVIEW`, `REJECTED`, `ERROR` | `STATE_NOT_EDITABLE` (`BILLING_APPROVED`, `CLOSED`, `CANCELLED`) |
| `DISTRICT` | `DRAFT`, `PLANNING`, `SUBMISSION`, `SUBMITTED`, `HOLD`, `SUBMISSION_APPROVED`, `STAFF_REVIEW`, `REJECTED`, `ERROR` | `STATE_NOT_EDITABLE` (`BILLING_APPROVED`, `CLOSED`, `CANCELLED`) |
| `ADMIN` | `DRAFT`, `PLANNING`, `SUBMISSION`, `SUBMITTED`, `HOLD`, `SUBMISSION_APPROVED`, `STAFF_REVIEW`, `REJECTED`, `ERROR` | `STATE_NOT_EDITABLE` (`BILLING_APPROVED`, `CLOSED`, `CANCELLED`) |

> Note: BCeID callers claiming internal roles (`ADMIN`, `AREA`, `DISTRICT`) are always denied with `ROLE_NOT_ALLOWED`.

## 4. Open Questions Requiring Product / Domain Sign-off

1. **`BILLING_APPROVED -> HOLD` ("4-Billing cancelled"):** Referenced in #1231 comment on Confluence page *Waste Plus - Block State Transition*. Confirm whether a `CANCEL_BILLING` (or similar) edge exists from `BILLING_APPROVED` to `HOLD`, its allowed roles, comment requirement, and whether it requires an HBS step.
2. **Timer semantics (`AUTO_APPROVE_MONTHS` vs `BILLING_DELAY_MONTHS`):**
   - `AUTO_APPROVE_MONTHS` (default 12): moves `SUBMITTED` -> `SUBMISSION_APPROVED` (or directly `SUBMISSION_APPROVED` -> `BILLING_APPROVED`?).
   - `BILLING_DELAY_MONTHS` (default 1): moves `SUBMISSION_APPROVED` -> `BILLING_APPROVED` via `AUTO_APPROVE_BILLING`.
   - Confirm exact state pairs and whether `HOLD` blocks are excluded from `AUTO_APPROVE`.
3. **Editability in `BILLING_APPROVED` and `CLOSED`:** Issue #1231 notes *"the 'save data' self transition allows submitters to edit in `DRAFT` and `REJECTED`, and Area, District and Admin staff to edit in any state"* and asks to *"confirm per state against the diagram, including `CLOSED` and `BILLING_APPROVED`"*. Currently `BILLING_APPROVED`, `CLOSED`, and `CANCELLED` are marked non-editable; confirm if staff can edit in `BILLING_APPROVED` or `CLOSED`.
4. **Reporting unit `SUBMISSION` -> `STAFF_REVIEW` vs `SUBMITTED`/`HOLD`:** Confirm whether Reporting Unit `SUBMIT` transitions to `STAFF_REVIEW` (as in `PLANNING`) or if `SUBMISSION` has different edges in Figma `79:7691`.
5. **Block `CLOSED` state transitions:** Confirm how/when a block enters `CLOSED` (e.g., from `BILLING_APPROVED` or `CANCELLED`, or if `CLOSED` is only a reporting unit state).
6. **`ADMIN` role on `SUBMIT` and `APPROVE_FOR_BILLING`:** Confirm whether `ADMIN` is allowed on `SUBMIT` (currently enabled in #1229) and `APPROVE_FOR_BILLING` (illustrative row in #1231 lists `AREA`, `DISTRICT`).
