# Claricont Open Source Workflow Documentation Design

## Goal

Document Claricont's working model for maintaining a fork of Paperclip so future chats and contributors can quickly understand:
- where production comes from
- how internal customizations are developed
- how upstream updates are integrated
- how generally useful changes are proposed back to Paperclip

## Documentation Strategy

Keep `AGENTS.md` strategic and compact.
It should describe the working model, not become a changelog.

Use a split-document approach:

1. `AGENTS.md`
- high-level operating rules
- the three working modes
- links to detailed operational docs
- links to active Claricont customizations

2. `doc/operations/*.md`
- detailed operational runbooks and customization notes
- this is where implementation-specific context should live

3. `doc/operations/customizations-register.md`
- authoritative list of Claricont-only changes sitting on top of upstream
- each entry should point to a dedicated note when the customization is large enough to deserve one

## Three Working Modes To Capture

### 1. Fork + Deploy Mode
Claricont deploys from its own fork, not from upstream directly.

Key facts:
- `origin` is Claricont's fork
- `upstream` is `paperclipai/paperclip`
- `master` stays a clean upstream mirror
- `claricont-prod` is the only production deploy branch

### 2. Internal Customization Mode
Claricont-specific product work is developed in short-lived branches from `claricont-prod`, verified locally, then merged back into `claricont-prod`.

This is the mode used for things like the `Knowledge` customization.

### 3. Upstream Contribution Mode
Changes that are generally useful to Paperclip should be extracted into a smaller, cleaner branch from `master` and proposed back to `paperclipai/paperclip` as a PR.

This mode should be described as a deliberate extraction process, not as an automatic push of Claricont production code upstream.

## Knowledge Customization Note

The current `Knowledge` work should not be described in detail inside `AGENTS.md`.
Instead, add a dedicated operations note that explains:
- what the customization is
- what behaviors it introduces
- what is implemented now
- what remains intentionally deferred

`AGENTS.md` should only mention it briefly and link to the note.

## Constraints

- do not duplicate entire runbooks inside `AGENTS.md`
- do not present worktree-only experiments as production unless explicitly marked
- make the workflow readable in a fresh chat with minimal repository context
