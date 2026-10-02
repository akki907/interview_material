// src/renderers/react.ts
import { h } from '../utils';
import { card, lifecycleSteps, collapsible, diagram, qaCard } from '../components';

export function renderReactFundamentals(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Fundamentals'));

    section.appendChild(card('🧠 Mental Model', `
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
</ul>`));

    const pipelineCard = card('🔁 From JSX to pixels', `
<p>Three trees, one direction. You never write the third tree by hand; you author the first
and React diffs the second.</p>`);
    pipelineCard.appendChild(diagram(`
flowchart LR
    JSX["JSX in source"] --> CE["createElement calls<br/>type, props, children"]
    CE --> VDOM["Element tree<br/>plain JS objects"]
    VDOM --> RECON["Reconcile against<br/>the previous fiber tree"]
    RECON --> COMMIT["Commit: mutate the real DOM<br/>run layout effects, then paint"]
`, 'Render produces elements; commit is the only phase allowed to touch the DOM'));
    section.appendChild(pipelineCard);

    section.appendChild(card('📋 Core Concepts', `
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
</ul>`));

    const reconCard = card('🔑 Reconciliation in one picture', `
<p>Same position, same type, same key → reuse the fiber and update props. Type change →
unmount the old subtree and mount a new one. That is why swapping <code>&lt;input&gt;</code>
for <code>&lt;textarea&gt;</code> wipes typed text, and why <code>key={index}</code> on a
sortable list shuffles state onto the wrong rows.</p>`);
    reconCard.appendChild(diagram(`
flowchart TD
    A["Compare old fiber vs new element"] --> B{"type and key match?"}
    B -->|"yes"| C["Reuse fiber<br/>update props<br/>recurse into children"]
    B -->|"no"| D["Unmount old subtree<br/>destroy state and effects"]
    D --> E["Mount new fiber<br/>run effects after commit"]
    C --> F["Host component: queue DOM update"]
    E --> F
`, 'Identity is type plus key, not visual position on the screen'));
    section.appendChild(reconCard);

    section.appendChild(card('💻 Example', `<pre><code class="language-javascript">function Counter({ initial = 0 }) {
    const [count, setCount] = useState(initial);
    return (
        &lt;button onClick={() =&gt; setCount(c =&gt; c + 1)}&gt;
            Count: {count}
        &lt;/button&gt;
    );
}

// Lifting state: the parent owns the value, children only notify
function Parent() {
    const [value, setValue] = useState('');
    return (
        &lt;&gt;
            &lt;SearchBox value={value} onChange={setValue} /&gt;
            &lt;Results query={value} /&gt;
        &lt;/&gt;
    );
}</code></pre>`));

    section.appendChild(card('⚠️ Pitfalls', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Mutating props or state</b> — <code>user.name = 'x'; setUser(user)</code> does not
schedule a render. Copy: <code>setUser({ ...user, name: 'x' })</code>.</li>
<li><b>Index keys on dynamic lists</b> — fine for static, never-reordered lists; wrong for
inserts, deletes, or sorts.</li>
<li><b>Conditional hooks</b> — hooks must run in the same order every render. Put
<code>if</code> inside the hook body, never around the hook call.</li>
<li><b>Derived state copied into <code>useState</code></b> — if it can be computed from props,
compute it during render instead of syncing in an effect.</li>
</ul>`));

    section.appendChild(qaCard([
        ['What does React actually render?',
            '<p><b>A:</b> An element tree. The DOM is a side effect of the commit phase. That split is why SSR, React Native, and testing libraries can all consume the same components.</p>'],
        ['Why are keys required on lists?',
            '<p><b>A:</b> Reconciliation matches children by type and key. Without keys, React matches by index, so moving item 0 to the end looks like every item changed. Stable IDs keep state attached to the right row.</p>'],
        ['JSX vs <code>createElement</code>?',
            '<p><b>A:</b> JSX is sugar. After the transform they are identical. Interviews want you to know that <code>class</code> becomes <code>className</code> because it is a JS object key, not HTML.</p>'],
    ]));

    container.appendChild(section);
}

export function renderReactHooks(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Hooks Deep Dive'));

    section.appendChild(card('🧠 Mental Model', `
<p>Hooks are a linked list on the fiber, not magic globals. Each call to <code>useState</code>
or <code>useEffect</code> walks to the next slot. That is why the Rules of Hooks exist: if
the call order changes between renders, slot 3 reads what used to be slot 2 and you get
silent, undebuggable state corruption.</p>
<p>State updates are <em>requests</em>. <code>setCount(c =&gt; c + 1)</code> queues a new
render; the <code>count</code> in the current closure stays the old value until that render
runs. Functional updates exist so two updates in the same event both apply.</p>`));

    const rulesCard = card('📏 Rules of Hooks as a state machine', `
<p>React walks this path once per component render. Branching around a hook call is the
only way to skip a node, and skipping a node desynchronizes the list forever.</p>`);
    rulesCard.appendChild(diagram(`
flowchart TD
    R["Component function starts"] --> H1["Hook slot 0: useState"]
    H1 --> H2["Hook slot 1: useEffect"]
    H2 --> H3["Hook slot 2: useRef"]
    H3 --> RET["return element tree"]
    R -.-> X["if (cond) useThing() — FORBIDDEN"]
    X -.-> BAD["next render has a different list length<br/>slots point at the wrong values"]
`, 'Call the same hooks in the same order on every render; put conditions inside the hooks'));
    section.appendChild(rulesCard);

    section.appendChild(card('🎬 useEffect Lifecycle', lifecycleSteps(['Render', 'Commit', 'useEffect', 'External System', 'State Update', 'Render'])));

    const effectCard = card('🔁 Effect subscribe / cleanup', `
<p>Effects run after paint. The cleanup from the previous effect runs before the next
effect, on the same fiber, whenever a dependency changed or the component is about to
unmount. That pairing is how you avoid leaking subscriptions.</p>`);
    effectCard.appendChild(diagram(`
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
`, 'Cleanup always belongs to the previous effect, never to the render that queued it'));
    section.appendChild(effectCard);

    section.appendChild(card('🧰 Hook cheat sheet', `
<table class="complexity-table">
<tr><th>Hook</th><th>Stores</th><th>When it re-runs</th><th>Interview trap</th></tr>
<tr><td><code>useState</code></td><td>a value + a dispatcher</td><td>when the setter is called with a new value</td><td>setting the same primitive is a no-op; setting a mutated object is also a no-op</td></tr>
<tr><td><code>useReducer</code></td><td>state + dispatch</td><td>dispatch of a new state</td><td>prefer it when next state depends on previous in several ways</td></tr>
<tr><td><code>useRef</code></td><td>a mutable box</td><td>never triggers render</td><td>do not read/write <code>ref.current</code> during render except to initialize</td></tr>
<tr><td><code>useEffect</code></td><td>subscribe / sync</td><td>after commit if deps changed</td><td>missing deps → stale closure; object deps → infinite loop</td></tr>
<tr><td><code>useLayoutEffect</code></td><td>DOM measurement</td><td>after DOM mutation, before paint</td><td>blocks paint; use only when the user would see a flicker</td></tr>
<tr><td><code>useMemo</code></td><td>a cached value</td><td>when deps change</td><td>not a semantic guarantee in concurrent React; still must be pure</td></tr>
<tr><td><code>useCallback</code></td><td>a cached function</td><td>when deps change</td><td>only useful if a child is memoized or the fn is a dep of another hook</td></tr>
<tr><td><code>useId</code></td><td>stable id</td><td>never</td><td>SSR-safe; do not use for list keys</td></tr>
</table>`));

    section.appendChild(card('⚠️ Common Pitfalls', `
<ul style="padding-left:20px;line-height:1.9;">
<li>Missing dependency → stale closures. The linter is usually right.</li>
<li>Object / array literals in the dep array → new reference every render → infinite loops.</li>
<li>Async in <code>useEffect</code> without a cancelled flag or <code>AbortController</code> →
setting state after unmount or applying a stale response.</li>
<li>Putting <code>setState</code> in an effect that lists that state as a dep → cascading renders.
Derive instead, or gate on a real external event.</li>
<li>Using <code>useEffect</code> to copy props into state. That is a sign the state should not exist.</li>
</ul>`));

    section.appendChild(card('💻 Custom Hook Example', `<pre><code class="language-javascript">function useDebounce(val, delay) {
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
}</code></pre>`));

    section.appendChild(qaCard([
        ['Why can you not call hooks in a loop?',
            '<p><b>A:</b> The dispatcher finds hook state by call order, not by name. A loop that sometimes runs 2 iterations and sometimes 3 shifts every subsequent slot.</p>'],
        ['useMemo vs useCallback?',
            '<p><b>A:</b> <code>useMemo(() =&gt; fn, deps)</code> is <code>useCallback(fn, deps)</code>. Memo caches a value; callback caches a function identity. Neither makes the work free — they skip recomputation when deps are <code>Object.is</code>-equal.</p>'],
        ['When is useLayoutEffect the right tool?',
            '<p><b>A:</b> When you must read layout (size, position) and write to the DOM before the browser paints, otherwise the user sees a flash. Tooltips, autofocus after measure, scroll restoration. Default to <code>useEffect</code>.</p>'],
    ]));

    container.appendChild(section);
}

export function renderReactState(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'State Management'));

    section.appendChild(card('🧠 Mental Model', `
<p>State should live in the lowest common ancestor of the components that read or write it.
That is "lifting state up". Context is not a state manager — it is a way to skip prop drilling
for a value that already lives somewhere. Libraries (Zustand, Redux, Jotai, TanStack Query)
earn their keep when updates are frequent, the tree is wide, or the source of truth is the
server.</p>
<p><b>Server state vs client state.</b> A list of todos from the API is server state: cache it
(TanStack Query). "Is the modal open?" is client state: <code>useState</code>. Mixing them
in Redux is how stores become a second, stale database.</p>`));

    const placeCard = card('📍 Where does this value live?', `
<p>Walk the decision tree out loud in an interview. Most teams over-reach for a global store
because they are tired of drilling, not because the data is actually global.</p>`);
    placeCard.appendChild(diagram(`
flowchart TD
    Q["Who needs this value?"] --> One["One component"]
    Q --> Few["A subtree"]
    Q --> Many["Distant, unrelated trees"]
    Q --> Server["Comes from the network"]
    One --> US["useState or useReducer"]
    Few --> Lift["Lift to the parent<br/>pass props"]
    Lift --> Ctx{"Drilling through 4+ layers<br/>that do not care?"}
    Ctx -->|"no"| Props["Keep props"]
    Ctx -->|"yes"| Context["Context for that subtree"]
    Many --> Lib["Zustand / Redux / Jotai<br/>subscribe narrowly"]
    Server --> TQ["TanStack Query / SWR<br/>cache, revalidate, mutate"]
`, 'Start local. Promote only when the readers are actually far apart'));
    section.appendChild(placeCard);

    section.appendChild(card('⚡ Patterns', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Lifting state.</b> Two children need the same value → parent owns it, children get
<code>value</code> + <code>onChange</code>.</li>
<li><b>Derived state.</b> <code>const total = items.reduce(...)</code> during render. Do not
store totals in state unless computing them is measurably expensive.</li>
<li><b>Optimistic updates.</b> Write the cache immediately, roll back on error. Query libraries
do this; a homemade Redux slice usually forgets the rollback path.</li>
<li><b>URL as state.</b> Filters, selected tab, pagination belong in search params so refresh
and share work. <code>useSearchParams</code> is a store.</li>
<li><b>Colocate reducers.</b> A form with five dependent fields is <code>useReducer</code>, not
five <code>useState</code>s that fight in effects.</li>
</ul>`));

    const ctxCard = card('📦 Context without accidental broadcasts', `
<p>A context consumer re-renders when the provider's <code>value</code> identity changes.
Putting <code>value={{ user, setUser }}</code> inline creates a new object every render and
defeats memoization of every consumer. Split "rarely changing" from "high-frequency" values,
or use a store that lets components subscribe to a selector.</p>`);
    ctxCard.appendChild(diagram(`
flowchart TD
    P["Provider value equals new object every render"] --> All["Every useContext subscriber re-renders"]
    S["Zustand selector: useStore(s => s.user.id)"] --> One["Only components whose selected slice changed"]
    Split["Split UserContext and ThemeContext"] --> Fine["Theme toggle does not re-render the inbox"]
`, 'Context is a broadcast bus. Selectors and split providers turn it back into a scalpel'));
    section.appendChild(ctxCard);

    section.appendChild(card('💻 Example', `<pre><code class="language-javascript">// Zustand: subscribe to a slice, not the whole store
const useCart = create((set) => ({
    items: [],
    add: (item) => set((s) => ({ items: [...s.items, item] })),
}));
function Badge() {
    const count = useCart((s) => s.items.length);
    return &lt;span&gt;{count}&lt;/span&gt;;
}

// Context done safely: memoize the value
function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const value = useMemo(() => ({ user, setUser }), [user]);
    return &lt;AuthContext.Provider value={value}&gt;{children}&lt;/AuthContext.Provider&gt;;
}</code></pre>`));

    section.appendChild(qaCard([
        ['Redux or Zustand in 2026?',
            '<p><b>A:</b> Zustand for most client trees: less boilerplate, selector subscriptions. Redux Toolkit still wins when you need time-travel, middleware, or a large existing ecosystem. Neither should cache server data that TanStack Query already handles.</p>'],
        ['Is Context slow?',
            '<p><b>A:</b> Context itself is cheap. Re-rendering every consumer on every provider update is not. The fix is split contexts, memoized values, or a store with selectors — not "never use Context".</p>'],
        ['How do you keep form state from exploding?',
            '<p><b>A:</b> Uncontrolled inputs plus <code>FormData</code> for simple forms. <code>useReducer</code> or a form library when fields depend on each other. Do not put keystrokes into a global store.</p>'],
    ]));

    container.appendChild(section);
}

export function renderReactPerformance(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Performance'));

    section.appendChild(card('🧠 Mental Model', `
<p>The expensive part is rarely "React is slow". It is "this state lived too high, so a
keystroke re-rendered a table of 5,000 rows". Measure with the Profiler, then apply the
smallest tool that cuts the wasted work: move state down, memoize a heavy child, virtualize
the list, or split the bundle.</p>
<p><code>React.memo</code>, <code>useMemo</code>, and <code>useCallback</code> skip work when
inputs are referentially equal. They do not make a slow function fast, and wrapping
everything in them adds comparison cost plus memory. Profile first.</p>`));

    const fanoutCard = card('📣 Render fan-out', `
<p>A state update re-renders the component that owns the state <em>and every descendant</em>,
unless a descendant is memoized and its props are unchanged. That is the default, and it is
correct. Performance work is about shrinking that cone.</p>`);
    fanoutCard.appendChild(diagram(`
flowchart TD
    S["setQuery in SearchPage"] --> Page["SearchPage re-renders"]
    Page --> Box["SearchBox"]
    Page --> Filters["Filters"]
    Page --> Table["ResultsTable — 5000 rows"]
    Table --> Row1["Row"]
    Table --> RowN["Row x 4999"]
    Note["Fix: move query state into SearchBox<br/>or memo ResultsTable so only Box re-renders"]
`, 'State at the top of a wide tree is a fan-out amplifier'));
    section.appendChild(fanoutCard);

    section.appendChild(card('🎬 Before / After', `
<div class="two-col">
<div class="card"><h4>❌ Before</h4>
<p>Search query lives in the page. Typing re-renders the whole table. Rows are not memoized.
A 2 MB chart library is in the main bundle. Images are 4x the display size.</p></div>
<div class="card"><h4>✅ After</h4>
<p>Query state is local to the input. <code>ResultsTable</code> is <code>memo</code>'d and
virtualized. Chart loads via <code>lazy()</code> + <code>Suspense</code>. Images use
<code>srcset</code>.</p></div>
</div>`));

    const memoCard = card('🧮 When memoization actually pays', `
<p>Memoize a child when (1) it is heavy to render, (2) the parent re-renders often, and
(3) you can keep its props stable. If you pass an inline <code>onClick={() =&gt; ...}</code>,
<code>memo</code> never wins. That is the only reason <code>useCallback</code> exists.</p>`);
    memoCard.appendChild(diagram(`
flowchart TD
    P["Parent re-renders"] --> Cmp{"React.memo: props Object.is equal?"}
    Cmp -->|"yes"| Skip["Skip rendering the child"]
    Cmp -->|"no"| Run["Render child as usual"]
    P --> Inline["inline object or function prop"]
    Inline --> Run
`, 'memo is a prop-equality gate, not a cache of rendered HTML'));
    section.appendChild(memoCard);

    section.appendChild(card('💻 Memo Example', `<pre><code class="language-javascript">const Row = React.memo(function Row({ item, onSelect }) {
    return &lt;li onClick={() =&gt; onSelect(item.id)}&gt;{item.name}&lt;/li&gt;;
});

function List({ items }) {
    const onSelect = useCallback((id) => {
        navigate('/items/' + id);
    }, []);
    return items.map((item) => (
        &lt;Row key={item.id} item={item} onSelect={onSelect} /&gt;
    ));
}

const Chart = lazy(() => import('./HeavyChart'));
function Page() {
    return (
        &lt;Suspense fallback={&lt;Spinner /&gt;}&gt;
            &lt;Chart /&gt;
        &lt;/Suspense&gt;
    );
}</code></pre>`));

    section.appendChild(card('⚠️ Pitfalls', `
<ul style="padding-left:20px;line-height:1.9;">
<li>Memoizing everything. Comparisons are not free; most components are cheap.</li>
<li>Virtualizing too late — if you already mount 10k DOM nodes, memo will not save you.
<code>content-visibility</code> or a windowing library first.</li>
<li>Premature <code>useMemo</code> around cheap math. The hook call can cost more than the math.</li>
<li>Ignoring layout thrash: measuring DOM in <code>useEffect</code> then setting state causes
a flash and a second render. Use <code>useLayoutEffect</code> or CSS.</li>
</ul>`));

    section.appendChild(qaCard([
        ['How do you prove a re-render is the problem?',
            '<p><b>A:</b> React Profiler: record an interaction, look at "why did this render". If the commit is 2ms, stop. If a table is 80ms because props are new objects, then memoize or move state.</p>'],
        ['Does concurrent React replace memo?',
            '<p><b>A:</b> No. Concurrent features let React yield so the UI stays responsive; they do not skip your component work. You still need to shrink the work per frame.</p>'],
    ]));

    container.appendChild(section);
}

export function renderReactRendering(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Rendering'));

    section.appendChild(card('🧠 Mental Model', `
<p>A render is a calculation. A commit is a mutation. React 18+ can start a render, throw it
away, and start another one before committing — that is concurrent rendering. Your components
must tolerate being invoked twice in development (Strict Mode) and must not have side effects
in the function body.</p>
<p>Transitions mark updates as non-urgent: the typed character in the input stays urgent
(sync), the filtered list can be deferred. Suspense lets a subtree "wait" without blocking
siblings that are already ready.</p>`));

    const phasesCard = card('⏱️ Render vs commit vs paint', `
<p>The browser cannot paint until the commit finishes. Concurrent rendering is React's way of
doing the render work in slices so a high-priority event can jump the queue before commit.</p>`);
    phasesCard.appendChild(diagram(`
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
`, 'Render is interruptible; commit is not'));
    section.appendChild(phasesCard);

    section.appendChild(card('⚡ Concurrent features', `
<table class="complexity-table">
<tr><th>API</th><th>What it changes</th><th>Use when</th></tr>
<tr><td>Automatic batching</td><td>All <code>setState</code>s in an event, timeout, or promise flush once</td><td>Always — do not fight it with leftover <code>flushSync</code></td></tr>
<tr><td><code>startTransition</code></td><td>Marks the update as interruptible</td><td>Filtering, tab switches, anything that can show stale UI for a frame</td></tr>
<tr><td><code>useDeferredValue</code></td><td>Keeps showing the previous value while a new one renders</td><td>A derived list that lags behind an input</td></tr>
<tr><td><code>Suspense</code></td><td>Shows a fallback while a child is not ready</td><td>lazy() code-split, data frameworks that throw promises</td></tr>
<tr><td><code>useTransition</code></td><td>Transition plus an <code>isPending</code> flag</td><td>You need a pending spinner on the deferred UI</td></tr>
</table>`));

    const batchCard = card('📦 Batching and transitions', `
<p>Urgent updates keep the input in sync with the keystrokes. Transitional updates may be
abandoned mid-render if another keystroke arrives. The user never sees a half-built list
because abandoned renders do not commit.</p>`);
    batchCard.appendChild(diagram(`
flowchart TD
    Key["Keystroke"] --> Urgent["Urgent: setInput(next)"]
    Key --> Trans["startTransition: setFilter(next)"]
    Urgent --> Commit1["Commit input immediately"]
    Trans --> Maybe{"Another keystroke before commit?"}
    Maybe -->|"yes"| Drop["Discard in-progress list render"]
    Maybe -->|"no"| Commit2["Commit the filtered list"]
    Drop --> Trans
`, 'Transitions keep typing snappy by making the expensive update skippable'));
    section.appendChild(batchCard);

    section.appendChild(card('💻 Example', `<pre><code class="language-javascript">function Search({ items }) {
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
        &lt;&gt;
            &lt;input value={text} onChange={onChange} /&gt;
            {isPending && &lt;Spinner /&gt;}
            &lt;List items={visible} /&gt;
        &lt;/&gt;
    );
}</code></pre>`));

    section.appendChild(collapsible('Hydration mismatch — why SSR blows up', `
<p>The server rendered HTML must match the first client render of the same components.
<code>Date.now()</code>, <code>Math.random()</code>, <code>typeof window</code> branches, and
invalid HTML nesting (a <code>&lt;p&gt;</code> inside a <code>&lt;p&gt;</code>) cause React to
throw away the server tree and client-render from scratch. Fix: the same data, the same
tree, <code>suppressHydrationWarning</code> only for known time-of-day text, and
<code>useId</code> instead of rolling your own IDs.</p>`));

    section.appendChild(qaCard([
        ['What is hydration?',
            '<p><b>A:</b> Attaching event handlers and fibers to existing server HTML instead of creating DOM from scratch. It is a performance feature and a correctness constraint.</p>'],
        ['Why Strict Mode double-invokes render?',
            '<p><b>A:</b> To surface impure renders and missing effect cleanups before concurrent features do it in production. The extra invoke is not a second commit.</p>'],
    ]));

    container.appendChild(section);
}

export function renderReactArchitecture(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Architecture'));

    section.appendChild(card('🧠 Mental Model', `
<p>Architecture in React is mostly about <em>where code runs</em> and <em>who owns state</em>.
Composition (children, slots, compound components) replaces inheritance. Custom hooks replace
HOCs and render props for shared behavior. Server Components (RSC) move data fetching and
heavy dependencies to the server so the client bundle only contains interactive leaves.</p>`));

    const layerCard = card('🧱 A typical app, layered', `
<p>Keep the arrows one-way. Feature modules import from UI primitives, not the other way
around. Server components import clients; clients never import servers.</p>`);
    layerCard.appendChild(diagram(`
flowchart TB
    RSC["Server Components<br/>fetch data, render static UI"] --> CC["Client Components<br/>hooks, events, local state"]
    ACT["Server Actions<br/>mutations with revalidation"] --> RSC
    CC --> HOOK["Custom hooks<br/>one concern each"]
    CC --> UI["Presentational primitives"]
`, 'RSC is the default; Client Components are the opt-in islands of interactivity'));
    section.appendChild(layerCard);

    section.appendChild(card('⚡ Patterns', `
<table class="complexity-table">
<tr><th>Pattern</th><th>What it solves</th><th>When it hurts</th></tr>
<tr><td>Compound components</td><td><code>Select.Item</code> shares implicit state via context</td><td>Overkill for a one-off button</td></tr>
<tr><td>Custom hooks</td><td>Reuse behavior without wrapping the tree</td><td>A 200-line hook that is secretly a module</td></tr>
<tr><td>Headless + styled</td><td>Logic in a hook or headless lib, look in your design system</td><td>Re-styling a coupled component from a UI kit</td></tr>
<tr><td>Feature folders</td><td>Colocate route, components, tests, API for one domain</td><td>Circular imports when features reach into each other</td></tr>
<tr><td>HOC / render props</td><td>Legacy sharing of behavior</td><td>Wrapper hell; prefer hooks</td></tr>
</table>`));

    const rscCard = card('🌐 Server Components vs Client Components', `
<p>RSC cannot use hooks or browser APIs. They can <code>await</code> a database directly and
send serialized UI to the client. A file with <code>'use client'</code> is a boundary: that
module and its imports become part of the bundle. Push the boundary down so a leaf button
is client, not the whole page.</p>`);
    rscCard.appendChild(diagram(`
flowchart TD
    Page["app/invoices/page.tsx<br/>Server Component"] --> Table["InvoiceTable RSC<br/>await db.invoices()"]
    Table --> Row["InvoiceRow RSC"]
    Row --> Btn["PayButton<br/>use client"]
    Btn --> Hook["useTransition + server action"]
`, 'Only PayButton ships JS; the table HTML arrives already rendered'));
    section.appendChild(rscCard);

    section.appendChild(card('💻 Compound component sketch', `<pre><code class="language-javascript">const TabsContext = createContext(null);

export function Tabs({ children, defaultValue }) {
    const [value, setValue] = useState(defaultValue);
    return (
        &lt;TabsContext.Provider value={{ value, setValue }}&gt;
            {children}
        &lt;/TabsContext.Provider&gt;
    );
}
Tabs.List = function List({ children }) {
    return &lt;div role="tablist"&gt;{children}&lt;/div&gt;;
};
Tabs.Tab = function Tab({ id, children }) {
    const { value, setValue } = useContext(TabsContext);
    return (
        &lt;button role="tab" aria-selected={value === id} onClick={() =&gt; setValue(id)}&gt;
            {children}
        &lt;/button&gt;
    );
};</code></pre>`));

    section.appendChild(qaCard([
        ['Container vs presentational — still relevant?',
            '<p><b>A:</b> The names faded; the split did not. Data and effects in a small parent (or a server component); dumb UI as children. Custom hooks ate the old container classes.</p>'],
        ['How do you keep a feature from importing the world?',
            '<p><b>A:</b> Public API per feature folder (<code>index.ts</code> that exports only the page and types). Cross-feature talk goes through the URL, a query cache, or a thin shared package — not deep imports.</p>'],
    ]));

    container.appendChild(section);
}

export function renderReactInterview(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'React Interview Questions'));

    const recCard = card('🗺️ A 45-minute map', `
<p>Interviewers usually walk this path. Lead with the mental model, then drop into the
diagram they ask for. Do not start with library names.</p>`);
    recCard.appendChild(diagram(`
flowchart TD
    A["Elements vs DOM"] --> B["Reconciliation and keys"]
    B --> C["Hooks: order, effects, stale closures"]
    C --> D["Where state lives"]
    D --> E["Render cost and memo"]
    E --> F["Concurrent: transitions, Suspense"]
    F --> G["RSC vs client bundle"]
`, 'If you can teach this sequence, follow-ups stay inside it'));
    section.appendChild(recCard);

    const questions: Array<[string, string]> = [
        ['What is the difference between useMemo and useCallback?',
            '<p><b>A:</b> <code>useMemo</code> caches a <em>value</em>. <code>useCallback</code> caches a <em>function</em> (it is <code>useMemo(() =&gt; fn, deps)</code>). Both skip work when deps are unchanged by <code>Object.is</code>. They do not make impure functions safe, and they only help if a consumer cares about referential equality — a memoized child or another hook dep list.</p>'],
        ['What are React Server Components?',
            '<p><b>A:</b> Components that run on the server (or at build time), can await data, and send a serialized UI payload. They add zero client JS unless they import a Client Component. The boundary is the <code>use client</code> module. You cannot use hooks or effects in an RSC. The win is a smaller bundle and closer data access, not a new way to handle clicks.</p>'],
        ['How does React reconciliation work?',
            '<p><b>A:</b> React compares the previous fiber tree to the new element tree. Same type and key at a position: reuse the fiber, update props, recurse. Different type: unmount the old subtree (state and effects die) and mount a new one. Lists need stable keys so identity survives reorder. It is not a perfect DOM diff and it does not look at sibling types across different parents.</p>'],
        ['What happens when you call setState?',
            '<p><b>A:</b> React schedules a re-render of that fiber. Updates in the same event are batched. The state variable in the current closure does not change until the next render. Functional updates (<code>c =&gt; c + 1</code>) chain correctly when several updates are queued. After React 18 this batching also applies inside promises and timeouts.</p>'],
        ['Why is useEffect the wrong place to sync props into state?',
            '<p><b>A:</b> You render once with stale state, then the effect runs, then you render again. That flicker is a bug, and Strict Mode makes it obvious. If the value is determined by props, compute it during render. If you need to reset state when an id changes, pass a <code>key</code> so React remounts.</p>'],
        ['Controlled vs uncontrolled inputs?',
            '<p><b>A:</b> Controlled: React state is the source of truth, every keystroke calls <code>setState</code>. Uncontrolled: the DOM holds the value, you read it via a ref or <code>FormData</code> on submit. Controlled is required when other UI depends on the value as you type. Uncontrolled is simpler for large static forms.</p>'],
        ['How would you stop a 10k-row table from hitching on typeahead?',
            '<p>Move the input state down; keep the query in a transition or <code>useDeferredValue</code>; virtualize rows; memoize the row component with a stable <code>onSelect</code>. If the data is server-backed, debounce the request, do not debounce the input itself.</p>'],
        ['What does a hydration mismatch mean?',
            '<p><b>A:</b> The client\'s first render produced a different tree than the server HTML. React logs a warning and may rebuild the DOM. Typical causes: <code>Date</code>, random IDs, <code>window</code> checks, invalid HTML. Fix the tree so both sides agree; do not paper over it with <code>suppressHydrationWarning</code> except for known text like timestamps.</p>'],
    ];
    questions.forEach(([q, a], i) => {
        section.appendChild(collapsible(`Q${i + 1}. ${q}`, a, i === 0));
    });

    container.appendChild(section);
}
