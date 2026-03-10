# Claricont Fork Workflow

This repository serves two purposes at once:

1. track upstream Paperclip cleanly
2. carry Claricont-specific operational changes without losing them on update

Use this workflow exactly.

## Remotes

- `origin`: `https://github.com/Vladick-Pick/paperclip.git`
- `upstream`: `https://github.com/paperclipai/paperclip.git`

`origin` is Claricont's operational source of truth.
`upstream` is only used to pull new open-source changes.

## Branch Roles

- `master`: mirror of `upstream/master`; do not add Claricont-only commits here
- `claricont-prod`: Claricont's stable deployment branch
- `codex/*`: short-lived implementation and ops branches

## Practical Model

There are three separate places in this workflow:

1. open source (`upstream/master`)
2. Claricont's integrated version (`claricont-prod`)
3. the production server

Always move changes through them in that order.

- Open-source updates: `upstream/master -> master -> codex/upstream-sync-* -> claricont-prod -> server`
- Claricont-only work: `claricont-prod -> codex/* -> claricont-prod -> server`
- Upstream contribution work: `master -> codex/* -> upstream PR`

The production server is never the source of truth. It only runs a version that already exists in GitHub.

## Rules

1. Do not ship from `master`.
2. Do not commit Claricont-only changes to `master`.
3. Do not make production code changes directly on the server.
4. Do not merge upstream changes directly on the server.
5. Deploy only from `claricont-prod`.
6. Start internal changes from `claricont-prod`.
7. Start upstream candidate changes from `master`.
8. Do not allow server-only drift. The server repo must stay clean and must not get ahead of `origin/claricont-prod`.
9. If server-only drift is discovered, recover it back into git before the next deploy.
10. Keep authenticated production secrets persistent outside the repo so the service can restart cleanly.

## Internal Change Flow

Use this when the work is only for Claricont.

```sh
git checkout claricont-prod
git pull --ff-only origin claricont-prod
git checkout -b codex/<topic>
```

After implementation and verification:

```sh
git checkout claricont-prod
git merge --ff-only codex/<topic>
git push origin claricont-prod
```

Then deploy `claricont-prod` to the server.

## Upstream Candidate Flow

Use this when the change should stay small and potentially go to the public Paperclip repo.

```sh
git checkout master
git fetch upstream
git pull --ff-only upstream master
git checkout -b codex/<topic>
```

Open the PR from `codex/<topic>` to `paperclipai/paperclip:master`.

If Claricont needs the change before upstream merges it, bring it into `claricont-prod` with a normal merge or a cherry-pick after local verification.

## Branch Protection

Enable branch protection in GitHub for:

- `master`
- `claricont-prod`

Recommended minimum settings:

- block force-push
- block branch deletion
- require pull request before merge
- require conversation resolution before merge

## Source Of Truth

GitHub is the source of truth.
The server is a deployment target only.
