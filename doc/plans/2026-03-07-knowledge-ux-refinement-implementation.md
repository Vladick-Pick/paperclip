# Knowledge UX Refinement Implementation Plan

1. Add pure helper functions for knowledge picker filtering and selection labels, with tests written first.
2. Build a reusable `KnowledgeAttachDialog` component using existing dialog and command primitives.
3. Refactor `IssueKnowledgePanel` to remove inline select and quick-note creation, and use the dialog instead.
4. Extend `NewIssueDialog` with local draft knowledge selection, removable pills, and post-create attach behavior.
5. Refine `Knowledge.tsx` card layout and `KnowledgeDetail.tsx` spacing to match existing Paperclip panels.
6. Run targeted tests, typecheck, build, and manual UI verification.
