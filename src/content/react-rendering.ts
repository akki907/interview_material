// src/content/react-rendering.ts
import { registerContent } from "./registry";

registerContent({
    id: "react-rendering",
    title: "React Rendering",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html: `
<p>A render is a calculation. A commit is a mutation. React 18+ can start a render, throw it
away, and start another one before committing — that is concurrent rendering. Your components
must tolerate being invoked twice in development (Strict Mode) and must not have side effects
in the function body.</p>
<p>Transitions mark updates as non-urgent: the typed character in the input stays urgent
(sync), the filtered list can be deferred. Suspense lets a subtree "wait" without blocking
siblings that are already ready.</p>`,
        },
        {
            kind: "card",
            title: "⏱️ Render vs commit vs paint",
            html: `
<p>The browser cannot paint until the commit finishes. Concurrent rendering is React's way of
doing the render work in slices so a high-priority event can jump the queue before commit.</p>`,
        },
        {
            kind: "diagram",
            source: `
sequenceDiagram
    participant E as Event
    participant R as Render phase
    participant C as Commit phase
    participant B as Browser
    E->>R: setState / startTransition
    R->>R: reconcile fibers, may yield
    Note over R: high-priority update can restart this
    R->>C: once a tree is complete
    C->>C: attach DOM, run layout effects
    C->>B: paint
    C->>C: run passive useEffect after paint
`,
            caption: "Render is interruptible; commit is not",
        },
        {
            kind: "table",
            title: "⚡ Concurrent features",
            headers: ["API", "What it changes", "Use when"],
            rows: [
                [
                    "Automatic batching",
                    "All <code>setState</code>s in an event, timeout, or promise flush once",
                    "Always — do not fight it with leftover <code>flushSync</code>",
                ],
                [
                    "<code>startTransition</code>",
                    "Marks the update as interruptible",
                    "Filtering, tab switches, anything that can show stale UI for a frame",
                ],
                [
                    "<code>useDeferredValue</code>",
                    "Keeps showing the previous value while a new one renders",
                    "A derived list that lags behind an input",
                ],
                [
                    "<code>Suspense</code>",
                    "Shows a fallback while a child is not ready",
                    "lazy() code-split, data frameworks that throw promises",
                ],
                [
                    "<code>useTransition</code>",
                    "Transition plus an <code>isPending</code> flag",
                    "You need a pending spinner on the deferred UI",
                ],
            ],
        },
        {
            kind: "card",
            title: "📦 Batching and transitions",
            html: `
<p>Urgent updates keep the input in sync with the keystrokes. Transitional updates may be
abandoned mid-render if another keystroke arrives. The user never sees a half-built list
because abandoned renders do not commit.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    Key["Keystroke"] --> Urgent["Urgent: setInput(next)"]
    Key --> Trans["startTransition: setFilter(next)"]
    Urgent --> Commit1["Commit input immediately"]
    Trans --> Maybe{"Another keystroke before commit?"}
    Maybe -->|"yes"| Drop["Discard in-progress list render"]
    Maybe -->|"no"| Commit2["Commit the filtered list"]
    Drop --> Trans
`,
            caption:
                "Transitions keep typing snappy by making the expensive update skippable",
        },
        {
            kind: "code",
            title: "💻 Example",
            language: "javascript",
            code: `function Search({ items }) {
    const [text, setText] = useState('');
    const [query, setQuery] = useState('');
    const [isPending, startTransition] = useTransition();

    function onChange(e) {
        const next = e.target.value;
        setText(next);                          // urgent
        startTransition(() => setQuery(next));  // interruptible
    }

    const visible = useMemo(
        () => items.filter((x) => x.includes(query)),
        [items, query],
    );

    return (
        <>
            <input value={text} onChange={onChange} />
            {isPending && <Spinner />}
            <List items={visible} />
        </>
    );
}`,
        },
        {
            kind: "collapsible",
            title: "Hydration mismatch — why SSR blows up",
            html: `
<p>The server rendered HTML must match the first client render of the same components.
<code>Date.now()</code>, <code>Math.random()</code>, <code>typeof window</code> branches, and
invalid HTML nesting (a <code>&lt;p&gt;</code> inside a <code>&lt;p&gt;</code>) cause React to
throw away the server tree and client-render from scratch. Fix: the same data, the same
tree, <code>suppressHydrationWarning</code> only for known time-of-day text, and
<code>useId</code> instead of rolling your own IDs.</p>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "What is hydration?",
                    a: "<p><b>A:</b> Attaching event handlers and fibers to existing server HTML instead of creating DOM from scratch. It is a performance feature and a correctness constraint.</p>",
                },
                {
                    q: "Why Strict Mode double-invokes render?",
                    a: "<p><b>A:</b> To surface impure renders and missing effect cleanups before concurrent features do it in production. The extra invoke is not a second commit.</p>",
                },
            ],
        },
    ],
});
