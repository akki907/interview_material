# Product Specification — Interview OS

**Version:** 1.0  
**Status:** Active  
**Last updated:** 2026-09-17

---

## 1. Vision

Interview OS is a **personal, interactive learning platform** for senior engineers preparing for technical interviews — with emphasis on **AI engineering**, full-stack skills, and system design.

Unlike static cheat sheets or LeetCode clones, Interview OS combines:
- Structured topic pages with mental models, code, and visualizations
- Progress tracking and spaced repetition (flashcards)
- Simulated interview practice with (eventually) AI-powered feedback

## 2. Problem statement

Senior interview prep spans many domains (DSA, React, Python, RAG/agents, system design). Content is scattered across blogs, videos, and notes. Candidates need a **single, navigable system** that supports deep study, quick review, and realistic practice — without requiring sign-up or a backend for the core experience.

## 3. Target users

### Primary persona: Senior AI / Full-Stack Engineer
- 5+ years experience
- Interviewing for staff/senior roles at product companies
- Needs depth in AI (RAG, agents, eval) plus traditional CS fundamentals
- Studies in short sessions; values bookmarks, search, and progress visibility

### Secondary persona: Self-directed learner
- Uses the app as a structured reference while building side projects
- Cares about code examples and architecture patterns

## 4. Product goals

| ID | Goal | Success metric |
|----|------|----------------|
| G1 | Cover all major senior interview domains in one app | 50+ navigable topic pages |
| G2 | Enable fast lookup during study | Global search < 100ms feel; ⌘K shortcut |
| G3 | Support retention via active recall | Flashcards with category filters |
| G4 | Simulate interview pressure | Timed interview mode with hints |
| G5 | Track personal progress locally | Progress, bookmarks, topic completion persist across sessions |
| G6 | Provide AI-quality feedback (future) | LLM evaluates open-ended answers with structured rubric |

## 5. Non-goals (explicit)

- **Not** a social platform (no accounts, sharing, or leaderboards in v1)
- **Not** a code execution sandbox with real Python/JS runtime (simulated run only unless backend added)
- **Not** a full LMS with courses, payments, or admin CMS in v1
- **Not** mobile-native (responsive web is sufficient)
- **Not** offline-first PWA in v1 (nice-to-have later)

## 6. Core user journeys

### J1 — Daily study session
1. Open app → land on Dashboard
2. See weak areas and progress bars
3. Navigate to a topic (e.g. Sliding Window)
4. Read cards, step through visualization, bookmark key sections
5. Mark topic complete in sidebar

### J2 — Quick reference
1. Press ⌘K / Ctrl+K
2. Type topic name
3. Jump directly to page

### J3 — Flashcard review
1. Open Flashcards
2. Filter by category (DSA, RAG, etc.)
3. Flip cards, navigate prev/next

### J4 — Mock interview (current + future)
1. Open Interview Mode
2. Pick topic (DSA, AI, System Design, …)
3. Read question, optionally reveal hint
4. Write or speak answer (text input in future)
5. Submit → receive structured evaluation (stub today; AI in Phase 2)

## 7. Content domains

| Domain | Nav ID prefix | Subtopics (count) | Depth expectation |
|--------|---------------|---------------------|-------------------|
| Dashboard | `dashboard` | 1 | Stats, progress, quick actions |
| DSA | `dsa-*` | 15 | Mental model, code, complexity, viz where applicable |
| React | `react-*` | 7 | Hooks, performance, architecture |
| Python | `py-*` | 10 | AsyncIO, GIL, FastAPI, OOP |
| AI Engineering | `ai-*` | 12 | RAG pipeline, agents, eval, system design |
| System Design | `sd-*` | 12 | Scalability, caching, real-world designs |
| Interview Mode | `interview` | 1 | Topic-picker + Q&A flow |
| Flashcards | `flashcards` | 1 | Filterable deck |

**Total navigable routes:** 59 (57 topic/subtopic pages + dashboard + interview + flashcards)

## 8. UX principles

1. **Dark, developer-focused aesthetic** — low eye strain for long sessions
2. **Progressive disclosure** — collapsibles, tabs, step controls for dense content
3. **Keyboard-first search** — ⌘K global shortcut
4. **Immediate feedback** — toasts for bookmarks, submissions, pipeline clicks
5. **No login friction** — localStorage for personal state
6. **Mobile-usable** — collapsible sidebar below 900px breakpoint

## 9. Quality bar for topic pages

Every topic renderer SHOULD include where applicable:

| Section | Required | Notes |
|---------|----------|-------|
| Page title (`h2`) | Yes | Matches nav label |
| Mental model card | Yes | 1–3 sentence intuition |
| Key concepts / approach | Yes | Bullets or table |
| Code example | Preferred | Syntax-highlighted when hljs available |
| Complexity table | For algorithms | Time/space |
| Visualization / interactive | For DSA patterns | Step controls, pipeline, lifecycle |
| Real-world usage | Optional | Production context |
| Bookmarkable cards | Yes | Via `card()` component |

## 10. Constraints

- **Privacy:** User data stays in browser unless user opts into AI features (API calls)
- **Secrets:** API keys only in `.env.local`, never committed
- **Bundle size:** Prefer vanilla JS; avoid heavy frameworks for v1
- **Accessibility:** Semantic HTML, aria labels on icon buttons, keyboard search

## 11. Open questions

| ID | Question | Default assumption |
|----|----------|-------------------|
| Q1 | Migrate fully to TypeScript or stay JS? | Resolved: full migration done; `src/` is TypeScript |
| Q2 | Remove legacy `app.js`? | Yes, once `src/` parity verified |
| Q3 | Which LLM provider for interview eval? | Vercel AI Gateway (`AI_GATEWAY_API_KEY`) |
| Q4 | Backend for progress sync? | Out of scope until Phase 3 |
