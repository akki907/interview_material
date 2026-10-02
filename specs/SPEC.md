# Interview OS — Project Specification

## 1. Overview

**Project Name:** Interview OS
**Description:** A personal, interactive learning platform for senior engineers preparing for technical interviews. Combines structured topic pages, progress tracking, flashcards, and simulated interview practice.

**Tech Stack:**
- **Framework:** Vite (build tool)
- **Language:** TypeScript (strict), compiled by Vite; no runtime framework
- **UI:** Vanilla JS with `h()` helper (component-like functions)
- **Styling:** CSS custom properties (dark-themed, responsive)
- **Persistence:** Browser `localStorage` (no backend in v1)
- **Future:** Vercel AI SDK for LLM-powered interview evaluation (Phase 2)

**Repository Location:** `workspace/personal/interview_prep`

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (SPA)                              │
├──────────────┬──────────────────────────────────────────────────┤
│  index.html  │  Shell: sidebar, search, modals, toasts          │
├──────────────┼──────────────────────────────────────────────────┤
│  src/        │  TypeScript sources                                │
│  ├─ main.ts  │  Entry point: builds nav, initializes search,   │
│  ├─ nav.ts   │  Sidebar rendering & navigation                   │
│  ├─ search.ts│  Global search (⌘K shortcut)                      │
│  ├─ store.ts │  localStorage persistence (progress, bookmarks,  │
│  ├─ data.ts  │  Static nav tree & seed content                   │
│  ├─ components.ts│  Reusable UI builders (card, collapsible,     │
│  ├─ utils.ts │  h(), toast(), escHtml() utilities                │
│  └─ renderers/│  Page renderers (56 total, one per topic)        │
└──────────────┴──────────────────────────────────────────────────┘
```

### Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `main.ts` | Bootstraps the app: builds nav, initializes search, mounts content |
| `nav.ts` | Renders sidebar from `NAV` in `data.ts`; handles navigation transitions |
| `search.ts` | Builds searchable index from `NAV` + `INTERVIEW_QUESTIONS`; provides global search |
| `store.ts` | Manages localStorage persistence: progress bars, bookmarks, topic checkmarks |
| `data.ts` | Defines the navigation tree (`NAV`), seed content for all topics |
| `components.ts` | Reusable UI primitives: `progressBar`, `card`, `collapsible`, `tabs`, `stepControls`, `codeRunner`, `pipelineStages`, `lifecycleSteps` |
| `utils.ts` | Helper functions: `h()` DOM builder, `toast()`, `escHtml()` |
| `renderers/` | One renderer per topic (56 total), registered in `RENDERERS` map |

## 3. Data Model

### Navigation (`NAV` in `data.ts`)

```typescript
interface NavItem {
  id: string;
  label: string;
  children?: NavItem[]; // Only on group items (e.g., "DSA")
}
```

**Top-level groups:**
- `dashboard` – Main landing page with stats
- `dsa` – Data Structures & Algorithms (15 topics)
- `react` – React framework (7 topics)
- `python` – Python programming (10 topics)
- `ai` – AI Engineering (12 topics)
- `systemDesign` – System Design patterns (12 topics)
- `interview` – Mock interview questions
- `flashcards` – Study flashcards

### Flashcards

```typescript
interface Flashcard {
  cat: string;        // "DSA", "React", "Python", "AI", "System Design"
  front: string;      // Question or prompt
  back: string;       // Answer / explanation
}
```

### Progress (seed + user-override)

```typescript
interface ProgressSeed {
  dsa: number;      // 0-100
  react: number;
  python: number;
  ai: number;
  design: number;
}

interface UserProgress {
  dsa?: number;
  react?: number;
  python?: number;
  ai?: number;
  design?: number;
}
```

### LocalStorage Schema

| Key | Type | Description |
|-----|------|-------------|
| `ios_progress` | `UserProgress` | Override dashboard percentages |
| `ios_bookmarks` | `string[]` | Bookmark IDs (card titles or explicit IDs) |
| `ios_checked` | `Record<string, boolean>` | Subtopic completion in sidebar |

## 4. Feature Catalog (Acceptance Criteria)

### F-CORE (Shell)
- **F-CORE-001** App loads via Vite → `src/main.ts` → sidebar renders + dashboard
- **F-CORE-002** Responsive sidebar (desktop >900px, collapses on mobile ≤900px)
- **F-CORE-003** Toast notifications (info, success) auto-dismiss in 3s
- **F-CORE-004** Styles loaded (dark theme, CSS custom properties)

### F-NAV (Navigation)
- **F-NAV-001** All `NAV` entries appear in sidebar
- **F-NAV-002** Every `NAV` leaf `id` has a matching `RENDERERS[id]` entry
- **F-NAV-003** Group expansion/collapse on header click
- **F-NAV-004** Active item highlighted after navigation
- **F-NAV-005** Page transition scrolls to top on navigation

### F-STORE (Persistence)
- **F-STORE-001** Bookmarks toggle (star/unstar) with toast confirmation
- **F-STORE-002** Progress override via `ios_progress` (read/write)
- **F-STORE-003** Topic checkmarks reflect `ios_checked` in sidebar

### F-DASH (Dashboard)
- **F-DASH-001** Shows problems solved, topics completed, streak, learning hours
- **F-DASH-002** Progress bars for DSA, React, Python, AI, System Design (merged with `ios_progress`)
- **F-DASH-003** Stats sourced from `STATS` in `data.ts`

### F-TOPIC (Topic Pages)
- **F-TOPIC-001** All 59 routable pages (57 topics + dashboard + interview + flashcards)
- **F-TOPIC-002** Each page has title + mental model + code example + complexity analysis
- **F-TOPIC-003** Interactive elements: step controls, pipeline visualization, collapsible sections
- **F-TOPIC-004** Bookmarkable cards (via `card()` component)

### F-INTERVIEW (Mock Interviews)
- **F-INT-001** Topic selection buttons (DSA, React, Python, AI, System Design, Interview)
- **F-INT-002** Question UI with text escaping, timestamp, and hint toggle
- **F-INT-003** Answer submission (stub – textarea + submit → static rubric)
- **F-INT-004** Future: LLM-powered evaluation via Vercel AI Gateway

### F-FLASH (Flashcards)
- **F-FLASH-001** Category filter (DSA, React, Python, AI, System Design)
- **F-FLASH-002** Card navigation (front/back flip, prev/next)
- **F-FLASH-003** Active filter highlighted with primary color

### F-CODE (Code Modal)
- **F-CODE-001** Code editor modal with copy-to-clipboard
- **F-CODE-002** Simulated execution (placeholder output)

### F-SEARCH (Global Search)
- **F-SEARCH-001** Indexes all nav items + interview questions
- **F-SEARCH-002** Minimum 2-character query length
- **F-SEARCH-003** ⌘K/Ctrl+K focus, Escape dismisses
- **F-SEARCH-004** Empty results show "No results" message

## 5. Renderer Registry

**Total registered renderers (56):**

| Category | Examples |
|----------|----------|
| **DSA** | sliding-window, two-pointers, arrays, strings, hashmaps, stack, queue, linked-list, binary-tree, BST, heap, greedy |
| **React** | fundamentals, hooks, state, performance, rendering, architecture, interview |
| **Python** | fundamentals, decorators, asyncio, concurrency, GIL, iterators, functions, async-io, fastapi, interview |
| **AI Engineering** | llm, embeddings, vector-db, rag, advanced-rag, rag-eval, agents, tool-calling, agent-memory, multi-agent, orchestration, system-design |
| **System Design** | scalability, load-balancing, caching, databases, replication, sharding, queues, event-driven, microservices, api, distributed, real-world |
| **Interview** | question UI, timed mode, hints |
| **Flashcards** | card creation, filtering, navigation |

**Registration:** All renderers exported in `src/renderers/index.ts` under `RENDERERS` map.

## 6. UI/UX Principles

1. **Dark, developer-focused aesthetic** – low eye strain for long study sessions
2. **Progressive disclosure** – collapsibles, tabs, step controls for dense content
3. **Keyboard-first search** – ⌘K global shortcut
4. **Immediate feedback** – toasts for bookmarks, submissions, pipeline clicks
5. **No login friction** – all state persisted in `localStorage`
6. **Mobile-usable** – collapsible sidebar below 900px breakpoint

## 7. Quality Standards

| Requirement | Standard |
|-------------|----------|
| **Theme** | Dark background (`#0d0d0d`), light cards (`#1a1a1a`), accent blue (`#6c63ff`) |
| **Typography** | Inter / JetBrains Mono for code, system-ui for body |
| **Responsiveness** | Sidebar collapses on mobile; content scrolls smoothly |
| **Accessibility** | Semantic HTML, aria labels on icon buttons, keyboard search |
| **Performance** | No heavy frameworks; vanilla JS + CSS only |
| **Local Storage** | All user data persisted; no network calls for read/write |

## 8. Constraints & Dependencies

- **No backend** in v1 – all persistence is local (`localStorage`)
- **No secret keys** in client bundle – AI gateway API key lives in `.env.local` (not committed)
- **TypeScript** – gradually migrating; `tsconfig.json` enforces strict mode
- **Build** – Vite dev server (`pnpm dev`) and production build (`pnpm build`)
- **Testing** – unit tests for `Store` (currently not started), renderer smoke tests (not started)

## 9. Open Questions

| ID | Question | Resolution |
|----|----------|------------|
| Q1 | Should we migrate entire codebase to TypeScript now? | Done — `src/` is fully TypeScript (`strict`), `tsc --noEmit` clean |
| Q2 | When to delete `app.js`? | After confirming `src/` parity for all functionality |
| Q3 | Which LLM provider for interview evaluation? | Vercel AI Gateway (`AI_GATEWAY_API_KEY`) – Phase 2 |
| Q4 | Backend for progress sync? | Out of scope until Phase 3 (cloud sync, auth, etc.) |

## 10. Roadmap (Current Phase)

| Phase | Focus | Status |
|-------|-------|---------|
| **Phase 0** | Baseline stabilization | Mostly done – shell, search, store, components, 57 topic pages |
| **Phase 1** | Content & UX polish | Need to finish bookmarks UI, expand flashcards, improve interview mode |
| **Phase 2** | AI-powered interview evaluation | Create `src/ai/evaluate.ts`, API route, LLM rubric UI |
| **Phase 3** | Personalization & scale | Spaced repetition, weak-area drills, export/import |
| **Phase 4** | Production deployment | Deploy to Vercel/Netlify, PWA enhancements |

## 11. Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview
pnpm preview

# Run tests (when ready)
pnpm test
```

## 12. File Structure Summary

```
interview_prep/
├── index.html              # App shell, modals, script entry
├── styles.css              # Dark theme, layout tokens
├── package.json            # Project metadata, devDependencies
├── tsconfig.json           # TypeScript strict configuration
├── pnpm-lock.yaml          # Dependency lock file
├── .env.local              # AI_GATEWAY_API_KEY (gitignored)
├── src/
│   ├── main.js             # Entry point, bootstrapping
│   ├── nav.js              # Sidebar & navigation
│   ├── search.js           # Global search
│   ├── store.js            # localStorage persistence
│   ├── data.js             # Navigation tree & seed content
│   ├── components.js       # Reusable UI builders
│   ├── utils.js            # h(), toast(), escHtml()
│   └── renderers/
│       ├── index.js        # RENDERERS registry (56 entries)
│       ├── dashboard.js
│       ├── dsa.js
│       ├── react.js
│       ├── python.js
│       ├── ai.js
│       ├── systemDesign.js
│       ├── interview.js
│       └── flashcards.js
└── specs/
    └── SPEC.md             # This file
```

---
*Specification version: 1.0*
*Last updated: 2026-09-17*
