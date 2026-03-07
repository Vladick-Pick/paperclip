# Issue-First Shared Knowledge MVP Design

## Goal

Add a reusable, company-scoped knowledge registry that can be attached to issues and injected into issue execution context, without introducing a second document storage system.

## Existing Primitives

Paperclip already has:

- `assets` for uploaded files
- `issue_attachments` for files attached directly to issues/comments
- `project_workspaces` for filesystem and repo hints
- `company_secrets` for machine secrets

The missing capability is not file storage. It is reusable organizational memory that can be attached to future work.

## Product Shape

The first release is issue-first.

Users can:

1. create company-scoped knowledge items
2. attach them to issues
3. inspect attached knowledge in the issue UI
4. have the attached knowledge injected into the agent runtime context for issue runs

## Knowledge Item Model

A knowledge item is a reusable reference, not necessarily a new file.

Kinds:

- `note`: markdown/plain text stored in the database
- `asset`: reference to an existing uploaded asset
- `url`: external link with title/summary

This keeps the model close to existing primitives and avoids inventing a second storage layer.

## Deliberate Exclusion: Workspace Files

The MVP does not attach arbitrary workspace paths directly.

Reason:

- workspaces may be local to a specific agent machine
- paths are not guaranteed to be readable by the server
- path-based references are fragile and hard to validate cross-agent

If a workspace artifact should become shared knowledge, it must first become an `asset` or be copied into a `note`.

## Data Model

### `knowledge_items`

Company-scoped reusable knowledge.

Core fields:

- `id`
- `companyId`
- `title`
- `kind`
- `summary`
- `body`
- `assetId`
- `sourceUrl`
- `createdByAgentId`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Field rules:

- `note` requires `body`
- `asset` requires `assetId`
- `url` requires `sourceUrl`

### `issue_knowledge_items`

Join table mapping issues to knowledge items.

Core fields:

- `id`
- `companyId`
- `issueId`
- `knowledgeItemId`
- `sortOrder`
- `createdByAgentId`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Constraint:

- unique `(issueId, knowledgeItemId)`

## API Surface

### Company knowledge registry

- `GET /companies/:companyId/knowledge-items`
- `POST /companies/:companyId/knowledge-items`
- `GET /knowledge-items/:id`
- `PATCH /knowledge-items/:id`
- `DELETE /knowledge-items/:id`

### Issue attachment operations

- `GET /issues/:id/knowledge-items`
- `POST /issues/:id/knowledge-items`
- `DELETE /issues/:id/knowledge-items/:knowledgeItemId`

## Runtime Injection

When an issue-backed run starts, the resolved issue knowledge should be added to `contextSnapshot` before adapter execution.

Proposed shape:

- `context.paperclipKnowledgeItems`

Each entry should include:

- `id`
- `title`
- `kind`
- `summary`
- `body` for notes
- `sourceUrl` for urls
- asset metadata for asset-backed entries
- `contentText` only for text-like assets that can be safely inlined

The MVP should avoid aggressive document parsing. Only inline text for obviously text-readable asset types such as markdown, plain text, json, and html.

## UI Shape

### Company page: Knowledge

Add a lightweight company page to browse and create knowledge items.

MVP actions:

- create note
- create url item
- create asset-backed item from an existing asset id later if needed

To keep the first UI small, asset-backed knowledge can initially be supported by API and created later in UI if needed.

### Issue detail page: Knowledge block

Add a `Knowledge` block to issue detail.

MVP actions:

- list attached knowledge items
- attach an existing knowledge item
- create a new note and attach it immediately
- detach from issue

## Security / Invariants

- all knowledge items are company-scoped
- cross-company knowledge attachment must be rejected
- secrets remain separate and are not embedded into knowledge items
- deleting a knowledge item should also remove issue links to it
- deleting an issue should cascade the join rows but not the underlying knowledge item

## Non-Goals

- project-level knowledge
n- agent-level knowledge
- workspace path references
- search / embeddings / RAG
- tags / folders / permissions matrix
- rich text editor
- automatic promotion from attachment to knowledge item

## Success Criteria

The MVP is successful when:

- company knowledge items can be created and listed
- issue knowledge attachments can be added and removed
- issue runs receive attached knowledge in execution context
- company boundaries are enforced end to end
