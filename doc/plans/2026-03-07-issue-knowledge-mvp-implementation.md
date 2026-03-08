# Issue-First Shared Knowledge MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add company-scoped reusable knowledge items that can be attached to issues and injected into issue execution context.

**Architecture:** Introduce `knowledge_items` and `issue_knowledge_items` as company-scoped database entities, expose them through new CRUD and attachment routes, and enrich issue run context with attached knowledge. Reuse existing `assets` rather than adding a second file storage layer.

**Tech Stack:** Drizzle schema/migrations, Express routes/services, Zod validators, React + TanStack Query UI, Vitest

---

### Task 1: Add database entities and shared contracts

**Files:**
- Create: `packages/db/src/schema/knowledge_items.ts`
- Create: `packages/db/src/schema/issue_knowledge_items.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `packages/shared/src/types/knowledge.ts`
- Modify: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/validators/knowledge.ts`
- Modify: `packages/shared/src/validators/index.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/types/issue.ts`

**Step 1: Write failing shared/db tests if needed or add route/service tests that require missing types**

**Step 2: Define schema and exported shared types**

Include:
- `KnowledgeItem`
- `IssueKnowledgeAttachment`
- create/update/attach payload schemas

**Step 3: Generate migration**

Run: `pnpm db:generate`
Expected: new migration files created

**Step 4: Typecheck shared/db surface**

Run: `pnpm -r typecheck`
Expected: passes

**Step 5: Commit**

```bash
git add packages/db packages/shared
git commit -m "feat: add knowledge item schema and contracts"
```

### Task 2: Add backend services and API routes

**Files:**
- Create: `server/src/services/knowledge.ts`
- Modify: `server/src/services/index.ts`
- Modify: `server/src/services/issues.ts`
- Create or Modify: `server/src/routes/knowledge.ts`
- Modify: `server/src/routes/issues.ts`
- Modify: `server/src/app.ts`
- Create tests under `server/src/__tests__/knowledge-*.test.ts`

**Step 1: Write failing backend tests**

Cover:
- create/list note knowledge items
- create/list url knowledge items
- attach knowledge item to issue
- reject cross-company attach
- prevent duplicate attach to same issue

**Step 2: Implement services and routes minimally to satisfy tests**

**Step 3: Run targeted tests**

Run: `pnpm test:run -- --runInBand server/src/__tests__/knowledge-routes.test.ts`
Expected: targeted tests pass

**Step 4: Commit**

```bash
git add server/src
git commit -m "feat: add issue knowledge APIs"
```

### Task 3: Inject attached knowledge into issue execution context

**Files:**
- Modify: `server/src/services/heartbeat.ts`
- Possibly create: `server/src/services/knowledge-context.ts`
- Add tests in `server/src/__tests__/heartbeat-knowledge-context.test.ts`

**Step 1: Write failing runtime-context test**

Verify that an issue-backed run gets attached knowledge in `contextSnapshot`.

**Step 2: Implement minimal knowledge context hydration**

Add `paperclipKnowledgeItems` to runtime context for issue runs.

**Step 3: Run targeted tests**

Run: `pnpm test:run -- --runInBand server/src/__tests__/heartbeat-knowledge-context.test.ts`
Expected: pass

**Step 4: Commit**

```bash
git add server/src/services/heartbeat.ts server/src/__tests__
git commit -m "feat: inject issue knowledge into run context"
```

### Task 4: Add minimal UI for knowledge list/create and issue attachment

**Files:**
- Create: `ui/src/api/knowledge.ts`
- Modify: `ui/src/lib/queryKeys.ts`
- Create: `ui/src/pages/Knowledge.tsx`
- Modify: `ui/src/App.tsx`
- Modify: `ui/src/components/Sidebar.tsx`
- Modify: `ui/src/pages/IssueDetail.tsx`
- Possibly create lightweight UI helpers/components for knowledge forms

**Step 1: Write minimal UI-facing tests if practical, otherwise implement with small surface area**

**Step 2: Add company Knowledge page**

Support:
- list knowledge items
- create note
- create url item

**Step 3: Add issue Knowledge block**

Support:
- list attached knowledge
- attach existing item
- create note and attach
- detach

**Step 4: Run typecheck/build**

Run:
```bash
pnpm -r typecheck
pnpm build
```
Expected: pass

**Step 5: Commit**

```bash
git add ui/src
git commit -m "feat: add issue knowledge UI"
```

### Task 5: Full verification and documentation sync

**Files:**
- Modify docs if behavior or operator workflow needs explanation

**Step 1: Run full verification**

Run:
```bash
pnpm test:run
pnpm -r typecheck
pnpm build
```
Expected: all pass

**Step 2: Push feature branch**

```bash
git push -u origin codex/issue-knowledge-mvp
```

**Step 3: Summarize user-visible behavior and known limitations**

Explicitly call out:
- issue-only scope
- no direct workspace-file references yet
- no project/agent attach yet
