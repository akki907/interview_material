// src/content/py-iterators.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-iterators",
    title: "Iterators & Generators",
    intro: "__iter__ returns iterator. Generators use yield to produce values lazily.",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html:
                "<p><code>__iter__</code> returns iterator. Generators use <code>yield</code> to produce values " +
                "lazily.</p>" +
                "<p><b>The invariant that makes the protocol work:</b> an iterator must never return itself twice " +
                "— its state must advance monotonically until it finally raises <code>StopIteration</code>. The " +
                "<code>for</code> loop's <code>StopIteration</code> is how the iteration terminates, which is why " +
                "<code>next()</code> on an exhausted iterator raising is normal behaviour and not an error.</p>" +
                "<p>Rule of thumb: <b>iterable = has <code>__iter__</code>, iterator = has " +
                "<code>__next__</code></b>. A generator object is both, and it is its own iterator.</p>",
        },
        {
            kind: "card",
            title: "Protocol state machine",
            html:
                "<p>Follow the state transitions: <code>for</code> asks the iterable for an iterator once, then " +
                "repeatedly calls <code>next()</code> until <code>StopIteration</code>. The <code>else</code> branch " +
                "of a <code>for</code> loop is exactly that normal termination — <code>break</code> skips it.</p>",
        },
        {
            kind: "diagram",
            caption:
                "The iterator protocol as a state machine, with the generator frame as its internal state",
            source: `stateDiagram-v2
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
    Producing --> [*]`,
        },
        {
            kind: "code",
            title: "Example",
            language: "python",
            code: `def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b`,
        },
        {
            kind: "card",
            title: "Worked trace",
            html: `<p>Trace <code>list(islice(fibonacci(), 3))</code> — note the generator never builds the infinite series.</p>
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
for x in ReusableCountdown(3): pass   # works again - a new iterator each time</code></pre>`,
        },
        {
            kind: "card",
            title: "Generator flavours",
            html: `<table class="complexity-table">
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
            yield msg                 # async generator: back-pressure preserved</code></pre>`,
        },
        {
            kind: "card",
            title: "Laziness pipelines and memory",
            html: `<pre><code class="language-python">from itertools import chain, islice, groupby

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
defeats the purpose — that is the one sentence to remember about generator performance.</p>`,
        },
        {
            kind: "card",
            title: "Complexity",
            html: `<table class="complexity-table">
<tr><th>Aspect</th><th>Generator</th><th>List</th></tr>
<tr><td>Time to produce n items</td><td>O(total work), interleaved</td><td>O(n) up front, then O(1) reads</td></tr>
<tr><td>Peak memory</td><td>O(frame) — O(1) for a simple pipeline</td><td>O(n) plus per-object overhead</td></tr>
<tr><td>First value latency</td><td>O(1) — nothing runs before the first <code>next()</code></td><td>O(n) — the whole comprehension must finish</td></tr>
<tr><td>Re-iteration</td><td>No — one shot; wrap in a function to restart</td><td>Yes, infinitely</td></tr>
<tr><td>Cost per item</td><td>Extra frame switch: ~50-100 ns, plus saved allocations</td><td>List append amortised O(1), plus object allocation</td></tr>
</table>
<p style="margin-top:10px;">A generator wins on memory and start-up latency and loses on re-iteration and
per-item overhead. For <code>range(10**6)</code> the difference is invisible; for reading a 20 GB log the
generator is the only option that fits.</p>`,
        },
        {
            kind: "card",
            title: "Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Premature finalisation.</b> If a generator holds a resource, wrap the body in " +
                "<code>try/finally</code> and expose <code>close()</code>; PEP 380 adds " +
                "<code>GeneratorExit</code> handling for a reason.</li>" +
                "<li><b>Lazy is not eager-safe.</b> Exceptions inside the body raise at <em>iteration</em> time, " +
                "not at call time — a whole class of " +
                '"why does this fail later" bugs.</li>' +
                "<li><b>Draining twice.</b> Iterators are one-shot. Return the <em>function</em>, not the generator " +
                "object, from a factory API.</li>" +
                "<li><b><code>groupby</code> on unsorted input</b> silently produces one group per item because it " +
                "only groups <em>adjacent</em> equal keys.</li>" +
                "<li><b><code>send()</code> and <code>throw()</code></b> confuse readers and break " +
                "<code>yield from</code> delegation subtleties — avoid in application code, use in coroutine " +
                "protocols and test frameworks.</li>" +
                "<li><b>Generator <code>return value</b> is invisible</b> to <code>for</code>; use " +
                "<code>StopIteration.value</code> from <code>yield from</code> if you need it.</li>" +
                "<li><b>Infinite generator + <code>list()</code></b> hangs forever. Always bound an infinite " +
                "generator with <code>islice</code>.</li>" +
                "</ul>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "Interview Q&A" },
        {
            kind: "collapsible",
            title: "What is the difference between an iterable and an iterator?",
            html:
                "<p><b>A:</b> an iterable has <code>__iter__</code> and can produce an iterator; an iterator has " +
                "<code>__next__</code> and produces values, raising <code>StopIteration</code> when exhausted. " +
                "Lists are iterable but not iterators — which is why <code>for</code> calls <code>iter()</code> " +
                "on every pass and gets a fresh iterator, while iterating a generator object twice gives you " +
                "nothing the second time.</p>",
        },
        {
            kind: "collapsible",
            title: "Write a class implementing both dunders from scratch.",
            html: `<p><b>A:</b></p>
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

list(Fibonacci(50))     # restarts cleanly on every iteration</code></pre>`,
        },
        {
            kind: "collapsible",
            title: "Why use a generator when a list comprehension is faster?",
            html:
                "<p><b>A:</b> a generator never materialises the intermediate collection, so memory is O(1) " +
                "instead of O(n) and the first result arrives before the last input is read. That makes it the " +
                "right tool for streaming files, database cursors, network chunks and pipelines over infinite " +
                "sequences. The per-item overhead of resuming a frame is real but small compared to allocating and " +
                "keeping millions of objects alive.</p>",
        },
        {
            kind: "collapsible",
            title: "When is laziness actively harmful?",
            html:
                "<p><b>A:</b> when the consumer needs random access (<code>itertools.islice</code> twice, " +
                "indexing), repeated passes, or a length. Those force materialisation anyway, so use a list — or " +
                "<code>itertools.tee</code> if you truly need two passes, at the cost of buffering.</p>",
        },
        {
            kind: "card",
            title: "Real-world usage",
            html:
                "Reading multi-gigabyte logs line by line, CSV and Parquet streaming readers, " +
                "<code>paginate()</code> in Django, async generators streaming SSE or WebSocket chunks, " +
                "<code>yield from</code> in parsers, <code>itertools.groupby</code> for run-length encoding, and " +
                "<code>yield</code>-based coroutines for legacy asyncio. Pipelines in Airflow and data loaders lean " +
                "on the same laziness.",
        },
        {
            kind: "card",
            title: "What to say out loud",
            html:
                'Say "iterable has <code>__iter__</code>, iterator has <code>__next__</code> and is one-shot", ' +
                "then walk the three-step <code>for</code> protocol. Add the one practical consequence: laziness " +
                "only pays off when the consumer streams too.",
        },
    ],
});
