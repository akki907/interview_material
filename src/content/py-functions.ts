// src/content/py-functions.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-functions",
    title: "Functions",
    intro: "First-class objects. Closures. *args collects positional, **kwargs collects keyword.",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>First-class objects. Closures. <code>*args</code> collects positional, " +
                "<code>**kwargs</code> collects keyword.</p>" +
                "<p><b>The invariant that makes scoping predictable:</b> a name resolves by walking the enclosing " +
                "<code>def</code> scopes lexically at compile time — never the caller's stack. A closure therefore " +
                "captures <em>variables</em> (cells), not <em>values</em>, and sees whatever those variables hold " +
                "when it runs. That single fact explains late binding, the classic loop-lambda bug, and " +
                "<code>nonlocal</code>.</p>",
        },
        {
            kind: "card",
            title: "🎯 Scopes, closures and the cell",
            html:
                "<p>The two closure bugs below are the same mechanism: the lambda captures the loop variable itself, " +
                "and the variable keeps being reassigned after the lambda is created.</p>",
        },
        {
            kind: "diagram",
            caption: "A closure is a function plus the cells it captured",
            source: `flowchart TD
    DEF["def outer<br/>x = 1"] --> CELL["closure cell for x<br/>shared by every function defined here"]
    CELL --> G1["def inner_a reads x"]
    CELL --> G2["def inner_b writes x<br/>needs the nonlocal keyword"]
    G2 --> CELL
    OUTER["outer returns inner_a"] --> KEEP["the cell outlives the frame<br/>that is what a closure is"]
    KEEP --> CALL["inner_a runs long after outer returned<br/>and reads the CURRENT value of x"]
    LOOP["for i in range(3):<br/>fns.append(lambda: i)"] --> CELL2["one shared cell for i"]
    CELL2 --> LATE["all three lambdas return 2<br/>the late-binding bug"]
    LOOP -.->|"fix: lambda i=i: i"| CELL3["per-iteration binding"]
    CELL3 --> OK["each lambda sees its own i"]`,
        },
        {
            kind: "code",
            title: "💻 Example",
            language: "python",
            code: `def compose(*fns):
    def inner(x):
        for f in reversed(fns):
            x = f(x)
        return x
    return inner`,
        },
        {
            kind: "card",
            title: "🔑 Parameter passing",
            html: `<table class="complexity-table">
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
    return bucket</code></pre>`,
        },
        {
            kind: "card",
            title: "🎛️ The callable protocol",
            html: `<p>A "function" is really "any object implementing <code>__call__</code>". That is the difference between
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
Counter() is Counter.__call__(Counter)</code></pre>`,
        },
        {
            kind: "table",
            title: "⏱️ Complexity",
            headers: ["Aspect", "Bound", "Notes"],
            rows: [
                [
                    "Plain call",
                    "O(1) plus arguments",
                    "The call itself is a few tens of nanoseconds; the body dominates",
                ],
                [
                    "<code>*args</code> / <code>**kwargs</code>",
                    "+O(n) allocations",
                    "A tuple, and a new dict per call — measurable in millions-of-calls hot loops",
                ],
                [
                    "<code>compose(f, g)(x)</code>",
                    "O(k) for k functions",
                    "One call per layer; deep pipelines accumulate call overhead",
                ],
                [
                    "Recursive functions",
                    "O(n) depth",
                    "CPython raises <code>RecursionError</code> around 1000 nested frames unless " +
                        "<code>sys.setrecursionlimit</code> is raised — and the C stack may overflow first",
                ],
                [
                    "Closures",
                    "O(1) extra space per cell",
                    "Cells stay alive as long as any function references them",
                ],
            ],
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Mutable default arguments</b> — evaluated once at <code>def</code> time and shared by every " +
                "call. The single most common Python bug in production.</li>" +
                "<li><b>Late binding in loops</b> — <code>[lambda: i for i in range(3)]</code> gives three functions " +
                "that all return the final <code>i</code>. Bind with a default argument or use a comprehension " +
                "(which has its own scope).</li>" +
                "<li><b>Using <code>nonlocal</code> when you meant <code>global</code></b> (or vice versa) — " +
                "<code>nonlocal</code> rebinds the enclosing function's cell, which is what a counter closure " +
                "needs.</li>" +
                "<li><b><code>global</code> for caches and counters.</b> It works, and it is untestable, " +
                "unthread-safe and invisible in the signature. Use a returned function or a closure cell.</li>" +
                "<li><b><code>pop(0)</code> / <code>insert(0, x)</code> on a list</b> — O(n) each; use " +
                "<code>collections.deque</code>.</li>" +
                "<li><b>Signature drift from <code>*args, **kwargs</code>.</b> Wrappers lose the contract unless " +
                "you add <code>@wraps</code>; <code>functools.wraps</code> also restores " +
                "<code>__wrapped__</code> so <code>inspect.signature</code> works.</li>" +
                "<li><b>Forward references.</b> Annotations are evaluated at <code>def</code> time, so " +
                "<code>def f() -&gt; Node</code> needs quotes or " +
                "<code>from __future__ import annotations</code> before <code>Node</code> exists.</li>" +
                "<li><b>Recursion depth</b> — the default limit is 1000 frames; iterative conversion or " +
                "<code>sys.setrecursionlimit</code> plus a bigger thread stack is the safe fix for deep " +
                "trees.</li>" +
                "</ul>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "🎤 Interview Q&A" },
        {
            kind: "collapsible",
            title: "Explain closures in one example.",
            html: `<p><b>A:</b></p>
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
mechanism: functions plus captured cells.</p>`,
        },
        {
            kind: "collapsible",
            title: "Why is the mutable default argument a bug?",
            html:
                "<p><b>A:</b> the default is evaluated once when the <code>def</code> statement executes, and the " +
                "resulting object is stored in the function object. Every call that omits the argument shares that " +
                "same object, so state accumulates across calls. Tests pass individually and fail in a suite. The " +
                "fix is <code>None</code> + allocate inside, which also makes the intent explicit.</p>",
        },
        {
            kind: "collapsible",
            title: "What are `*args` and `**kwargs` for, and what do they cost?",
            html:
                "<p><b>A:</b> they accept an unknown number of positional and keyword arguments. Positional extras " +
                "are collected into a tuple and keyword extras into a fresh dict, so there is one allocation per " +
                "call plus the cost of the body. For a hot loop, prefer an explicit signature; for decorators, " +
                "wrappers and config-forwarding helpers, they are the right tool.</p>",
        },
        {
            kind: "collapsible",
            title: "When is `functools.partial` better than a lambda?",
            html:
                "<p><b>A:</b> when you are pre-binding leading arguments, because <code>partial</code> keeps the " +
                "remaining ones positional and passes keywords through correctly, while " +
                "<code>lambda *a, **k: f(x, *a, **k)</code> has to rebuild the whole call. " +
                "<code>partial</code> also has a <code>.func</code>/<code>.args</code>/" +
                "<code>.keywords</code> you can introspect — which is what makes it picklable and inspectable " +
                "where a lambda is neither.</p>",
        },
        {
            kind: "collapsible",
            title: "`def`, `lambda` and `functools.partial` — how do you choose?",
            html:
                "<p><b>A:</b> <code>def</code> for anything named, documented, multi-line or stack-traced; " +
                "<code>lambda</code> for a single expression passed as an argument, especially as a sort key; " +
                "<code>partial</code> to pre-bind arguments of an existing callable without adding a frame. Prefer " +
                "readable <code>def</code> over clever lambdas in application code.</p>",
        },
        {
            kind: "card",
            title: "🔥 Real-world usage",
            html:
                "Django/Flask route functions and FastAPI dependencies lean on keyword-only signatures and type " +
                "hints. <code>functools.partial</code> is how test suites inject fakes. <code>contextlib</code>, " +
                "<code>asyncpg</code> connection callbacks and most retry libraries register callbacks through the " +
                "callable protocol. Closures are the basis for decorators, <code>@lru_cache</code>-adjacent caching, " +
                'and any "factory returns a configured worker" pattern.',
        },
        {
            kind: "card",
            title: "🗣️ What to say out loud",
            html:
                "Draw the cell: a closure is a function plus the cells it captured. Then the two consequences — " +
                "late binding in loops, and the shared-mutable-default trap — and finish with the callable protocol. " +
                "Three minutes, and every Python scoping question is on the table.",
        },
    ],
});
