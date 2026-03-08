# Knowledge Landing And Upstream Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land the current Knowledge customization into Claricont's production fork workflow, then update the fork's upstream mirror and attempt a controlled upstream merge into Claricont's integration line.

**Architecture:** First stabilize and commit the current `codex/issue-knowledge-mvp` branch. Then merge it into `claricont-prod`, verify, and push to `origin`. After that, fast-forward `master` to `upstream/master`, push the mirror, and test an upstream integration from a short-lived branch created off `claricont-prod`.

**Tech Stack:** git, pnpm, TypeScript monorepo, Claricont fork workflow

---

### Task 1: Stabilize and commit the Knowledge branch

**Files:**
- Modify: repository working tree changes already present on `codex/issue-knowledge-mvp`
- Create: `docs/plans/2026-03-08-knowledge-land-and-upstream-sync.md`

**Step 1: Verify current branch**
Run:
```bash
pnpm test:run
pnpm -r typecheck
pnpm build
```
Expected: PASS before any merge.

**Step 2: Review working tree**
Run:
```bash
git status --short
git diff --stat
```
Expected: understand exactly what will be committed.

**Step 3: Commit the branch**
Run:
```bash
git add AGENTS.md doc/operations/customizations-register.md doc/operations/knowledge-customization.md doc/plans docs/plans packages server skills ui package.json server/package.json packages/adapter-utils/package.json pnpm-lock.yaml
git commit -m "feat: add company knowledge workflow"
```
Expected: one coherent feature commit for merge.

### Task 2: Merge into Claricont production branch

**Files:**
- Merge: `codex/issue-knowledge-mvp` into `claricont-prod`

**Step 1: Switch to production branch**
Run:
```bash
git checkout claricont-prod
git pull --ff-only origin claricont-prod
```

**Step 2: Merge the feature branch**
Run:
```bash
git merge --no-ff codex/issue-knowledge-mvp
```
Expected: local merge commit or fast-forward if possible.

**Step 3: Verify merged result**
Run:
```bash
pnpm test:run
pnpm -r typecheck
pnpm build
```
Expected: PASS on `claricont-prod`.

### Task 3: Push Claricont production state

**Files:**
- Push: `claricont-prod`

**Step 1: Push fork production branch**
Run:
```bash
git push origin claricont-prod
```
Expected: Claricont fork now contains the Knowledge feature on the deploy branch.

### Task 4: Sync the upstream mirror branch

**Files:**
- Update: local `master`
- Push: `origin/master`

**Step 1: Fast-forward local mirror**
Run:
```bash
git checkout master
git fetch upstream
git pull --ff-only upstream master
```

**Step 2: Push updated mirror**
Run:
```bash
git push origin master
```
Expected: fork mirror branch matches current upstream.

### Task 5: Test upstream integration into Claricont line

**Files:**
- Create branch: `codex/upstream-sync-20260308`

**Step 1: Create integration branch from production**
Run:
```bash
git checkout claricont-prod
git pull --ff-only origin claricont-prod
git checkout -b codex/upstream-sync-20260308
```

**Step 2: Merge updated master**
Run:
```bash
git merge master
```
Expected: either conflicts to resolve or a clean merge.

**Step 3: Verify integration branch**
Run:
```bash
pnpm test:run
pnpm -r typecheck
pnpm build
```
Expected: either PASS or explicit report of conflicts/test failures blocking the upstream landing.

**Step 4: Decide next action based on evidence**
- If PASS: merge `codex/upstream-sync-20260308` into `claricont-prod` and push.
- If FAIL: keep integration branch for follow-up and report exact blockers.
