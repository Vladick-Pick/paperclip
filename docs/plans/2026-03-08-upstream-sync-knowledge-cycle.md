# Upstream Sync Knowledge Cycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the verified Claricont `Knowledge` customization into the fork, then integrate the latest upstream `paperclipai/paperclip` changes into `claricont-prod` without losing the customization.

**Architecture:** Use an isolated integration branch on top of `claricont-prod`, resolve merge conflicts in favor of preserving the Claricont `Knowledge` behavior while retaining upstream fixes, regenerate database migration metadata on top of upstream migrations, and only land the result after the full test, typecheck, and build suite passes.

**Tech Stack:** Git, pnpm workspace, Vitest, TypeScript, React, PostgreSQL schema migrations.

---

### Task 1: Record current integration state

**Files:**
- Modify: `docs/plans/2026-03-08-upstream-sync-knowledge-cycle.md`

**Step 1: Inspect branch and conflict state**

Run: `git status --short && git diff --name-only --diff-filter=U && git branch --show-current`
Expected: integration branch is `codex/upstream-sync-20260308` and unresolved merge paths are listed.

**Step 2: Confirm merge goals before editing**

Check that these customizations must survive the merge:
- knowledge-aware issue creation in `server/src/routes/issues.ts`
- knowledge context injection in `server/src/services/heartbeat.ts`
- Knowledge-aware issue composer in `ui/src/components/NewIssueDialog.tsx`
- shared issue type additions in `packages/shared/src/types/issue.ts`

**Step 3: Commit**

Do not commit yet; continue after conflict resolution.

### Task 2: Resolve code conflicts preserving Knowledge behavior

**Files:**
- Modify: `packages/adapter-utils/package.json`
- Modify: `packages/db/src/backup.ts`
- Modify: `packages/shared/src/types/issue.ts`
- Modify: `server/package.json`
- Modify: `server/src/routes/issues.ts`
- Modify: `server/src/services/heartbeat.ts`
- Modify: `ui/src/components/NewIssueDialog.tsx`

**Step 1: Remove conflict markers and keep intended merged behavior**

Preserve:
- upstream dependency versions where they do not affect custom behavior
- server-side attachment of `knowledgeItemIds` before issue wakeup
- issue knowledge context injection in heartbeat
- upstream issue wakeup guard for `backlog`
- upstream assignee/model sorting and provider helpers in the new issue dialog
- Claricont Knowledge selection flow and success handling in the new issue dialog
- upstream type additions on `Issue`

**Step 2: Run targeted search for conflict markers**

Run: `rg -n "^(<<<<<<<|=======|>>>>>>>)" packages server ui pnpm-lock.yaml`
Expected: no matches.

**Step 3: Stage nothing yet**

Keep working tree unstaged until migrations are normalized.

### Task 3: Normalize migration metadata on top of upstream

**Files:**
- Delete: `packages/db/src/migrations/0024_peaceful_sauron.sql`
- Delete: `packages/db/src/migrations/0025_omniscient_ender_wiggin.sql`
- Create: `packages/db/src/migrations/0026_cuddly_luminals.sql`
- Create: `packages/db/src/migrations/meta/0026_snapshot.json`
- Modify: `packages/db/src/migrations/meta/0024_snapshot.json`
- Modify: `packages/db/src/migrations/meta/0025_snapshot.json`
- Modify: `packages/db/src/migrations/meta/_journal.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Adopt upstream 0024/0025 metadata as base**

Write upstream versions of `0024_snapshot.json`, `0025_snapshot.json`, and `_journal.json` into the merge branch.

**Step 2: Regenerate the next migration from the merged schema**

Run: `pnpm install --no-frozen-lockfile && pnpm db:generate`
Expected: a new `0026_*.sql` and matching `0026_snapshot.json` are generated on top of upstream base.

**Step 3: Verify no merge markers remain in migration metadata**

Run: `rg -n "^(<<<<<<<|=======|>>>>>>>)" packages/db/src/migrations`
Expected: no matches.

### Task 4: Verify the integration branch

**Files:**
- Test: workspace-wide test, typecheck, and build targets

**Step 1: Stage all resolved files**

Run: `git add -A`
Expected: `git status --short` shows no `UU`/`AA` entries.

**Step 2: Run the full suite**

Run:
- `pnpm test:run`
- `pnpm -r typecheck`
- `pnpm build`

Expected: all commands pass.

**Step 3: Fix failures if needed**

If any command fails, fix the relevant files and rerun only the failing command first, then rerun the full suite.

### Task 5: Land the upstream sync into Claricont production

**Files:**
- Modify: git history only

**Step 1: Commit the integration branch**

```bash
git commit -m "merge: sync upstream after knowledge rollout"
```

**Step 2: Merge into `claricont-prod`**

```bash
git checkout claricont-prod
git merge codex/upstream-sync-20260308
```

**Step 3: Re-run verification on `claricont-prod`**

Run:
- `pnpm test:run`
- `pnpm -r typecheck`
- `pnpm build`

Expected: all commands pass on the deploy branch too.

**Step 4: Push the fork**

```bash
git push origin claricont-prod
```

**Step 5: Record outcome**

Summarize:
- resulting `claricont-prod` commit SHA
- upstream SHA integrated
- whether server deployment is still pending
