# Knowledge Library Tightening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add top breathing room to the Knowledge page and remove note body preview from knowledge library cards.

**Architecture:** Introduce one small pure helper for library-card content rules, test it first, then wire it into the Knowledge page and adjust spacing classes only where needed.

**Tech Stack:** React, TypeScript, Vitest, Tailwind utility classes.

---

### Task 1: Add library-card content helper

**Files:**
- Create: `ui/src/lib/knowledge-library.ts`
- Test: `ui/src/lib/knowledge-library.test.ts`

**Step 1:** Write a failing test proving note items return no library body preview while URL and asset items keep their reference text.

**Step 2:** Run `pnpm test:run ui/src/lib/knowledge-library.test.ts` and confirm it fails because the helper does not exist yet.

**Step 3:** Implement the minimal helper.

**Step 4:** Re-run the targeted test and confirm it passes.

### Task 2: Update Knowledge page spacing and card rendering

**Files:**
- Modify: `ui/src/pages/Knowledge.tsx`

**Step 1:** Replace note preview rendering with the new helper.

**Step 2:** Add top padding under the page title/divider and increase the gap between the library header and the first card.

**Step 3:** Keep left create column structure intact.

### Task 3: Verify

**Files:**
- Verify: `ui/src/pages/Knowledge.tsx`
- Verify: `ui/src/lib/knowledge-library.ts`
- Verify: `ui/src/lib/knowledge-library.test.ts`

**Step 1:** Run `pnpm test:run ui/src/lib/knowledge-library.test.ts ui/src/lib/knowledge-preview.test.ts`.

**Step 2:** Run `pnpm -r typecheck`.

**Step 3:** Run `pnpm build`.

**Step 4:** Open the local UI and confirm:
- top spacing is less cramped
- note cards no longer render body text
- URL/asset cards still show their reference text
