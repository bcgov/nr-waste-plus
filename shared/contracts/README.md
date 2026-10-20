# Shared Contracts

Golden JSON files pinning the wire contract between the Spring backend and
the Zod frontend. There is no OpenAPI and there will not be one — these
files **are** the contract.

## How it works

1. **Backend tests generate and compare.** A golden test calls a real
   controller through the real MVC stack and passes the serialized response
   to `GoldenFiles.assertMatches(relativePath, actualJson)`. A changed DTO
   fails the build until the file is regenerated.
2. **Frontend tests parse.** `frontend/src/config/tests/contracts.unit.test.ts`
   maps every golden file to its Zod schema; a regenerated file that no longer
   parses fails there, with the drifted field named.
3. **Golden files are never hand-written and never hand-edited.** They are
   produced only by the regenerate flag from real controller responses. If a
   golden file looks wrong, fix the backend test data or the DTO, then
   regenerate.

## Commands

```bash
# compare mode (default; what CI runs) — backend + frontend
cd backend && ./mvnw verify -P all-tests
cd frontend && npx vitest run src/config/tests/

# regenerate golden files after an intentional contract change
GOLDEN_UPDATE=true ./mvnw verify -P all-tests
```

`GOLDEN_UPDATE` (env) or `-Dgolden.update=true` (system property) enables
update mode. The env variable is the reliable channel: Maven does not forward
CLI `-D` properties to the forked failsafe JVM.

## Layout and naming

- One folder per feature, one file per endpoint response shape.
- Variants use a dotted suffix: `.nulls.json` (every nullable field is
  genuinely `null` on the wire), `.empty.json` (empty collection or page).
- Every endpoint with nullable fields gets a `.nulls` variant.
- Files are pretty-printed with a stable key order and a trailing newline —
  regenerate, never hand-format.

## Adding an endpoint (checklist)

A new or changed backend response consumed by the frontend needs:

1. A backend golden test — in the endpoint's existing integration test class
   (`AbstractTestContainerIntegrationTest` subclasses run the real stack,
   including `pageSerializationMode = VIA_DTO`). Seed deterministic data
   (fixed ids, not sequences) and call `GoldenFiles.assertMatches`.
2. A regenerated file under `shared/contracts/` — review the diff.
3. A registry entry in
   `frontend/src/config/tests/contracts.unit.test.ts` mapping the file to the
   matching Zod schema from `@/types`.

The frontend completeness test fails on an orphan in either direction, so a
new endpoint cannot silently go uncovered.

## For agents and contributors

A new or changed backend response consumed by the frontend needs all three of:

1. a backend golden test,
2. a regenerated file under `shared/contracts/` (reviewed, never hand-edited),
3. a registry entry in `frontend/src/config/tests/contracts.unit.test.ts`.

Missing any one fails CI: the backend test, the frontend completeness test,
or both.

## CI

CI always runs in strict compare mode: both the backend and frontend test
jobs pin `GOLDEN_UPDATE=false`, and the backend job fails if the test run
modifies anything under `shared/contracts/`. Regenerated files reach CI only
as committed, reviewed diffs — a PR whose golden files were regenerated must
also carry the backend DTO change that justifies them.

## Non-determinism

Golden files must be deterministic. Avoid `now()` timestamps and
sequence-generated ids in seeded rows — use fixed ids (e.g. `98700000x`)
and fixed dates. Where a field genuinely cannot be made deterministic
(today: `lastUpdated` on the blocks list, derived from `now()` at query
time), mask it explicitly in the golden test and record the masking in the
contract report. Masked-to-null fields must still parse on the frontend —
check the schema before choosing the mask.
