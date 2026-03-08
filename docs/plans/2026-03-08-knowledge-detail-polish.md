# Knowledge Detail Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the Knowledge detail/edit flow by improving header spacing, fixing modal containment, and exposing basic authorship metadata without adding revision history.

**Architecture:** Keep the existing Knowledge routes and data model. Add a small UI metadata helper for actor labels, wire existing agent/session data into the detail page, and make narrow class-level fixes to the detail page and editor dialog.

**Tech Stack:** React, TanStack Query, TypeScript, Vitest, shadcn/ui, Tailwind CSS

---

### Task 1: Add failing tests for authorship label resolution

**Files:**
- Create: `ui/src/lib/knowledge-metadata.test.ts`
- Create: `ui/src/lib/knowledge-metadata.ts`

**Step 1: Write the failing test**
- Cover agent label resolution.
- Cover board/current-user/unknown fallbacks.
- Cover detail metadata row generation for `Created by` and `Last updated by`.

**Step 2: Run test to verify it fails**
Run: `pnpm vitest run ui/src/lib/knowledge-metadata.test.ts`
Expected: FAIL because helper module does not exist yet.

**Step 3: Write minimal implementation**
- Implement a small helper that accepts agent list, current user id, and knowledge item authorship fields.
- Return display labels for detail metadata.

**Step 4: Run test to verify it passes**
Run: `pnpm vitest run ui/src/lib/knowledge-metadata.test.ts`
Expected: PASS.

### Task 2: Wire authorship metadata into Knowledge detail

**Files:**
- Modify: `ui/src/pages/KnowledgeDetail.tsx`
- Use: `ui/src/api/agents.ts`
- Use: `ui/src/api/auth.ts`
- Use: `ui/src/lib/queryKeys.ts`
- Use: `ui/src/lib/knowledge-metadata.ts`

**Step 1: Write the failing test**
- Reuse the helper-level tests from Task 1 as the enforced behavior.
- No extra page render test is required for this narrow pass.

**Step 2: Write minimal implementation**
- Load company agents and auth session in `KnowledgeDetail`.
- Resolve `Created by` and `Last updated by` labels through the helper.
- Render the two new metadata rows in the Details card.

**Step 3: Run targeted tests**
Run: `pnpm vitest run ui/src/lib/knowledge-metadata.test.ts`
Expected: PASS.

### Task 3: Polish detail page spacing and modal containment

**Files:**
- Modify: `ui/src/pages/KnowledgeDetail.tsx`
- Modify: `ui/src/components/KnowledgeEditorDialog.tsx`

**Step 1: Make the smallest layout changes**
- Increase top/header spacing in the detail page.
- Add safe width and wrapping classes in the editor dialog.
- Keep existing layout structure and controls.

**Step 2: Run typecheck and build**
Run: `pnpm -r typecheck && pnpm build`
Expected: PASS.

**Step 3: Manual verification in local preview**
- Open `http://127.0.0.1:3100/KNO/knowledge`
- Open a knowledge item detail page
- Confirm the title block no longer feels pinned to the top edge
- Open the edit dialog and confirm long content stays visually contained
- Confirm `Created by` and `Last updated by` appear in the Details card

### Task 4: Final verification

**Files:**
- No new files

**Step 1: Run focused tests**
Run: `pnpm vitest run ui/src/lib/knowledge-metadata.test.ts ui/src/components/KnowledgeLibraryCard.test.tsx ui/src/components/IssueKnowledgeCompactRow.test.tsx`
Expected: PASS.

**Step 2: Run full verification**
Run: `pnpm test:run && pnpm -r typecheck && pnpm build`
Expected: PASS.

**Step 3: Document remaining gaps in final handoff**
Call out that these are still not implemented:
- revision history UI/model
- manager-chain delete rule
