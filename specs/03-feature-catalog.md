# Feature Catalog — Interview OS

**Version:** 1.0  
**Status:** Active  

Each feature has an ID, status, requirements, and **acceptance criteria** (AC). Implementation is done when all AC pass.

**Status legend:** ✅ Done · 🟡 Partial · ⬜ Not started · 🔮 Planned

---

## F-CORE — Application shell

### F-CORE-001 App bootstrap
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | App loads via Vite from `index.html` → `src/main.ts` |
| AC2 | On load, sidebar renders and dashboard is shown |
| AC3 | No uncaught errors in console on first paint |

### F-CORE-002 Responsive sidebar
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Sidebar visible on desktop (>900px) |
| AC2 | Mobile menu button toggles sidebar on ≤900px |
| AC3 | Clicking nav item closes sidebar on mobile |

### F-CORE-003 Toast notifications
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Toasts appear in `#toast-container` |
| AC2 | Toasts auto-dismiss after ~3 seconds |
| AC3 | Types: `info`, `success` (CSS class applied) |

### F-CORE-004 Styles loaded
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | `styles.css` imported in app entry |
| AC2 | Dark theme tokens apply (background `#0d0d0d`) |
| AC3 | Cards, sidebar, search bar styled correctly |

---

## F-NAV — Navigation

### F-NAV-001 Sidebar navigation tree
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | All entries from `NAV` in `data.ts` appear in sidebar |
| AC2 | Groups expand/collapse on header click |
| AC3 | Active item highlighted after navigation |

### F-NAV-002 Route rendering
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Every `NAV` leaf `id` has a matching `RENDERERS[id]` entry |
| AC2 | Unknown id shows "Page not found" card |
| AC3 | Content scrolls to top on navigation |
| AC4 | Page transition uses `page-enter` class |

### F-NAV-003 Topic completion checkmarks
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Completed subtopics show checked state in sidebar |
| AC2 | User can toggle completion (click or in-page control) |
| AC3 | State persists in `ios_checked` localStorage |

*✓ Topic toolbar already provides in-page completion toggle.

---

## F-SEARCH — Global search

### F-SEARCH-001 Search index
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Indexes all nav items (groups + leaves) |
| AC2 | Indexes interview question text |
| AC3 | Minimum 2 characters to show results |

### F-SEARCH-002 Search UX
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | ⌘K / Ctrl+K focuses search input |
| AC2 | Escape hides results and blurs input |
| AC3 | Click result navigates and clears query |
| AC4 | Empty results show "No results" message |

---

## F-STORE — Persistence

### F-STORE-001 Bookmarks
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Card bookmark button toggles ☆/★ |
| AC2 | Toast confirms bookmark/unbookmark |
| AC3 | Bookmarks persist in `ios_bookmarks` |
| AC4 | Bookmark state restores on re-render |

*✓ All criteria met.*

### F-STORE-002 Progress override
**Status:** 🟡 Partial

| AC | Criterion |
|----|-----------|
| AC1 | Dashboard merges `PROGRESS` seed with `ios_progress` |
| AC2 | User can update progress values |
| AC3 | Updates persist across sessions |

*Gap: no UI to edit progress yet; read-only merge works.*

### F-STORE-003 Checked topics
**Status:** 🟡 Partial

| AC | Criterion |
|----|-----------|
| AC1 | `Store.toggleCheck(id)` toggles boolean |
| AC2 | Sidebar reflects checked state on build |

---

## F-DASH — Dashboard

### F-DASH-001 Stats overview
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Shows problems solved, topics done, streak, learning hours |
| AC2 | Stats sourced from `STATS` in `data.ts` |

### F-DASH-002 Progress bars
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Five domain progress bars: DSA, React, Python, AI, System Design |
| AC2 | Percentages from merged progress object |

### F-DASH-003 Weak areas & recent
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Lists `WEAK_AREAS` as bullet list |
| AC2 | Shows `RECENTLY_STUDIED` as tags |

### F-DASH-004 Quick actions
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Buttons navigate to preset topics + interview mode |

---

## F-TOPIC — Topic pages

### F-TOPIC-001 DSA topics (15)
**Status:** ✅ Done

Renderers: `dsa-arrays` … `dsa-greedy`

| AC | Criterion |
|----|-----------|
| AC1 | Each page has title + at least mental model + one content card |
| AC2 | Sliding Window includes step visualization |
| AC3 | Stack includes interactive push/pop viz |
| AC4 | Code blocks use `<pre><code class="language-*">` |

### F-TOPIC-002 React topics (7)
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Hooks page includes lifecycle visualization |
| AC2 | Interview questions page lists Q&A content |

### F-TOPIC-003 Python topics (10)
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | AsyncIO page explains event loop |
| AC2 | GIL page covers CPython threading limits |
| AC3 | FastAPI page includes route example |

### F-TOPIC-004 AI Engineering topics (12)
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | RAG page includes clickable pipeline stages |
| AC2 | RAG Eval page includes metrics table |
| AC3 | Agents page includes architecture lifecycle |

### F-TOPIC-005 System Design topics (12)
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Load balancing, caching, databases covered |
| AC2 | Real-world designs page present |

### F-TOPIC-006 Shared components on topics
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | `card()`, `collapsible()`, `tabs()` usable across renderers |
| AC2 | `codeRunner()` simulates execution with fallback message |
| AC3 | `pipelineStages()` fires toast on stage click |

### F-TOPIC-007 Mermaid diagrams
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | `diagram(source, caption)` renders a figure with a rendered SVG |
| AC2 | Diagrams render automatically after every navigation (`renderMermaid`) |
| AC3 | Mermaid bundle is lazily imported — pages without diagrams never load it |
| AC4 | Invalid diagram source degrades to an inline error box with the source, page still usable |
| AC5 | Diagram theme matches the app's paper theme (light, readable labels) |

*✓ Diagrams appear across DSA, React, Python, AI Engineering and System Design pages.*

---

## F-FLASH — Flashcards

### F-FLASH-001 Category filter
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Filter buttons: All + unique categories from data |
| AC2 | Active filter highlighted with `btn-primary` |

### F-FLASH-002 Card navigation
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Shows front with category and index |
| AC2 | Flip reveals back |
| AC3 | Prev/Next cycles within filtered set |

---

## F-INT — Interview mode

### F-INT-001 Topic selection
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Buttons for DSA, React, Python, AI, System Design |
| AC2 | Loads question from `INTERVIEW_QUESTIONS` for topic |

### F-INT-002 Question UI
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Displays question text (HTML-escaped) |
| AC2 | Timer placeholder shown (⏱ 30:00) |
| AC3 | Hint hidden by default; reveal toggles visibility |

### F-INT-003 Answer submission (stub)
**Status:** 🟡 Partial

| AC | Criterion |
|----|-----------|
| AC1 | Submit shows static evaluation checklist |
| AC2 | Success toast on submit |
| AC3 | No text input for answer yet |

### F-INT-004 AI evaluation
**Status:** 🔮 Planned (Phase 2)

| AC | Criterion |
|----|-----------|
| AC1 | Textarea for user answer (min 50 chars to submit) |
| AC2 | Submit calls `/api/evaluate` with question + answer |
| AC3 | Response renders structured rubric from LLM |
| AC4 | Loading state while evaluating |
| AC5 | Error state if API fails (retry + friendly message) |
| AC6 | API key never sent to client |

---

## F-AI — AI coach (future)

### F-AI-001 Explain topic
**Status:** 🔮 Planned (Phase 2)

| AC | Criterion |
|----|-----------|
| AC1 | "Ask AI" button on topic pages |
| AC2 | Sends topic context + user question to LLM |
| AC3 | Streams or displays response inline |

### F-AI-002 Generate flashcards
**Status:** 🔮 Planned (Phase 3)

| AC | Criterion |
|----|-----------|
| AC1 | Generate N flashcards for a topic |
| AC2 | User can save to local deck |

### F-AI-003 Weak area drill
**Status:** 🔮 Planned (Phase 3)

| AC | Criterion |
|----|-----------|
| AC1 | Dashboard "Drill weak areas" generates custom quiz |
| AC2 | Uses weak areas from dashboard + user history |

---

## F-CODE — Code modals & playground

### F-CODE-001 Code modal shell
**Status:** ✅ Done

| AC | Criterion |
|----|-----------|
| AC1 | Modal opens/closes via DOM in `index.html` |
| AC2 | Backdrop click closes modal |

### F-CODE-002 In-page code runner
**Status:** 🟡 Partial

| AC | Criterion |
|----|-----------|
| AC1 | `codeRunner` shows editable textarea |
| AC2 | Run button shows simulated or custom output |
| AC3 | Copy button copies to clipboard |

---

## F-TEST — Testing

### F-TEST-001 Unit tests for Store
**Status:** ⬜ Not started

| AC | Criterion |
|----|-----------|
| AC1 | Tests for get/set/toggle bookmark/check |
| AC2 | Runs via `pnpm test` |

### F-TEST-002 Renderer smoke tests
**Status:** ⬜ Not started

| AC | Criterion |
|----|-----------|
| AC1 | Every `RENDERERS` key runs without throw |
| AC2 | Each renderer appends at least one child to container |

---

## F-DEV — Developer experience

### F-DEV-001 TypeScript migration
**Status:** ⬜ Not started

| AC | Criterion |
|----|-----------|
| AC1 | Shared types in `src/types.ts` |
| AC2 | AI modules written in `.ts` |
| AC3 | `pnpm build` succeeds |

### F-DEV-002 Remove legacy app.js
**Status:** ⬜ Not started

| AC | Criterion |
|----|-----------|
| AC1 | `app.js` deleted from repo root |
| AC2 | No references to `app.js` remain |

### F-DEV-003 Vite config + API proxy
**Status:** ⬜ Not started

| AC | Criterion |
|----|-----------|
| AC1 | `vite.config.ts` proxies `/api/*` to handler |
| AC2 | `.env.local` loaded for server-side AI calls |

---

## Feature ↔ file map

| Feature area | Primary files |
|--------------|---------------|
| Shell | `index.html`, `src/main.ts`, `styles.css` |
| Nav | `src/nav.ts`, `src/data.ts` |
| Search | `src/search.ts` |
| Store | `src/store.ts` |
| Components | `src/components.ts`, `src/utils.ts` |
| Topics | `src/renderers/*.ts` |
| Diagrams | `src/mermaid.ts` |
| Interview | `src/renderers/interview.ts` |
| AI (planned) | `src/ai/*.ts`, API route |
