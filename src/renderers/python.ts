// src/renderers/python.ts
import { h, toast } from '../utils';
import { card, pipelineStages, lifecycleSteps, collapsible, diagram } from '../components';

export function renderPyFundamentals(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Python Fundamentals'));

    section.appendChild(card('🧠 Mental Model', `
<p>Everything is an object. Names bind to objects. Mutable vs immutable.</p>
<p><b>The invariant that makes almost every Python bug make sense:</b> a name is only a
<em>label</em> that points at an object — rebinding a name never copies anything, and mutating an
object is visible through every name bound to it.</p>
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Assignment copies the reference</b>, never the object. <code>[]</code> vs <code>list(x)</code> is the whole difference between sharing and copying.</li>
<li><b>Immutable</b> types (<code>int</code>, <code>str</code>, <code>tuple</code>, <code>bytes</code>, <code>frozenset</code>) can be shared and cached freely; <b>mutable</b> ones (<code>list</code>, <code>dict</code>, <code>set</code>, most class instances) alias.</li>
<li><b>Tuples are not fully immutable</b>: their <em>contents</em> are fixed, but they can hold mutable objects.</li>
<li><b>CPython's eval loop</b> (3.11+ is a specializing adaptive interpreter) runs bytecode with a predictable instruction budget and drops the GIL periodically so waiting threads can run.</li>
<li><b>Scopes are lexical, not dynamic.</b> A closure captures the cell it was defined in, not "whatever the variable happens to hold later".</li>
</ul>
<p style="margin-top:10px;">Deeper in the language reference: the <em>Data Model</em> chapter (what "an object" is: identity, type, value) and the <em>Execution Model</em> chapter (frames, generators, <code>await</code>).</p>`));

    section.appendChild(card('🔗 Names, objects and mutation', `
<pre><code class="language-python">a = [1, 2]      # a -> object X
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
</table>`));

    const cmpCard = card('🆚 Built-in containers', '<p>Pick the container that gives you the cheapest operation for the access pattern you actually have.</p>');
    cmpCard.appendChild(card('📐 Costs, and where they degrade', `
<table class="complexity-table">
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
</ul>`));
    section.appendChild(cmpCard);

    const lookupCard = card('🔍 How a name becomes a value', '<p>The compiler decides at compile time which of these instructions to emit; that is why <code>global x</code> changes the lookup and why a local shadows a global even before it is assigned.</p>');
    lookupCard.appendChild(diagram(`
flowchart TD
    A["source line reads x"] --> B{"Where was x bound?"}
    B -->|"assigned in this function"| C["LOAD_FAST<br/>slot in the fast-locals array"]
    B -->|"captured from an enclosing function"| D["LOAD_DEREF<br/>read the closure cell"]
    B -->|"module level or never assigned"| E["LOAD_GLOBAL<br/>module dict, then builtins<br/>3.11+ caches this lookup"]
    C --> F["object reference pushed<br/>on the value stack for the next opcode"]
    D --> F
    E --> F
`, 'Compile-time scope analysis decides which LOAD opcode a name uses'));
    lookupCard.appendChild(h('p', { innerHTML: 'A local always wins over a global at runtime, which is why <code>print(x)</code> before <code>x = 1</code> inside a function raises <code>UnboundLocalError</code> instead of reading the global.' }));
    section.appendChild(lookupCard);

    section.appendChild(card('💻 Example', `<pre><code class="language-python"># List comprehension vs loop
squares = [x**2 for x in range(10) if x % 2 == 0]
# Generator expression (lazy)
squares_gen = (x**2 for x in range(10))</code></pre>`));

    const comprehensionCard = card('🧬 Comprehensions', `
<p>Every comprehension is secretly a loop that builds a list — except generator expressions, which build
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
enclosing function — a classic 3.0 migration bug.</p>`);
    section.appendChild(comprehensionCard);

    const objCard = card('🔢 Numbers, hashing and equality', `
<pre><code class="language-python">print(10 ** 20 == int("100000000000000000000"))  # True
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
</ul>`);
    section.appendChild(objCard);

    section.appendChild(card('🐍 Version context that matters', `
<table class="complexity-table">
<tr><th>Release</th><th>What changed for an interview</th></tr>
<tr><td>3.11+</td><td>Specializing adaptive interpreter, ~10-60% faster; ExceptionGroup; <code>tomllib</code>; <code>asyncio.TaskGroup</code>; <code>Self</code> typing.</td></tr>
<tr><td>3.12+</td><td>Per-interpreter GIL (<code>Py_GIL_DISABLED</code> + own GIL per sub-interpreter), f-string grammar relaxation (<code>f"{d["k"]}"</code> and backslashes), <code>itertools.batched</code>, <code>typing.override</code>, 1.2x faster comprehension inlining.</td></tr>
<tr><td>3.13+</td><td><b>Experimental free-threaded build</b> (<code>python3.13t</code>, <code>Py_GIL_DISABLED=1</code>), JIT (experimental), locals semantics defined by PEP 667, <code>copy.replace()</code>, <code>warnings.deprecated()</code>, better interactive REPL. Default builds still have the GIL.</td></tr>
<tr><td>3.14</td><td>Free-threading officially supported (still opt-in at first), JIT preview, <code>asyncio</code> / comprehension speedups.</td></tr>
</table>
<p style="margin-top:10px;">Interview phrasing that lands: "CPython ships one GIL per <em>interpreter</em>, so 3.12's
per-interpreter GIL plus 3.13's experimental free-threaded build are two different pieces of work —
the former isolates sub-interpreters, the latter removes the interpreter-wide lock entirely on opt-in
builds."</p>`));

    const basicsCard = card('📊 Object model and memory', `
<ul style="padding-left:20px;line-height:1.9;">
<li>Containers hold <b>references</b>. A <code>list[int]</code> of small ints stores pointers to shared <code>int</code> objects — mutating one element rebinds the pointer, it does not write into the shared int.</li>
<li><code>sys.getsizeof(obj)</code> shows the object header + fields, <em>not</em> what it transitively references. Use <code>tracemalloc</code> for allocation deltas and <code>objgraph</code> for reference cycles.</li>
<li>CPython frees objects deterministically via <b>reference counting</b>. Anything in a cycle needs the cyclic GC (<code>gc.collect()</code>, generational collection) or leaks until process exit — and a <code>__del__</code> makes a cycle uncollectable.</li>
<li><code>is</code> compares identity, <code>==</code> compares value. In a list, <code>x is not None</code> is the correct idiom for optional arguments.</li>
</ul>`);
    section.appendChild(basicsCard);

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Mutable default argument</b> <code>def f(x, acc=[])</code> — the default is evaluated once at <code>def</code> time and shared by every call. Use <code>None</code> and allocate inside.</li>
<li><b>Late binding in closures</b> — <code>[lambda: i for i in range(3)]</code> gives three functions that all return 2. Bind the value: <code>lambda i=i: i</code>.</li>
<li><b>Iteration while mutating</b> — appending to a list while iterating over it re-reads <code>len</code> each step, so the loop silently processes new items. Snapshot with <code>list(x)</code>.</li>
<li><b>Loop-variable capture</b> in list comprehensions (pre-3.0 style) and in <code>lambda</code>s stored for later.</li>
<li><b><code>==</code> on floats</b> — never test float equality; use <code>math.isclose</code> or <code>Decimal</code>.</li>
<li><b>Integer division surprises</b> — <code>7 / 2</code> is <code>3.5</code>, while <code>//</code> floors (and <code>-7 // 2 == -4</code>).</li>
<li><b>String interning assumptions</b> — <code>"a" + "b"</code> may or may not be the same object as <code>"ab"</code>. Never rely on it; rely on <code>==</code>.</li>
<li><b><code>hash()</code> is salted per process</b> for <code>str</code>/<code>bytes</code>, so persisted hashes are not stable across runs. Set <code>PYTHONHASHSEED=0</code> only for debugging.</li>
</ul>`));

    section.appendChild(card('⏱️ Complexity cheat sheet', `
<table class="complexity-table">
<tr><th>Expression</th><th>Time</th><th>Notes on the bound</th></tr>
<tr><td><code>"".join(list_of_str)</code></td><td>O(n)</td><td>Faster than repeated <code>+=</code>, which is O(n²) by naive reasoning (CPython's in-place resize makes it amortised, but join still wins on constant factors).</td></tr>
<tr><td><code>[f(x) for x in xs]</code></td><td>O(n)</td><td>Inner work can dominate: <code>[len(g(x)) for x in xs]</code> is O(Σ cost of g(x)).</td></tr>
<tr><td><code>any(...)</code> / <code>all(...)</code></td><td>O(k)</td><td>Short-circuits — real cost is where the predicate first fails.</td></tr>
<tr><td><code>x in list</code></td><td>O(n)</td><td>Degrades to O(n) even for sets if the element is unhashable and forces <code>==</code> scanning.</td></tr>
<tr><td><code>sorted(xs)</code></td><td>O(n log n)</td><td>Timsort exploits runs: already-sorted or reverse-sorted input is O(n); many short runs merge in O(n log r).</td></tr>
<tr><td><code>d[k] = v</code></td><td>O(1) amortised</td><td>Worst case O(n) after repeated resizes in a pathological growth pattern.</td></tr>
</table>`));

    const qCard = card('🎤 Interview Q&A', '');
    qCard.appendChild(collapsible('Are Python lists / dicts really O(1)? What is the amortised part?', `
<p><b>A:</b> <code>list.append</code> and dict insert are amortised O(1): the container over-allocates and
copies all elements during a resize, which is O(n) but happens only every ~n appends, so the average cost
stays constant. Single operations are O(1) except the resize itself, which is O(n). Lookups degrade toward
O(n) only on hash collisions (dict/set) — randomisation of string hashing is a deliberate defence against
chosen-collision DoS.</p>`));
    qCard.appendChild(collapsible('Why is `x = y = []` a bug?', `
<p><b>A:</b> it binds both names to the <em>same</em> object, so later mutations are visible through both.
Assignment binds a name; it never copies. The correct copy is <code>y = x[:]</code> (shallow) or
<code>y = copy.deepcopy(x)</code> (deep).</p>`));
    qCard.appendChild(collapsible('What does "everything is an object" buy us?', `
<p><b>A:</b> a single protocol surface — <code>type()</code>, <code>isinstance()</code>, the data model
(<code>id()</code>, <code>==</code>, <code>hash()</code>, <code>repr()</code>), duck typing, and
monkey-patching everything including built-ins. It is why decorators can wrap anything and why
comprehensions can iterate over any iterable.</p>`));
    qCard.appendChild(collapsible('Comprehension or explicit loop? Which is faster?', `
<p><b>A:</b> neither, measurably. CPython inlines comprehension frames; the bytecode is the same. Pick the
form that reads better — the loop for multi-statement bodies, the comprehension when the single expression
plus filter is the whole job.</p>`));
    qCard.appendChild(collapsible('When would you reach for `frozenset` or `tuple` instead of `list`?', `
<p><b>A:</b> when the value must be hashable (a dict key or a set member), when it must not be mutated
accidentally across a boundary, or when a slightly smaller/faster object matters. <code>tuple</code> is also
the natural shape for fixed records and for <code>functools.lru_cache</code> keyword arguments.</p>`));
    section.appendChild(qCard);

    section.appendChild(card('🔥 Real-world usage', 'Django/DRF views parse <code>request.query_params</code> into plain dicts, validating that clients cannot mutate shared state. Configuration objects are frozen dataclasses. Caching layers key on tuples of primitives, never on lists, because <code>list</code> is unhashable. Every profiling session that shows "list of dicts" as the hot spot is this same aliasing story.'));
    section.appendChild(card('🗣️ What to say out loud', 'Start from "names bind to objects", show the aliasing trace on the whiteboard, then move to container choice and the <code>hash</code>/<code>__eq__</code> contract. That covers roughly fifteen minutes and every follow-up lands inside it.'));

    container.appendChild(section);
}

export function renderPyDecorators(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Decorators'));

    section.appendChild(card('🧠 Mental Model', `
<p>Functions that modify other functions. Wraps behavior without changing source.</p>
<p><b>The invariant that makes decorators safe:</b> a decorator must return a callable that is
<b>interchangeable</b> with the function it replaced — same signature, same return value, same side
effects. Everything else (<code>functools.wraps</code>, argument forwarding, attribute copying) exists to
protect that invariant.</p>
<p>A decorator is exactly <code>fn = decorator(fn)</code>. Python has no syntax for it; the
<code>@</code> sign is that one line, written for you.</p>`));

    section.appendChild(card('🎯 Order of application', `
<p>Bottom-up. The decorator closest to <code>def</code> is applied first, and the last one written on top
is applied last — so the outermost call at runtime is the one written first, i.e. the one farthest from
<code>def</code>.</p>
<pre><code class="language-python">@a
@b
def f(): ...          # == def f(): ...
                       #     f = a(b(f))</code></pre>
<p>At call time the order <b>inverts</b>: <code>a</code>'s wrapper runs first, then <code>b</code>'s, then
<code>f</code>'s body.</p>`));

    const orderCard = card('🔁 Decoration order, visually', '<div class="viz-area"></div>');
    orderCard.appendChild(diagram(`
flowchart TB
    DEF["def f<br/>plain function object"] --> D1["apply b<br/>f = b(f)<br/>b-wrapper wraps plain f"]
    D1 --> D2["apply a<br/>f = a(b(f))<br/>a-wrapper wraps b-wrapper"]
    D2 --> CALL["call f<br/>a outer &rarr; b &rarr; original"]
    DEF -.-> D3["@a<br/>written here<br/>but applied last"]
    D3 -.-> D2
`, 'Bottom-up decoration, top-down execution'));
    section.appendChild(orderCard);

    section.appendChild(card('💻 Example', `<pre><code class="language-python">def retry(max_attempts=3):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try: return fn(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1: raise
        return wrapper
    return decorator</code></pre>`));

    section.appendChild(card('🔁 Decorators with parameters', `
<p>Because <code>@retry</code> calls <code>retry(fn)</code>, a decorator that takes arguments needs the
extra <em>closure</em> layer: <code>retry(...)</code> returns <code>decorator</code>, which returns
<code>wrapper</code>, which finally receives the call. That is why "parameterised decorators" are three
levels deep.</p>
<pre><code class="language-python">from functools import wraps, lru_cache
import time

def retry(times=3, delay=0.1, exceptions=(Exception,)):
    def decorator(fn):                       # level 2: receives the function
        @wraps(fn)                           # keep __name__/__doc__/__wrapped__
        def wrapper(*args, **kwargs):        # level 3: receives the call
            for attempt in range(times):
                try:
                    return fn(*args, **kwargs)
                except exceptions:
                    if attempt == times - 1:
                        raise               # re-raise the LAST error, never swallow
                time.sleep(delay * 2 ** attempt)   # exponential backoff
            return None                     # unreachable: loop returns or raises
        return wrapper
    return decorator

@retry(times=5, exceptions=(ConnectionError, TimeoutError))
def fetch(url): ...</code></pre>
<p style="margin-top:10px;">Catching bare <code>Exception</code> around a retry is usually a bug — never
retry <code>ValueError</code> or <code>KeyError</code>, those will never succeed. Narrow the
<code>exceptions</code> tuple and let real bugs surface.</p>`));

    section.appendChild(card('🧷 Built-in decorators', `
<table class="complexity-table">
<tr><th>Decorator</th><th>What it does</th><th>Interview angle</th></tr>
<tr><td><code>@functools.wraps(fn)</code></td><td>Copies <code>__name__</code>, <code>__doc__</code>, <code>__wrapped__</code>, <code>__dict__</code> onto the wrapper</td><td>Without it, <code>help()</code>, logging by function name and Sphinx all break</td></tr>
<tr><td><code>@property</code></td><td>Descriptor: <code>obj.attr</code> becomes a method call</td><td>Use for computed attributes; never for expensive work with no invalidation story</td></tr>
<tr><td><code>@staticmethod</code> / <code>@classmethod</code></td><td>Descriptors that rebind <code>__get__</code></td><td><code>classmethod</code> receives the class — the idiomatic place for alternative constructors</td></tr>
<tr><td><code>@lru_cache</code> / <code>@cache</code></td><td>Memoisation keyed on args; <code>cache_info()</code> exposes hits/misses</td><td>Requires hashable arguments; caching a coroutine leaks the un-awaited coroutine (see async page)</td></tr>
<tr><td><code>@property.setter</code></td><td>Second function with the same name</td><td>Validation belongs here; see pitfall 3 below</td></tr>
<tr><td><code>@abstractmethod</code></td><td>Marks a method for <code>ABC</code>; blocks instantiation</td><td>Structural, not nominal, typing: duck typing at class level</td></tr>
<tr><td><code>@dataclass</code></td><td>Generates <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code> from annotations</td><td><code>frozen=True</code> adds <code>__hash__</code>; <code>slots=True</code> saves memory</td></tr>
<tr><td><code>@contextlib.contextmanager</code></td><td>Turns a generator into a <code>with</code> statement</td><td>Ensure the <code>yield</code> is guarded by <code>try/finally</code></td></tr>
<tr><td><code>@functools.singledispatch</code></td><td>Dispatches on the type of the first argument</td><td>Functional replacement of <code>isinstance</code> dispatch</td></tr>
</table>`));

    const classCard = card('🧱 Class decorators & stacked use', `
<pre><code class="language-python">registry = {}

def register(cls):
    registry[cls.__name__] = cls
    return cls

@register                      # applied AFTER validate below? no — bottom-up: validate first
@dataclass(frozen=True, slots=True)
class Config:
    retries: int = 3
    timeout: float = 1.5

@timed
@register
@cache
def fetch_key(k): ...</code></pre>
<p style="margin-top:10px;">Read <code>@timed @register @cache</code> as
<code>fetch_key = timed(register(cache(fetch_key)))</code>: <code>cache</code> wraps first (innermost),
so the cache lives closest to the real work and <code>timed</code> measures both cache hits and misses.
Order is a design decision about which layer owns which responsibility.</p>`);
    section.appendChild(classCard);

    const diagCard = card('🩺 Parameterised decorator anatomy', '');
    diagCard.appendChild(diagram(`
flowchart TD
    CALL["@retry(times=5)"] --> L1["retry(times=5)<br/>captures times + delay in a closure"]
    L1 -->|"returns decorator"| L2["decorator(fn)<br/>receives the undecorated function"]
    L2 --> L3["wrapper(*args, **kwargs)<br/>performs the actual work"]
    L3 --> FN["fn(*args, **kwargs)<br/>the original function body"]
    L3 -->|"raises after last attempt"| ERR["propagate the last exception"]
    WRAPS["@wraps(fn)<br/>copies __name__ and __doc__"] -.-> L3
`, 'The three levels: parameter binding, function binding, call binding'));
    section.appendChild(diagCard);

    section.appendChild(card('⏱️ Cost', `
<table class="complexity-table">
<tr><th>Aspect</th><th>Cost</th><th>Degrades when</th></tr>
<tr><td>Import time</td><td>O(1) per decoration</td><td>Thousands of decorated definitions at import time (e.g. huge generated APIs)</td></tr>
<tr><td>Runtime per call</td><td>+1 Python frame (<code>wrapper</code>) → roughly 1-2 µs</td><td>Hot loops called millions of times per second</td></tr>
<tr><td>Memory</td><td>One extra function object + one closure cell per decoration</td><td>Dynamic per-call decoration (a decorator factory in a loop)</td></tr>
<tr><td>Debuggability</td><td>Stack frames gain a <code>wrapper</code> level; <code>inspect.stack()</code> shows it</td><td>—</td></tr>
</table>`));

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Forgetting <code>@wraps</code></b> — the function loses its name and docstring, which breaks introspection, logging by <code>__name__</code>, and framework registration.</li>
<li><b>Mutating the setter instead of the attribute.</b> With <code>@x.setter</code>, assigning <code>self.x = value</code> recurses into the setter infinitely. Either validate into a different attribute or make the property return a value without storing it.</li>
<li><b>Caching coroutines.</b> <code>@lru_cache</code> on an <code>async def</code> returns the <em>same coroutine object</em>; the second caller gets a coroutine that has already been awaited → <code>RuntimeError: cannot reuse already awaited coroutine</code>. Use an explicit per-key <code>asyncio.Lock</code> instead.</li>
<li><b>Decorating across processes.</b> A closure-based decorator is not picklable, so <code>multiprocessing.Pool.imap</code> over decorated functions fails. Use module-level functions or <code>functools.partial</code>.</li>
<li><b>Losing the ability to call the original.</b> Keep <code>wrapper.__wrapped__ = fn</code> (that is what <code>@wraps</code> does) so tests and <code>inspect.signature</code> can reach the undecorated version.</li>
<li><b>Decorating <code>async def</code> with a sync wrapper</b> blocks the event loop — the wrapper must be <code>async def</code> and must <code>await fn(...)</code>.</li>
<li><b>Class decorators break <code>isinstance</code></b> if they return a different object (a proxy, a factory) — a classic surprise when a "decorator" is really a metaclass replacement.</li>
</ul>`));

    const dqCard = card('🎤 Interview Q&A', '');
    dqCard.appendChild(collapsible('Explain decorators without using the word "wrapper".', `
<p><b>A:</b> a decorator is a function that takes a function and returns a replacement. <code>@d</code> is
syntactic sugar for <code>f = d(f)</code>. The return value only has to be callable — it can be a plain
function, a class, or a callable object — but to keep <code>f</code> substitutable it must preserve the
signature and metadata, which is what <code>functools.wraps</code> is for.</p>`));
    dqCard.appendChild(collapsible('What is the difference between a class decorator and `metaclass`?', `
<p><b>A:</b> a class decorator runs once, right after the class body finishes executing, and receives the
finished class object — good for registration, validation and wrapping. A metaclass controls class
<em>creation</em> (methods like <code>__call__</code>, <code>__new__</code>, <code>__init_subclass__</code>)
and applies to every class in that hierarchy, including subclasses.</p>`));
    dqCard.appendChild(collapsible('How would you add a timeout to an arbitrary function?', `
<p><b>A:</b> with <code>functools.wraps</code> and a thread if the callee is sync:</p>
<pre><code class="language-python">def timeout(seconds):
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **k):
            with ThreadPoolExecutor(max_workers=1) as ex:
                fut = ex.submit(fn, *a, **k)
                try:
                    return fut.result(timeout=seconds)
                except TimeoutError:
                    fut.cancel()
                    raise
        return wrapper
    return deco</code></pre>
<p>For <code>async def</code>, use <code>asyncio.timeout()</code> / <code>asyncio.wait_for()</code> instead —
cancellation is cooperative and cheap there.</p>`));
    dqCard.appendChild(collapsible('Why is `@lru_cache` dangerous on an `async def`?', `
<p><b>A:</b> the cache stores the coroutine object, not its result. The first caller awaits it; the second
caller receives the already-consumed coroutine and gets "cannot reuse already awaited coroutine".
Fixes: cache on the awaited result inside an <code>async</code> wrapper with a per-key
<code>asyncio.Lock</code>, or use a <code>Task</code> as the cached value so concurrent callers
<code>await</code> the same in-flight operation.</p>`));
    dqCard.appendChild(collapsible('Do decorators hurt performance?', `
<p><b>A:</b> one extra Python frame per call — on the order of a microsecond, negligible for I/O-bound
code and measurable only in tight numeric loops. Also note <code>functools.wraps</code> sets
<code>__wrapped__</code>, so <code>inspect</code> and <code>help</code> still report the original
signature.</p>`));
    section.appendChild(dqCard);

    section.appendChild(card('🔥 Real-world usage', 'Every Flask/FastAPI route uses <code>@app.get</code>. Flask adds one more layer: <code>@app.route</code> wraps the view in <code>werkzeug</code> request context management. <code>functools.lru_cache</code> fronts memoised lookups; <code>@retry</code> and <code>@timeout</code> wrap SDK clients; <code>@dataclass</code> turns config classes into validated records; <code>@override</code> (3.12+) documents Liskov overrides.'));
    section.appendChild(card('🗣️ What to say out loud', 'Say the one-liner (<code>f = d(f)</code>), then the application order and the call order, then show the three-level parameterised form. Name <code>@wraps</code> and the coroutine-caching trap unprompted — that is the detail that separates a memorised answer from a real one.'));

    container.appendChild(section);
}


export function renderPyAsyncio(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'AsyncIO'));

    section.appendChild(card('🧠 Mental Model', `
<p>Single-threaded concurrency via event loop. Coroutines yield control with await.</p>
<p><b>The invariant that makes asyncio correct:</b> a coroutine runs to completion only between
<code>await</code> points. At an <code>await</code> the interpreter suspends the frame, registers a
callback for the future it is waiting on, and hands the thread back to the loop — so N tasks are served
by <em>one</em> thread and progress requires that the awaited operation be genuinely asynchronous.</p>
<p>If an <code>await</code> expression blocks the thread (a <code>time.sleep</code>, a synchronous DB
driver, a big pure-Python loop), every other task stalls with it. That single sentence explains almost
every asyncio bug.</p>`));

    const loopCard = card('🔄 How the event loop schedules tasks', '<p>Read the diagram top to bottom: one <code>Task</code> blocks at <code>await</code>, its continuation is parked, and the loop serves the next ready task until a selector reports I/O completion. Concurrency is an illusion of interleaving, not parallelism.</p>');
    loopCard.appendChild(diagram(`
sequenceDiagram
    autonumber
    participant T as Task A
    participant L as EventLoop
    participant Q as Ready queue
    participant S as Selector (epoll / kqueue)
    participant T2 as Task B
    T->>L: task starts running
    L->>Q: move remaining tasks to ready queue
    L->>T: resume Task A on next iteration
    T->>S: await socket.read() - registers callback, suspends
    T-->>L: frame parked, control returns to loop
    L->>T2: resume Task B
    T2->>S: await socket.write()
    S-->>L: socket A readable
    L->>T: schedule Task A continuation in ready queue
    L->>T: Task A resumes after the await point
`, 'One thread, many tasks: suspend at await, resume from the selector'));
    section.appendChild(loopCard);

    section.appendChild(card('🎬 Event Loop', '<div class="viz-area" id="asyncio-viz"></div>'));

    const stepCard = card('🔬 What `await` actually does', `
<table class="complexity-table">
<tr><th>Expression</th><th>What is awaited</th><th>Who resumes it</th></tr>
<tr><td><code>await sleep(1)</code></td><td>TimerHandle</td><td>The loop's <code>_run_once</code> when the monotonic clock passes the deadline</td></tr>
<tr><td><code>await queue.get()</code></td><td>Queue getter future</td><td>The producer's <code>put_nowait</code></td></tr>
<tr><td><code>await lock.acquire()</code></td><td>Lock acquire future</td><td>The first releaser, or the next FIFO waiter</td></tr>
<tr><td><code>await task</code></td><td>The child task</td><td>That task's completion callback</td></tr>
<tr><td><code>await future</code></td><td>Plain future</td><td>Whoever calls <code>set_result</code> / <code>set_exception</code></td></tr>
<tr><td><code>await gather(...)</code></td><td>Future wrapping all children</td><td>When the last child finishes; cancels siblings on error</td></tr>
</table>
<p style="margin-top:10px;"><b>Blocking <code>await</code></b> suspends <em>the current task</em>, not
the thread. That is why <code>asyncio.sleep</code> is mandatory and <code>time.sleep</code> is a bug:
with ten tasks doing <code>time.sleep(1)</code> the run takes ten seconds, not one.</p>`);
    section.appendChild(stepCard);

    section.appendChild(card('💻 Example', `<pre><code class="language-python">import asyncio

async def fetch(url):
    await asyncio.sleep(1)  # Simulate I/O
    return f"Data from {url}"

async def main():
    results = await asyncio.gather(
        fetch("api/1"), fetch("api/2")
    )</code></pre>`));

    const tasksCard = card('🧱 Concurrent primitives (3.11+)', `
<p><b>TaskGroup</b> is the structured-concurrency answer. It owns its children: it starts them together,
waits for all of them, and on any exception it cancels the survivors and raises an
<code>ExceptionGroup</code>. No leaked tasks, no forgotten <code>await</code>.</p>
<pre><code class="language-python">async def main():
    async with asyncio.TaskGroup() as tg:          # 3.11+
        for user_id in ids:
            tg.create_task(process(user_id))       # children cancelled if one raises

# child failures are collected, never swallowed silently
try:
    async with asyncio.TaskGroup() as tg:
        tg.create_task(flaky_a())
        tg.create_task(flaky_b())
except* TimeoutError as eg:
    ...   # except* splits an ExceptionGroup by type (3.11+)

# 3.8-3.10 equivalent, correct but noisier
tasks = [asyncio.create_task(w(i)) for i in range(100)]
try:
    results = await asyncio.gather(*tasks, return_exceptions=True)
finally:
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)</code></pre>
<table class="complexity-table">
<tr><th>Primitive</th><th>Blocks?</th><th>Typical use</th><th>Gotcha</th></tr>
<tr><td><code>asyncio.sleep</code></td><td>No</td><td>Simulated latency, retry backoff</td><td>Never <code>time.sleep</code></td></tr>
<tr><td><code>Semaphore(n)</code></td><td>Yes, when n in flight</td><td>Cap concurrency against a rate-limited API</td><td>The <code>async with</code> must wrap the actual await</td></tr>
<tr><td><code>Queue</code></td><td>Yes when empty</td><td>Producer/consumer pipelines</td><td>Unbounded queue hides back-pressure</td></tr>
<tr><td><code>Lock</code></td><td>Yes</td><td>Mutual exclusion, e.g. one in-flight refresh</td><td>Re-entering deadlocks (no owner tracking)</td></tr>
<tr><td><code>Event</code></td><td>Yes</td><td>One-shot "shutdown" signal</td><td>Must <code>clear()</code> if reusable</td></tr>
<tr><td><code>Condition</code></td><td>Yes</td><td>Wait for a predicate to become true</td><td>Use <code>wait_for</code>, not bare <code>wait</code></td></tr>
<tr><td><code>gather</code></td><td>Yes</td><td>Fire-and-await a fixed set</td><td>Order preserved, exceptions raised eagerly</td></tr>
<tr><td><code>TaskGroup</code></td><td>Yes</td><td>Structured concurrency (preferred)</td><td>Child exceptions are grouped</td></tr>
<tr><td><code>shield</code></td><td>No</td><td>Protect an inner operation from outer cancel</td><td>The outer <code>await</code> still raises <code>CancelledError</code></td></tr>
<tr><td><code>as_completed</code></td><td>Iterator</td><td>Stream results as they land</td><td>Must consume inside the task group</td></tr>
</table>`);
    section.appendChild(tasksCard);

    const primCard = card('🧭 Bounded concurrency, cancellation and timeouts', '');
    primCard.appendChild(diagram(`
flowchart TD
    START["1000 user ids to fetch"] --> SEM["async with Semaphore(20)<br/>only 20 requests in flight"]
    SEM --> CREATE["TaskGroup creates 1000 tasks<br/>each starts and immediately queues"]
    CREATE -->|"task acquires"| RUN["perform request"]
    RUN -->|"done"| DONE["release semaphore<br/>task exits scope"]
    CREATE -->|"some task raises"| CANCEL["TaskGroup cancels<br/>every unfinished sibling"]
    CANCEL --> EG["raise ExceptionGroup"]
    START -.->|"try / async with asyncio.timeout(5)"| TO["TimeoutError<br/>cancel + wait_for cleanup"]
    RUN -.-> TO
`, 'Semaphore caps in-flight work; TaskGroup makes cancellation structural'));
    section.appendChild(primCard);

    const cancelCard = card('✂️ Cancellation & timeouts', `
<p>Cancellation in asyncio is <b>cooperative</b>: <code>task.cancel()</code> raises
<code>asyncio.CancelledError</code> at the task's next suspension point. The task then has a chance to
clean up — which is why <code>finally</code> blocks and <code>async with</code> exits matter.</p>
<pre><code class="language-python">async def resilient():
    try:
        async with asyncio.timeout(5):        # 3.11+
            await slow_work()
    except TimeoutError:
        ...                                     # cancelled, no orphan task
    except asyncio.CancelledError:
        await cleanup()                         # re-raise afterwards!
        raise

t = asyncio.create_task(resilient())
t.cancel()
await t                                     # always await a cancelled task
# asyncio.wait_for(coro, 5) does both for you (prefer asyncio.timeout inside a TaskGroup)</code></pre>
<ul style="padding-left:20px;line-height:1.9;">
<li>Since 3.8 <code>CancelledError</code> inherits from <code>BaseException</code>, not
<code>Exception</code> — so a bare <code>except Exception</code> will <em>not</em> swallow it. That is
deliberate and saves you from swallowing cancellation.</li>
<li>Never <code>await</code> inside a <code>finally</code> that runs during cancellation without a
<code>shield</code> or <code>wait_for</code> guard — a second cancellation can interrupt the cleanup.</li>
<li>Unawaited coroutines emit "coroutine was never awaited" warnings at GC time. The usual sources are a
bare <code>create_task</code> call with no reference kept (the task can be GC'd mid-flight), and
<code>lru_cache</code> on an <code>async def</code>.</li>
</ul>`);
    section.appendChild(cancelCard);

    section.appendChild(card('⏱️ Complexity & scheduling', `
<table class="complexity-table">
<tr><th>Aspect</th><th>Bound</th><th>Notes</th></tr>
<tr><td>Cost of one <code>await</code></td><td>~1 µs of loop work</td><td>Cheap. Awaiting a million tasks is fine; awaiting in a hot numeric loop is not.</td></tr>
<tr><td>Scheduling fairness</td><td>O(1) per task per loop iteration</td><td><code>_run_once</code> pops a bounded batch of ready callbacks each tick.</td></tr>
<tr><td>Selector cost</td><td>O(1) per <code>epoll_wait</code></td><td>One syscall per loop iteration regardless of how many sockets are registered.</td></tr>
<tr><td>Task memory</td><td>~1-2 KB per task + frame</td><td>10k tasks is fine; 10M tasks is not — shard across processes instead.</td></tr>
<tr><td>Context switch</td><td>No OS context switch</td><td>Everything happens on one core, so total throughput equals the slowest blocking call.</td></tr>
</table>
<p style="margin-top:10px;"><code>uvloop</code> (used by Uvicorn when installed) is the same API with a
faster C loop — typically 2-4x. <code>asyncio.run()</code> is the one-call entry point for scripts;
it creates a fresh loop, runs the main coroutine, and cancels leftover tasks at exit.</p>`));

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Blocking the loop.</b> <code>time.sleep</code>, <code>requests</code>, sync DB drivers, <code>json.dumps</code> on a huge payload, or a CPU-bound function inside a coroutine — all serialise every other task. Fix: <code>asyncio.to_thread</code> for the short blocking calls, a real async driver for the rest, a process pool for real CPU work.</li>
<li><b>Creating a task in a loop without keeping a reference</b> — the task may be garbage collected mid-execution. Use a set or a <code>TaskGroup</code>.</li>
<li><b>Fire-and-forget with no error handling.</b> An exception in a background task is stored on the task and only surfaces when someone awaits it. Log it, or use <code>task.add_done_callback</code>.</li>
<li><b>Assuming the loop is thread-safe.</b> <code>asyncio.get_event_loop()</code> from a worker thread does not do what you think; use <code>asyncio.run_coroutine_threadsafe</code>.</li>
<li><b><code>async for</code> over a sync iterable</b> blocks — <code>async for</code> requires an object with <code>__aiter__</code>.</li>
<li><b>Mixing <code>run_until_complete</code> inside a running loop</b> raises immediately. In Jupyter/Notebook use <code>await</code> at top level.</li>
<li><b>Semaphore created in the wrong scope</b> — a semaphore bound to one loop cannot be awaited from another (e.g. created at import time and used per-request).</li>
<li><b>Subclassing <code>asyncio.Task</code></b> for timeouts or to track all tasks — fragile across versions; prefer <code>TaskGroup</code> / <code>asyncio.timeout</code>.</li>
</ul>`));

    const aqCard = card('🎤 Interview Q&A', '');
    aqCard.appendChild(collapsible('Explain the event loop as if I have never used async.', `
<p><b>A:</b> it is a while-loop that (1) runs every coroutine that is ready to make progress, (2) asks the OS
selector which registered file descriptors are ready, (3) wakes the coroutines that were waiting on those
descriptors, (4) runs the expired timers, and repeats. Concurrency comes from suspending at
<code>await</code>, not from threads. There is exactly one thread running Python bytecode, so the loop is
safe without locks but is only fast if nothing blocks it.</p>`));
    aqCard.appendChild(collapsible('`await` is not blocking — so why did my requests all serialise?', `
<p><b>A:</b> because something in the chain was blocking. Most often a synchronous HTTP client or DB
driver called inside an <code>async def</code>. <code>await</code> only yields if the awaited object
implements the async protocol; awaiting a synchronous call (even wrapped in a coroutine) runs it to
completion on the loop thread. Diagnose with <code>py-spy dump --pid</code> and look for the same frame
repeated across tasks.</p>`));
    aqCard.appendChild(collapsible('When is `asyncio.gather` the wrong tool?', `
<p><b>A:</b> in three cases: when a child fails (the default raises on the first exception and leaves the
rest running — use <code>TaskGroup</code>); when you want streaming results as they complete (use
<code>as_completed</code>); and when the tasks must be cancellable as a unit with a timeout (use
<code>asyncio.timeout</code>). In 3.11+ <code>TaskGroup</code> is the default answer.</p>`));
    aqCard.appendChild(collapsible('How does `asyncio.to_thread` relate to the GIL?', `
<p><b>A:</b> it hands the blocking call to the default <code>ThreadPoolExecutor</code> (since 3.9), so the
loop keeps serving other tasks while the OS thread works. It only helps for <em>blocking</em> work —
for CPU-bound work the thread still holds the GIL and steals a timeslice from the loop, so use a process
pool (<code>ProcessPoolExecutor</code> / <code>run_in_executor</code> with it).</p>`));
    aqCard.appendChild(collapsible('How do you backpressure a fan-out of 10,000 requests?', `
<p><b>A:</b> bound the in-flight set with a <code>Semaphore</code> and/or page the work in batches, so
memory and the remote API both stay bounded. Combine with <code>asyncio.timeout</code> per task and a
<code>TaskGroup</code> for structured cleanup; return <code>return_exceptions=True</code> (or catch
per task) so one failure does not abort the whole batch.</p>`));
    section.appendChild(aqCard);

    section.appendChild(card('🔥 Real-world usage', 'Uvicorn/FastAPI, aiohttp, <code>asyncpg</code>, SQLAlchemy <code>create_async_engine</code>, Redis (<code>redis.asyncio</code>), <code>httpx</code>, Kafka clients, and every SDK that ships an <code>async</code> variant. LangChain and most LLM providers are async-first, which is why agent loops are written as coroutines rather than callback chains.'));
    section.appendChild(card('🗣️ What to say out loud', 'Draw the loop: ready queue, selector, timers, resume. Then the single killer sentence — <i>await suspends a task, not a thread; anything that blocks the thread blocks every task</i>. Finish with TaskGroup as the modern structured-concurrency answer; that single sentence about blocking is what the interviewer is listening for.'));

    container.appendChild(section);

    setTimeout(() => {
        const viz = document.getElementById('asyncio-viz');
        if (!viz) return;
        viz.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
                <div style="padding:12px 20px;background:var(--accent);border-radius:8px;color:white;font-weight:600;">Task A</div>
                <div style="padding:12px 20px;background:var(--accent);border-radius:8px;color:white;font-weight:600;">Task B</div>
                <div style="padding:12px 20px;background:var(--accent);border-radius:8px;color:white;font-weight:600;">Task C</div>
                <span style="color:var(--text-muted);">↓</span>
                <div style="padding:12px 24px;background:var(--bg-tertiary);border:1px solid var(--accent);border-radius:8px;color:var(--accent-light);font-weight:600;">Event Loop</div>
            </div>
            <p style="text-align:center;margin-top:12px;font-size:0.85rem;color:var(--text-muted);">Each task suspends at <code>await</code> and yields the single thread back to the loop</p>
        `;
    }, 100);
}


export function renderPyConcurrency(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Concurrency'));

    section.appendChild(card('🧠 Mental Model', `
<p>Threading for I/O-bound, multiprocessing for CPU-bound, asyncio for high-concurrency I/O.</p>
<p><b>The invariant that decides the tool:</b> concurrency buys you <em>overlap of waiting</em>, parallelism
buys you <em>simultaneous execution</em>, and in CPython only separate processes (or a free-threaded build)
give you the latter for Python bytecode. So the first question is never "which library" — it is
"is this work waiting on something, or computing?"</p>
<p>The second question: "how much of it?" A handful of blocking sockets justifies a thread pool; a hundred
thousand justifies an event loop, because a thread costs ~8 MB of stack (virtual) and an OS scheduling
entity.</p>`));

    const decisionCard = card('🧭 Choose the tool', '<p>Follow the branches: the first question is whether the work spends its time waiting or computing, the second is how many concurrent operations there are.</p>');
    decisionCard.appendChild(diagram(`
flowchart TD
    Q1{"Is the work CPU-bound<br/>compute, compress, parse,<br/>inference?"}
    Q1 -->|"yes"| POOL["ProcessPoolExecutor<br/>or native library<br/>true parallelism, IPC cost"]
    Q1 -->|"no"| Q2{"How many concurrent<br/>operations?"}
    Q2 -->|"tens"| THREADS["ThreadPoolExecutor<br/>simple, works with sync code"]
    Q2 -->|"thousands"| ASYNCIO["asyncio + TaskGroup<br/>one thread, bounded by semaphore"]
    Q2 -->|"1-4 cores, pure Python"| SUBPROC["subprocess / ProcessPool<br/>embarrassingly parallel jobs"]
    ASYNCIO --> MIX["Mixed workload:<br/>asyncio for I/O,<br/>to_thread or process pool for CPU"]
    THREADS --> MIX
    POOL --> MIX
`, 'The decision path: CPU-bound, then scale'));
    section.appendChild(decisionCard);

    section.appendChild(card('⚡ When to use what', '<table class="complexity-table"><tr><th>Task Type</th><th>Tool</th></tr><tr><td>I/O-bound</td><td>asyncio / threads</td></tr><tr><td>CPU-bound</td><td>multiprocessing</td></tr><tr><td>High concurrency</td><td>asyncio</td></tr></table>'));

    section.appendChild(card('📊 Full comparison', `
<table class="complexity-table">
<tr><th>Dimension</th><th>threading</th><th>multiprocessing</th><th>asyncio</th></tr>
<tr><td>Execution model</td><td>N threads, 1 process, 1 interpreter</td><td>N processes, N interpreters</td><td>N tasks, 1 thread</td></tr>
<tr><td>True parallelism in CPython</td><td>No — the GIL serialises bytecode</td><td>Yes — separate processes</td><td>No — one thread</td></tr>
<tr><td>CPU-bound speedup</td><td>~1x (often slower)</td><td>~N cores</td><td>~1x, and it starves the loop</td></tr>
<tr><td>I/O concurrency ceiling</td><td>Hundreds (context-switch + stack cost)</td><td>Hundreds (context-switch + IPC)</td><td>Tens of thousands (one thread)</td></tr>
<tr><td>Memory per unit</td><td>~8 MB stack + thread state</td><td>~30 MB interpreter (fork: COW helps)</td><td>~1-2 KB task + coroutine frame</td></tr>
<tr><td>Shared state</td><td>Easy (shared memory, needs a lock)</td><td>None — must pickle or use shared memory</td><td>Easy (one thread) but blocks the loop</td></tr>
<tr><td>Failure isolation</td><td>None — a segfault kills the process</td><td>Full — a worker can die alone</td><td>Full — a task can be cancelled</td></tr>
<tr><td>Cancellation</td><td>Cooperative only (a running thread ignores <code>Event</code>)</td><td>Terminate the process</td><td>Native: <code>cancel()</code> at the next await</td></tr>
<tr><td>Debuggability</td><td>Simple</td><td>Hard: pickling, fork safety, interleaving</td><td>Simple, but stack traces stop at await</td></tr>
<tr><td>Best for</td><td>Legacy sync libraries, blocking SDKs, modest fan-out</td><td>CPU-heavy batches, image/video, ML inference, crawls with parsing</td><td>Web servers, API fan-out, streams, DB pools</td></tr>
</table>
<p style="margin-top:10px;">Rule of thumb: <b>default to asyncio</b> for network I/O,
<b>reach for processes</b> when a profiler says the CPU is busy, and reach for <code>numpy</code>/a
native library before either — the fastest "concurrency" fix for pure-Python maths is to stop doing it in
Python.</p>`));

    const exampleCard = card('💻 Worked example — one program, three regimes', `
<pre><code class="language-python">import asyncio, time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def cpu_work(n):                      # burns GIL cycles
    return sum(i * i for i in range(n))

def io_work(url):                     # releases the GIL while waiting
    time.sleep(0.5)                   # stand-in for a socket read
    return url

async def amain(urls):
    sem = asyncio.Semaphore(20)        # bound the fan-out
    async def one(u):
        async with sem:
            return io_work(u)          # blocking -> use to_thread in real code
    async with asyncio.TaskGroup() as tg:
        for u in urls:
            tg.create_task(one(u))

# CPU-bound, 4 jobs -> 4 processes: ~4x faster
with ProcessPoolExecutor(max_workers=4) as ex:
    ex.map(cpu_work, [10**7] * 4)

# blocking I/O, 100 jobs -> threads (or asyncio; threads keep sync code unchanged)
with ThreadPoolExecutor(max_workers=16) as ex:
    list(ex.map(io_work, urls))        # 100 jobs / 16 workers x 0.5s ~ 3.2s</code></pre>`);
    section.appendChild(exampleCard);

    section.appendChild(card('🌍 Real-world context', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Web servers:</b> uvicorn (asyncio) for I/O, gunicorn with <code>UvicornWorker</code> to get multiple processes, or uWSGI/gunicorn sync workers for threaded traffic. Celery uses prefork processes; RQ and Dramatiq use threads/processes for I/O.</li>
<li><b>Data:</b> <code>pandas</code> releases the GIL inside its C loops, so threads give little; <code>ProcessPoolExecutor</code> plus <code>multiprocessing.shared_memory</code> avoids copying big frames. Joblib and Dask wrap the same idea.</li>
<li><b>ML inference:</b> batching inside one process beats more Python threads, because the heavy math is in BLAS/CUDA, not Python.</li>
<li><b>Microservices:</b> one event loop per container, scaled horizontally — that is what the asyncio model is optimised for.</li>
<li><b>Mixed workloads:</b> keep asyncio for the request path and offload CPU blocks with <code>await asyncio.to_thread(...)</code> or <code>run_in_executor(ProcessPoolExecutor(), ...)</code>.</li>
</ul>`));

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Threads for CPU work.</b> Context switching makes it slower than serial execution. Always benchmark before "optimising" this way.</li>
<li><b><code>fork()</code> + threads + open sockets.</b> Forking a multi-threaded process can deadlock in the child if a lock was held at fork time. Prefer <code>spawn</code> start method on macOS/Windows and in any pre-forked worker pool.</li>
<li><b>Passing huge objects to a process pool.</b> Arguments are pickled — a 200 MB numpy array costs more than the computation. Use shared memory or a file path.</li>
<li><b>Threads do not make sync I/O parallel in async code.</b> Blocking a thread inside a coroutine still blocks the loop.</li>
<li><b>Unbounded <code>ThreadPoolExecutor</code> defaults.</b> Python caps threads at <code>min(32, cpu+4)</code> by default; a "fixed" pool that grows is the usual culprit behind a fan-out that never finishes.</li>
<li><b>Data races look like they work.</b> <code>x += 1</code> on a shared counter from N threads is not atomic in general; the GIL makes CPython's bytecode-level ops safer than in C, but the race window around releasing the GIL is still real. Use <code>queue.Queue</code> or a lock.</li>
</ul>`));

    const cqCard = card('🎤 Interview Q&A', '');
    cqCard.appendChild(collapsible('You have a slow function. How do you parallelise it in Python?', `
<p><b>A:</b> first find out <em>where</em> the time goes. Network wait → asyncio (or a thread pool if the
client is sync-only). Pure-Python CPU → <code>ProcessPoolExecutor</code>. Already in NumPy/SciPy →
probably already threaded; use more processes or bigger batches. And first consider whether the algorithm
can be improved, because no pool fixes an O(n²) loop.</p>`));
    cqCard.appendChild(collapsible('When is multiprocessing overkill?', `
<p><b>A:</b> when the work is I/O-bound (use asyncio), when it is already parallelised inside a native
library, when the payload is so large that pickling dominates, and when the tasks are tiny — process
start-up plus IPC exceeds the work itself. If tasks are milliseconds long, batching them inside one
process usually wins.</p>`));
    cqCard.appendChild(collapsible('How would you run 10,000 URLs "concurrently"?', `
<p><b>A:</b> with an event loop and bounded concurrency: <code>httpx.AsyncClient</code> +
<code>Semaphore(50)</code> + <code>asyncio.TaskGroup</code>, a per-request timeout, and retries with
exponential backoff. Threads would work but cost far more memory. Whatever the tool, cap the fan-out —
unbounded concurrency just moves the failure to the far end.</p>`));
    cqCard.appendChild(collapsible('Do threads share state safely?', `
<p><b>A:</b> they share the heap, so yes with synchronisation and no without. <code>queue.Queue</code>,
locks, and immutability are the practical tools; and the GIL removes data races on individual bytecode
instructions but gives no atomicity across multi-instruction sequences, nor protection in free-threaded
builds.</p>`));
    section.appendChild(cqCard);

    container.appendChild(section);
}

export function renderPyGIL(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'GIL (Global Interpreter Lock)'));

    section.appendChild(card('🎬 GIL Visualization', '<div class="viz-area" id="gil-viz"></div>'));

    section.appendChild(card('💡 Key Insight', `
<p>The GIL prevents true parallel execution of Python bytecode across threads. For CPU-bound work, use multiprocessing instead.</p>
<p><b>The invariant that defines it:</b> at any instant at most one thread in an interpreter executes
Python bytecode, and bytecode can only advance while holding the GIL. Everything else — refcount updates,
C extensions, blocking syscalls, and explicit release calls — is where threads get a chance to swap in.</p>`));

    const loopCard = card('🔬 Inside the eval loop', '<p>CPython runs bytecode in a loop that does three things in order: execute instructions, maintain the reference count, and periodically check the <em>eval breaker</em> to drop the GIL. That third step is why threads make progress even without any I/O.</p>');
    loopCard.appendChild(diagram(`
flowchart TD
    FETCH["Fetch and decode next bytecode instruction"] --> EXEC["Execute it in the current thread"]
    EXEC --> REF["Update reference counts<br/>objects hitting zero are freed immediately"]
    REF --> BREAK{"Eval breaker tripped?<br/>interval or pending call"}
    BREAK -->|"no"| FETCH
    BREAK -->|"yes, waiting threads exist"| DROP["Release the GIL<br/>wait on the OS condition variable"]
    DROP --> SWITCH["Another waiting thread acquires<br/>the GIL and runs"]
    SWITCH --> FETCH
    BREAK -->|"yes, but nobody is waiting"| FETCH
    EXEC -.->|"C extension, e.g. socket recv or file IO"| IO["GIL released around the blocking call"]
    IO --> BREAK
`, 'Refcount on every instruction, GIL drop on the eval breaker or an I/O release'));
    section.appendChild(loopCard);

    section.appendChild(card('🧵 Why threads still help', `
<p>The GIL is not "one thread at a time forever". It is dropped often:</p>
<ul style="padding-left:20px;line-height:1.9;">
<li>Every <b>N bytecodes</b> (a few hundred) CPython checks the eval breaker and yields to waiting threads.</li>
<li>Every <b>syscall</b> that blocks (<code>socket.recv</code>, file reads, <code>os.read</code>) releases the GIL, which is precisely why I/O-bound threading works at all.</li>
<li>Many C extensions release it explicitly — <code>hashlib</code>, <code>zlib</code>, <code>json</code>, NumPy's big loops, and NumPy releases it around <code>@</code> matmul.</li>
<li>Calls that can trigger Python code (<code>Py_BEGIN_ALLOW_THREADS</code> sites) release it too.</li>
</ul>
<p style="margin-top:10px;">So the honest statement is: <b>threads overlap I/O and drop-in C code; they
overlap pure-Python CPU work not at all</b> — and with the default 5 ms switch interval they may even be
slower than serial code due to context-switch churn. That is also why GIL contention inflates tail
latency (p99) long before it hurts average throughput: the whole queue waits on the lock.</p>`));

    const gilSeqCard = card('🔀 Two threads, one GIL', '');
    gilSeqCard.appendChild(diagram(`
sequenceDiagram
    participant OS as OS scheduler
    participant T1 as Thread A
    participant T2 as Thread B
    participant G as GIL mutex
    OS->>T1: dispatch, acquires the GIL
    T1->>T1: executes Python bytecode
    T1->>G: eval breaker - releases the GIL
    OS->>T2: dispatch, acquires the GIL
    T2->>T2: executes Python bytecode, A is idle
    T2->>G: releases the GIL for I/O or breaker
    OS->>T1: dispatch, acquires the GIL again
`, 'One thread at a time, but they take turns — so the work is serialised, not parallel'));
    section.appendChild(gilSeqCard);

    const escCard = card('🪄 Getting real parallelism', `
<table class="complexity-table">
<tr><th>Approach</th><th>How it beats the GIL</th><th>Cost / caveat</th></tr>
<tr><td><code>multiprocessing</code></td><td>Separate processes, separate interpreters, separate GILs</td><td>IPC cost; pickling; no shared memory by default</td></tr>
<tr><td>Native extension (C/Cython/Rust)</td><td>Heavy loops run in C without needing bytecode</td><td>Build tooling, GIL release discipline</td></tr>
<tr><td>NumPy / vectorised libraries</td><td>Bulk work in C, and the GIL is released inside the loops</td><td>Constant-factor wins, not algorithmic ones</td></tr>
<tr><td>Subprocess / serverless</td><td>Different OS processes entirely</td><td>Serialisation and cold starts</td></tr>
<tr><td><b>Free-threaded CPython (3.13t / 3.14)</b></td><td><b>No GIL at all</b> — opt-in build, threads run bytecode in parallel</td><td>Single-threaded overhead of roughly 5-10% from finer-grained locking; some extensions are not yet thread-safe</td></tr>
</table>
<pre><code class="language-python"># Free-threaded build:  python3.13t
# or, on a build compiled with --disable-gil:  PYTHON_GIL_DISABLED=1 python3.13
# python3.13t -c "import sysconfig; print(sysconfig.get_config_var('Py_GIL_DISABLED'))"  -> 1
# Reason at runtime:
import sysconfig
free_threaded = bool(sysconfig.get_config_var("Py_GIL_DISABLED"))
print("free-threaded:", free_threaded)     # False on a normal 3.13 build</code></pre>
<p style="margin-top:10px;">3.12 also introduced a <em>per-interpreter</em> GIL: each sub-interpreter
gets its own lock, so they no longer serialise against the main interpreter. That is a different feature
free-threading, and conflating the two is the most common mistake in this topic.</p>`);
    section.appendChild(escCard);

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>"The GIL makes Python threads useless" is wrong.</b> Threads are excellent for I/O and for C
extensions that release the lock; they are useless only for pure-Python CPU work.</li>
<li><b>Assuming <code>time.sleep</code> releases the GIL.</b> It does — <code>sleep</code> is a syscall —
which is exactly why a "threaded" CPU benchmark with sleeps looks parallel and a real one does not.</li>
<li><b>Compile-time constant folding hides GIL costs.</b> <code>for i in range(n): pass</code> may be
optimised to nothing; the loop must contain real work to measure contention.</li>
<li><b>The switch interval is tunable.</b> <code>sys.setswitchinterval(0.0005)</code> trades throughput for
tail latency in mixed workloads — measure, and only for a measured problem.</li>
<li><b>Free-threaded builds are opt-in and slower single-threaded.</b> Never promise "3.13 has no GIL" —
say "3.13 ships an experimental free-threaded build; the default build still has the GIL".</li>
<li><b>Do not measure GIL contention without pinning cores.</b> A test that lands two threads on one core
measures the OS scheduler, not the GIL.</li>
</ul>`));

    const gqCard = card('🎤 Interview Q&A', '');
    gqCard.appendChild(collapsible('What exactly does the GIL protect, and what does it not?', `
<p><b>A:</b> it protects CPython's internal data structures — the reference counts, the object heap and
the interpreter's own mutable state — from concurrent bytecode execution. It does not protect shared
resources in your own objects from a <em>sequence</em> of operations, it does not protect C extensions
that release it, and it says nothing about multiprocessing or subprocesses.</p>`));
    gqCard.appendChild(collapsible('Why does CPython still use a GIL?', `
<p><b>A:</b> it makes reference counting and container mutation safe without per-object locks, which keeps
single-threaded code fast and keeps C extensions simple to write. The cost is that bytecode execution is
serialised. PEP 703 (3.13) attacks that with a biased-refcount, deferred-reference-count design plus
immortal objects and per-object locking so that free-threaded builds pay a small single-threaded cost
instead of a large complexity cost.</p>`));
    gqCard.appendChild(collapsible('I profiled and the GIL is 60% of my CPU time. Now what?', `
<p><b>A:</b> three options in order of cost: (1) reduce the total Python-level work — algorithmic change,
vectorise with NumPy, cache; (2) move the hot loop into a C/Cython extension that releases the GIL, or
into a separate process; (3) if and only if you can control the runtime, try a free-threaded 3.13+ build and
measure both the parallel speedup and the single-threaded regression. Retuning
<code>sys.setswitchinterval</code> is a stopgap, not a fix.</p>`));
    gqCard.appendChild(collapsible('Does the GIL exist in Jython or IronPython?', `
<p><b>A:</b> no — they run on the JVM and .NET, which are genuinely parallel, and they cannot run
C extensions. That is why the GIL is a CPython implementation detail rather than a language guarantee, and
why "Python is single-threaded" is a wrong sentence to say in an interview.</p>`));
    section.appendChild(gqCard);

    container.appendChild(section);

    setTimeout(() => {
        const viz = document.getElementById('gil-viz');
        if (!viz) return;
        viz.innerHTML = `
            <div style="display:flex;align-items:center;gap:16px;justify-content:center;flex-wrap:wrap;">
                <div style="padding:12px 20px;background:var(--blue);border-radius:8px;color:white;font-weight:600;">Thread A</div>
                <div style="font-size:1.5rem;color:var(--text-muted);">⇄</div>
                <div style="padding:12px 24px;background:var(--accent);border-radius:8px;color:white;font-weight:600;">Python Interpreter</div>
                <div style="font-size:1.5rem;color:var(--text-muted);">⇄</div>
                <div style="padding:12px 20px;background:var(--green);border-radius:8px;color:white;font-weight:600;">Thread B</div>
            </div>
            <p style="text-align:center;margin-top:12px;font-size:0.85rem;color:var(--text-muted);">Only ONE thread holds the GIL at a time — they take turns at the eval breaker and around every blocking syscall</p>
        `;
    }, 100);
}


export function renderPyOOP(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'OOP'));

    section.appendChild(card('🧠 Mental Model', `
<p>Classes, inheritance, MRO (C3 linearization), dataclasses, abstract base classes.</p>
<p><b>The invariant that makes attribute access work:</b> <code>obj.attr</code> is never "a field" — it is a
protocol. Python looks up <code>type(obj).__mro__</code> for a data descriptor, then the instance
<code>__dict__</code>, then a non-data descriptor, and only then raises <code>AttributeError</code>. A
<code>property</code> is simply a descriptor sitting in that lookup.</p>`));

    const mroCard = card('🧭 Attribute lookup and the MRO', '<p>Every attribute read walks the method resolution order computed by the C3 linearisation algorithm. Descriptor precedence is what makes <code>property</code>, <code>functools.cached_property</code> and validation setters composable instead of magical.</p>');
    mroCard.appendChild(diagram(`
flowchart TD
    A["obj.attr"] --> B{"Data descriptor found<br/>in type obj mro?<br/>defines __set__ or __delete__"}
    B -->|"yes"| C["call its __get__<br/>property, cached_property, dataclass field"]
    B -->|"no"| D{"Key in instance __dict__?"}
    D -->|"yes"| E["return the instance value"]
    D -->|"no"| F{"Non-data descriptor or plain<br/>attribute in type obj mro?"}
    F -->|"yes"| G["return the descriptor value<br/>plain function binds as a bound method"]
    F -->|"no"| H["AttributeError"]
    C --> I["Instance __setattr__ runs<br/>data descriptors win over __dict__"]
`, 'Lookup order: data descriptor, instance dict, non-data descriptor'));
    mroCard.appendChild(h('p', { innerHTML: 'The C3 linearisation (Python 3.7+, it replaced the old depth-first, left-to-right rule) builds each class MRO as the merge of its parents\' MROs plus itself, preserving local precedence and monotonicity.' }));
    section.appendChild(mroCard);

    const c3Card = card('🔢 Worked example — C3 linearisation', `
<p>For <code>class D(B, C)</code> with <code>B(A)</code> and <code>C(A)</code>:</p>
<table class="complexity-table">
<tr><th>Step</th><th>Merge</th><th>Result so far</th></tr>
<tr><td>Linearise B</td><td>B + merge(A, A)</td><td><code>[B, A]</code></td></tr>
<tr><td>Linearise C</td><td>C + merge(A, A)</td><td><code>[C, A]</code></td></tr>
<tr><td>Linearise D</td><td>D + merge([B, A], [C, A], [B, C])</td><td><code>[D, B, C, A, object]</code></td></tr>
</table>
<pre><code class="language-python">class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass
print(D.__mro__)       # D, B, C, A, object
print(D.mro())         # the same, as a list

# Multiple inheritance and __init__
class Base:
    def __init__(self, **kw): self.__dict__.update(kw)
class Child(Base, Mixin):      # explicit, cooperative super() chain
    def __init__(self, **kw):
        super().__init__(**kw) # resolves to the NEXT class in D.mro()
        self.extra = 1

# C3 rejects inconsistent hierarchies
class X(A, B): pass   # TypeError when A and B have incompatible MRO orders</code></pre>
<p style="margin-top:10px">Rule that avoids most MRO bugs: <b>always use <code>super()</code>, never
<code>Base.__init__(self, ...)</code></b>. A hard-coded parent call skips any other class in the MRO that
also needs initialising, which turns a diamond into a partially built object.</p>`);
    section.appendChild(c3Card);

    section.appendChild(card('💻 Example', `<pre><code class="language-python">from abc import ABC, abstractmethod
class Repository(ABC):
    @abstractmethod
    def save(self, entity): pass

class PostgresRepo(Repository):
    def save(self, entity):
        # INSERT INTO ...
        pass</code></pre>`));

    const dcCard = card('🏗️ Dataclasses, ABCs and protocols', `
<table class="complexity-table">
<tr><th>Feature</th><th>Generates</th><th>Use it when</th><th>Cost / gotcha</th></tr>
<tr><td><code>@dataclass</code></td><td><code>__init__</code>, <code>__repr__</code>, <code>__eq__</code></td><td>Data-carrying value objects</td><td>Boilerplate of the class <em>definition</em> only — per-instance cost is higher than <code>__slots__</code> classes without it</td></tr>
<tr><td><code>frozen=True</code></td><td>immutable instance + <code>__hash__</code></td><td>Hashable, shareable config or message records</td><td>Any attribute write raises <code>FrozenInstanceError</code>; needs object.__setattr__ to bypass</td></tr>
<tr><td><code>slots=True</code></td><td><code>__slots__</code>, no <code>__dict__</code></td><td>Millions of instances (AST nodes, protocol buffers, ORM rows)</td><td>No weakref and no ad-hoc attributes unless declared; breaks naive subclassing</td></tr>
<tr><td><code>kw_only=True</code></td><td>keyword-only <code>__init__</code></td><td>Optional fields that grow</td><td>Positional construction breaks (3.10+)</td></tr>
<tr><td><code>@classmethod</code> + <code>dataclasses.field</code></td><td>—</td><td>Config objects from env/JSON</td><td>Must guard against a missing key yourself</td></tr>
<tr><td><code>ABC</code> + <code>@abstractmethod</code></td><td>instantiation check</td><td>Nominal contracts, plugin registries</td><td>Subclasses must remember to call <code>super()</code></td></tr>
<tr><td><code>Protocol</code> (3.8+)</td><td>nothing at runtime</td><td><b>Structural</b> typing — accept anything with the right methods</td><td>No enforcement; <code>@runtime_checkable</code> only checks method names</td></tr>
</table>
<pre><code class="language-python">from dataclasses import dataclass, field, asdict
from typing import Protocol

@dataclass(frozen=True, slots=True, order=True)
class Order:
    id: int
    total_cents: int
    tags: tuple[str, ...] = ()     # tuple, not list: keeps the object hashable

    def __post_init__(self):
        if self.total_cents &lt; 0:                 # validation runs after __init__
            raise ValueError("total_cents must be &gt;= 0")

class SupportsSave(Protocol):                      # duck typing, checked by type checkers
    def save(self, entity) -&gt; None: ...

def persist(repo: SupportsSave, order: Order) -&gt; None:
    repo.save(order)</code></pre>`);
    section.appendChild(dcCard);

    const descCard = card('🔌 Descriptors & special methods', `
<p>Anything that implements <code>__get__</code>, <code>__set__</code> or <code>__delete__</code> is a
descriptor. Python's own features are built on them, which is why "just use <code>property</code>" is
usually enough for application code and descriptors are reserved for reusable, framework-level behaviour.</p>
<table class="complexity-table">
<tr><th>Mechanism</th><th>Built from</th><th>Behaviour</th></tr>
<tr><td><code>property</code></td><td>data descriptor</td><td>Read/write hook on the class; assignment goes through the setter</td></tr>
<tr><td><code>classmethod</code> / <code>staticmethod</code></td><td>descriptors</td><td>Rebind <code>__get__</code> to the class or to nothing</td></tr>
<tr><td><code>functools.cingledispatch</code></td><td>descriptor</td><td>Dispatch on the first argument's type</td></tr>
<tr><td><code>functools.cached_property</code></td><td>non-data descriptor</td><td>Compute once, store in the instance <code>__dict__</code>; needs <code>__dict__</code>, so not with <code>slots=True</code></td></tr>
<tr><td><code>__getattr__</code></td><td>hook</td><td>Called only when normal lookup fails — this is how proxies and lazy imports work</td></tr>
<tr><td><code>__slots__</code></td><td>layout</td><td>Fixed memory layout, faster attribute access, ~15-25% smaller instances</td></tr>
<tr><td><code>__slots__ = ('__dict__', '__weakref__')</code></td><td>escape hatch</td><td>Restores ad-hoc attributes and weak references while keeping the declared slots fast</td></tr>
</table>`);
    section.appendChild(descCard);

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Mutable class attributes are shared by every instance.</b> <code>items = []</code> in the class body is one list for the whole class; use a <code>field(default_factory=list)</code>.</li>
<li><b><code>__eq__</code> without <code>__hash__</code></b> makes instances unhashable (Python sets it to <code>None</code>). Re-declare it, or use <code>frozen=True</code>.</li>
<li><b>Equality across types.</b> Return <code>NotImplemented</code>, do not raise — it lets Python fall back to the reflected operation.</li>
<li><b>Forgetting <code>super().__init__()</code></b> in a multiple-inheritance hierarchy leaves the other bases uninitialised; the classic symptom is a missing attribute only on one code path.</li>
<li><b><code>@property</code> that does heavy work.</b> Every read recomputes, and it now looks like a free attribute. Use <code>cached_property</code>, or compute once in <code>__post_init__</code>.</li>
<li><b>Deep inheritance chains</b> make the MRO hard to reason about and make <code>super()</code> chains expensive to debug. Prefer composition.</li>
<li><b>Dunder methods are looked up on the type, not the instance</b> — <code>obj.__len__()</code> bypasses normal instance lookup and can break for proxies; implement <code>__len__</code> and let the syntax do the work.</li>
<li><b>Adding attributes in <code>__init__</code> without annotations</b> works, but <code>slots</code> classes, dataclass <code>repr</code>, and type checkers will all complain.</li>
</ul>`));

    const oqCard = card('🎤 Interview Q&A', '');
    oqCard.appendChild(collapsible('What is the MRO and how is it computed?', `
<p><b>A:</b> the Method Resolution Order is the order Python searches <code>type(cls).__mro__</code> for an
attribute. It is built by the C3 linearisation of the class's direct bases: take each parent's MRO, merge
them while preserving local precedence order, then append the class itself. Consistency is checked at class
creation, so contradictory hierarchies raise <code>TypeError</code>. <code>super()</code> is simply "the
next class in this MRO".</p>`));
    oqCard.appendChild(collapsible('ABC or Protocol — how do you choose?', `
<p><b>A:</b> <code>ABC</code> is nominal: subclasses must explicitly inherit to satisfy it, and you get a
runtime instantiation check plus shared base-class code. <code>Protocol</code> is structural: anything with
the right methods qualifies, giving duck typing with static-checker support. Use protocols at your own API
boundaries so callers are not forced into your hierarchy, and ABCs where you own the hierarchy and want
enforcement or shared implementation.</p>`));
    oqCard.appendChild(collapsible('When would you use `__slots__`?', `
<p><b>A:</b> when you create very many instances with a fixed shape — parsed syntax nodes, protocol
messages, cached rows. It removes the per-instance <code>__dict__</code>, so memory drops noticeably and
attribute access is a fixed-offset load instead of a hash lookup. It also makes typos in attribute names
fail loudly at construction. The cost: no dynamic attributes, no weak references, and it interacts badly
with <code>cached_property</code>.</p>`));
    oqCard.appendChild(collapsible('Where do descriptors actually appear in production code?', `
<p><b>A:</b> <code>property</code>, <code>classmethod</code>, <code>staticmethod</code>,
<code>functools.cached_property</code>, <code>abc.abstractproperty</code>, SQLAlchemy's
<code>InstrumentedAttribute</code>, Pydantic v1's <code>ModelField</code>, ORM lazy columns, and
dependency-injection containers that inject attributes on assignment. Descriptors are how a library hooks
itself into <code>obj.attr</code> without the caller knowing.</p>`));
    oqCard.appendChild(collapsible('Composition vs inheritance?', `
<p><b>A:</b> prefer composition — hold a collaborator and delegate. Inheritance couples you to a base
class you do not control (the fragile base class problem), while composition lets you swap behaviour at
runtime and test each part alone. Inherit only for genuine is-a relationships and when you can own both
sides of the hierarchy.</p>`));
    section.appendChild(oqCard);

    section.appendChild(card('🔥 Real-world usage', 'Dataclasses model DTOs and events everywhere (Pydantic leans on them, FastAPI generates schemas from annotated functions). <code>ABC</code> underpins repository interfaces in Django service layers. <code>Protocol</code> is the standard trick for typing duck-typed plugins, and <code>__slots__</code> shows up in CPython itself, in dataclass-heavy ETL code, and in parsers holding millions of nodes.'));
    section.appendChild(card('🗣️ What to say out loud', 'Anchor on attribute lookup: instance dict versus descriptor is the single idea that explains properties, slots, cached_property and validation in one breath. Then show the MRO for a diamond and say "always super()". If asked for the algorithm, name C3 and describe the merge.'));
    section.appendChild(card('📋 Model choice matrix', `
<table class="complexity-table">
<tr><th>Situation</th><th>Reach for</th><th>Why</th></tr>
<tr><td>A flat record with a handful of fields</td><td><code>@dataclass(frozen=True)</code></td><td>Free <code>__init__</code>/<code>__repr__</code>/<code>__eq__</code>, hashable, self-documenting</td></tr>
<tr><td>A record with a validation rule</td><td>dataclass + <code>__post_init__</code></td><td>One place for invariants, raising before the object escapes</td></tr>
<tr><td>Many instances in a hot path</td><td>dataclass with <code>slots=True</code>, or a plain class with <code>__slots__</code></td><td>Drops the instance <code>__dict__</code></td></tr>
<tr><td>A family of interchangeable implementations</td><td><code>ABC</code> + <code>@abstractmethod</code></td><td>Failures at construction, not at first use</td></tr>
<tr><td>Accepting anything shaped right</td><td><code>Protocol</code></td><td>No inheritance required, still type-checked</td></tr>
<tr><td>Expensive derived value</td><td><code>@cached_property</code></td><td>Computed on first read, then stored per instance</td></tr>
<tr><td>Shared base behaviour plus a stable contract</td><td>Inheritance with cooperative <code>super()</code></td><td>Only when you own both classes</td></tr>
<tr><td>Deep nesting of helpers</td><td>Composition</td><td>Swap, stub and test each part independently</td></tr>
</table>`));
    section.appendChild(card('🗣️ Model choice answers', 'If you freeze a dataclass and need a mutable variant later, pass <code>dataclasses.replace()</code> a new instance instead of mutating in place — that keeps the "never change a value that has been shared" rule intact and makes updates easy to log.'));

    container.appendChild(section);
}

export function renderPyIterators(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Iterators & Generators'));

    section.appendChild(card('🧠 Mental Model', `
<p><code>__iter__</code> returns iterator. Generators use <code>yield</code> to produce values lazily.</p>
<p><b>The invariant that makes the protocol work:</b> an iterator must never return itself twice — its
state must advance monotonically until it finally raises <code>StopIteration</code>. The <code>for</code>
loop's <code>StopIteration</code> is how the iteration terminates, which is why
<code>next()</code> on an exhausted iterator raising is normal behaviour and not an error.</p>
<p>Rule of thumb: <b>iterable = has <code>__iter__</code>, iterator = has <code>__next__</code></b>. A
generator object is both, and it is its own iterator.</p>`));

    const stateCard = card('🔄 Protocol state machine', '<p>Follow the state transitions: <code>for</code> asks the iterable for an iterator once, then repeatedly calls <code>next()</code> until <code>StopIteration</code>. The <code>else</code> branch of a <code>for</code> loop is exactly that normal termination — <code>break</code> skips it.</p>');
    stateCard.appendChild(diagram(`
stateDiagram-v2
    [*] --> Iterable
    Iterable --> Iterator: for calls iter obj
    Iterator --> Producing: next returns a value
    Iterator --> Exhausted: raises StopIteration
    Exhausted --> Exhausted: next raises StopIteration again
    Iterable --> Iterator: list and dict are iterable but are not iterators
    state Iterator {
        [*] --> Suspended
        Suspended --> Producing: resumes at the yield
        Producing --> Suspended: suspends at the next yield
        Producing --> Exhausted: function returns
        Suspended --> Closed: generator garbage collected or close called
    }
    Producing --> [*]
`, 'The iterator protocol as a state machine, with the generator frame as its internal state'));
    section.appendChild(stateCard);

    section.appendChild(card('💻 Example', `<pre><code class="language-python">def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b</code></pre>`));

    const traceCard = card('🧪 Worked trace', `
<p>Trace <code>list(islice(fibonacci(), 3))</code> — note the generator never builds the infinite series.</p>
<table class="complexity-table">
<tr><th>Step</th><th>Call</th><th>Frame state at suspension</th><th>Value</th></tr>
<tr><td>1</td><td><code>iter(gen)</code></td><td>fresh, before the first line</td><td>—</td></tr>
<tr><td>2</td><td><code>next(gen)</code></td><td><code>yield a</code> with <code>a=0, b=1</code></td><td><code>0</code></td></tr>
<tr><td>3</td><td><code>next(gen)</code></td><td><code>yield a</code> with <code>a=1, b=1</code></td><td><code>1</code></td></tr>
<tr><td>4</td><td><code>next(gen)</code></td><td><code>yield a</code> with <code>a=1, b=2</code></td><td><code>1</code></td></tr>
<tr><td>5</td><td>consumer breaks</td><td>frozen at <code>a=1, b=2</code>, never resumed</td><td>—</td></tr>
</table>
<pre><code class="language-python">from itertools import islice

def count_up(start=1):                # reusable, finite generator
    n = start
    while n &lt;= 3:
        yield n
        n += 1

print(list(count_up()))        # [1, 2, 3]
print(list(count_up(2)))       # [2, 3]   - each call makes a NEW generator

g = fibonacci()
print(next(g), next(g))        # 0 1 - explicit stepping is legal

# The protocol in full
class Countdown:
    def __init__(self, start): self.n = start
    def __iter__(self): return self          # iterable and iterator
    def __next__(self):
        if self.n &lt;= 0: raise StopIteration  # the only legal way to end
        self.n -= 1
        return self.n + 1

for x in Countdown(3): print(x)     # 3 2 1

# The improved form: iterable and iterator are separate objects,
# so the object itself can be iterated more than once
class ReusableCountdown:
    def __init__(self, n): self.n = n
    def __iter__(self): return _CD(self.n)

class _CD:                         # the actual iterator
    def __init__(self, n): self.n = n
    def __iter__(self): return self
    def __next__(self):
        if self.n &lt;= 0: raise StopIteration
        self.n -= 1
        return self.n + 1
for x in ReusableCountdown(3): pass
for x in ReusableCountdown(3): pass   # works again - a new iterator each time</code></pre>`);
    section.appendChild(traceCard);

    const kindsCard = card('🧰 Generator flavours', `
<table class="complexity-table">
<tr><th>Form</th><th>Give it</th><th>It gives you</th><th>Typical use</th></tr>
<tr><td><code>yield</code></td><td>a function containing yield</td><td>a lazy iterator over one series</td><td>Streaming transforms, CSV rows, log tails</td></tr>
<tr><td><code>yield from</code></td><td>an iterable</td><td>transparent delegation <em>plus</em> the sub-generator's return value</td><td>Splitting generators, recursive traversal</td></tr>
<tr><td>generator expression</td><td><code>(f(x) for x in it)</code></td><td>a lazy iterator</td><td>Streaming map/filter</td></tr>
<tr><td>comprehension</td><td><code>[f(x) for x in it]</code></td><td>a fully materialised list</td><td>Small, fully needed results</td></tr>
<tr><td><code>async def</code> + yield</td><td>an async generator</td><td><code>async for</code> / <code>async with ... yield</code></td><td>Async streams, webhook replay, token streaming</td></tr>
<tr><td><code>yield from</code> delegation</td><td>a sub-generator</td><td>flat traversal plus its <code>return</code> value</td><td>Recursive tree walk that also reports "found"</td></tr>
</table>
<pre><code class="language-python">def walk(node):
        yield from walk(child)       # no nested-loop bookkeeping

tree = list(walk(root))               # depth-first, O(nodes) time, O(depth) stack

async def events():
    async with connect() as stream:
        async for msg in stream:
            yield msg                 # async generator: back-pressure preserved</code></pre>`);
    section.appendChild(kindsCard);

    const pipelineCard = card('🔗 Laziness pipelines and memory', `
<pre><code class="language-python">from itertools import chain, islice, groupby

# Infinite stream, constant memory, zero work until asked
evens = (n * n for n in itertools.count() if n % 2 == 0)
print(list(islice(evens, 5)))      # [0, 4, 16, 36, 64]

# Generators compose left to right, one item at a time
records = (
    {**json.loads(line), "src": name}
    for name, lines in sources.items()
    for line in lines                 # pulls lazily
    if line.strip()
)

# Iterators are consumed ONCE - this is the classic bug
it = iter([1, 2, 3])
list(it), list(it)                   # [1, 2, 3], []  - already drained

# Why itertools: C-speed adapters, still lazy
chain([1, 2], (x * x for x in range(3)), "ab")   # 1 2 0 1 4 a b
groupby(sorted(words), key=len)                   # must sort first: equal keys must be adjacent</code></pre>
<p style="margin-top:10px;">Laziness only helps if the <b>consumer</b> also streams. Passing a generator
into <code>len()</code>, <code>sorted()</code>, <code>list()</code> or a pandas <code>DataFrame</code>
defeats the purpose — that is the one sentence to remember about generator performance.</p>`);
    section.appendChild(pipelineCard);

    section.appendChild(card('⏱️ Complexity', `
<table class="complexity-table">
<tr><th>Aspect</th><th>Generator</th><th>List</th></tr>
<tr><td>Time to produce n items</td><td>O(total work), interleaved</td><td>O(n) up front, then O(1) reads</td></tr>
<tr><td>Peak memory</td><td>O(frame) — O(1) for a simple pipeline</td><td>O(n) plus per-object overhead</td></tr>
<tr><td>First value latency</td><td>O(1) — nothing runs before the first <code>next()</code></td><td>O(n) — the whole comprehension must finish</td></tr>
<tr><td>Re-iteration</td><td>No — one shot; wrap in a function to restart</td><td>Yes, infinitely</td></tr>
<tr><td>Cost per item</td><td>Extra frame switch: ~50-100 ns, plus saved allocations</td><td>List append amortised O(1), plus object allocation</td></tr>
</table>
<p style="margin-top:10px;">A generator wins on memory and start-up latency and loses on re-iteration and
per-item overhead. For <code>range(10**6)</code> the difference is invisible; for reading a 20 GB log the
generator is the only option that fits.</p>`));

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Premature finalisation.</b> If a generator holds a resource, wrap the body in
<code>try/finally</code> and expose <code>close()</code>; PEP 380 adds <code>GeneratorExit</code>
handling for a reason.</li>
<li><b>Lazy is not eager-safe.</b> Exceptions inside the body raise at <em>iteration</em> time, not at
call time — a whole class of "why does this fail later" bugs.</li>
<li><b>Draining twice.</b> Iterators are one-shot. Return the <em>function</em>, not the generator object,
from a factory API.</li>
<li><b><code>groupby</code> on unsorted input</b> silently produces one group per item because it only
groups <em>adjacent</em> equal keys.</li>
<li><b><code>send()</code> and <code>throw()</code></b> confuse readers and break <code>yield from</code>
delegation subtleties — avoid in application code, use in coroutine protocols and test frameworks.</li>
<li><b>Generator <code>return value</b> is invisible</b> to <code>for</code>; use
<code>StopIteration.value</code> from <code>yield from</code> if you need it.</li>
<li><b>Infinite generator + <code>list()</code></b> hangs forever. Always bound an infinite generator with
<code>islice</code>.</li>
</ul>`));

    const iqCard = card('🎤 Interview Q&A', '');
    iqCard.appendChild(collapsible('What is the difference between an iterable and an iterator?', `
<p><b>A:</b> an iterable has <code>__iter__</code> and can produce an iterator; an iterator has
<code>__next__</code> and produces values, raising <code>StopIteration</code> when exhausted. Lists are
iterable but not iterators — which is why <code>for</code> calls <code>iter()</code> on every pass and gets
a fresh iterator, while iterating a generator object twice gives you nothing the second time.</p>`));
    iqCard.appendChild(collapsible('Write a class implementing both dunders from scratch.', `
<p><b>A:</b></p>
<pre><code class="language-python">class Fibonacci:
    def __init__(self, limit=None):
        self.limit, self.a, self.b = limit, 0, 1

    def __iter__(self):
        return self                 # the iterator is its own iterator

    def __next__(self):
        if self.limit is not None and self.a &gt;= self.limit:
            raise StopIteration
        self.a, self.b = self.b, self.a + self.b
        return self.a

list(Fibonacci(50))     # restarts cleanly on every iteration</code></pre>`));
    iqCard.appendChild(collapsible('Why use a generator when a list comprehension is faster?', `
<p><b>A:</b> a generator never materialises the intermediate collection, so memory is O(1) instead of
O(n) and the first result arrives before the last input is read. That makes it the right tool for
streaming files, database cursors, network chunks and pipelines over infinite sequences. The per-item
overhead of resuming a frame is real but small compared to allocating and keeping millions of objects
alive.</p>`));
    iqCard.appendChild(collapsible('When is laziness actively harmful?', `
<p><b>A:</b> when the consumer needs random access (<code>itertools.islice</code> twice, indexing),
repeated passes, or a length. Those force materialisation anyway, so use a list — or
<code>itertools.tee</code> if you truly need two passes, at the cost of buffering.</p>`));
    section.appendChild(iqCard);

    section.appendChild(card('🔥 Real-world usage', 'Reading multi-gigabyte logs line by line, CSV and Parquet streaming readers, <code>paginate()</code> in Django, async generators streaming SSE or WebSocket chunks, <code>yield from</code> in parsers, <code>itertools.groupby</code> for run-length encoding, and <code>yield</code>-based coroutines for legacy asyncio. Pipelines in Airflow and data loaders lean on the same laziness.'));
    section.appendChild(card('🗣️ What to say out loud', 'Say "iterable has <code>__iter__</code>, iterator has <code>__next__</code> and is one-shot", then walk the three-step <code>for</code> protocol. Add the one practical consequence: laziness only pays off when the consumer streams too.'));

    container.appendChild(section);
}


export function renderPyFunctions(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Functions'));

    section.appendChild(card('🧠 Mental Model', `
<p>First-class objects. Closures. <code>*args</code> collects positional, <code>**kwargs</code> collects keyword.</p>
<p><b>The invariant that makes scoping predictable:</b> a name resolves by walking the enclosing
<code>def</code> scopes lexically at compile time — never the caller's stack. A closure therefore captures
<em>variables</em> (cells), not <em>values</em>, and sees whatever those variables hold when it runs.
That single fact explains late binding, the classic loop-lambda bug, and <code>nonlocal</code>.</p>`));

    const scopeCard = card('🎯 Scopes, closures and the cell', '<p>The two closure bugs below are the same mechanism: the lambda captures the loop variable itself, and the variable keeps being reassigned after the lambda is created.</p>');
    scopeCard.appendChild(diagram(`
flowchart TD
    DEF["def outer<br/>x = 1"] --> CELL["closure cell for x<br/>shared by every function defined here"]
    CELL --> G1["def inner_a reads x"]
    CELL --> G2["def inner_b writes x<br/>needs the nonlocal keyword"]
    G2 --> CELL
    OUTER["outer returns inner_a"] --> KEEP["the cell outlives the frame<br/>that is what a closure is"]
    KEEP --> CALL["inner_a runs long after outer returned<br/>and reads the CURRENT value of x"]
    LOOP["for i in range(3):<br/>fns.append(lambda: i)"] --> CELL2["one shared cell for i"]
    CELL2 --> LATE["all three lambdas return 2<br/>the late-binding bug"]
    LOOP -.->|"fix: lambda i=i: i"| CELL3["per-iteration binding"]
    CELL3 --> OK["each lambda sees its own i"]
`, 'A closure is a function plus the cells it captured'));
    section.appendChild(scopeCard);

    section.appendChild(card('💻 Example', `<pre><code class="language-python">def compose(*fns):
    def inner(x):
        for f in reversed(fns):
            x = f(x)
        return x
    return inner</code></pre>`));

    section.appendChild(card('🔑 Parameter passing', `
<table class="complexity-table">
<tr><th>Form</th><th>Syntax</th><th>Receives</th><th>Extra cost</th></tr>
<tr><td>Positional-or-keyword</td><td><code>def f(a, b=1)</code></td><td>One value</td><td>None</td></tr>
<tr><td>Positional-only</td><td><code>def f(a, /, b)</code></td><td>One value, cannot be named</td><td>Protects a signature from a caller using keywords</td></tr>
<tr><td>Keyword-only</td><td><code>def f(a, *, key)</code></td><td>Named argument</td><td>Makes call sites self-documenting; the default for evolving APIs</td></tr>
<tr><td><code>*args</code></td><td><code>def f(*a)</code></td><td>A tuple</td><td>One extra allocation per call</td></tr>
<tr><td><code>**kwargs</code></td><td><code>def f(**k)</code></td><td>A fresh dict</td><td>One extra allocation, plus keys are str-only</td></tr>
<tr><td><code>*a, **k</code> in a call</td><td><code>g(*a, **k)</code></td><td>Unpacks positionally / by name</td><td>Collect-then-repack</td></tr>
</table>
<pre><code class="language-python">def call(*args, **kwargs):
    return args, kwargs

args, kwargs = call(1, 2, x=3)
# args == (1, 2)      kwargs == {"x": 3}

# unpacking, in both directions
first, *rest = [1, 2, 3, 4]        # first=1, rest=[2, 3, 4]
a, b = {"k1": 1, "k2": 2}          # unpacks the KEYS
head, tail = xs[:1], xs[1:]        # cheaper than pop(0)

# defaults are evaluated once, at def time - the classic mutable default
def push(item, bucket=[]):          # BUG: shared across calls
    bucket.append(item)
    return bucket
push(1); push(2)                    # [1, 2] then [1, 2] again

def push(item, bucket=None):        # correct
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket</code></pre>`));

    const fnCard = card('🎛️ The callable protocol', `
<p>A "function" is really "any object implementing <code>__call__</code>". That is the difference between
a function, a lambda, a bound method, a class, and a class instance with <code>__call__</code> — they are
interchangeable everywhere Python accepts a callable.</p>
<pre><code class="language-python">class Counter:
    def __init__(self, start=0): self.n = start
    def __call__(self, step=1):
        self.n += step
        return self.n

c = Counter()
c(); c(5)                    # 1, 6        - state lives in the instance

# All of these are callables, and all work the same way
print(applyable := [len, str.upper, (lambda *a: sum(a)), Counter()])
handler = {"a": lambda x: x + 1, "b": str}.get("a")   # dispatch by name
dispatch("a")(41)                                     # 42

# functools.partial is a callable object
from functools import partial, reduce
inc = partial(lambda x, n: x + n, n=1)
list(map(inc, [1, 2, 3]))                    # [2, 3, 4]

# __call__ on a class: calling the class creates an instance
Counter() is Counter.__call__(Counter)</code></pre>`);
    section.appendChild(fnCard);

    section.appendChild(card('⏱️ Complexity', `
<table class="complexity-table">
<tr><th>Aspect</th><th>Bound</th><th>Notes</th></tr>
<tr><td>Plain call</td><td>O(1) plus arguments</td><td>The call itself is a few tens of nanoseconds; the body dominates</td></tr>
<tr><td><code>*args</code> / <code>**kwargs</code></td><td>+O(n) allocations</td><td>A tuple, and a new dict per call — measurable in millions-of-calls hot loops</td></tr>
<tr><td><code>compose(f, g)(x)</code></td><td>O(k) for k functions</td><td>One call per layer; deep pipelines accumulate call overhead</td></tr>
<tr><td>Recursive functions</td><td>O(n) depth</td><td>CPython raises <code>RecursionError</code> around 1000 nested frames unless <code>sys.setrecursionlimit</code> is raised — and the C stack may overflow first</td></tr>
<tr><td>Closures</td><td>O(1) extra space per cell</td><td>Cells stay alive as long as any function references them</td></tr>
</table>`));

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Mutable default arguments</b> — evaluated once at <code>def</code> time and shared by every call. The single most common Python bug in production.</li>
<li><b>Late binding in loops</b> — <code>[lambda: i for i in range(3)]</code> gives three functions that all return the final <code>i</code>. Bind with a default argument or use a comprehension (which has its own scope).</li>
<li><b>Using <code>nonlocal</code> when you meant <code>global</code></b> (or vice versa) — <code>nonlocal</code> rebinds the enclosing function's cell, which is what a counter closure needs.</li>
<li><b><code>global</code> for caches and counters.</b> It works, and it is untestable, unthread-safe and invisible in the signature. Use a returned function or a closure cell.</li>
<li><b><code>pop(0)</code> / <code>insert(0, x)</code> on a list</b> — O(n) each; use <code>collections.deque</code>.</li>
<li><b>Signature drift from <code>*args, **kwargs</code>.</b> Wrappers lose the contract unless you add <code>@wraps</code>; <code>functools.wraps</code> also restores <code>__wrapped__</code> so <code>inspect.signature</code> works.</li>
<li><b>Forward references.</b> Annotations are evaluated at <code>def</code> time, so <code>def f() -&gt; Node</code> needs quotes or <code>from __future__ import annotations</code> before <code>Node</code> exists.</li>
<li><b>Recursion depth</b> — the default limit is 1000 frames; iterative conversion or <code>sys.setrecursionlimit</code> plus a bigger thread stack is the safe fix for deep trees.</li>
</ul>`));

    const fnqCard = card('🎤 Interview Q&A', '');
    fnqCard.appendChild(collapsible('Explain closures in one example.', `
<p><b>A:</b></p>
<pre><code class="language-python">def make_counter():
    count = 0
    def increment():
        nonlocal count          # rebind the enclosing cell
        count += 1
        return count
    return increment

c = make_counter()
c(); c()                        # 1, 2
c2 = make_counter(); c2()       # 1  - each call made a new cell</code></pre>
<p>The returned function keeps the frame's cells alive after the frame is gone. That is the whole
mechanism: functions plus captured cells.</p>`));
    fnqCard.appendChild(collapsible('Why is the mutable default argument a bug?', `
<p><b>A:</b> the default is evaluated once when the <code>def</code> statement executes, and the resulting
object is stored in the function object. Every call that omits the argument shares that same object, so
state accumulates across calls. Tests pass individually and fail in a suite. The fix is
<code>None</code> + allocate inside, which also makes the intent explicit.</p>`));
    fnqCard.appendChild(collapsible('What are `*args` and `**kwargs` for, and what do they cost?', `
<p><b>A:</b> they accept an unknown number of positional and keyword arguments. Positional extras are
collected into a tuple and keyword extras into a fresh dict, so there is one allocation per call plus the
cost of the body. For a hot loop, prefer an explicit signature; for decorators, wrappers and
config-forwarding helpers, they are the right tool.</p>`));
    fnqCard.appendChild(collapsible('When is `functools.partial` better than a lambda?', `
<p><b>A:</b> when you are pre-binding leading arguments, because <code>partial</code> keeps the remaining
ones positional and passes keywords through correctly, while <code>lambda *a, **k: f(x, *a, **k)</code> has
to rebuild the whole call. <code>partial</code> also has a <code>.func</code>/<code>.args</code>/
<code>.keywords</code> you can introspect — which is what makes it picklable and inspectable where a
lambda is neither.</p>`));
    fnqCard.appendChild(collapsible('`def`, `lambda` and `functools.partial` — how do you choose?', `
<p><b>A:</b> <code>def</code> for anything named, documented, multi-line or stack-traced;
<code>lambda</code> for a single expression passed as an argument, especially as a sort key;
<code>partial</code> to pre-bind arguments of an existing callable without adding a frame. Prefer
readable <code>def</code> over clever lambdas in application code.</p>`));
    section.appendChild(fnqCard);

    section.appendChild(card('🔥 Real-world usage', 'Django/Flask route functions and FastAPI dependencies lean on keyword-only signatures and type hints. <code>functools.partial</code> is how test suites inject fakes. <code>contextlib</code>, <code>asyncpg</code> connection callbacks and most retry libraries register callbacks through the callable protocol. Closures are the basis for decorators, <code>@lru_cache</code>-adjacent caching, and any "factory returns a configured worker" pattern.'));
    section.appendChild(card('🗣️ What to say out loud', 'Draw the cell: a closure is a function plus the cells it captured. Then the two consequences — late binding in loops, and the shared-mutable-default trap — and finish with the callable protocol. Three minutes, and every Python scoping question is on the table.'));

    container.appendChild(section);
}


export function renderPyFastAPI(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'FastAPI'));

    section.appendChild(card('🏗️ Architecture', pipelineStages([
        { name: 'Client', desc: 'HTTP request' },
        { name: 'API Router', desc: 'Path operation' },
        { name: 'Service', desc: 'Business logic' },
        { name: 'Repository', desc: 'Data access' },
        { name: 'Database', desc: 'PostgreSQL' },
    ], (_i, s) => toast(`Stage: ${s.name}`, 'info'))));

    section.appendChild(card('🔁 Request lifecycle', lifecycleSteps([
        'ASGI receive', 'Middleware', 'Routing', 'Dependencies', 'Endpoint', 'Serialise', 'Response',
    ])));

    const lifeCard = card('🧬 What happens per request', '<p>Every request walks the same path. The interesting details are the two <code>async def</code> dependency runs (FastAPI inspects signatures at import time and caches the compiled dependant) and the fact that response serialisation goes through the same Pydantic model machinery.</p>');
    lifeCard.appendChild(diagram(`
sequenceDiagram
    autonumber
    participant C as Client
    participant A as ASGI server (Uvicorn)
    participant M as Middleware
    participant R as Router
    participant D as Dependency injection
    participant E as Endpoint
    participant S as Serialiser (Pydantic)
    C->>A: HTTP request
    A->>M: call app scope
    M->>R: forward to the routing layer
    R->>R: match path and method
    R->>D: resolve Depends in declaration order
    D->>D: yield cached value for repeat deps
    D->>E: call the endpoint with resolved kwargs
    E->>S: return a pydantic model or dict
    S-->>M: JSON body plus status and headers
    M-->>A: response
    A-->>C: HTTP response
`, 'FastAPI request lifecycle: routing, dependency resolution, serialisation'));
    section.appendChild(lifeCard);

    section.appendChild(card('💻 CRUD Example', `<pre><code class="language-python">from fastapi import FastAPI
app = FastAPI()

@app.get("/items/{id}")
async def get_item(id: int):
    return await repo.find(id)

@app.post("/items")
async def create(item: ItemSchema):
    return await repo.save(item)</code></pre>`));

    const appCard = card('🏗️ A complete app', `
<pre><code class="language-python">from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

class ItemIn(BaseModel):                     # request body: validate + coerce
    name: str = Field(min_length=1, max_length=100)
    price_cents: int = Field(ge=0)

class ItemOut(ItemIn):                      # response body: never leak internals
    id: int

async def get_db() -&gt; AsyncIterator[AsyncSession]:
    async with SessionLocal() as s:         # one session per request
        yield s                            # closed by FastAPI even on error

Db = Annotated[AsyncSession, Depends(get_db)]

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_schema()
    yield
    await dispose_pool()

app = FastAPI(lifespan=lifespan)           # startup / shutdown hook

@app.get("/items/{item_id}", response_model=ItemOut)
async def read_item(item_id: int, db: Db) -&gt; ItemOut:
    item = await db.get(Item, item_id)
    if item is None:
        raise HTTPException(404, "item not found")
    return ItemOut.model_validate(item)</code></pre>
<table class="complexity-table">
<tr><th>Feature</th><th>What it does</th><th>Why it matters</th></tr>
<tr><td>Type hints on the endpoint</td><td>Drives body parsing, query/path params, validation and the OpenAPI schema</td><td>The schema is generated, never hand-written, so it cannot drift from the code</td></tr>
<tr><td><code>response_model</code></td><td>Filters and validates the output, including for dicts</td><td>Stops internal fields and ORM objects from leaking into the contract</td></tr>
<tr><td><code>Depends</code></td><td>Declares a dependency, resolved per request</td><td>Nested dependencies compose and are cached per request</td></tr>
<tr><td><code>lifespan</code></td><td>Async startup and shutdown</td><td>Pools and clients open and close cleanly</td></tr>
<tr><td><code>async def</code> endpoints</td><td>Run on the event loop; <code>def</code> endpoints run in a threadpool</td><td>Know which one you wrote before blaming the GIL</td></tr>
<tr><td><code>HTTPException</code></td><td>Short-circuits with a status code</td><td>The only clean way to return a non-2xx</td></tr>
</table>`);
    section.appendChild(appCard);

    const layerCard = card('🧅 Layers, routers and versioning', `
<pre><code class="language-python"># routers/items.py
from fastapi import APIRouter

router = APIRouter(prefix="/items", tags=["items"])

@router.get("/{item_id}")
async def read_item(item_id: int, db: Db): ...

# main.py
app.include_router(items.router, prefix="/v1")
app.include_router(admin.router, prefix="/v1", dependencies=[Depends(require_admin)])</code></pre>
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Layers:</b> middleware (raw ASGI, request and response, run for every request) &rarr; dependencies (declared per route, cached per request) &rarr; endpoint. Middleware wraps everything, dependencies wrap the route.</li>
<li><b>Validation runs before your code.</b> A bad body becomes a 422 without entering the handler — which is why validation errors never appear in your business-log metrics.</li>
<li><b>Blocking endpoints serialize the worker.</b> A <code>def</code> endpoint runs in Starlette's threadpool; a CPU-heavy <code>async def</code> endpoint blocks the whole loop.</li>
<li><b>Background work</b> belongs in <code>BackgroundTasks</code> (same process, not durable) or in a real queue — not in a fire-and-forget coroutine that dies with the request.</li>
</ul>`);
    section.appendChild(layerCard);

    section.appendChild(card('⏱️ Complexity & performance', `
<table class="complexity-table">
<tr><th>Aspect</th><th>Cost</th><th>Bound degrades when</th></tr>
<tr><td>Routing</td><td>O(1) dict lookup</td><td>Thousands of routes still resolve in microseconds</td></tr>
<tr><td>Dependency resolution</td><td>O(d) per request</td><td><code>use_cache=False</code> dependencies (a new session per sub-dependency) or deep chains</td></tr>
<tr><td>Body validation</td><td>O(body size)</td><td>Huge nested payloads; validate with a max body size upstream</td></tr>
<tr><td>Serialisation</td><td>O(rows returned)</td><td>Returning 10k rows in one response — paginate instead</td></tr>
<tr><td>Throughput</td><td>~1-3k rps per worker for trivial routes</td><td>Blocking endpoints, missing indexes, N+1 queries, serialisation of big responses</td></tr>
<tr><td>Concurrency model</td><td>One event loop per process</td><td>One slow synchronous dependency blocks every request in that worker</td></tr>
</table>
<p style="margin-top:10px;"><code>uvicorn app:app --workers 4</code> (or gunicorn with
<code>UvicornWorker</code>) multiplies throughput by the number of cores because each worker is its own
process, GIL included.</p>`));

    section.appendChild(card('⚠️ Pitfalls & gotchas', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Blocking the event loop</b> — a synchronous DB driver or <code>requests</code> call inside an <code>async def</code> route serialises the whole worker. Use <code>asyncpg</code> / <code>httpx</code>, or declare the endpoint <code>def</code> so Starlette uses its threadpool.</li>
<li><b>Returning ORM objects directly.</b> Lazy relationships trigger sync I/O in the serialiser. Map to a Pydantic model inside the transaction, or load eagerly.</li>
<li><b>N+1 queries.</b> A list endpoint that serialises relations issues one query per row. Use eager loading or <code>selectinload</code>.</li>
<li><b>Global mutable state</b> — a module-level cache or connection object is shared by every worker and every request; use <code>lifespan</code> and dependency-scoped objects.</li>
<li><b>Sync dependency inside an async route</b> runs on the threadpool but its teardown can block the loop.</li>
<li><b>Forwarding exceptions raw</b> leaks stack traces to clients; raise <code>HTTPException</code> or register an exception handler.</li>
<li><b>Trusting the type hint is not validation of intent.</b> <code>price_cents: int</code> accepts a negative number unless you add <code>Field(ge=0)</code> or a validator.</li>
</ul>`));

    const fqCard = card('🎤 Interview Q&A', '');
    fqCard.appendChild(collapsible('Explain the FastAPI request lifecycle.', `
<p><b>A:</b> Uvicorn receives the ASGI scope, middleware wraps the app, the router matches path and method,
FastAPI resolves the <code>Depends</code> tree (yielding cached values for repeat dependencies), calls the
endpoint with validated arguments, converts the return value with the response model, and serialises it to
JSON. The OpenAPI schema is produced from the same type hints at import time, so documentation cannot drift
from behaviour.</p>`));
    fqCard.appendChild(collapsible('Why is FastAPI faster than Flask?', `
<p><b>A:</b> three reasons, in order of weight: it is async-first instead of sync-first, so one worker
serves thousands of connections instead of one request per thread; validation uses compiled Pydantic
(v2 is Rust-backed) instead of ad-hoc <code>request.form</code> parsing; and the returned object is
serialised from the response model directly. FastAPI also has near-zero overhead on trivial routes — the
gap grows with concurrency, not with per-request work.</p>`));
    fqCard.appendChild(collapsible('`async def` or `def` for an endpoint?', `
<p><b>A:</b> <code>async def</code> when everything inside is genuinely async (asyncpg, httpx) — it runs on
the event loop. Plain <code>def</code> when the body is blocking or sync (a psycopg2 call, a CPU-bound
function): Starlette runs it in a threadpool, so the loop stays free. The worst option is
<code>async def</code> wrapping blocking code, which blocks the whole worker.</p>`));
    fqCard.appendChild(collapsible('What is `Depends` and why would you nest it?', `
<p><b>A:</b> <code>Depends</code> declares a dependency the framework resolves before the handler runs, so
DB sessions, auth checks and pagination parameters become part of the signature rather than hidden inside
the body. Nesting composes — <code>get_current_user</code> can itself <code>Depends(get_db)</code> — and
each dependency is cached per request, so declaring it in two places costs one execution unless you pass
<code>use_cache=False</code>.</p>`));
    fqCard.appendChild(collapsible('How would you debug a slow endpoint?', `
<p><b>A:</b> put middleware timing around routing, dependency resolution, the handler and serialisation to
find which phase dominates; then check the database first (missing index, N+1, a lock waiting on a
transaction). <code>EXPLAIN ANALYZE</code> beats guessing. Only after that look at the process — if the
loop is pinned at 100% with no I/O waiting, the handler is CPU-bound and belongs in a worker or a
process.</p>`));
    section.appendChild(fqCard);

    section.appendChild(card('🔥 Real-world usage', 'CRUD and BFF layers in microservice architectures, streaming LLM endpoints that push tokens over SSE, ML inference services behind a queue, internal platform APIs generated from OpenAPI, and auth middleware with per-request dependency caching. The dependency-injection pattern is also why FastAPI endpoints are easy to unit-test — override a dependency and pass it in.'));
    section.appendChild(card('🗣️ What to say out loud', 'Walk the lifecycle in order, then name the three performance traps: blocking the loop, N+1 queries, and over-large responses. Finish by saying you would add request timing middleware before optimising anything.'));

    container.appendChild(section);
}

export function renderPyInterview(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Python Interview Questions'));

    section.appendChild(card('🧠 How to answer Python questions', `
<p>Every Python question is really one of four: <b>object model</b> (names, mutability, hashing),
<b>language protocol</b> (iterators, descriptors, dunders), <b>runtime semantics</b> (scoping, evaluation
order, references), or <b>concurrency</b> (GIL, event loop, processes). Name the category in your first
sentence, give the smallest correct example, then state the trap. Depth comes from the trap, not from
listing more syntax.</p>`));

    const coreCard = card('🎯 Core language', `
<table class="complexity-table">
<tr><th>Area</th><th>Must-know</th></tr>
<tr><td>Object model</td><td>Names vs objects, mutability, <code>==</code> vs <code>is</code>, <code>hash</code>/<code>__eq__</code> contract, interning</td></tr>
<tr><td>Data structures</td><td>dict vs set vs deque, list slicing copies, amortised O(1), hash collisions</td></tr>
<tr><td>Functions</td><td>positional-only, keyword-only, <code>*args</code>/<code>**kwargs</code>, closures, late binding, mutable defaults</td></tr>
<tr><td>OOP</td><td>MRO/C3, <code>super()</code>, descriptors, <code>property</code>, <code>slots</code>, ABC vs Protocol, dataclass flags</td></tr>
<tr><td>Iterators</td><td><code>__iter__</code>/<code>__next__</code>, generators, <code>yield from</code>, laziness, one-shot iteration</td></tr>
<tr><td>Metaprogramming</td><td><code>getattr</code>/<code>setattr</code>, <code>__getattr__</code>, monkey-patching, decorators with arguments</td></tr>
</table>`);
    section.appendChild(coreCard);

    const pyCard = card('🐍 Python-specific & version-aware', '');
    pyCard.appendChild(diagram(`
flowchart TD
    Q1{"Is the answer about<br/>the language or about<br/>CPython the implementation?"}
    Q1 -->|"language"| L1["Guaranteed: the data model,<br/>scoping rules, MRO,<br/>decorators, the iterator protocol"]
    Q1 -->|"implementation"| Q2{"Which release?"}
    Q2 -->|"3.11"| V11["ExceptionGroup, TaskGroup,<br/>Self, faster eval loop"]
    Q2 -->|"3.12"| V12["Per-interpreter GIL,<br/>f-string nesting,<br/>itertools.batched, override"]
    Q2 -->|"3.13+"| V13["Experimental free-threaded build,<br/>JIT, PEP 667 locals,<br/>copy.replace"]
    Q2 -->|"3.14"| V14["Free-threading supported,<br/>JIT preview"]
    L1 --> CHECK["State the assumption:<br/>CPython 3.12+, GIL build"]
    V11 --> CHECK
    V12 --> CHECK
    V13 --> CHECK
    V14 --> CHECK
`, 'Separate language guarantees from CPython version behaviour'));
    section.appendChild(pyCard);

    section.appendChild(card('⏱️ Performance questions', ''));
    section.appendChild(collapsible('Why is my list operation slow, and how do I profile it?', `
<p><b>A:</b> profile before guessing: <code>cProfile</code> for call counts and cumulative time,
<code>py-spy</code> for sampling a running process with <code>dump</code> or <code>top</code> (no
instrumentation, works in production), <code>line_profiler</code> for per-line cost, and
<code>timeit</code> for microbenchmarks. Then look for the usual suspects: O(n) membership on a list that
should be a set, quadratic <code>+=</code> or <code>pop(0)</code> in a loop, repeated work inside a loop,
and objects rebuilt on every iteration.</p>`));
    section.appendChild(collapsible('How is CPython faster now than in 3.10?', `
<p><b>A:</b> three separate changes. 3.11 shipped a specialising adaptive interpreter that caches
instruction-specific fast paths after warm-up and removed per-object type checks in the eval loop — that
alone was the biggest jump. 3.12 added comprehension inlining (about 1.2x on comprehension-heavy code) and
immutable <code>dict</code>/<code>list</code> methods that avoid copying. 3.13 added an experimental JIT
that specialises hot traces, plus the faster free-threaded path. Note that "faster" here is about the
interpreter's own overhead, not about your algorithm.</p>`));
    section.appendChild(collapsible('I want more speed without rewriting in C++.', `
<p><b>A:</b> in order: (1) fix the algorithm — an O(n log n) beats a tuned O(n²); (2) eliminate work with
memoisation; (3) vectorise with NumPy, or use <code>pandas</code>/<code>polars</code>/<code>pyarrow</code>
for data work; (4) batch instead of looping, using C-implemented bulk operations; (5) parallelise with
processes for CPU-bound work or asyncio/threads for I/O-bound work; (6) only then consider Cython, Rust
via PyO3, or <code>numba</code>/<code>cython</code> just-in-time compilation. Measure at every step — the
first two usually close the gap.</p>`));

    section.appendChild(card('🧩 Tricky and gotcha questions', ''));
    section.appendChild(collapsible('What is MRO in Python?', `
<p><b>A:</b> Method Resolution Order — C3 linearization defines the order base classes are searched for methods.</p>
<p>The full answer: <code>cls.__mro__</code> is a tuple listing <code>cls</code> and its bases in the order
Python searches them, computed by the C3 linearisation algorithm (Python 3.7+). Each class's MRO is the
merge of its parents' MROs followed by the class itself, preserving each parent's local order and never
reversing an inherited order; contradictory hierarchies raise <code>TypeError</code> at class creation.
<code>super()</code> follows this list, which is why cooperative multiple inheritance works and why a
hard-coded <code>Base.__init__()</code> call is a bug.</p>`));
    section.appendChild(collapsible('What are descriptors?', `
<p><b>A:</b> objects implementing <code>__get__</code>, <code>__set__</code>, <code>__delete__</code>. Used for properties, classmethods, staticmethods.</p>
<p>The full answer: a descriptor defines <code>__get__</code> (and optionally <code>__set__</code>/
<code>__delete__</code>); storing an instance of it on a class makes attribute access on that class call
the descriptor. <b>Data descriptors</b> (those defining <code>__set__</code> or <code>__delete__</code>)
take precedence over the instance <code>__dict__</code>, which is why <code>property</code> can intercept
assignment; <b>non-data descriptors</b> lose to the instance dict, which is why
<code>functools.cached_property</code> can write its cached value into the instance. Python's own
<code>property</code>, <code>classmethod</code>, <code>staticmethod</code>,
<code>functools.cached_property</code> and <code>functools.singledispatch</code> are all descriptors —
and so is the attribute mechanism of SQLAlchemy models and older Pydantic fields.</p>`));
    section.appendChild(collapsible('Generator or iterator — what is the difference?', `
<p><b>A:</b> an <em>iterable</em> has <code>__iter__</code> and produces an iterator; an <em>iterator</em>
has <code>__next__</code> and raises <code>StopIteration</code> when done. A generator is the function
syntax for building an iterator with <code>yield</code>. A generator object is its own iterator, which is
why iterating it twice yields nothing the second time, while a list — being only iterable — starts over
on every loop.</p>`));
    section.appendChild(collapsible('What are `__init__` and `__new__`?', `
<p><b>A:</b> <code>__new__</code> creates the object (it is a classmethod-ish static hook that receives the
class) and <code>__init__</code> initialises the instance that <code>__new__</code> returned. Calling a
class runs <code>__new__</code> then, if the result is an instance of that class, <code>__init__</code>.
Immutable types like <code>tuple</code>, <code>int</code> and <code>str</code> cannot use
<code>__init__</code>, so <code>tuple.__new__</code> does the whole job — and that is why
<code>__init_subclass__</code> exists for class creation hooks. Use <code>__new__</code> sparingly: it is
how <code>copy.copy</code>, metaclasses and caching proxies work.</p>`));
    section.appendChild(collapsible('Mutable vs immutable, and why does it matter?', `
<p><b>A:</b> immutable objects (<code>int</code>, <code>str</code>, <code>tuple</code>, <code>frozenset</code>)
can be shared, cached and passed around without defensive copying; mutable ones (<code>list</code>,
<code>dict</code>, <code>set</code>, instances) alias. It matters because assignment binds a name rather
than copying, so mutating a shared mutable argument changes the caller's data — the source of the classic
"my function modified my list" bug. Immutability is also what makes tuples usable as dict keys and set
members, and what lets CPython intern and share strings safely.</p>`));
    section.appendChild(collapsible('Why use a dataclass instead of a plain class?', `
<p><b>A:</b> it removes the boilerplate (<code>__init__</code>, <code>__repr__</code>, <code>__eq__</code>)
by generating it from annotated fields, and the flags express intent that is otherwise easy to get wrong:
<code>frozen=True</code> for hashable immutable values, <code>slots=True</code> for millions of instances,
<code>kw_only=True</code> for evolving optional fields, <code>order=True</code> for comparisons, and
<code>__post_init__</code> for validation. The cost is a small per-instance overhead versus a
<code>__slots__</code> class written by hand, and the rule that a mutable default requires
<code>field(default_factory=...)</code>.</p>`));
    section.appendChild(collapsible('Explain the GIL and when it matters.', `
<p><b>A:</b> it is a per-interpreter lock ensuring only one thread executes Python bytecode at a time.
It matters for CPU-bound threading (no speedup, sometimes slower) and not for I/O-bound work, because
CPython drops the lock on the eval breaker and around every blocking syscall and many C extensions.
Escape routes: processes, native extensions, or a free-threaded 3.13+/3.14 build (opt-in, single-threaded
slower). Distinguish that from 3.12's per-interpreter GIL, which isolates sub-interpreters rather than
removing the lock.</p>`));
    section.appendChild(card('📌 The five answers that always land', `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Names bind to objects</b> — assignment copies a reference, never the object.</li>
<li><b>Keyword-only arguments and <code>@wraps</code></b> are what keep an API and its wrappers honest.</li>
<li><b><code>await</code> suspends a task, not a thread</b> — anything that blocks the thread blocks every task.</li>
<li><b>C3 linearisation</b> determines the MRO, and <code>super()</code> is the only correct way to call through it.</li>
<li><b>Measure with <code>py-spy</code> before optimising</b>, then fix the algorithm, then vectorise, then parallelise.</li>
</ul>`));
    section.appendChild(card('🗣️ Interview tactics', 'Open with the one-line invariant, give the smallest runnable example, then volunteer the trap you have seen in production. Interviewers are listening for whether you know when the technique <em>fails</em> — a correct answer with no failure mode reads like recitation. If you are unsure, say what you would measure: that is a credible engineering answer and it keeps the conversation on your terms.'));

    container.appendChild(section);
}
