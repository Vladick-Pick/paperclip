# Claricont Fork Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move Claricont's Paperclip setup to a fork-based deployment workflow with documented rules, versioned deploy scripts, and a safe server update path.

**Architecture:** Keep `master` as a clean upstream mirror, deploy only from `claricont-prod`, and store the operational rules in `doc/operations/`. Version the deploy logic in the repository, then repoint both local and server remotes to Claricont's fork while keeping `upstream` for open-source sync.

**Tech Stack:** Git, GitHub fork workflow, Bash, systemd, pnpm, Paperclip docs

---

### Task 1: Document the operating model

**Files:**
- Create: `doc/operations/fork-workflow.md`
- Create: `doc/operations/deploy-runbook.md`
- Create: `doc/operations/upstream-sync-runbook.md`
- Create: `doc/operations/customizations-register.md`
- Modify: `AGENTS.md`

**Step 1: Write the docs with exact remotes, branch roles, and deployment rules**

Include:
- remote names and URLs
- branch responsibilities
- rules for internal work vs upstream PR work
- deploy sequence and rollback notes
- customization inventory template

**Step 2: Update `AGENTS.md` to link the new operations docs**

Add a short Claricont-specific section near the contribution rules.

**Step 3: Verify docs are discoverable**

Run: `rg -n "Claricont|fork-workflow|deploy-runbook|upstream-sync" AGENTS.md doc/operations`
Expected: matches from the new files and AGENTS section

**Step 4: Commit**

```bash
git add AGENTS.md doc/operations
git commit -m "docs: add Claricont fork workflow runbooks"
```

### Task 2: Version the production deploy logic

**Files:**
- Create: `scripts/deploy-server.sh`
- Modify: `/home/paperclip/update-paperclip.sh` on the server after the repo script exists

**Step 1: Add a repo-owned deploy script**

The script should:
- require a non-root `paperclip` user
- backup the embedded DB
- fetch from `origin`
- fast-forward the current branch
- install dependencies with lockfile fallback
- build the UI
- restart the service
- wait for healthcheck success

**Step 2: Run shell syntax validation**

Run: `bash -n scripts/deploy-server.sh`
Expected: no output

**Step 3: Commit**

```bash
git add scripts/deploy-server.sh
git commit -m "ops: add versioned deploy script"
```

### Task 3: Repoint local repository remotes and branches

**Files:**
- Modify: Git config only

**Step 1: Set remotes**

Run:
```bash
git remote rename origin upstream
git remote add origin https://github.com/Vladick-Pick/paperclip.git
```

**Step 2: Create production branch**

Run:
```bash
git checkout -b claricont-prod
```

**Step 3: Push branches to the fork**

Run:
```bash
git push -u origin master
git push -u origin claricont-prod
```

**Step 4: Verify branch/remotes state**

Run: `git remote -v && git branch -vv`
Expected: `origin` is the fork, `upstream` is the official repo, `claricont-prod` tracks the fork

### Task 4: Repoint the server and install the new deploy workflow

**Files:**
- Modify: server Git config only
- Modify: `/home/paperclip/update-paperclip.sh`

**Step 1: Backup the current server repo state**

Capture branch, remotes, and status before mutation.

**Step 2: Repoint server remotes to fork + upstream**

Set:
- `origin` = `Vladick-Pick/paperclip`
- `upstream` = `paperclipai/paperclip`

**Step 3: Create or switch to `claricont-prod` on the server**

Ensure the server deploys that branch only.

**Step 4: Replace the home-directory wrapper with a thin call into the repo script**

Make `~/update-paperclip.sh` call `~/paperclip/scripts/deploy-server.sh`.

**Step 5: Verify production update flow**

Run: `~/update-paperclip.sh`
Expected: backup created, dependencies installed, UI built, service active, healthcheck passes

### Task 5: Record current Claricont customizations and verify everything

**Files:**
- Modify: `doc/operations/customizations-register.md`

**Step 1: Register known customizations**

At minimum capture:
- deployment wrapper behavior
- fork-based branch model
- any local-only operational scripts

**Step 2: Run project verification**

Run:
```bash
pnpm test:run
bash -n scripts/deploy-server.sh
```
Expected: tests pass, shell validation passes

**Step 3: Commit and push the integration branch**

```bash
git add doc/operations AGENTS.md scripts/deploy-server.sh
git commit -m "ops: establish Claricont fork workflow"
git push -u origin codex/claricont-fork-workflow
```
