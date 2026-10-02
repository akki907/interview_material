Phase 0 — Baseline stabilization (current)

**Goal:** Make the existing modular app reliable and spec-aligned.

| Priority | Task | Feature IDs | Status |
|----------|------|-------------|--------|
| P0 | Import `styles.css` in app entry | F-CORE-004 | ✅ Done |
| P0 | Fix `components.ts` imports (Store, toast) | F-STORE-001 | ✅ Done |
| P0 | Fix undeclared globals in renderers (escHtml, navigateTo) | TD-7 | ✅ Done |
| P1 | Add `vite.config.ts` with CSS + path aliases | F-DEV-003 | ⬜ |
| P1 | Remove or stub `pnpm test` until tests exist | F-TEST-001 | ⬜ |
| P2 | Delete legacy `app.js` after diff verification | F-DEV-002 | ⬜ |
| P2 | Add topic completion toggle on pages | F-NAV-003 | ✅ Done |
| P1 | Migrate `src/` to TypeScript (strict, `tsc --noEmit`) | F-DEV-001 | ✅ Done |

**Exit criteria:**
- [x] App visually matches design (dark theme fully applied)
- [x] Bookmarks work without console errors
- [x] All 59 routes render without throw
- [x] `pnpm dev` and `pnpm build` succeed

---

## Phase 1 — Content & UX polish

**Goal:** Deepen topic quality and study workflows.

| Priority | Task | Feature IDs | Status |
|----------|------|-------------|--------|
| P1 | Study Todos & checklist tracker with topic linking | F-TODO-001 | ✅ Done |
| P1 | Mermaid diagrams on topic pages (lazy-loaded, theme-matched) | F-TOPIC-007 | ⬜ |
| P1 | Syntax highlighting (highlight.js CDN or bundle) | F-TOPIC-006 |
| P1 | Interview mode: answer textarea (no AI yet) | F-INT-003 |
| P1 | Progress edit UI on dashboard | F-STORE-002 |
| P2 | Bookmarks list page / dashboard section | F-STORE-001 |
| P2 | Expand flashcard deck (50+ cards) | F-FLASH-002 |
| P2 | Expand `INTERVIEW_QUESTIONS` (10+ per topic) | F-INT-001 |
| P3 | Working countdown timer in interview mode | F-INT-002 |
| P3 | Code modal wired from topic "expand code" actions | F-CODE-001 |

**Exit criteria:**
- [ ] User can type and save interview answers locally
- [ ] 50+ flashcards across all categories
- [ ] hljs highlights code on navigation
- [ ] Mermaid diagrams render on every topic page

---

## Current status summary

```
Phase 0  ████████████  100%   (all infrastructure complete)
Phase 1  ██░░░░░░░░  20%   (basic UX exists)
Phase 2  ░░░░░░░░░░   0%   (deps added, not wired)
Phase 3  ░░░░░░░░░░   0%
Phase 4  ░░░░░░░░░░   0%
```
