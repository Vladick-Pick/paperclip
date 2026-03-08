# Agent-Managed Knowledge Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable agents to manage company knowledge through the existing Paperclip API and injected skills, with collaborative editing, restricted deletion, and authorship tracking.

**Architecture:** Extend the Knowledge server model with update authorship and delete permissions, then expose the workflow to agents through a dedicated `paperclip-knowledge` skill and API reference updates. Reuse the existing Paperclip API + injected auth-token pattern instead of building a new adapter-side tool transport.

**Tech Stack:** TypeScript, Express, Drizzle ORM, Vitest, Markdown skills, local Paperclip dev runtime

---

### Task 1: Add failing tests for knowledge authorship and delete permissions

**Files:**
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/server/src/__tests__/knowledge-routes.test.ts`
- Test: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/server/src/__tests__/knowledge-routes.test.ts`

**Step 1: Write the failing tests**

Add tests covering:
- agent updates another agent's knowledge item and `updatedByAgentId` changes
- non-creator non-CEO agent cannot delete another agent's item
- creator can delete own item
- CEO can delete another agent's item

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run server/src/__tests__/knowledge-routes.test.ts`
Expected: FAIL on missing authorship fields and missing delete restriction.

**Step 3: Write minimal implementation**

Do not implement yet beyond what is necessary to make those tests target real missing behavior.

**Step 4: Run test to verify failure is precise**

Run: `pnpm vitest run server/src/__tests__/knowledge-routes.test.ts`
Expected: FAIL only on the new knowledge permission / authorship assertions.

**Step 5: Commit**

```bash
git add server/src/__tests__/knowledge-routes.test.ts
git commit -m "test: cover agent-managed knowledge permissions"
```

### Task 2: Extend the knowledge data contract with update authorship fields

**Files:**
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/packages/db/src/schema/knowledge_items.ts`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/packages/db/src/schema/index.ts`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/packages/shared/src/types/knowledge.ts`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/packages/shared/src/types/index.ts`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/packages/shared/src/index.ts`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/packages/shared/src/validators/knowledge.ts`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/packages/shared/src/validators/index.ts`
- Create: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/packages/db/src/migrations/0025_agent_managed_knowledge.sql`

**Step 1: Write the migration and schema changes**

Add nullable columns:
- `updated_by_agent_id`
- `updated_by_user_id`

Set create-time logic to mirror creator identity into updated-by fields.

**Step 2: Run schema / type test surface**

Run: `pnpm vitest run server/src/__tests__/knowledge-routes.test.ts`
Expected: still failing on service / route behavior, but schema compiles.

**Step 3: Update shared contracts**

Expose the new fields in the shared knowledge payload types so UI, tests, and skills can rely on them.

**Step 4: Run typecheck**

Run: `pnpm -r typecheck`
Expected: type errors identify all server and UI call sites that must be updated.

**Step 5: Commit**

```bash
git add packages/db/src/schema/knowledge_items.ts packages/db/src/schema/index.ts packages/shared/src/types/knowledge.ts packages/shared/src/types/index.ts packages/shared/src/index.ts packages/shared/src/validators/knowledge.ts packages/shared/src/validators/index.ts packages/db/src/migrations/0025_agent_managed_knowledge.sql
git commit -m "feat: track knowledge update authorship"
```

### Task 3: Implement actor-aware knowledge update and restricted delete

**Files:**
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/server/src/services/knowledge.ts`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/server/src/routes/knowledge.ts`
- Test: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/server/src/__tests__/knowledge-routes.test.ts`

**Step 1: Implement update authorship in the service**

Change `update()` to accept actor identity and write:
- `updatedByAgentId`
- `updatedByUserId`
- `updatedAt`

Preserve `createdBy*`.

**Step 2: Implement delete permission checks**

In route or service, enforce:
- creator can delete
- CEO can delete
- board/admin can delete
- other agents cannot delete foreign items

**Step 3: Run focused tests**

Run: `pnpm vitest run server/src/__tests__/knowledge-routes.test.ts`
Expected: PASS.

**Step 4: Add any missing edge-case test**

If a company-boundary or actor-type edge case appears during implementation, add the smallest failing test first, then patch the implementation.

**Step 5: Commit**

```bash
git add server/src/services/knowledge.ts server/src/routes/knowledge.ts server/src/__tests__/knowledge-routes.test.ts
git commit -m "feat: add agent-managed knowledge permissions"
```

### Task 4: Add the agent-facing `paperclip-knowledge` skill and update Paperclip guidance

**Files:**
- Create: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/skills/paperclip-knowledge/SKILL.md`
- Create: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/skills/paperclip-knowledge/references/api-reference.md`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/skills/paperclip/SKILL.md`
- Modify: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/skills/paperclip/references/api-reference.md`

**Step 1: Write the new skill**

Document:
- when to publish to Knowledge
- list/get before create/update
- attach after durable output creation
- delete restrictions

Include exact `curl` examples for:
- list company knowledge
- get item
- create item
- update item
- delete item
- list issue-attached knowledge
- attach to issue
- detach from issue

**Step 2: Update the main Paperclip skill**

Add one concise rule telling agents to use `paperclip-knowledge` when a run produces durable organizational knowledge.

**Step 3: Update the API reference**

Add a Knowledge section to the shared Paperclip API reference so the agent has endpoint shapes close to issue workflows.

**Step 4: Verify the skill is discoverable**

Run: `find skills -maxdepth 2 -name 'SKILL.md' | sort`
Expected: includes `skills/paperclip-knowledge/SKILL.md`.

**Step 5: Commit**

```bash
git add skills/paperclip-knowledge/SKILL.md skills/paperclip-knowledge/references/api-reference.md skills/paperclip/SKILL.md skills/paperclip/references/api-reference.md
git commit -m "feat: add paperclip knowledge skill"
```

### Task 5: Verify end-to-end agent behavior against the local dev instance

**Files:**
- Modify if needed: `/Users/vladislavbogdan/.config/superpowers/worktrees/paperclip/issue-knowledge-mvp/doc/plans/2026-03-07-agent-managed-knowledge-tools-verification.md`

**Step 1: Start or confirm local dev runtime**

Run: `pnpm dev`
Expected: local UI and API available on `http://127.0.0.1:3100`.

**Step 2: Create or reuse a local agent / issue scenario**

Use an issue that instructs the agent to produce a durable artifact and save it to Knowledge.

**Step 3: Execute the agent workflow**

Verify the agent can:
- read its current issue context
- use the knowledge endpoints with injected auth
- create or update a knowledge item
- attach it to the issue

**Step 4: Validate results through API and UI**

Run API checks with `curl` and inspect the UI:
- the knowledge item exists
- authorship fields are populated
- the item is attached to the issue
- the next run can read it from issue context

**Step 5: Record verification notes**

Document exactly what was tested, the issue used, and the observed API/UI state.

**Step 6: Commit**

```bash
git add doc/plans/2026-03-07-agent-managed-knowledge-tools-verification.md
git commit -m "docs: record agent-managed knowledge verification"
```

### Task 6: Full verification before handoff

**Files:**
- No new files required unless fixes are needed

**Step 1: Run targeted server tests**

Run: `pnpm vitest run server/src/__tests__/knowledge-routes.test.ts server/src/__tests__/heartbeat-knowledge-context.test.ts server/src/__tests__/knowledge-payload.test.ts`
Expected: PASS.

**Step 2: Run full typecheck**

Run: `pnpm -r typecheck`
Expected: PASS.

**Step 3: Run project build**

Run: `pnpm build`
Expected: PASS.

**Step 4: Run broader test suite if touched behavior expands**

Run: `pnpm test:run`
Expected: PASS, or document unrelated failures precisely.

**Step 5: Prepare summary for merge / next review**

Summarize:
- schema changes
- server auth / permission changes
- new skill surface
- local agent verification result
