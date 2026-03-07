# Upstream Sync Runbook

Use this runbook when new changes land in the public `paperclipai/paperclip` repository and Claricont wants to adopt them.

## Goals

- keep `master` as a clean upstream mirror
- review upstream changes before they reach production
- keep Claricont customizations on `claricont-prod`

## Step 1: Sync the Mirror Branch

```sh
git checkout master
git fetch upstream
git pull --ff-only upstream master
git push origin master
```

After this, `origin/master` should match `upstream/master`.

## Step 2: Integrate Into Claricont

Create a short-lived integration branch from production:

```sh
git checkout claricont-prod
git pull --ff-only origin claricont-prod
git checkout -b codex/upstream-sync-YYYYMMDD
git merge master
```

If there are conflicts, resolve them here. Do not resolve them directly on `claricont-prod`.

## Step 3: Verify

Run the project checks:

```sh
pnpm test:run
pnpm -r typecheck
pnpm build
```

If the change touches deploy logic, also validate:

```sh
bash -n scripts/deploy-server.sh
```

## Step 4: Land The Update

If verification passes:

```sh
git checkout claricont-prod
git merge --ff-only codex/upstream-sync-YYYYMMDD
git push origin claricont-prod
```

Then deploy from `claricont-prod`.

## When To Open An Upstream PR Instead

If Claricont had to patch something while integrating upstream, ask:

- is the fix generally useful for Paperclip?
- can it be extracted cleanly from Claricont-only operational code?

If yes, prepare a separate branch from `master` and open a PR upstream.
