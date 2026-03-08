# Knowledge UX Refinement Design

## Problem

The first pass of Knowledge MVP works functionally, but it does not fit Paperclip's existing interaction model or card anatomy.

Current problems:
- Knowledge library cards do not match spacing and footer patterns used elsewhere in the UI.
- Knowledge detail page wraps content safely, but typography and panel density still feel improvised.
- Issue detail uses an inline select plus a "Quick issue note" form that does not scale when the company has many knowledge items.
- New issue creation has an `Image` attachment entrypoint, but no equivalent knowledge attach flow.

## Goals

- Align knowledge cards and detail view with existing Paperclip panel/card patterns.
- Replace inline issue knowledge attach controls with a searchable picker dialog.
- Add a knowledge attach entrypoint to `NewIssueDialog` next to the existing image attachment chip.
- Preserve the current company knowledge model and issue attachment model.
- Keep note creation in the company library, not inline on the issue surface.

## Non-goals

- No new backend entity types.
- No workspace-file import flow.
- No inline creation of company knowledge from issue detail or new issue.
- No agent-side self-service tools in this change.

## Recommended approach

### 1. Normalize Knowledge cards to Paperclip card anatomy

Use the shared `Card`, `CardHeader`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter` primitives consistently.

Rules:
- header contains title, kind badge, summary, action icons
- content contains preview or URL/asset body
- footer contains updated timestamp and primary `Open` action
- previews stay compact and truncated
- long unbroken strings always wrap without stretching layout

### 2. Introduce a reusable searchable knowledge picker dialog

Add a reusable `KnowledgeAttachDialog` component.

Behavior:
- fetches from existing company knowledge query data passed in by parent
- filters via search input
- supports multi-select before confirmation
- excludes knowledge already attached to the current issue when used from issue detail
- returns selected knowledge IDs on confirm

This dialog becomes the single attach primitive used in both issue detail and new issue creation.

### 3. Simplify issue detail knowledge section

Issue detail should show:
- attached knowledge cards
- attached count
- one `Attach note` button opening the picker dialog

Remove the inline select and remove `Quick issue note` from issue detail.

Rationale:
- attach to issue should scale to large libraries
- note creation belongs in the company knowledge library
- the issue surface should stay focused on selecting context, not authoring reusable knowledge

### 4. Add pre-attach flow in `NewIssueDialog`

Add a `Knowledge` chip beside `Image` in the property bar.

Behavior:
- opening the chip launches the same searchable picker dialog
- selections are stored locally in dialog state before issue creation
- selected items are rendered as compact removable pills below the property bar
- after issue creation succeeds, the UI attaches the selected knowledge items to the created issue
- if issue creation succeeds but one or more attach requests fail, show a warning toast and keep issue creation successful

This keeps server scope minimal while giving the expected UX.

## Agent behavior clarification

This change does not add new agent tools.

After the previous MVP, attached knowledge is already injected into run context, so agents can use attached knowledge during execution.

What agents do not have yet:
- a first-class tool to create company knowledge items
- a first-class tool to attach existing knowledge items to issues

Those would require a follow-up tool/API integration change.

## Verification

- Unit tests for knowledge picker filtering/selection helpers.
- Manual UI verification for:
  - knowledge library card spacing
  - detail page layout
  - attach dialog search and attach from issue detail
  - attach dialog in new issue flow
  - selected draft pills and removal
  - post-create attach success path
