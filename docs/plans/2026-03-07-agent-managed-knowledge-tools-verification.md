# Agent-Managed Knowledge Tools Verification

## Scope

This document records local end-to-end verification for agent-managed Knowledge in the `codex/issue-knowledge-mvp` worktree.

Verified capabilities:
- agent can discover and use the injected `paperclip-knowledge` skill
- agent can create company knowledge and attach it to an issue
- agent can update an existing company knowledge item instead of duplicating it
- agent can delete a knowledge item it created
- server records authorship on create and update
- server attaches selected knowledge to a newly created issue before waking the assignee

## Environment

- Worktree: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp`
- Local Paperclip API/UI: `http://127.0.0.1:3100`
- Test agent:
  - id: `c875c02a-cf76-43f4-8cc5-9108bc00d35e`
  - name: `KnowledgeBot`
  - adapter: `codex_local`
- Local dev runtime launched with:

```bash
PAPERCLIP_AGENT_JWT_SECRET=paperclip-dev-jwt-secret pnpm dev
```

## Live verification 1: create and attach

### Issue
- identifier: `KNO-5`
- id: `0adddc3e-af58-41f2-ae9f-de95fd273e71`

### Run
- run id: `e567ab62-3576-4dbf-8f0a-cbc21b864da2`

### Expected behavior
The agent should list company knowledge first, create a reusable note, attach it to the issue, post an issue update, and complete the issue.

### Observed result
The agent created a new knowledge item:
- knowledge id: `d94f6dc4-fb56-467f-bf56-af7380066eb5`
- title: `Knowledge validation checklist`

It then:
- attached the knowledge item to `KNO-5`
- posted issue comments
- marked the issue `done`

### Verified fields
The knowledge item was returned with:
- `createdByAgentId = c875c02a-cf76-43f4-8cc5-9108bc00d35e`
- `updatedByAgentId = c875c02a-cf76-43f4-8cc5-9108bc00d35e`

## Live verification 2: update existing knowledge instead of duplicating

### Issue
- identifier: `KNO-6`
- id: `3521ad20-6e62-4b5e-ba2d-b1c01fed90ef`

### Run
- run id: `96dc1758-a10d-4d6a-8b8e-4411a352aba6`

### Expected behavior
The agent should find the existing `Knowledge validation checklist`, update it in place, attach that same item to the issue, post an update, and complete the issue.

### Observed result
The agent:
- listed company knowledge
- found the existing item `d94f6dc4-fb56-467f-bf56-af7380066eb5`
- updated the same record instead of creating a duplicate
- attached the same knowledge item to `KNO-6`
- posted a final issue update
- marked the issue `done`

### Verified fields
Post-update state was verified through the API:
- `id = d94f6dc4-fb56-467f-bf56-af7380066eb5`
- `updatedByAgentId = c875c02a-cf76-43f4-8cc5-9108bc00d35e`
- `updatedAt` changed after the edit
- summary/body were updated to include explicit authorship and traceability checks

## Live verification 3: delete owned knowledge

### Issue
- identifier: `KNO-7`
- id: `0c165d87-c973-4c0a-98c7-cb77008b30de`

### Run
- run id: `af1440fc-c004-464a-b412-907110c27fed`

### Expected behavior
The agent should create a temporary knowledge note, verify it exists, delete that same note, confirm the delete by API, post an issue update, and complete the issue.

### Observed result
The agent created and deleted:
- title: `Knowledge delete smoke note 1772918312`
- deleted knowledge id: `03b2af84-0e7c-4166-9d33-ae473498716b`

The final issue comment reported:
- no existing title match before creation
- temporary note created and verified
- same note deleted
- `GET /knowledge-items/{id}` returned `404` after deletion

`KNO-7` finished in status `done`.

### API evidence
Direct verification after the run:

```bash
curl -s -o /tmp/kno7_delete_check.json -w '%{http_code}' \
  http://127.0.0.1:3100/api/knowledge-items/03b2af84-0e7c-4166-9d33-ae473498716b
```

Observed result:
- HTTP status: `404`
- body: `{"error":"Knowledge item not found"}`

## Supporting fix verified during live runs

During live agent testing, Codex skill injection exposed a real runtime issue: stale broken symlinks in `~/.codex/skills` prevented some injected skills from loading reliably.

A fix was implemented in the codex-local adapter to resync and repair broken skill symlinks before execution.

Evidence from later live runs showed successful reinjection logs for:
- `paperclip`
- `paperclip-knowledge`
- other existing Codex skills

This was verified by the dedicated test:
- `server/src/__tests__/codex-local-skill-injection.test.ts`

## Route-level regression coverage

The UI originally attached selected knowledge after issue creation, which meant an auto-woken assignee could start on the issue before attachments existed.

That race is now covered by:
- `server/src/__tests__/issue-create-knowledge-routing.test.ts`

The test verifies:
- `knowledgeItemIds` are accepted on issue creation
- server-side `attachToIssue()` happens before `heartbeat.wakeup()`
- the first wake sees the issue with knowledge already attached

## Conclusion

Local live verification now covers the full agent-managed Knowledge loop:
- read/list
- create
- update existing
- attach to issue
- delete owned item
- comment + close issue

The remaining gate before merge is project-level verification on the current branch:
- targeted tests
- typecheck
- build
- optional full test suite
