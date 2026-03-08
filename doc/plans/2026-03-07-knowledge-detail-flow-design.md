# Knowledge Detail Flow Design

## Goal

Extend the first knowledge MVP so large notes can be read comfortably, edited, and deleted without overloading the library grid or issue detail cards.

## Current Problem

The existing UI is sufficient for creating and attaching knowledge items, but it breaks down as soon as content becomes substantial:

- long unbroken text can overflow the library card width
- library cards attempt to render too much body content inline
- there is no dedicated place to read a long document comfortably
- the API already supports update/delete, but the UI does not expose those actions

## Options Considered

### Option 1: Keep everything inline on the library page

Add edit/delete buttons directly on cards and show the full note body in-place.

Pros:
- smallest routing change
- fast to implement

Cons:
- bad fit for long notes
- library page becomes a wall of text
- editing rich or long content inline is visually noisy

### Option 2: Add modal dialogs for view/edit/delete

Keep the library list page and use dialogs for reading and editing a selected item.

Pros:
- faster than a full page flow
- avoids route additions

Cons:
- long-form reading/editing in a modal is cramped
- deep linking to a knowledge item is impossible
- not ideal for future expansion to asset-backed items

### Option 3: Add a dedicated knowledge detail page

Keep the library list compact and move long-form reading and editing to a separate page.

Pros:
- best fit for large notes
- keeps the library scannable
- gives us a stable place for read/edit/delete actions
- future-friendly for asset-backed or URL-backed knowledge

Cons:
- requires one more route and page
- slightly more implementation work

## Recommendation

Use Option 3.

The library should behave like an index, not a document reader. The issue panel should stay even more compact because it sits inside an already dense detail view. A dedicated knowledge detail page matches the existing Paperclip information architecture better than trying to stretch cards or modals beyond their intended role.

## UX Shape

### Knowledge Library

Each library card should show:

- title
- kind badge
- summary if present
- a bounded body preview for notes
- primary action: `Open`
- secondary actions: `Edit`, `Delete`

Preview rules:

- preserve line breaks
- wrap long words and unbroken strings
- clamp preview height/length so cards remain scannable

### Knowledge Detail Page

Add route: `/:companyPrefix/knowledge/:knowledgeItemId`

Page sections:

- breadcrumb back to `Knowledge`
- title, kind badge, timestamps
- summary block if present
- full content block
- action row with `Edit` and `Delete`

Behavior by kind:

- `note`: show full note body in a readable text block
- `url`: show summary and clickable source URL
- `asset`: show asset metadata and file name; no extra asset-preview work in this pass

### Editing

Use a dialog, launched from either the library card or detail page.

Reason:
- reading deserves a full page
- editing only needs a focused form
- this stays consistent with the existing design system dialogs

Edit form supports existing MVP kinds only:

- note
- url

Asset-backed items remain readable and deletable, but not newly editable from bespoke UI in this pass.

### Deletion

Use a confirmation dialog.

Delete semantics:
- deleting a knowledge item removes it from the company library
- attached issue references disappear via existing backend behavior
- after deleting from detail page, redirect back to `/:companyPrefix/knowledge`

## Technical Notes

- add `knowledge` to board-route normalization helpers
- add `queryKeys.knowledge.detail`
- reuse existing `knowledgeApi.get/update/remove`
- extract preview formatting into a small helper so behavior is testable without browser-only UI tests

## Non-Goals

- markdown rendering
- collaborative editor
- asset file previewing
- issue-side full-screen reading experience
- tags, folders, or search improvements

## Success Criteria

This follow-up is successful when:

- long library preview text no longer overflows its card
- a user can open a dedicated knowledge detail page
- a user can edit a note or URL from the UI
- a user can delete a knowledge item from the UI
- the issue panel remains compact and readable
