# Claricont Customizations Register

Track every Claricont-only change that sits on top of upstream Paperclip.

Update this file whenever a new local customization is added, removed, or upstreamed.

## Current Customizations

| Area | Status | Upstream Candidate | Notes |
| --- | --- | --- | --- |
| Fork-based branch model (`origin` fork, `upstream` official, `claricont-prod` deploy branch) | Active | No | Operational policy for Claricont's deployment workflow |
| Repo-owned deploy script (`scripts/deploy-server.sh`) | Active | No | Claricont-specific production deploy wrapper for the self-hosted server |
| Home-directory deploy wrapper (`/home/paperclip/update-paperclip.sh`) | Active | No | Thin wrapper that delegates to the repo-owned deploy script |
| `Knowledge` company-memory customization | Active (local integration) | Yes | Shared knowledge library plus issue attachment flow; see `doc/operations/knowledge-customization.md` |

## How To Use This Register

For each customization record:

- what changed
- whether it is still active
- whether it should eventually be proposed upstream
- where future merge conflicts are most likely
