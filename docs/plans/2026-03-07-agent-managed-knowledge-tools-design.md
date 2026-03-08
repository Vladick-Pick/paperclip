# Agent-Managed Knowledge Tools Design

## Goal

Enable Paperclip agents to treat Knowledge as a first-class company memory surface: agents should be able to discover, read, create, update, attach, detach, and selectively delete knowledge items using the same API-driven coordination model already used for issues and approvals.

## Current Context

Paperclip already has the key primitives needed for this feature:

- The adapter runtime injects `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, `PAPERCLIP_RUN_ID`, and issue/workspace context into local agent processes.
- The current agent-facing tool model is skill-driven, not a dedicated internal RPC layer. Agents use repo-provided skills that call the Paperclip API via `curl`.
- The new Knowledge MVP already provides API routes for:
  - listing company knowledge items
  - getting one knowledge item
  - creating, updating, deleting knowledge items
  - attaching and detaching knowledge items to issues
- These knowledge routes already accept authenticated agent actors through the existing auth middleware.

This means the missing layer is not transport or auth. The missing layer is agent-facing behavior: a clear skill, API reference coverage, and server-side authorship / permission rules for collaborative knowledge editing.

## Product Decision

Knowledge is company memory, not a personal notebook and not a secret store.

That leads to three product rules:

1. Durable outputs should usually end up in Knowledge.
   - audits
   - reports
   - handoff notes
   - integration notes
   - access notes
   - runbooks
   - reusable summaries
2. Most knowledge should be attached back to the issue that produced it.
3. Knowledge is collaboratively editable, but deletion is restricted.

## Recommended Permission Model

### Read
Any authenticated agent in the same company can read any knowledge item in that company.

### Create
Any authenticated agent in the same company can create a knowledge item.

### Update
Any authenticated agent in the same company can update a knowledge item.

Rationale:
- knowledge is shared organizational memory
- collaborative editing is necessary for maintenance and reuse
- strict ownership on edits would turn company memory into stale personal silos

### Delete
Delete is restricted to:
- the original creator of the knowledge item
- the CEO
- board / instance admin users

This is the recommended MVP rule because it is simple and safe. Manager-chain delete permissions can be added later if needed.

## Authorship and Auditability

The current MVP already stores `createdByAgentId` and `createdByUserId`. That is insufficient for collaborative edits.

We should extend the data model to store:

- `createdByAgentId`
- `createdByUserId`
- `updatedByAgentId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`

Rules:
- on create, set both create and update actors to the creating actor
- on update, only update `updatedBy*`
- on delete, keep auditability through existing activity log entries

A future revision table is desirable, but not required for this step.

## Agent Tooling Model

Do not add a new adapter-level RPC protocol.

Paperclip already has a working, comprehensible model:
- skills are injected into the agent environment
- skills call the Paperclip API directly with the injected auth token

The correct extension is therefore:

1. Keep Knowledge operations in the existing Paperclip API.
2. Add a dedicated skill, `paperclip-knowledge`.
3. Update the core `paperclip` skill to instruct agents when to invoke knowledge workflows.
4. Extend the Paperclip API reference to document knowledge endpoints and expected usage.

## Skill Design

### New Skill: `paperclip-knowledge`

This skill will teach agents how to:
- list company knowledge
- inspect one knowledge item
- create a knowledge item
- update an existing knowledge item
- delete an owned knowledge item when cleanup is justified
- list issue-attached knowledge
- attach knowledge to an issue
- detach knowledge from an issue

It also needs decision rules:
- before creating a new item, first list existing items
- if an item clearly already exists, fetch it and update it instead of creating a duplicate
- when a durable artifact is produced for the current issue, attach it back to that issue

### Update Existing Skill: `paperclip`

The main `paperclip` skill should stay focused on heartbeat coordination and issue work.

It should gain one short rule:
- if the run produces reusable organizational knowledge, save it through `paperclip-knowledge` and attach it to the current issue

This keeps the main skill lean and gives Knowledge its own focused workflow.

## Data Model Changes

### `knowledge_items`
Add:
- `updatedByAgentId`
- `updatedByUserId`

No change to the relationship model:
- `knowledge_items` remains the company-level source of truth
- `issue_knowledge_items` remains an attachment / linkage table only

This is important because one knowledge item should survive beyond any single issue and be attachable to many issues.

## Server Changes

### `knowledgeService`
- make update actor-aware so it records `updatedByAgentId` / `updatedByUserId`
- add a delete permission helper enforcing creator / CEO / board policy

### `knowledgeRoutes`
- pass actor info into update operations
- enforce restricted delete policy before removal
- keep existing company-bound access checks

No auth middleware changes are required because the current `req.actor` model already supports both users and agents.

## Agent Behavior Rules

Agents should follow this lifecycle when they finish meaningful work:

1. Determine whether the output is durable and reusable.
2. If yes, search Knowledge first.
3. If a matching item exists, update it.
4. Otherwise, create a new item.
5. If the work came from an issue, attach the knowledge item to that issue.
6. Mention the knowledge item in the issue comment / status update.

Examples of outputs that should usually be published:
- implementation audit
- integration notes
- runbook for an operational flow
- reusable debugging summary
- onboarding notes for a subsystem
- external API usage guidance

Examples that should usually not be published:
- scratchpad notes for the current run only
- failed experiment logs with no future value
- noisy intermediate thoughts

## Testing Strategy

### Automated

1. Route / permission tests
- agent can create knowledge
- agent can update another agent's knowledge item in the same company
- agent cannot delete another agent's knowledge item
- creator can delete own item
- CEO can delete another agent's item
- board can delete any item

2. Service tests
- create sets both create and update authorship fields
- update rewrites `updatedBy*` without mutating `createdBy*`

3. Skill/reference smoke verification
- ensure new skill files are discoverable from the injected skills directory

### Manual local verification

Use the existing local dev instance in the worktree.

Run a real local agent with the Paperclip runtime and give it a task such as:
- "Write an audit note, save it to Knowledge, attach it to this issue, then update the issue comment with the resulting knowledge item."

Verify:
- the agent can call the API using injected auth
- the item appears in Knowledge
- authorship fields are set
- the item is attached to the issue
- a later run can read and reuse that item

## Non-Goals for This Step

- revision history UI
- version diffing
- project-level or agent-level knowledge links
- automatic workspace-file ingestion
- semantic search or embeddings
- secret references inside knowledge documents

Those can follow after the agent-managed core loop is stable.
