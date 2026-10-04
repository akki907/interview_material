// src/content/react-performance.ts
import { registerContent } from "./registry";

registerContent({
    id: "react-performance",
    title: "React Performance",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html: `
<p>The expensive part is rarely "React is slow". It is "this state lived too high, so a
keystroke re-rendered a table of 5,000 rows". Measure with the Profiler, then apply the
smallest tool that cuts the wasted work: move state down, memoize a heavy child, virtualize
the list, or split the bundle.</p>
<p><code>React.memo</code>, <code>useMemo</code>, and <code>useCallback</code> skip work when
inputs are referentially equal. They do not make a slow function fast, and wrapping
everything in them adds comparison cost plus memory. Profile first.</p>`,
        },
        {
            kind: "card",
            title: "Render fan-out",
            html: `
<p>A state update re-renders the component that owns the state <em>and every descendant</em>,
unless a descendant is memoized and its props are unchanged. That is the default, and it is
correct. Performance work is about shrinking that cone.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    S["setQuery in SearchPage"] --> Page["SearchPage re-renders"]
    Page --> Box["SearchBox"]
    Page --> Filters["Filters"]
    Page --> Table["ResultsTable — 5000 rows"]
    Table --> Row1["Row"]
    Table --> RowN["Row x 4999"]
    Note["Fix: move query state into SearchBox<br/>or memo ResultsTable so only Box re-renders"]
`,
            caption: "State at the top of a wide tree is a fan-out amplifier",
        },
        {
            kind: "card",
            title: "Before / After",
            html: `
<div class="two-col">
<div class="card"><h4>Before</h4>
<p>Search query lives in the page. Typing re-renders the whole table. Rows are not memoized.
A 2 MB chart library is in the main bundle. Images are 4x the display size.</p></div>
<div class="card"><h4>After</h4>
<p>Query state is local to the input. <code>ResultsTable</code> is <code>memo</code>'d and
virtualized. Chart loads via <code>lazy()</code> + <code>Suspense</code>. Images use
<code>srcset</code>.</p></div>
</div>`,
        },
        {
            kind: "card",
            title: "When memoization actually pays",
            html: `
<p>Memoize a child when (1) it is heavy to render, (2) the parent re-renders often, and
(3) you can keep its props stable. If you pass an inline <code>onClick={() =&gt; ...}</code>,
<code>memo</code> never wins. That is the only reason <code>useCallback</code> exists.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    P["Parent re-renders"] --> Cmp{"React.memo: props Object.is equal?"}
    Cmp -->|"yes"| Skip["Skip rendering the child"]
    Cmp -->|"no"| Run["Render child as usual"]
    P --> Inline["inline object or function prop"]
    Inline --> Run
`,
            caption:
                "memo is a prop-equality gate, not a cache of rendered HTML",
        },
        {
            kind: "code",
            title: "Memo Example",
            language: "javascript",
            code: `const Row = React.memo(function Row({ item, onSelect }) {
    return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
});

function List({ items }) {
    const onSelect = useCallback((id) => {
        navigate('/items/' + id);
    }, []);
    return items.map((item) => (
        <Row key={item.id} item={item} onSelect={onSelect} />
    ));
}

const Chart = lazy(() => import('./HeavyChart'));
function Page() {
    return (
        <Suspense fallback={<Spinner />}>
            <Chart />
        </Suspense>
    );
}`,
        },
        {
            kind: "card",
            title: "Pitfalls",
            html: `
<ul style="padding-left:20px;line-height:1.9;">
<li>Memoizing everything. Comparisons are not free; most components are cheap.</li>
<li>Virtualizing too late — if you already mount 10k DOM nodes, memo will not save you.
<code>content-visibility</code> or a windowing library first.</li>
<li>Premature <code>useMemo</code> around cheap math. The hook call can cost more than the math.</li>
<li>Ignoring layout thrash: measuring DOM in <code>useEffect</code> then setting state causes
a flash and a second render. Use <code>useLayoutEffect</code> or CSS.</li>
</ul>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "How do you prove a re-render is the problem?",
                    a: '<p><b>A:</b> React Profiler: record an interaction, look at "why did this render". If the commit is 2ms, stop. If a table is 80ms because props are new objects, then memoize or move state.</p>',
                },
                {
                    q: "Does concurrent React replace memo?",
                    a: "<p><b>A:</b> No. Concurrent features let React yield so the UI stays responsive; they do not skip your component work. You still need to shrink the work per frame.</p>",
                },
            ],
        },
    ],
});
