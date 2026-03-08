# Knowledge Detail Polish Design

## Scope

Apply a narrow polish pass to the Knowledge detail flow without expanding the data model into full document revisions.

This change set covers:
- better header spacing and rhythm on the Knowledge detail page
- fixing the edit dialog layout so long text does not visually break the modal
- showing basic authorship metadata on the Knowledge detail page

This change set intentionally does **not** cover:
- full revision history UI
- content diffs between versions
- manager-chain delete authorization

## Current Problems

### Detail header
The Knowledge detail page header is structurally correct but visually cramped. The back link, kind badge, timestamp, title, summary, and action buttons sit too close to the top edge, which makes the page feel harsher than the rest of the Paperclip detail views.

### Edit dialog
The editor modal is functionally usable, but long content can make the dialog feel visually unstable. Inputs and text areas need safer width and wrapping behavior so the modal stays contained and readable.

### Metadata visibility
The system already stores authorship fields on knowledge items:
- `createdByAgentId`
- `createdByUserId`
- `updatedByAgentId`
- `updatedByUserId`

But the detail page only shows timestamps and IDs. Users cannot see who created or last updated a document.

## UX Direction

Stay within the existing Paperclip visual language:
- no redesign of the page shell
- no new visual primitives
- use the same spacing, muted metadata treatment, and utility card style already used across issue and detail screens

The detail page should feel calmer, not different.

## Proposed Changes

### 1. Detail header spacing
- Increase vertical separation between the back link row and the metadata/title block.
- Give the title stack slightly more breathing room.
- Keep the existing two-column action layout on desktop.
- Preserve the current cards and page shell.

### 2. Edit dialog containment
- Constrain dialog width to a stable content width.
- Ensure title, summary, and body fields use safe wrapping behavior.
- Add `min-w-0` and text wrapping classes where needed so long strings do not appear to escape the modal.
- Keep the form structure unchanged.

### 3. Detail metadata additions
Add these rows to the right-side Details card:
- `Created by`
- `Last updated by`

Resolution rules:
- if `createdByAgentId` / `updatedByAgentId` matches a loaded agent, show the agent name
- if the user ID is `local-board`, show `Board`
- if the user ID matches the current signed-in user, show `Me`
- otherwise show a short stable fallback derived from the ID
- if no actor is known, show `Unknown`

### 4. Explicitly deferred work
Do not implement now:
- revision table
- change history timeline
- manager-chain delete policy

These need a broader design because they change server authorization semantics and the product model for document history.

## Testing Strategy

Automated coverage should focus on deterministic logic:
- actor label resolution helper
- metadata row content generation helper

Visual spacing and modal containment should be validated manually in the local preview because the current repo does not have reliable screenshot tests for this surface.
