# Interview OS — Spec-Driven Development

This directory is the **source of truth** for building Interview OS. All implementation work should trace back to these specs.

## How to use these specs

### For humans
1. Read [01-product-spec.md](./01-product-spec.md) for vision, users, and constraints.
2. Read [02-technical-spec.md](./02-technical-spec.md) before changing architecture or adding dependencies.
3. Check [03-feature-catalog.md](./03-feature-catalog.md) for acceptance criteria before marking work done.
4. Use [04-roadmap.md](./04-roadmap.md) to pick the next slice of work.

### For AI agents / Cursor
When implementing a feature:
1. **Locate** the feature ID in `03-feature-catalog.md` (e.g. `F-INT-001`).
2. **Verify** technical constraints in `02-technical-spec.md`.
3. **Implement** only what the acceptance criteria require.
4. **Update** the feature status in `03-feature-catalog.md` when complete.
5. **Do not** expand scope beyond `04-roadmap.md` current phase unless the user asks.

### Spec change workflow
1. Propose spec change first (update the relevant `.md` file).
2. Get approval or explicit user request.
3. Implement against the updated spec.
4. Never let code drift from spec without updating the spec.

## Document index

| Document | Purpose |
|----------|---------|
| [01-product-spec.md](./01-product-spec.md) | Product vision, personas, goals, non-goals |
| [02-technical-spec.md](./02-technical-spec.md) | Architecture, modules, data, env, conventions |
| [03-feature-catalog.md](./03-feature-catalog.md) | Feature IDs, requirements, acceptance criteria |
| [04-roadmap.md](./04-roadmap.md) | Phased delivery plan and current status |

## Project snapshot

| Field | Value |
|-------|-------|
| Name | Interview OS (`interview-os`) |
| Type | Client-side SPA (Vite + TypeScript, no runtime framework) |
| Primary user | Senior engineer preparing for AI/full-stack interviews |
| Content domains | DSA, React, Python, AI Engineering, System Design |
| Persistence | Browser `localStorage` (no backend today) |
| Planned | AI-powered interview feedback via Vercel AI SDK |

## Current implementation status

**Implemented (baseline):** Modular TypeScript `src/` app (strict, `tsc --noEmit` clean), 57 topic renderers, dashboard, flashcards, search, bookmarks, progress UI, interview mode (stub evaluation).

**In progress / gaps:** AI integration, legacy `app.js` cleanup, real interview evaluation, broader automated test coverage.

See [04-roadmap.md](./04-roadmap.md) for phase details.
