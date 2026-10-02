# Content module migration spec

You are porting study content from the **legacy** renderers (`src/renderers/*.ts`, imperative DOM code)
to the **new React content model** (`src/content/*.ts`, pure data).

## Target shape

```ts
// src/content/<topic-id>.ts
import { registerContent } from './registry';

registerContent({
    id: 'dsa-arrays',            // must match the legacy nav id exactly
    title: 'Arrays',              // legacy page <h2> text, without emoji prefix
    intro: 'Optional lede sentence shown under the title.',
    blocks: [ /* ContentBlock[] */ ],
});
```

**Read `src/content/dsa-sliding-window.ts` first** — it is the reference implementation and uses every
block type. Match its style, comment density, and tone.

## Block types

```ts
{ kind: 'card',        title: string, html?: string, id?: string }
{ kind: 'diagram',     source: string, caption?: string }        // raw mermaid
{ kind: 'callout',     tone?: 'info'|'good'|'warn'|'c0'|'c1'|'c2'|'c3'|'c4'|'c5', title?: string, html: string }
{ kind: 'collapsible', title: string, html: string, open?: boolean }
{ kind: 'qa',          title?: string, items: Array<{ q: string; a: string; level?: 1|2|3|4|5; probing?: string; followUp?: string }> }
{ kind: 'table',       title?: string, headers: string[], rows: string[][] }
{ kind: 'chips',       items: Array<[label: string, value: string, tone?: 'good'|'warn'|'info']> }
{ kind: 'deflist',     pairs: Array<[term: string, definition: string]> }
{ kind: 'tabs',        tabs: Array<{ label: string; html: string }> }
{ kind: 'code',        title?: string, language: string, code: string, notes?: string }
{ kind: 'pipeline',    stages: Array<{ name: string; desc: string }> }
```

## Legacy → new mapping

| Legacy call | New block |
| --- | --- |
| `card('Title', \`html\`)` | `{ kind:'card', title:'Title', html }` |
| `card('Title', \`html\`, { id:'x' })` | `{ kind:'card', title, html, id:'x' }` |
| `diagram(src, caption)` | `{ kind:'diagram', source: src, caption }` |
| `collapsible('T', html)` | `{ kind:'collapsible', title:'T', html }` |
| `qaCard([[q,a],…])` | `{ kind:'qa', items: pairs.map(([q,a])=>({ q, a })) }` |
| `pipelineStages(stages, cb)` | `{ kind:'pipeline', stages }` |
| `tabs([labels],[contents])` | `{ kind:'tabs', tabs: labels.map((l,i)=>({label:l, html:contents[i]})) }` |
| `<pre><code class="language-x">…` inside a card | prefer `{ kind:'code', language:'x', code }` |
| a `<table>` buried in card html | prefer `{ kind:'table', headers, rows }` |

## Non-negotiable rules

1. **Preserve the prose verbatim.** The HTML bodies are the product. Copy them exactly — do not
   rewrite, summarize, "improve", or drop explanations, edge-case lists, or caveats. Emoji in
   titles is fine; keep it.
2. **Mermaid sources must be byte-identical** to the legacy source. Do not reformat or "fix" them;
   the renderer reports syntax errors and a broken diagram is worse than an ugly one.
3. **Never merge or summarize two cards into one.** Card count must be preserved.
4. Strip only the legacy `bookmark: false` option and the `{ bookmark:false }` third arg.
5. If a legacy block is genuinely interactive (uses `stepControls`, `codeRunner`, or event
   handlers you cannot express), still capture all of its **text content** as a card/code block and
   add a one-line comment noting what interactivity was dropped.
6. No `container.appendChild` / DOM code in the new files — data only.
7. One `registerContent` call per file; no exports needed beyond the side effect.

## Verify before you finish

```bash
cd /Users/akashkumar/workspace/personal/interview_prep
npx tsc --noEmit          # must exit 0
```

Also self-check your batch and report the numbers:

- number of pages/modules written
- number of `card`, `diagram`, `qa`, `table`, `collapsible`, `code`, `pipeline` blocks produced
- any interactivity or content you could not represent

Do NOT edit anything outside `src/content/`. Do NOT touch `src/renderers/`, `src/lib/`, or any page
component — other agents own those.
