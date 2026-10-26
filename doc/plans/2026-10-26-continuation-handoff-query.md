# Continuation handoff query failure — 2026-10-26

Outcome: fixed and independently reviewed locally. Production remains unchanged at `06a0e0c2efdc65edac80c2db8a5decc4b673665e`. No push, deploy, production migration, agent/config changes, issue/run mutation or agent wake was performed.

- [x] Recover the PostgreSQL cause and reproduce the logged query.
- [x] Distinguish adapter and review-path hypotheses using real test databases.
- [x] Add a failing regression, fix the shared projection and run focused checks.
- [x] Complete independent correctness/security and Ponytail reviews.
- [x] Document the authorized local result and owner-gated COM-94 recovery.

## Исправление конкретного случая

The journal for the three specified run IDs contains the same failed query and stack at `native-session-handoff.ts` → `heartbeat.ts:executeRun`, but its error serializer retained only type/message/stack and lost the nested PostgreSQL cause. Each original SELECT was replayed with its parameters in an explicit production `READ ONLY` transaction. All three returned:

```text
PostgresError: invalid byte sequence for encoding "UTF8": 0xd0 0x0a
SQLSTATE: 22021
routine: report_invalid_encoding
```

Production has `server_encoding=SQL_ASCII`, `client_encoding=UTF8`. In SQL_ASCII, text length/left/right count bytes. The successful prior COM-94 run stores a valid UTF8 `result_json.summary` of 4549 bytes / 2676 Unicode code points. Its first 2900 bytes and last 900 bytes each split a UTF8 character. Concatenating the head, ASCII omission marker and tail produces invalid UTF8, so the server rejects the text result before the adapter turn starts. The original stored summary itself is valid and was not changed.

The apparent null `resultJson` in the API is an existing SQL_ASCII-safe run projection in `services/heartbeat/run-state.ts`, not the underlying stored value. Its actual source was verified read-only; no production summary text was printed or copied into this report.

Neither initial hypothesis explains the defect. Both Claude and Codex fail on both `in_progress` and `in_review` when the shared handoff reads this text in SQL_ASCII. Review-path recovery supplies another wake; it is not the faulty SQL operator or authorization policy.

At the final read-only check COM-94 was still `blocked`, assigned to `5f0ef625-7bb2-487c-893d-5bc4a056211e`, with no active/queued run and no execution lock. Interaction `971c07e7-10b2-45ce-a494-318ef87ed881` remained `answered`. The case has not been restored live because deployment and company-data mutation are explicitly outside this task's authority.

## Call path

- Answer delivery: `question-response-delivery.ts` → `options.heartbeat.wakeup(... reason: issue_commented ...)` with durable question-response idempotency → wake queue → `heartbeat.ts:executeRun`.
- Review recovery: `heartbeat/run-lifecycle.ts:handleIssueReviewPathDisposition` → `enqueueWakeup` with the review-path-lost reason → the same `executeRun`. Exhaustion is logged by `recovery/review-path-recovery-escalation.ts`.
- Board comment: `routes/issues.ts` comment/resume handler → ordinary `heartbeat.wakeup` → the same `executeRun`.
- Before legacy dispatch with no usable previous session, `executeRun` awaits `createNativeSessionHandoffLoader` → `buildNativeSessionHandoff`. The failing run-summary SELECT is the sixth parallel history read. Failure is recorded as `setup_failed`; stranded-issue reconciliation can subsequently block the issue.

## Предотвращение повторения

`server/src/services/native-runtime/native-session-handoff.ts` now transports SQL-bounded previews as base64 ASCII and decodes them before existing trust handling and registered-secret redaction. This follows the existing database-text-preview approach in `services/issues.ts`.

The same small projection is used for comments, interaction summaries, prior agent replies, saved documents, prior-run summaries and the separately bounded interaction title. SQL_ASCII preserves its raw bytes for safe transport; other server encodings convert to UTF8 first. This also preserves native WIN1251 behavior rather than decoding its bytes as UTF8.

The query's company/task/agent scope, reset/cutoff boundaries, text/row limits, legacy fallback precedence, trust quarantine and 24,000-byte output budget remain unchanged. No schema, dependency, setting, permission, API contract or recovery-policy change is needed.

Known limit: SQL_ASCII can still cut a Unicode character at a preview edge. Decoding represents that intentionally omitted boundary with a replacement character; original stored content is unchanged. This patch does not convert the database encoding or claim to audit every unrelated text projection.

## Regression and verification

Added `server/src/services/native-runtime/native-session-handoff-encoding.test.ts`. It invokes the real shared loader against real PostgreSQL 18.1 databases, asserts each actual server encoding, and crosses:

| Database encoding | claude_local / in_progress | claude_local / in_review | codex_local / in_progress | codex_local / in_review |
| --- | --- | --- | --- | --- |
| SQL_ASCII, original source | 22021 | 22021 | 22021 | 22021 |
| UTF8, original source | pass | pass | pass | pass |
| WIN1251, original source | pass | pass | pass | pass |
| All three, fixed source | pass | pass | pass | pass |

The fixture uses a long Cyrillic legacy result summary, verifies exact decoded excerpts on UTF8/WIN1251 and all bounded history sources on SQL_ASCII. Baseline with the final test file: **4 failed / 8 passed**, with the exact production error. Final fixed run: **18 passed / 0 skipped** across the new 12-case matrix and existing 6-case handoff suite (scope/reset/cutoff/quarantine/lazy loading).

Local test runtime used pinned dependencies plus this repository's postgres/embedded-postgres patches, in `/tmp/paperclip-continuation-repro/runtime`; native package symlinks were restored using its own postinstall helper. The final two-file Vitest invocation used that runtime's config and server's source alias for the runner. No full suite, repository-wide typecheck/build, provider turn, production write or production agent smoke was run.

Equivalent focused invocation with ordinary repository dependencies installed:

```sh
pnpm --filter @paperclipai/server exec vitest run \
  src/services/native-runtime/native-session-handoff.test.ts \
  src/services/native-runtime/native-session-handoff-encoding.test.ts
```

Independent correctness/security and Ponytail reviews approved code patch SHA256 `a1bc2c35af10e3420811c55819a0b1e18f1a80a21e3448bd205214b30820cae0`. No blocker remained. `git diff --check` passed.

## Safe COM-94 recovery after separate owner authorization

1. Push/deploy the reviewed code only after the owner explicitly permits it; verify installed SHA and health. This fix needs no database migration.
2. Re-read COM-94: correct assignee, saved answer still answered, no live/queued run. Do not delete previous runs, reset the old question response, alter budgets or change agent settings.
3. Use the ordinary board comment/resume flow once, with a new instruction to continue from the saved answer. The supported endpoint is `POST /api/issues/cf8a8470-9596-4c75-95c5-87d15910fbfa/comments` with a normal comment body and `resume: true`. Its existing handler checks first-class blockers, reopens an eligible blocked issue to `todo`, and queues the assignee. If real unresolved blockers reject continuation, stop and resolve them through their normal workflow.
4. Observe the resulting run reaching adapter dispatch instead of `setup_failed`, and verify the planner receives the saved answer. Do not blindly repeat retries or manually update heartbeat/issue rows.

All recovery steps above remain proposed, not executed.
