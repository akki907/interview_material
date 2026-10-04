// src/content/react-interview.ts
import { registerContent } from "./registry";

registerContent({
    id: "react-interview",
    title: "React Interview Questions",
    blocks: [
        {
            kind: "card",
            title: "A 45-minute map",
            html: `
<p>Interviewers usually walk this path. Lead with the mental model, then drop into the
diagram they ask for. Do not start with library names.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    A["Elements vs DOM"] --> B["Reconciliation and keys"]
    B --> C["Hooks: order, effects, stale closures"]
    C --> D["Where state lives"]
    D --> E["Render cost and memo"]
    E --> F["Concurrent: transitions, Suspense"]
    F --> G["RSC vs client bundle"]
`,
            caption:
                "If you can teach this sequence, follow-ups stay inside it",
        },
        {
            kind: "collapsible",
            title: "Q1. What is the difference between useMemo and useCallback?",
            open: true,
            html: "<p><b>A:</b> <code>useMemo</code> caches a <em>value</em>. <code>useCallback</code> caches a <em>function</em> (it is <code>useMemo(() =&gt; fn, deps)</code>). Both skip work when deps are unchanged by <code>Object.is</code>. They do not make impure functions safe, and they only help if a consumer cares about referential equality — a memoized child or another hook dep list.</p>",
        },
        {
            kind: "collapsible",
            title: "Q2. What are React Server Components?",
            html: "<p><b>A:</b> Components that run on the server (or at build time), can await data, and send a serialized UI payload. They add zero client JS unless they import a Client Component. The boundary is the <code>use client</code> module. You cannot use hooks or effects in an RSC. The win is a smaller bundle and closer data access, not a new way to handle clicks.</p>",
        },
        {
            kind: "collapsible",
            title: "Q3. How does React reconciliation work?",
            html: "<p><b>A:</b> React compares the previous fiber tree to the new element tree. Same type and key at a position: reuse the fiber, update props, recurse. Different type: unmount the old subtree (state and effects die) and mount a new one. Lists need stable keys so identity survives reorder. It is not a perfect DOM diff and it does not look at sibling types across different parents.</p>",
        },
        {
            kind: "collapsible",
            title: "Q4. What happens when you call setState?",
            html: "<p><b>A:</b> React schedules a re-render of that fiber. Updates in the same event are batched. The state variable in the current closure does not change until the next render. Functional updates (<code>c =&gt; c + 1</code>) chain correctly when several updates are queued. After React 18 this batching also applies inside promises and timeouts.</p>",
        },
        {
            kind: "collapsible",
            title: "Q5. Why is useEffect the wrong place to sync props into state?",
            html: "<p><b>A:</b> You render once with stale state, then the effect runs, then you render again. That flicker is a bug, and Strict Mode makes it obvious. If the value is determined by props, compute it during render. If you need to reset state when an id changes, pass a <code>key</code> so React remounts.</p>",
        },
        {
            kind: "collapsible",
            title: "Q6. Controlled vs uncontrolled inputs?",
            html: "<p><b>A:</b> Controlled: React state is the source of truth, every keystroke calls <code>setState</code>. Uncontrolled: the DOM holds the value, you read it via a ref or <code>FormData</code> on submit. Controlled is required when other UI depends on the value as you type. Uncontrolled is simpler for large static forms.</p>",
        },
        {
            kind: "collapsible",
            title: "Q7. How would you stop a 10k-row table from hitching on typeahead?",
            html: "<p>Move the input state down; keep the query in a transition or <code>useDeferredValue</code>; virtualize rows; memoize the row component with a stable <code>onSelect</code>. If the data is server-backed, debounce the request, do not debounce the input itself.</p>",
        },
        {
            kind: "collapsible",
            title: "Q8. What does a hydration mismatch mean?",
            html: "<p><b>A:</b> The client's first render produced a different tree than the server HTML. React logs a warning and may rebuild the DOM. Typical causes: <code>Date</code>, random IDs, <code>window</code> checks, invalid HTML. Fix the tree so both sides agree; do not paper over it with <code>suppressHydrationWarning</code> except for known text like timestamps.</p>",
        },
    ],
});
