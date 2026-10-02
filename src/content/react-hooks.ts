// src/content/react-hooks.ts
import { registerContent } from "./registry";

registerContent({
    id: "react-hooks",
    title: "Hooks Deep Dive",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html: `
<p>Hooks are a linked list on the fiber, not magic globals. Each call to <code>useState</code>
or <code>useEffect</code> walks to the next slot. That is why the Rules of Hooks exist: if
the call order changes between renders, slot 3 reads what used to be slot 2 and you get
silent, undebuggable state corruption.</p>
<p>State updates are <em>requests</em>. <code>setCount(c =&gt; c + 1)</code> queues a new
render; the <code>count</code> in the current closure stays the old value until that render
runs. Functional updates exist so two updates in the same event both apply.</p>`,
        },
        {
            kind: "card",
            title: "📏 Rules of Hooks as a state machine",
            html: `
<p>React walks this path once per component render. Branching around a hook call is the
only way to skip a node, and skipping a node desynchronizes the list forever.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    R["Component function starts"] --> H1["Hook slot 0: useState"]
    H1 --> H2["Hook slot 1: useEffect"]
    H2 --> H3["Hook slot 2: useRef"]
    H3 --> RET["return element tree"]
    R -.-> X["if (cond) useThing() — FORBIDDEN"]
    X -.-> BAD["next render has a different list length<br/>slots point at the wrong values"]
`,
            caption:
                "Call the same hooks in the same order on every render; put conditions inside the hooks",
        },
        // The legacy card held only an animated lifecycle strip built by
        // lifecycleSteps([...]); a block list cannot nest one, so the strip is
        // emitted as the following pipeline block.
        {
            kind: "card",
            title: "🎬 useEffect Lifecycle",
        },
        {
            kind: "pipeline",
            stages: [
                { name: "Render", desc: "" },
                { name: "Commit", desc: "" },
                { name: "useEffect", desc: "" },
                { name: "External System", desc: "" },
                { name: "State Update", desc: "" },
                { name: "Render", desc: "" },
            ],
        },
        {
            kind: "card",
            title: "🔁 Effect subscribe / cleanup",
            html: `
<p>Effects run after paint. The cleanup from the previous effect runs before the next
effect, on the same fiber, whenever a dependency changed or the component is about to
unmount. That pairing is how you avoid leaking subscriptions.</p>`,
        },
        {
            kind: "diagram",
            source: `
sequenceDiagram
    participant R as Render
    participant C as Commit / paint
    participant E as useEffect
    participant X as External system
    R->>C: produce DOM
    C->>E: run effect body
    E->>X: subscribe / start timer
    Note over R,X: later: deps changed or unmount
    E->>X: cleanup from previous effect
    E->>X: run new effect body
`,
            caption:
                "Cleanup always belongs to the previous effect, never to the render that queued it",
        },
        {
            kind: "table",
            title: "🧰 Hook cheat sheet",
            headers: ["Hook", "Stores", "When it re-runs", "Interview trap"],
            rows: [
                [
                    "<code>useState</code>",
                    "a value + a dispatcher",
                    "when the setter is called with a new value",
                    "setting the same primitive is a no-op; setting a mutated object is also a no-op",
                ],
                [
                    "<code>useReducer</code>",
                    "state + dispatch",
                    "dispatch of a new state",
                    "prefer it when next state depends on previous in several ways",
                ],
                [
                    "<code>useRef</code>",
                    "a mutable box",
                    "never triggers render",
                    "do not read/write <code>ref.current</code> during render except to initialize",
                ],
                [
                    "<code>useEffect</code>",
                    "subscribe / sync",
                    "after commit if deps changed",
                    "missing deps → stale closure; object deps → infinite loop",
                ],
                [
                    "<code>useLayoutEffect</code>",
                    "DOM measurement",
                    "after DOM mutation, before paint",
                    "blocks paint; use only when the user would see a flicker",
                ],
                [
                    "<code>useMemo</code>",
                    "a cached value",
                    "when deps change",
                    "not a semantic guarantee in concurrent React; still must be pure",
                ],
                [
                    "<code>useCallback</code>",
                    "a cached function",
                    "when deps change",
                    "only useful if a child is memoized or the fn is a dep of another hook",
                ],
                [
                    "<code>useId</code>",
                    "stable id",
                    "never",
                    "SSR-safe; do not use for list keys",
                ],
            ],
        },
        {
            kind: "card",
            title: "⚠️ Common Pitfalls",
            html: `
<ul style="padding-left:20px;line-height:1.9;">
<li>Missing dependency → stale closures. The linter is usually right.</li>
<li>Object / array literals in the dep array → new reference every render → infinite loops.</li>
<li>Async in <code>useEffect</code> without a cancelled flag or <code>AbortController</code> →
setting state after unmount or applying a stale response.</li>
<li>Putting <code>setState</code> in an effect that lists that state as a dep → cascading renders.
Derive instead, or gate on a real external event.</li>
<li>Using <code>useEffect</code> to copy props into state. That is a sign the state should not exist.</li>
</ul>`,
        },
        {
            kind: "code",
            title: "💻 Custom Hook Example",
            language: "javascript",
            code: `function useDebounce(val, delay) {
    const [debounced, setDebounced] = useState(val);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(val), delay);
        return () => clearTimeout(t);
    }, [val, delay]);
    return debounced;
}

function useFetch(url) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        const ac = new AbortController();
        fetch(url, { signal: ac.signal })
            .then(r => r.json())
            .then(setData)
            .catch(e => { if (e.name !== 'AbortError') setError(e); });
        return () => ac.abort();
    }, [url]);
    return { data, error };
}`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Why can you not call hooks in a loop?",
                    a: "<p><b>A:</b> The dispatcher finds hook state by call order, not by name. A loop that sometimes runs 2 iterations and sometimes 3 shifts every subsequent slot.</p>",
                },
                {
                    q: "useMemo vs useCallback?",
                    a: "<p><b>A:</b> <code>useMemo(() =&gt; fn, deps)</code> is <code>useCallback(fn, deps)</code>. Memo caches a value; callback caches a function identity. Neither makes the work free — they skip recomputation when deps are <code>Object.is</code>-equal.</p>",
                },
                {
                    q: "When is useLayoutEffect the right tool?",
                    a: "<p><b>A:</b> When you must read layout (size, position) and write to the DOM before the browser paints, otherwise the user sees a flash. Tooltips, autofocus after measure, scroll restoration. Default to <code>useEffect</code>.</p>",
                },
            ],
        },
    ],
});
