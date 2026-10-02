# Technical Specification — Interview OS

**Version:** 1.0  
**Status:** Active  
**Last updated:** 2026-09-17

---

## 1. System overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (SPA)                        │
├──────────────┬──────────────────────────────────────────┤
│  index.html  │  Shell: sidebar, search, modals, toasts  │
├──────────────┴──────────────────────────────────────────┤
│  src/main.ts          Entry, event wiring, init           │
│  src/nav.ts           Sidebar + navigateTo(id)            │
│  src/search.ts        Global search (⌘K)                  │
│  src/store.ts         localStorage persistence            │
│  src/data.ts          Static nav + seed content           │
│  src/components.ts    Reusable UI builders                │
│  src/utils.ts         h(), toast, escHtml                 │
│  src/globals.d.ts     Window globals (navigateTo/toast/hljs) │
│  src/renderers/*.ts   Page renderers (RENDERERS map)      │
├──────────────────────────────────────────────────────────┤
│  styles.css           Design tokens + layout (root)       │
├──────────────────────────────────────────────────────────┤
│  localStorage         ios_* prefixed keys                 │
└─────────────────────────────────────────────────────────┘
         │ (Phase 2)
         ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel AI SDK (ai)  →  AI Gateway API                    │
│  Env: AI_GATEWAY_API_KEY                                  │
└─────────────────────────────────────────────────────────┘
```

## 2. Tech stack

| Layer | Choice | Version (current) |
|-------|--------|-------------------|
| Build | Vite | ^5.4 |
| Language | TypeScript (`strict`, `noUnusedLocals`, `isolatedModules`) | Compiled by Vite, `tsc --noEmit` for checks |
| UI | Vanilla DOM (`h()` helper) | No React/Vue in app |
| Styling | CSS custom properties | `styles.css` |
| Persistence | localStorage | Native |
| AI (planned) | Vercel `ai` package | ^7.0 |
| Test runner (planned) | tsx | ^4.23 |

## 3. Repository layout

```
interview_prep/
├── index.html              # App shell, modals, script entry
├── styles.css              # Global styles (MUST be imported — see §9)
├── package.json
├── tsconfig.json           # TS strict; include src/
├── .env.local              # AI_GATEWAY_API_KEY (gitignored)
├── src/
│   ├── main.ts             # Bootstrap
│   ├── nav.ts
│   ├── search.ts
│   ├── store.ts
│   ├── data.ts
│   ├── components.ts
│   ├── utils.ts
│   ├── globals.d.ts        # Window globals + vite/client types
│   └── renderers/
│       ├── index.ts        # RENDERERS registry
│       ├── dashboard.ts
│       ├── dsa.ts
│       ├── react.ts
│       ├── python.ts
│       ├── ai.ts
│       ├── systemDesign.ts
│       ├── interview.ts
│       └── flashcards.ts
└── specs/                  # This spec directory
```

## 4. Module responsibilities

### 4.1 `main.js`
- Import and call `buildNav()`, `initSearch()`, `navigateTo('dashboard')` on `DOMContentLoaded`
- Wire flashcard modal, code modal, sidebar toggle, mobile menu
- Expose `window.navigateTo`, `window.toast` for inline handlers in renderers

### 4.2 `nav.js`
- **`buildNav()`** — Renders sidebar from `NAV` in `data.js`; shows checkmarks for completed subtopics
- **`navigateTo(id)`** — Sets active nav state, looks up `RENDERERS[id]`, renders into `#content`, scrolls to top
- Missing renderer → "Page not found" card

### 4.3 `search.js`
- Builds searchable index from `NAV` + `INTERVIEW_QUESTIONS`
- Min query length: 2 characters
- Click result → `navigateTo(id)` + clear input
- Shortcuts: `⌘K`/`Ctrl+K` focus, `Escape` dismiss

### 4.4 `store.js`
- Prefix: `ios_`
- Keys: `progress`, `bookmarks`, `checked`
- All values JSON-serialized

### 4.5 `components.js`
Reusable builders (return DOM nodes):

| Export | Purpose |
|--------|---------|
| `progressBar(label, pct, cls)` | Labeled progress bar |
| `card(title, body, extra?)` | Card with optional bookmark |
| `collapsible(title, bodyHtml, startOpen?)` | Expand/collapse section |
| `tabs(tabsArr, contentsArr)` | Tabbed content |
| `stepControls(total, onStep)` | Step-through viz controls |
| `codeRunner(lang, code, onRun?)` | Editable code + simulated run |
| `pipelineStages(stages, onStageClick)` | RAG-style pipeline viz |
| `lifecycleSteps(steps)` | Horizontal lifecycle dots |

### 4.6 `utils.js`
- **`h(tag, attrs, ...children)`** — Minimal DOM factory; supports `className`, `innerHTML`, `textContent`, `onClick` style handlers
- **`toast(msg, type)`** — Append to `#toast-container`, auto-remove 3s
- **`escHtml(s)`** — Escape HTML for user content

### 4.7 Renderer pattern

Every page renderer:
```javascript
export function renderTopicName(container) {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Topic Title'));
    section.appendChild(card('🧠 Mental Model', '...'));
    // ...
    container.appendChild(section);
}
```

Register in `src/renderers/index.js`:
```javascript
export const RENDERERS = {
    'topic-id': renderTopicName,
    // ...
};
```

**Rule:** Renderer `id` MUST match `NAV` entry `id` exactly.

## 5. Data model

### 5.1 Navigation (`NAV`)

```typescript
type NavItem = {
    id: string;
    label: string;
    children?: NavItem[];  // subtopics only on groups
};
```

### 5.2 Flashcard

```typescript
type Flashcard = {
    cat: string;    // 'DSA' | 'React' | 'Python' | 'RAG' | 'Agents' | 'System Design' | ...
    front: string;
    back: string;
};
```

### 5.3 Interview question

```typescript
type InterviewQuestion = {
    topic: 'DSA' | 'React' | 'Python' | 'AI' | 'System Design';
    question: string;
    hint: string;
};
```

### 5.4 Progress (static seed + user override)

```typescript
type ProgressSeed = {
    dsa: number;      // 0-100
    react: number;
    python: number;
    ai: number;
    design: number;
};

type UserProgress = Partial<ProgressSeed>;  // stored in localStorage
```

### 5.5 localStorage schema

| Key | Type | Description |
|-----|------|-------------|
| `ios_progress` | `UserProgress` | Override dashboard percentages |
| `ios_bookmarks` | `string[]` | Bookmark IDs (card title or explicit id) |
| `ios_checked` | `Record<string, boolean>` | Subtopic completion in sidebar |

## 6. DOM contract (`index.html`)

| Element ID | Role |
|------------|------|
| `#app` | Root layout |
| `#sidebar`, `#sidebar-nav` | Navigation |
| `#sidebar-toggle`, `#mobile-menu-btn` | Sidebar controls |
| `#main-content`, `#content` | Page render target |
| `#search-input`, `#search-results` | Global search |
| `#toast-container` | Toast stack |
| `#flashcard-modal` | Legacy modal (partially used) |
| `#code-modal` | Code viewer modal |

## 7. Design tokens (CSS)

Defined in `:root` in `styles.css`:

- Backgrounds: `--bg-primary` (#0d0d0d) through `--bg-card`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Accent: `--accent` (#6c63ff), topic colors `--green`, `--orange`, etc.
- Layout: `--sidebar-width: 280px`
- Breakpoint: mobile sidebar at `max-width: 900px`

## 8. Environment variables

| Variable | Required | Usage |
|----------|----------|-------|
| `AI_GATEWAY_API_KEY` | Phase 2+ | Vercel AI Gateway for LLM calls |

**Never** expose in client bundle. AI calls MUST go through a dev server proxy or serverless function.

## 9. Known technical debt (must fix)

| ID | Issue | Spec action |
|----|-------|-------------|
| TD-1 | `styles.css` not imported in `index.html` or `main.js` | Add `import '../styles.css'` in `main.js` |
| TD-2 | Legacy `app.js` duplicates `src/` | Delete after parity check |
| TD-3 | `components.js` uses `Store`, `toast` without imports | Add imports from `./store.js`, `./utils.js` |
| TD-4 | `package.json` references missing `src/test.ts` | Create test file or remove script |
| TD-5 | No `vite.config.js` | Add if env proxy needed for AI |
| TD-6 | `interview.js` assigns `window.startInterview` globals | Refactor to module scope or event delegation |
| TD-7 | Some renderers use undeclared `escHtml`, `toast`, `navigateTo` | Import or use window globals consistently |

## 10. Conventions for new code

1. **One renderer per topic** in the appropriate domain file (or split when file > 400 lines)
2. **No inline styles** except viz animations; use CSS classes
3. **Escape user-facing strings** with `escHtml` when using `innerHTML`
4. **Bookmark IDs** — pass `extra.id` to `card()` for stable keys
5. **New NAV entries** require simultaneous updates to: `data.js`, `renderers/index.js`, and feature catalog
6. **AI features** — new code in `src/ai/` (TypeScript preferred), never embed API keys in frontend

## 11. AI integration architecture (Phase 2)

```
User submits answer (interview.js)
        │
        ▼
POST /api/evaluate  (Vite dev proxy or serverless)
        │
        ▼
src/ai/evaluate.ts  — uses `ai` SDK + structured output
        │
        ▼
JSON rubric response → render in #iq-result
```

### Evaluate request (planned)

```typescript
type EvaluateRequest = {
    topic: string;
    question: string;
    answer: string;
    hintRevealed: boolean;
};

type EvaluateResponse = {
    score: number;           // 0-100
    strengths: string[];
    gaps: string[];
    seniorTips: string[];
    rubric: {
        coreConcept: 'covered' | 'partial' | 'missing';
        tradeoffs: 'covered' | 'partial' | 'missing';
        scalability: 'covered' | 'partial' | 'missing';
        edgeCases: 'covered' | 'partial' | 'missing';
        production: 'covered' | 'partial' | 'missing';
    };
};
```

## 12. Build & dev commands

```bash
pnpm dev      # vite dev server
pnpm build    # production build
pnpm preview  # preview build
pnpm test     # tsx src/test.ts (when implemented)
```

## 13. Browser support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- ES2020 features assumed
- localStorage required
