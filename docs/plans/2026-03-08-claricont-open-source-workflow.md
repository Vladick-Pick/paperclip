# Claricont Open Source Workflow Documentation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update repository documentation so AGENTS.md explains Claricont's three working modes for operating on top of upstream Paperclip, while detailed customization notes live in separate operations docs.

**Architecture:** Keep AGENTS.md concise and strategic. Add one dedicated operations document for the current Knowledge customization and link it from both AGENTS.md and the customizations register.

**Tech Stack:** Markdown documentation

---

### Task 1: Update AGENTS.md with the three-mode workflow

**Files:**
- Modify: `AGENTS.md`

**Step 1: Add a new high-level section**
Describe Claricont's three working modes:
- Fork + Deploy Mode
- Internal Customization Mode
- Upstream Contribution Mode

**Step 2: Keep the section strategic**
- mention the branch/remotes model briefly
- link to existing runbooks for commands and detailed procedures
- add a short note pointing to the active customizations docs

### Task 2: Add a dedicated Knowledge customization document

**Files:**
- Create: `doc/operations/knowledge-customization.md`

**Step 1: Describe the customization at a product/ops level**
Include:
- what `Knowledge` is
- how it differs from secrets and issue attachments
- what agents and users can do today
- what remains deferred

**Step 2: Make the status explicit**
Mark it as an active Claricont customization under local validation / integration, not automatically as upstream or production.

### Task 3: Register the customization

**Files:**
- Modify: `doc/operations/customizations-register.md`

**Step 1: Add the Knowledge customization row**
- status
- whether it is an upstream candidate
- short note with link to the dedicated operations doc

### Task 4: Consistency pass

**Files:**
- Review: `AGENTS.md`
- Review: `doc/operations/fork-workflow.md`
- Review: `doc/operations/upstream-sync-runbook.md`
- Review: `doc/operations/customizations-register.md`
- Review: `doc/operations/knowledge-customization.md`

**Step 1: Check terminology**
Make sure the same branch names and remotes are used consistently.

**Step 2: Check scope wording**
Ensure AGENTS.md stays strategic and the customization note stays implementation-oriented.
