// src/content/py-fundamentals.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-fundamentals",
    title: "Python Fundamentals",
    intro: "Everything is an object. Names bind to objects. Mutable vs immutable.",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>Everything is an object. Names bind to objects. Mutable vs immutable.</p>" +
                "<p><b>The invariant that makes almost every Python bug make sense:</b> a name is only a " +
                "<em>label</em> that points at an object — rebinding a name never copies anything, and mutating an " +
                "object is visible through every name bound to it.</p>" +
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Assignment copies the reference</b>, never the object. <code>[]</code> vs " +
                "<code>list(x)</code> is the whole difference between sharing and copying.</li>" +
                "<li><b>Immutable</b> types (<code>int</code>, <code>str</code>, <code>tuple</code>, " +
                "<code>bytes</code>, <code>frozenset</code>) can be shared and cached freely; <b>mutable</b> ones " +
                "(<code>list</code>, <code>dict</code>, <code>set</code>, most class instances) alias.</li>" +
                "<li><b>Tuples are not fully immutable</b>: their <em>contents</em> are fixed, but they can hold " +
                "mutable objects.</li>" +
                "<li><b>CPython's eval loop</b> (3.11+ is a specializing adaptive interpreter) runs bytecode with a " +
                "predictable instruction budget and drops the GIL periodically so waiting threads can run.</li>" +
                "<li><b>Scopes are lexical, not dynamic.</b> A closure captures the cell it was defined in, not " +
                '"whatever the variable happens to hold later".</li>' +
                "</ul>" +
                '<p style="margin-top:10px;">Deeper in the language reference: the <em>Data Model</em> chapter (what ' +
                '"an object" is: identity, type, value) and the <em>Execution Model</em> chapter (frames, generators, ' +
                "<code>await</code>).</p>",
        },
        {
            kind: "card",
            title: "🔗 Names, objects and mutation",
            html: `<pre><code class="language-python">a = [1, 2]      # a -> object X
b = a             # b -> the SAME object X
b.append(3)
print(a)          # [1, 2, 3]   <- the aliasing trap
print(a is b)     # True

a = [9]           # rebinds the NAME a to a new object
print(b)          # [1, 2, 3]   <- X is untouched

c = a[:]         # shallow copy: new list, same inner objects
d = copy.deepcopy(a)   # new objects all the way down</code></pre>
<table class="complexity-table">
<tr><th>Operation</th><th>Type</th><th>Time</th><th>Allocates?</th></tr>
<tr><td><code>list(x)</code> / <code>x[:]</code></td><td>shallow copy</td><td>O(n)</td><td>Yes (new outer container)</td></tr>
<tr><td><code>copy.deepcopy(x)</code></td><td>deep copy</td><td>O(n · d)</td><td>Yes (every reachable object)</td></tr>
<tr><td><code>x += [1]</code></td><td>in-place append</td><td>amortised O(1)</td><td>Maybe, if the list had to grow</td></tr>
<tr><td><code>x = x + [1]</code></td><td>rebinding</td><td>O(n)</td><td>Always</td></tr>
</table>`,
        },
        {
            kind: "card",
            title: "🆚 Built-in containers",
            html: "<p>Pick the container that gives you the cheapest operation for the access pattern you actually have.</p>",
        },
        // The costs table was rendered as a nested card inside "🆚 Built-in
        // containers"; nesting is not expressible as content data, so it follows
        // the lead card as its own block.
        {
            kind: "card",
            title: "📐 Costs, and where they degrade",
            html: `<table class="complexity-table">
<tr><th>Container</th><th>Lookup by key</th><th>Lookup by index</th><th>Insert / remove</th><th>Best for</th></tr>
<tr><td><code>list</code></td><td>—</td><td>O(1)</td><td>O(1) append / O(n) insert</td><td>Ordered sequence, stack</td></tr>
<tr><td><code>tuple</code></td><td>—</td><td>O(1)</td><td>immutable</td><td>Fixed records, dict keys</td></tr>
<tr><td><code>dict</code></td><td>O(1) amortised</td><td>O(1) since 3.7</td><td>O(1) amortised</td><td>Lookup, mapping, ordered set</td></tr>
<tr><td><code>set</code></td><td>O(1) amortised</td><td>—</td><td>O(1) amortised</td><td>Membership, dedupe, intersections</td></tr>
<tr><td><code>deque</code></td><td>—</td><td>O(n)</td><td>O(1) at <em>both</em> ends</td><td>Queues, BFS, sliding windows</td></tr>
<tr><td><code>str</code></td><td>—</td><td>O(1)</td><td>immutable</td><td>Text; copy-on-write by design</td></tr>
</table>
<p style="margin-top:10px;">Complexity here is <em>asymptotic</em>, not a speed guarantee. Hash-based containers degrade when:</p>
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Collisions:</b> adversarial or low-quality hashes (e.g. many keys sharing <code>hash(k) % table_size</code>) push a lookup from O(1) toward O(n). Randomised hashing (Python's <code>str</code>/<code>bytes</code>) is a DoS defence.</li>
<li><b>Resizes:</b> dict/set growth is amortised, but a single insert right after a resize pays the full rehash. Keys must be <b>hashable</b> — a <code>list</code> key raises <code>TypeError</code> immediately.</li>
</ul>`,
        },
        // The legacy card held this paragraph, then the diagram, then one more
        // paragraph; the diagram becomes a sibling block, so both paragraphs sit
        // together here.
        {
            kind: "card",
            title: "🔍 How a name becomes a value",
            html:
                "<p>The compiler decides at compile time which of these instructions to emit; that is why " +
                "<code>global x</code> changes the lookup and why a local shadows a global even before it is " +
                "assigned.</p>" +
                "<p>A local always wins over a global at runtime, which is why <code>print(x)</code> before " +
                "<code>x = 1</code> inside a function raises <code>UnboundLocalError</code> instead of reading the " +
                "global.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Compile-time scope analysis decides which LOAD opcode a name uses",
            source: `flowchart TD
    A["source line reads x"] --> B{"Where was x bound?"}
    B -->|"assigned in this function"| C["LOAD_FAST<br/>slot in the fast-locals array"]
    B -->|"captured from an enclosing function"| D["LOAD_DEREF<br/>read the closure cell"]
    B -->|"module level or never assigned"| E["LOAD_GLOBAL<br/>module dict, then builtins<br/>3.11+ caches this lookup"]
    C --> F["object reference pushed<br/>on the value stack for the next opcode"]
    D --> F
    E --> F`,
        },
        {
            kind: "code",
            title: "💻 Example",
            language: "python",
            code: `# List comprehension vs loop
squares = [x**2 for x in range(10) if x % 2 == 0]
# Generator expression (lazy)
squares_gen = (x**2 for x in range(10))`,
        },
        {
            kind: "card",
            title: "🧬 Comprehensions",
            html: `<p>Every comprehension is secretly a loop that builds a list — except generator expressions, which build
a generator. Writing the loop by hand costs two extra lines and is easier to debug, so the comprehension
is a style choice, not a performance choice.</p>
<pre><code class="language-python"># loop form
result = []
for x in data:
    if x &gt; 0:            # keep the positives only
        result.append(x * 2)

# comprehension form — same semantics
result = [x * 2 for x in data if x &gt; 0]

# nested loops read left to right
pairs = [(x, y) for x in xs for y in ys if x != y]

# dict / set comprehensions
lengths = {w: len(w) for w in words}
uniq = {w.lower() for w in words}</code></pre>
<p style="margin-top:10px;">Scoping note worth memorising: the loop variable of a comprehension lives in a
<em>separate implicit scope</em>, so <code>[y for y in range(3)]</code> does not leak <code>y</code> into the
enclosing function — a classic 3.0 migration bug.</p>`,
        },
        {
            kind: "card",
            title: "🔢 Numbers, hashing and equality",
            html: `<pre><code class="language-python">print(10 ** 20 == int("100000000000000000000"))  # True
print(1 / 3 * 3 == 1.0)                             # False (float)
print(0.1 + 0.2 == 0.3)                             # False! use math.isclose

print(1000 is 1000)          # implementation detail — do not rely on it
print(1000 is 1000)          # may differ inside a list or a tuple

class P:
    def __init__(self, x): self.x = x
    def __eq__(self, o): return self.x == o.x
    def __hash__(self): return hash(self.x)   # required once __eq__ is defined

p = P(1)
print({p, P(1)})             # one entry: equal items collapse</code></pre>
<ul style="padding-left:20px;line-height:1.9;">
<li>Defining <code>__eq__</code> sets <code>__hash__ = None</code> unless you re-declare it — mutable objects must stay unhashable; that is deliberate, not a bug.</li>
<li><code>x in s</code> is <code>__contains__</code> if defined, else <code>__iter__</code>, else a linear scan. Membership over a list is O(n); over a set it is O(1).</li>
<li>Ordering (<code>&lt;</code>) is a <em>separate</em> protocol from equality (<code>==</code>). Implement both (via <code>@total_ordering</code> or the <code>@dataclass(order=True)</code> flag) or neither.</li>
</ul>`,
        },
        {
            kind: "card",
            title: "🐍 Version context that matters",
            html: `<table class="complexity-table">
<tr><th>Release</th><th>What changed for an interview</th></tr>
<tr><td>3.11+</td><td>Specializing adaptive interpreter, ~10-60% faster; ExceptionGroup; <code>tomllib</code>; <code>asyncio.TaskGroup</code>; <code>Self</code> typing.</td></tr>
<tr><td>3.12+</td><td>Per-interpreter GIL (<code>Py_GIL_DISABLED</code> + own GIL per sub-interpreter), f-string grammar relaxation (<code>f"{d["k"]}"</code> and backslashes), <code>itertools.batched</code>, <code>typing.override</code>, 1.2x faster comprehension inlining.</td></tr>
<tr><td>3.13+</td><td><b>Experimental free-threaded build</b> (<code>python3.13t</code>, <code>Py_GIL_DISABLED=1</code>), JIT (experimental), locals semantics defined by PEP 667, <code>copy.replace()</code>, <code>warnings.deprecated()</code>, better interactive REPL. Default builds still have the GIL.</td></tr>
<tr><td>3.14</td><td>Free-threading officially supported (still opt-in at first), JIT preview, <code>asyncio</code> / comprehension speedups.</td></tr>
</table>
<p style="margin-top:10px;">Interview phrasing that lands: "CPython ships one GIL per <em>interpreter</em>, so 3.12's
per-interpreter GIL plus 3.13's experimental free-threaded build are two different pieces of work —
the former isolates sub-interpreters, the latter removes the interpreter-wide lock entirely on opt-in
builds."</p>`,
        },
        {
            kind: "card",
            title: "📊 Object model and memory",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li>Containers hold <b>references</b>. A <code>list[int]</code> of small ints stores pointers to shared " +
                "<code>int</code> objects — mutating one element rebinds the pointer, it does not write into the shared " +
                "int.</li>" +
                "<li><code>sys.getsizeof(obj)</code> shows the object header + fields, <em>not</em> what it " +
                "transitively references. Use <code>tracemalloc</code> for allocation deltas and " +
                "<code>objgraph</code> for reference cycles.</li>" +
                "<li>CPython frees objects deterministically via <b>reference counting</b>. Anything in a cycle needs " +
                "the cyclic GC (<code>gc.collect()</code>, generational collection) or leaks until process exit — and " +
                "a <code>__del__</code> makes a cycle uncollectable.</li>" +
                "<li><code>is</code> compares identity, <code>==</code> compares value. In a list, " +
                "<code>x is not None</code> is the correct idiom for optional arguments.</li>" +
                "</ul>",
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Mutable default argument</b> <code>def f(x, acc=[])</code> — the default is evaluated once at " +
                "<code>def</code> time and shared by every call. Use <code>None</code> and allocate inside.</li>" +
                "<li><b>Late binding in closures</b> — <code>[lambda: i for i in range(3)]</code> gives three " +
                "functions that all return 2. Bind the value: <code>lambda i=i: i</code>.</li>" +
                "<li><b>Iteration while mutating</b> — appending to a list while iterating over it re-reads " +
                "<code>len</code> each step, so the loop silently processes new items. Snapshot with " +
                "<code>list(x)</code>.</li>" +
                "<li><b>Loop-variable capture</b> in list comprehensions (pre-3.0 style) and in <code>lambda</code>s " +
                "stored for later.</li>" +
                "<li><b><code>==</code> on floats</b> — never test float equality; use <code>math.isclose</code> or " +
                "<code>Decimal</code>.</li>" +
                "<li><b>Integer division surprises</b> — <code>7 / 2</code> is <code>3.5</code>, while " +
                "<code>//</code> floors (and <code>-7 // 2 == -4</code>).</li>" +
                '<li><b>String interning assumptions</b> — <code>"a" + "b"</code> may or may not be the same object ' +
                'as <code>"ab"</code>. Never rely on it; rely on <code>==</code>.</li>' +
                "<li><b><code>hash()</code> is salted per process</b> for <code>str</code>/<code>bytes</code>, so " +
                "persisted hashes are not stable across runs. Set <code>PYTHONHASHSEED=0</code> only for " +
                "debugging.</li>" +
                "</ul>",
        },
        {
            kind: "table",
            title: "⏱️ Complexity cheat sheet",
            headers: ["Expression", "Time", "Notes on the bound"],
            rows: [
                [
                    '<code>"".join(list_of_str)</code>',
                    "O(n)",
                    "Faster than repeated <code>+=</code>, which is O(n²) by naive reasoning (CPython's " +
                        "in-place resize makes it amortised, but join still wins on constant factors).",
                ],
                [
                    "<code>[f(x) for x in xs]</code>",
                    "O(n)",
                    "Inner work can dominate: <code>[len(g(x)) for x in xs]</code> is O(Σ cost of g(x)).",
                ],
                [
                    "<code>any(...)</code> / <code>all(...)</code>",
                    "O(k)",
                    "Short-circuits — real cost is where the predicate first fails.",
                ],
                [
                    "<code>x in list</code>",
                    "O(n)",
                    "Degrades to O(n) even for sets if the element is unhashable and forces <code>==</code> " +
                        "scanning.",
                ],
                [
                    "<code>sorted(xs)</code>",
                    "O(n log n)",
                    "Timsort exploits runs: already-sorted or reverse-sorted input is O(n); many short runs merge " +
                        "in O(n log r).",
                ],
                [
                    "<code>d[k] = v</code>",
                    "O(1) amortised",
                    "Worst case O(n) after repeated resizes in a pathological growth pattern.",
                ],
            ],
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "🎤 Interview Q&A" },
        {
            kind: "collapsible",
            title: "Are Python lists / dicts really O(1)? What is the amortised part?",
            html:
                "<p><b>A:</b> <code>list.append</code> and dict insert are amortised O(1): the container " +
                "over-allocates and copies all elements during a resize, which is O(n) but happens only every ~n " +
                "appends, so the average cost stays constant. Single operations are O(1) except the resize itself, " +
                "which is O(n). Lookups degrade toward O(n) only on hash collisions (dict/set) — randomisation of " +
                "string hashing is a deliberate defence against chosen-collision DoS.</p>",
        },
        {
            kind: "collapsible",
            title: "Why is `x = y = []` a bug?",
            html:
                "<p><b>A:</b> it binds both names to the <em>same</em> object, so later mutations are visible " +
                "through both. Assignment binds a name; it never copies. The correct copy is <code>y = x[:]</code> " +
                "(shallow) or <code>y = copy.deepcopy(x)</code> (deep).</p>",
        },
        {
            kind: "collapsible",
            title: 'What does "everything is an object" buy us?',
            html:
                "<p><b>A:</b> a single protocol surface — <code>type()</code>, <code>isinstance()</code>, the data " +
                "model (<code>id()</code>, <code>==</code>, <code>hash()</code>, <code>repr()</code>), duck typing, " +
                "and monkey-patching everything including built-ins. It is why decorators can wrap anything and why " +
                "comprehensions can iterate over any iterable.</p>",
        },
        {
            kind: "collapsible",
            title: "Comprehension or explicit loop? Which is faster?",
            html:
                "<p><b>A:</b> neither, measurably. CPython inlines comprehension frames; the bytecode is the same. " +
                "Pick the form that reads better — the loop for multi-statement bodies, the comprehension when the " +
                "single expression plus filter is the whole job.</p>",
        },
        {
            kind: "collapsible",
            title: "When would you reach for `frozenset` or `tuple` instead of `list`?",
            html:
                "<p><b>A:</b> when the value must be hashable (a dict key or a set member), when it must not be " +
                "mutated accidentally across a boundary, or when a slightly smaller/faster object matters. " +
                "<code>tuple</code> is also the natural shape for fixed records and for " +
                "<code>functools.lru_cache</code> keyword arguments.</p>",
        },
        {
            kind: "card",
            title: "🔥 Real-world usage",
            html:
                "Django/DRF views parse <code>request.query_params</code> into plain dicts, validating that clients " +
                "cannot mutate shared state. Configuration objects are frozen dataclasses. Caching layers key on " +
                "tuples of primitives, never on lists, because <code>list</code> is unhashable. Every profiling " +
                'session that shows "list of dicts" as the hot spot is this same aliasing story.',
        },
        {
            kind: "card",
            title: "🗣️ What to say out loud",
            html:
                'Start from "names bind to objects", show the aliasing trace on the whiteboard, then move to ' +
                "container choice and the <code>hash</code>/<code>__eq__</code> contract. That covers roughly fifteen " +
                "minutes and every follow-up lands inside it.",
        },
    ],
});
