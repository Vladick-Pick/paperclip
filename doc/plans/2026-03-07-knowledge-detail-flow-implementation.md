# Knowledge Detail Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a readable knowledge detail page, UI edit/delete actions, and overflow-safe previews for large knowledge notes.

**Architecture:** Keep the library and issue panel as compact summary surfaces, introduce a dedicated knowledge detail route for long-form reading, and wire edit/delete through the existing knowledge APIs. Extract preview formatting into a helper so truncation and wrapping behavior is testable without brittle browser tests.

**Tech Stack:** React, TanStack Query, existing Paperclip UI primitives, Vitest, Express routes already in place

---

### Task 1: Cover the new behavior with failing tests

**Files:**
- Modify: `server/src/__tests__/knowledge-routes.test.ts`
- Create: `ui/src/lib/knowledge-preview.test.ts`
- Create: `ui/src/lib/knowledge-preview.ts`

**Step 1: Write failing route tests**

Cover:
- `PATCH /knowledge-items/:id` returns updated fields
- `DELETE /knowledge-items/:id` returns `{ ok: true }`
- deleted items are absent from subsequent list responses in the stubbed app

**Step 2: Run targeted server test to verify failure**

Run: `pnpm test:run server/src/__tests__/knowledge-routes.test.ts`
Expected: failing assertions for unimplemented coverage

**Step 3: Write failing preview-helper tests**

Cover:
- long unbroken strings remain unchanged in data but helper returns clamped preview length
- multiline body preview preserves line breaks
- empty body produces null preview

**Step 4: Run targeted UI test to verify failure**

Run: `pnpm --filter @paperclipai/ui test:run ui/src/lib/knowledge-preview.test.ts`
Expected: fail because helper does not exist yet

### Task 2: Add shared UI helper and route normalization support

**Files:**
- Create: `ui/src/lib/knowledge-preview.ts`
- Modify: `ui/src/lib/company-routes.ts`
- Modify: `ui/src/lib/queryKeys.ts`

**Step 1: Implement the minimal preview helper**

The helper should:
- return null for empty note bodies
- trim excess surrounding whitespace
- clamp preview length to a bounded amount
- avoid layout assumptions; actual wrapping will be done with CSS classes

**Step 2: Add `knowledge` to board-route normalization**

**Step 3: Add or confirm `queryKeys.knowledge.detail` support**

**Step 4: Run targeted tests**

Run:
```bash
pnpm test:run server/src/__tests__/knowledge-routes.test.ts
pnpm --filter @paperclipai/ui test:run ui/src/lib/knowledge-preview.test.ts
```
Expected: preview helper tests pass; route tests still pending if UI-only work was done first

### Task 3: Build the knowledge detail page and card actions

**Files:**
- Create: `ui/src/pages/KnowledgeDetail.tsx`
- Modify: `ui/src/pages/Knowledge.tsx`
- Modify: `ui/src/App.tsx`
- Modify: `ui/src/api/knowledge.ts` only if client helpers need shape adjustments

**Step 1: Add a new detail route**

Route:
- `knowledge/:knowledgeItemId`

**Step 2: Build the detail page**

Include:
- breadcrumb back to library
- title, kind badge, timestamps
- summary
- full content block
- action row

**Step 3: Update library cards**

Add:
- `Open`
- `Edit`
- `Delete`
- overflow-safe preview classes such as `break-words` and `overflow-hidden`

**Step 4: Keep the visual language aligned with existing Paperclip cards and dialogs**

### Task 4: Add edit and delete dialogs

**Files:**
- Modify: `ui/src/pages/Knowledge.tsx`
- Modify: `ui/src/pages/KnowledgeDetail.tsx`
- Reuse: `ui/src/components/ui/dialog.tsx`, `button.tsx`, `input.tsx`, `textarea.tsx`

**Step 1: Add edit dialog**

Support:
- note title/summary/body
- url title/summary/sourceUrl
- read-only handling or no edit affordance for asset-backed items in this pass

**Step 2: Add delete confirmation dialog**

Behavior:
- invalidate library/detail/issue knowledge queries as needed
- redirect from detail page back to library after successful delete

**Step 3: Run typecheck/build**

Run:
```bash
pnpm -r typecheck
pnpm build
```
Expected: pass

### Task 5: Verify end-to-end manually and with full suite

**Files:**
- No new files required

**Step 1: Run full verification**

Run:
```bash
pnpm test:run
pnpm -r typecheck
pnpm build
```
Expected: all pass

**Step 2: Manual browser verification**

Check:
- long unbroken text wraps inside the library card
- `Open` shows the detail page
- edit updates the item in both detail and library
- delete removes the item and redirects correctly
- issue panel still renders compact attached knowledge

**Step 3: Commit**

```bash
git add ui/src server/src doc/plans
git commit -m "feat: add knowledge detail flow"
```
