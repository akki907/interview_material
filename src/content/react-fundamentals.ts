// src/content/react-fundamentals.ts
import { registerContent } from "./registry";

registerContent({
    id: "react-fundamentals",
    title: "React Fundamentals",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html: `
<p>A React component is a function from <code>(props, state)</code> to a tree of
<em>elements</em> — plain objects — not to DOM nodes. JSX is syntax for
<code>React.createElement</code>. React owns the tree; the browser owns the pixels.
Your job is to describe the next UI; React's job is to make the previous UI match it.</p>
<p><b>The invariant:</b> for a given set of props and state, the component must return the
same element tree. Side effects belong in effects, event handlers, or the server —
never in the render path. If render is not a pure function, concurrent rendering will
show you two versions of the same component at once and the bug becomes visible.</p>
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Elements vs instances vs DOM nodes.</b> An element is <code>{ type, props, key }</code>.
An instance is the fiber that remembers hooks. A DOM node is what the commit phase writes.</li>
<li><b>Props are a snapshot.</b> They never mutate. A child that needs to "change" a prop
asks the parent to set state; the parent re-renders and passes a new snapshot.</li>
<li><b>Keys identify siblings</b> of the same type across renders. Without a stable key,
React treats a reorder as delete-plus-insert and remounts state.</li>
</ul>`,
        },
        {
            kind: "card",
            title: "🔁 From JSX to pixels",
            html: `
<p>Three trees, one direction. You never write the third tree by hand; you author the first
and React diffs the second.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart LR
    JSX["JSX in source"] --> CE["createElement calls<br/>type, props, children"]
    CE --> VDOM["Element tree<br/>plain JS objects"]
    VDOM --> RECON["Reconcile against<br/>the previous fiber tree"]
    RECON --> COMMIT["Commit: mutate the real DOM<br/>run layout effects, then paint"]
`,
            caption:
                "Render produces elements; commit is the only phase allowed to touch the DOM",
        },
        {
            kind: "card",
            title: "📋 Core Concepts",
            html: `
<ul style="padding-left:20px;line-height:1.9;">
<li><strong>Components</strong> — functions that return elements. Class components still exist;
interviews expect hooks-first answers plus "classes keep an instance, functions re-run from scratch".</li>
<li><strong>JSX</strong> — <code>&lt;Foo bar={x} /&gt;</code> is <code>createElement(Foo, { bar: x })</code>.
Lowercase names are host tags (<code>div</code>); capitalized names are components.</li>
<li><strong>Props</strong> — the public API of a component. Treat them as read-only. Default via
parameter defaults, not mutation.</li>
<li><strong>State</strong> — private to the fiber. <code>setState</code> schedules a re-render; it
does not mutate the current render's local variables.</li>
<li><strong>Events</strong> — React 17+ attaches listeners to the root and dispatches a
synthetic event that wraps the native one. Names are camelCase: <code>onClick</code>.</li>
<li><strong>Children</strong> — just a prop. Composition beats inheritance: wrap UI, do not subclass it.</li>
</ul>`,
        },
        {
            kind: "card",
            title: "🔑 Reconciliation in one picture",
            html: `
<p>Same position, same type, same key → reuse the fiber and update props. Type change →
unmount the old subtree and mount a new one. That is why swapping <code>&lt;input&gt;</code>
for <code>&lt;textarea&gt;</code> wipes typed text, and why <code>key={index}</code> on a
sortable list shuffles state onto the wrong rows.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    A["Compare old fiber vs new element"] --> B{"type and key match?"}
    B -->|"yes"| C["Reuse fiber<br/>update props<br/>recurse into children"]
    B -->|"no"| D["Unmount old subtree<br/>destroy state and effects"]
    D --> E["Mount new fiber<br/>run effects after commit"]
    C --> F["Host component: queue DOM update"]
    E --> F
`,
            caption:
                "Identity is type plus key, not visual position on the screen",
        },
        {
            kind: "code",
            title: "💻 Example",
            language: "javascript",
            code: `function Counter({ initial = 0 }) {
    const [count, setCount] = useState(initial);
    return (
        <button onClick={() => setCount(c => c + 1)}>
            Count: {count}
        </button>
    );
}

// Lifting state: the parent owns the value, children only notify
function Parent() {
    const [value, setValue] = useState('');
    return (
        <>
            <SearchBox value={value} onChange={setValue} />
            <Results query={value} />
        </>
    );
}`,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls",
            html: `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Mutating props or state</b> — <code>user.name = 'x'; setUser(user)</code> does not
schedule a render. Copy: <code>setUser({ ...user, name: 'x' })</code>.</li>
<li><b>Index keys on dynamic lists</b> — fine for static, never-reordered lists; wrong for
inserts, deletes, or sorts.</li>
<li><b>Conditional hooks</b> — hooks must run in the same order every render. Put
<code>if</code> inside the hook body, never around the hook call.</li>
<li><b>Derived state copied into <code>useState</code></b> — if it can be computed from props,
compute it during render instead of syncing in an effect.</li>
</ul>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "What does React actually render?",
                    a: "<p><b>A:</b> An element tree. The DOM is a side effect of the commit phase. That split is why SSR, React Native, and testing libraries can all consume the same components.</p>",
                },
                {
                    q: "Why are keys required on lists?",
                    a: "<p><b>A:</b> Reconciliation matches children by type and key. Without keys, React matches by index, so moving item 0 to the end looks like every item changed. Stable IDs keep state attached to the right row.</p>",
                },
                {
                    q: "JSX vs <code>createElement</code>?",
                    a: "<p><b>A:</b> JSX is sugar. After the transform they are identical. Interviews want you to know that <code>class</code> becomes <code>className</code> because it is a JS object key, not HTML.</p>",
                },
            ],
        },
    ],
});
