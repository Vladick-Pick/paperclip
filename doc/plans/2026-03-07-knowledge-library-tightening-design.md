# Knowledge Library Tightening Design

## Goal

Apply a narrow visual correction to the Knowledge library without changing its overall structure.

## Confirmed requirements

- Keep the left create column structurally as-is.
- Increase the top spacing below the page title / top divider.
- Remove note body rendering from knowledge library cards.
- Keep only title, kind badge, summary, metadata, and actions in library cards.
- Preserve full content on the knowledge detail page.

## Approach

- Add a small UI helper that defines what secondary content is allowed inside a library card.
- For `note`, the helper returns `null` so the body never renders in the library.
- For `url` and `asset`, the helper can still expose the source reference.
- Tighten vertical rhythm in `Knowledge.tsx` by adding top padding to the page content and a slightly larger gap between the library header and the first card.
