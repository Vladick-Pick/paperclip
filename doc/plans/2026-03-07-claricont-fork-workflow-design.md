# Claricont Fork Workflow Design

## Goal

Move Claricont's Paperclip deployment from a direct-upstream server checkout to a fork-based workflow that preserves local customizations, keeps upstream updates easy to adopt, and leaves a clean path for upstream pull requests.

## Current Problems

- The production server tracks `paperclipai/paperclip` directly as `origin`.
- The production server deploys from `master`.
- Local customizations risk being overwritten by upstream pulls.
- Server state is currently too close to being a source of truth.
- There is no durable runbook describing how branches, remotes, deploys, and upstream sync are supposed to work.

## Requirements

1. Claricont-specific changes must survive future upstream updates.
2. Upstream updates must stay easy to integrate.
3. The deployment server must only consume reviewed Git branches, not ad-hoc filesystem edits.
4. The workflow must support both internal-only changes and future upstream pull requests.
5. The process must be documented inside the repository.

## Recommended Architecture

### Remotes

- `origin` -> `https://github.com/Vladick-Pick/paperclip.git`
- `upstream` -> `https://github.com/paperclipai/paperclip.git`

`origin` becomes the operational source of truth for Claricont.
`upstream` remains the source of new open-source changes.

### Branch Roles

- `master`: mirror of `upstream/master`; no Claricont-only commits
- `claricont-prod`: Claricont's stable deployment branch
- `codex/*`: short-lived feature or operations branches

This separation keeps the upstream mirror clean while giving Claricont a stable integration branch for production.

### Deployment Model

- The server must deploy only from `claricont-prod`.
- The server must never be the first place where code changes are introduced.
- The deployment script should live in the repository and be callable from a small server wrapper.
- Every deployment should include:
  - database backup
  - dependency install
  - UI build
  - service restart
  - healthcheck validation

### Upstream Update Model

1. Fast-forward local `master` from `upstream/master`.
2. Push mirrored `master` to Claricont's fork.
3. Merge `master` into `claricont-prod` on a short-lived branch.
4. Resolve conflicts and verify locally.
5. Merge into `claricont-prod`.
6. Deploy `claricont-prod` to the server.

This preserves manual review at the only risky step: integrating upstream changes into Claricont's customized production line.

### Contribution Model

Two contribution paths are supported:

1. Internal-only changes
   - branch from `claricont-prod`
   - merge back into `claricont-prod`
   - deploy

2. Upstream candidate changes
   - branch from `master`
   - keep the branch minimal and upstreamable
   - open PR to `paperclipai/paperclip`
   - if Claricont needs the change before upstream merge, cherry-pick or merge it into `claricont-prod`

This avoids mixing local operational changes with code that should later be proposed upstream.

## Documentation Plan

Add operations docs under `doc/operations/`:

- `fork-workflow.md`: remotes, branches, and development rules
- `deploy-runbook.md`: how production deploys work
- `upstream-sync-runbook.md`: how to bring upstream updates into Claricont safely
- `customizations-register.md`: inventory of local changes that may conflict with upstream later

Also update `AGENTS.md` with a short Claricont-specific section pointing contributors to those runbooks.

## Non-Goals

- Full CI/CD automation in this change
- Automatic conflict resolution when merging upstream into `claricont-prod`
- A separate staging server

Those can be added later if Claricont outgrows the single-prod-branch workflow.

## Success Criteria

The design is successful when:

- both local repo and server use `origin=fork` and `upstream=official`
- production runs from `claricont-prod`
- deploy steps are versioned in the repo
- update/deploy procedures are documented in-repo
- future custom work can be added without fear of being erased by upstream pulls
