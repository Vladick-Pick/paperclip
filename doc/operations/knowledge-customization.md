# Knowledge Customization

This document tracks Claricont's `Knowledge` customization on top of upstream Paperclip.

Status:

- active in Claricont's local customization workflow
- validated in the current worktree and local preview
- not automatically treated as production until merged into `claricont-prod`

## Purpose

`Knowledge` is Claricont's shared company-memory layer.

It is meant for durable context that should survive beyond a single issue run, for example:

- reports
- audits
- runbooks
- integration notes
- access notes
- reusable research summaries

It is intentionally different from:

- `company secrets`: machine secrets such as tokens and API keys
- issue attachments: file attachments scoped to an issue
- workspace files: agent-local artifacts that are not yet promoted into shared company memory

## Current Behavior

The current customization adds a company-level `Knowledge` surface and issue-level knowledge attachment flow.

Users can currently:

- create knowledge items
- read knowledge items
- update knowledge items
- delete knowledge items
- attach knowledge items to an issue
- detach knowledge items from an issue

Agents can currently:

- read attached knowledge through issue runtime context
- create and update knowledge through the `paperclip-knowledge` skill and API workflow
- attach and detach knowledge items to issues

## Data Model

The customization introduces a reusable company-scoped knowledge item model instead of treating every document as an issue-only artifact.

Current forms:

- `note`
- `url`
- `asset`

Issue attachment remains a separate relationship so one knowledge item can be reused across many issues.

## Authorship

The current implementation tracks:

- `createdByAgentId`
- `createdByUserId`
- `updatedByAgentId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`

The current detail UI shows:

- creator label
- last editor label
- creation time
- last update time

## Access Model

Current implemented behavior:

- `read`: any actor in the same company
- `create`: any actor in the same company
- `update`: any actor in the same company
- `delete`: creator, CEO, or board actor

Planned but not yet implemented:

- delete permission through the author's manager chain

## Agent Workflow

The intended operating model is:

- durable outputs should usually be published into `Knowledge`
- if the output is relevant to the current task, it should also be attached to the issue
- future issue runs then receive attached knowledge in runtime context

This lets Claricont treat knowledge as company memory instead of ephemeral task output.

## Deferred Work

These items are intentionally not complete yet:

- revision history UI
- full document version graph
- manager-chain delete authorization
- broader project-level or agent-level knowledge linking

## Related Docs

- `AGENTS.md`
- `doc/operations/fork-workflow.md`
- `doc/operations/upstream-sync-runbook.md`
- `doc/operations/customizations-register.md`
- `docs/plans/2026-03-07-agent-managed-knowledge-tools-design.md`
