# Deploy Runbook

This runbook describes the only supported production deploy path for Claricont's Paperclip server.

If the source tree is already correct and you only need the service to reload it, use [local-instance-restart-runbook.md](./local-instance-restart-runbook.md) instead of running a full deploy.

If the source tree is already correct and you only need the service to reload it, use [local-instance-restart-runbook.md](./local-instance-restart-runbook.md) instead of running a full deploy.

## Server Facts

- host alias: `paperclip-vps`
- app directory: `/home/paperclip/paperclip`
- wrapper script: `/home/paperclip/update-paperclip.sh`
- repo deploy script: `/home/paperclip/paperclip/scripts/deploy-server.sh`
- service name: `paperclip`
- healthcheck: `http://127.0.0.1:3100/api/health`

## Deployment Rules

1. The server must stay on branch `claricont-prod`.
2. `origin` on the server must point to `Vladick-Pick/paperclip`.
3. `upstream` on the server must point to `paperclipai/paperclip`.
4. Deploy with the wrapper script, not by manually repeating commands.

## Standard Deploy

From your terminal:

```sh
ssh paperclip-vps
cd ~
./update-paperclip.sh
```

What the wrapper does:

1. enters `/home/paperclip/paperclip`
2. calls the repo-owned deploy script
3. backs up the embedded database
4. fetches and fast-forwards `claricont-prod`
5. installs dependencies
6. builds the UI
7. restarts `paperclip`
8. waits for healthcheck success

## Pre-Deploy Checklist

- `claricont-prod` has been pushed to `origin`
- local verification already passed
- the server repo is still on branch `claricont-prod`
- the server repo is not ahead of `origin/claricont-prod`
- there are no modified, staged, or untracked files on the server
- authenticated production still has a persistent `BETTER_AUTH_SECRET` or `PAPERCLIP_AGENT_JWT_SECRET`

Quick server cleanliness check:

```sh
ssh paperclip-vps 'cd ~/paperclip && git status --short --branch && git log --oneline origin/claricont-prod..HEAD'
```

Expected:

- branch is `claricont-prod`
- no local commits beyond `origin/claricont-prod`
- no modified or untracked files

If the server is dirty or ahead of origin, stop. Recover that work back into git first. Do not continue the deploy until the server is back to being a clean target.

## Post-Deploy Checks

```sh
systemctl is-active paperclip
curl -fsS http://127.0.0.1:3100/api/health
ssh paperclip-vps 'cd ~/paperclip && git rev-parse --short HEAD && git status --short --branch'
```

Expected:

- service state is `active`
- healthcheck returns `status: ok`
- server HEAD matches the pushed `origin/claricont-prod` commit
- repo remains clean after deploy

## Rollback

If the new deploy is bad:

1. identify the last known-good commit in `claricont-prod`
2. reset the branch in GitHub to that commit or revert the bad commit
3. run `./update-paperclip.sh` again

If data recovery is needed, restore from the most recent SQL backup in:

`/home/paperclip/.paperclip/instances/default/data/backups/`

## What Not To Do

- do not edit code directly under `/home/paperclip/paperclip` and leave it uncommitted
- do not create local commits on the server as a substitute for git branches in the fork
- do not deploy from `master`
- do not point the server back to the official repo as `origin`
