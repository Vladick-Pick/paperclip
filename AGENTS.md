# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

Paperclip is a control plane for AI-agent companies.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

## 2. Read This First

Before making changes, read in this order:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `doc/`: operational and product docs

## 3.1 Claricont Fork Operations

This fork has a documented deployment workflow that differs from a plain upstream clone.

Read these before changing remotes, deploy scripts, or production update flow:

1. `doc/operations/fork-workflow.md`
2. `doc/operations/deploy-runbook.md`
3. `doc/operations/upstream-sync-runbook.md`
4. `doc/operations/customizations-register.md`

Operational rules:

- `master` stays a clean mirror of `upstream/master`
- `claricont-prod` is the only supported production deploy branch
- production deploy logic lives in `scripts/deploy-server.sh`
- the server is a deployment target, not a source of truth

## 3.2 Claricont Open Source Workflow

Claricont works on Paperclip in three distinct modes.
Keep them separate.

### Mode 1: Fork + Deploy

Use this mode for normal hosting and production operations.

- `origin` is Claricont's fork on GitHub
- `upstream` is the public `paperclipai/paperclip` repository
- `master` remains a clean mirror of upstream
- `claricont-prod` is the only supported deploy branch
- the server deploys from Claricont's fork, not from upstream directly

Detailed workflow:

1. `doc/operations/fork-workflow.md`
2. `doc/operations/deploy-runbook.md`

### Mode 2: Internal Customization

Use this mode when Claricont needs fork-only product or operational changes.

- start from `claricont-prod`
- build the change in a short-lived `codex/*` branch
- verify locally first
- merge back into `claricont-prod` only after checks pass
- deploy only after the integration branch is proven stable

When upstream releases new changes, merge them into Claricont's production line in a controlled way:

- sync `master` from `upstream/master`
- create an integration branch from `claricont-prod`
- merge the updated `master`
- resolve conflicts and run verification before landing the update

Detailed upstream integration procedure:

1. `doc/operations/upstream-sync-runbook.md`

Current Claricont-specific customizations are tracked in:

1. `doc/operations/customizations-register.md`

### Mode 3: Upstream Contribution

Use this mode when a Claricont change looks generally useful for the public Paperclip project.

- extract the smallest clean version of the change from Claricont's fork
- start the PR branch from clean `master`, not from `claricont-prod`
- keep Claricont-only deploy or operational code out of the public PR
- open the PR to `paperclipai/paperclip:master`

This means Claricont can:

- run a change internally first
- validate it on its own fork and infrastructure
- then upstream the generalizable part later

Active example:

- `Knowledge` company-memory customization: `doc/operations/knowledge-customization.md`

## 4. Dev Setup (Auto DB)

Use embedded PGlite in dev by leaving `DATABASE_URL` unset.

```sh
pnpm install
pnpm dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
pnpm db:generate
```

4. Validate compile:

```sh
pnpm -r typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `pnpm db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Run this full check before claiming done:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors

## 10. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change
