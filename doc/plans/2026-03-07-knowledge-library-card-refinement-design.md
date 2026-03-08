# 2026-03-07 Knowledge Library Card Refinement Design

## Goal
- Remove the heavy split between the top and bottom halves of company library cards.
- Move `Open` into the top action group with edit/delete.
- Keep updated metadata as a quiet bottom meta row.

## Decision
- Replace the current card header/content/footer composition with a custom two-zone card.
- Summary or auxiliary text stays in the top content cluster.
- No middle divider; only outer border remains.
