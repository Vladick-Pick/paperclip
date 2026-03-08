# 2026-03-07 Issue Knowledge Compact Rows Design

## Goal
- Render attached knowledge in issue detail as compact single-line rows.
- Keep only title, optional kind badge, open action, and detach action.
- Remove summary and body from the issue card presentation.

## Decision
- Replace the current card-like knowledge attachments in IssueDetail with compact list rows.
- Full knowledge content remains available only on the knowledge detail page opened via `Open`.
