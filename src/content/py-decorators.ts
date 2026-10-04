// src/content/py-decorators.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-decorators",
    title: "Decorators",
    intro: "Functions that modify other functions. Wraps behavior without changing source.",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html:
                "<p>Functions that modify other functions. Wraps behavior without changing source.</p>" +
                "<p><b>The invariant that makes decorators safe:</b> a decorator must return a callable that is " +
                "<b>interchangeable</b> with the function it replaced — same signature, same return value, same side " +
                "effects. Everything else (<code>functools.wraps</code>, argument forwarding, attribute copying) " +
                "exists to protect that invariant.</p>" +
                "<p>A decorator is exactly <code>fn = decorator(fn)</code>. Python has no syntax for it; the " +
                "<code>@</code> sign is that one line, written for you.</p>",
        },
        {
            kind: "card",
            title: "Order of application",
            html: `<p>Bottom-up. The decorator closest to <code>def</code> is applied first, and the last one written on top
is applied last — so the outermost call at runtime is the one written first, i.e. the one farthest from
<code>def</code>.</p>
<pre><code class="language-python">@a
@b
def f(): ...          # == def f(): ...
                       #     f = a(b(f))</code></pre>
<p>At call time the order <b>inverts</b>: <code>a</code>'s wrapper runs first, then <code>b</code>'s, then
<code>f</code>'s body.</p>`,
        },
        // The legacy card held an empty viz-area and the diagram below it.
        { kind: "card", title: "Decoration order, visually" },
        {
            kind: "diagram",
            caption: "Bottom-up decoration, top-down execution",
            source: `flowchart TB
    DEF["def f<br/>plain function object"] --> D1["apply b<br/>f = b(f)<br/>b-wrapper wraps plain f"]
    D1 --> D2["apply a<br/>f = a(b(f))<br/>a-wrapper wraps b-wrapper"]
    D2 --> CALL["call f<br/>a outer &rarr; b &rarr; original"]
    DEF -.-> D3["@a<br/>written here<br/>but applied last"]
    D3 -.-> D2`,
        },
        {
            kind: "code",
            title: "Example",
            language: "python",
            code: `def retry(max_attempts=3):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try: return fn(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1: raise
        return wrapper
    return decorator`,
        },
        {
            kind: "card",
            title: "Decorators with parameters",
            html: `<p>Because <code>@retry</code> calls <code>retry(fn)</code>, a decorator that takes arguments needs the
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
<code>exceptions</code> tuple and let real bugs surface.</p>`,
        },
        {
            kind: "table",
            title: "Built-in decorators",
            headers: ["Decorator", "What it does", "Interview angle"],
            rows: [
                [
                    "<code>@functools.wraps(fn)</code>",
                    "Copies <code>__name__</code>, <code>__doc__</code>, <code>__wrapped__</code>, " +
                        "<code>__dict__</code> onto the wrapper",
                    "Without it, <code>help()</code>, logging by function name and Sphinx all break",
                ],
                [
                    "<code>@property</code>",
                    "Descriptor: <code>obj.attr</code> becomes a method call",
                    "Use for computed attributes; never for expensive work with no invalidation story",
                ],
                [
                    "<code>@staticmethod</code> / <code>@classmethod</code>",
                    "Descriptors that rebind <code>__get__</code>",
                    "<code>classmethod</code> receives the class — the idiomatic place for alternative constructors",
                ],
                [
                    "<code>@lru_cache</code> / <code>@cache</code>",
                    "Memoisation keyed on args; <code>cache_info()</code> exposes hits/misses",
                    "Requires hashable arguments; caching a coroutine leaks the un-awaited coroutine (see async " +
                        "page)",
                ],
                [
                    "<code>@property.setter</code>",
                    "Second function with the same name",
                    "Validation belongs here; see pitfall 3 below",
                ],
                [
                    "<code>@abstractmethod</code>",
                    "Marks a method for <code>ABC</code>; blocks instantiation",
                    "Structural, not nominal, typing: duck typing at class level",
                ],
                [
                    "<code>@dataclass</code>",
                    "Generates <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code> from annotations",
                    "<code>frozen=True</code> adds <code>__hash__</code>; <code>slots=True</code> saves memory",
                ],
                [
                    "<code>@contextlib.contextmanager</code>",
                    "Turns a generator into a <code>with</code> statement",
                    "Ensure the <code>yield</code> is guarded by <code>try/finally</code>",
                ],
                [
                    "<code>@functools.singledispatch</code>",
                    "Dispatches on the type of the first argument",
                    "Functional replacement of <code>isinstance</code> dispatch",
                ],
            ],
        },
        {
            kind: "card",
            title: "Class decorators & stacked use",
            html: `<pre><code class="language-python">registry = {}

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
Order is a design decision about which layer owns which responsibility.</p>`,
        },
        // The legacy card was an empty wrapper around the anatomy diagram below.
        { kind: "card", title: "Parameterised decorator anatomy" },
        {
            kind: "diagram",
            caption:
                "The three levels: parameter binding, function binding, call binding",
            source: `flowchart TD
    CALL["@retry(times=5)"] --> L1["retry(times=5)<br/>captures times + delay in a closure"]
    L1 -->|"returns decorator"| L2["decorator(fn)<br/>receives the undecorated function"]
    L2 --> L3["wrapper(*args, **kwargs)<br/>performs the actual work"]
    L3 --> FN["fn(*args, **kwargs)<br/>the original function body"]
    L3 -->|"raises after last attempt"| ERR["propagate the last exception"]
    WRAPS["@wraps(fn)<br/>copies __name__ and __doc__"] -.-> L3`,
        },
        {
            kind: "table",
            title: "Cost",
            headers: ["Aspect", "Cost", "Degrades when"],
            rows: [
                [
                    "Import time",
                    "O(1) per decoration",
                    "Thousands of decorated definitions at import time (e.g. huge generated APIs)",
                ],
                [
                    "Runtime per call",
                    "+1 Python frame (<code>wrapper</code>) → roughly 1-2 µs",
                    "Hot loops called millions of times per second",
                ],
                [
                    "Memory",
                    "One extra function object + one closure cell per decoration",
                    "Dynamic per-call decoration (a decorator factory in a loop)",
                ],
                [
                    "Debuggability",
                    "Stack frames gain a <code>wrapper</code> level; <code>inspect.stack()</code> shows it",
                    "—",
                ],
            ],
        },
        {
            kind: "card",
            title: "Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Forgetting <code>@wraps</code></b> — the function loses its name and docstring, which " +
                "breaks introspection, logging by <code>__name__</code>, and framework registration.</li>" +
                "<li><b>Mutating the setter instead of the attribute.</b> With <code>@x.setter</code>, assigning " +
                "<code>self.x = value</code> recurses into the setter infinitely. Either validate into a different " +
                "attribute or make the property return a value without storing it.</li>" +
                "<li><b>Caching coroutines.</b> <code>@lru_cache</code> on an <code>async def</code> returns the " +
                "<em>same coroutine object</em>; the second caller gets a coroutine that has already been awaited → " +
                "<code>RuntimeError: cannot reuse already awaited coroutine</code>. Use an explicit per-key " +
                "<code>asyncio.Lock</code> instead.</li>" +
                "<li><b>Decorating across processes.</b> A closure-based decorator is not picklable, so " +
                "<code>multiprocessing.Pool.imap</code> over decorated functions fails. Use module-level functions " +
                "or <code>functools.partial</code>.</li>" +
                "<li><b>Losing the ability to call the original.</b> Keep <code>wrapper.__wrapped__ = fn</code> " +
                "(that is what <code>@wraps</code> does) so tests and <code>inspect.signature</code> can reach the " +
                "undecorated version.</li>" +
                "<li><b>Decorating <code>async def</code> with a sync wrapper</b> blocks the event loop — the " +
                "wrapper must be <code>async def</code> and must <code>await fn(...)</code>.</li>" +
                "<li><b>Class decorators break <code>isinstance</code></b> if they return a different object (a " +
                "proxy, a factory) — a classic surprise when a " +
                '"decorator" is really a metaclass replacement.</li>' +
                "</ul>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "Interview Q&A" },
        {
            kind: "collapsible",
            title: 'Explain decorators without using the word "wrapper".',
            html:
                "<p><b>A:</b> a decorator is a function that takes a function and returns a replacement. " +
                "<code>@d</code> is syntactic sugar for <code>f = d(f)</code>. The return value only has to be " +
                "callable — it can be a plain function, a class, or a callable object — but to keep " +
                "<code>f</code> substitutable it must preserve the signature and metadata, which is what " +
                "<code>functools.wraps</code> is for.</p>",
        },
        {
            kind: "collapsible",
            title: "What is the difference between a class decorator and `metaclass`?",
            html:
                "<p><b>A:</b> a class decorator runs once, right after the class body finishes executing, and " +
                "receives the finished class object — good for registration, validation and wrapping. A metaclass " +
                "controls class <em>creation</em> (methods like <code>__call__</code>, <code>__new__</code>, " +
                "<code>__init_subclass__</code>) and applies to every class in that hierarchy, including " +
                "subclasses.</p>",
        },
        {
            kind: "collapsible",
            title: "How would you add a timeout to an arbitrary function?",
            html: `<p><b>A:</b> with <code>functools.wraps</code> and a thread if the callee is sync:</p>
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
cancellation is cooperative and cheap there.</p>`,
        },
        {
            kind: "collapsible",
            title: "Why is `@lru_cache` dangerous on an `async def`?",
            html:
                "<p><b>A:</b> the cache stores the coroutine object, not its result. The first caller awaits it; " +
                "the second caller receives the already-consumed coroutine and gets " +
                '"cannot reuse already awaited coroutine". Fixes: cache on the awaited result inside an ' +
                "<code>async</code> wrapper with a per-key <code>asyncio.Lock</code>, or use a <code>Task</code> " +
                "as the cached value so concurrent callers <code>await</code> the same in-flight operation.</p>",
        },
        {
            kind: "collapsible",
            title: "Do decorators hurt performance?",
            html:
                "<p><b>A:</b> one extra Python frame per call — on the order of a microsecond, negligible for " +
                "I/O-bound code and measurable only in tight numeric loops. Also note " +
                "<code>functools.wraps</code> sets <code>__wrapped__</code>, so <code>inspect</code> and " +
                "<code>help</code> still report the original signature.</p>",
        },
        {
            kind: "card",
            title: "Real-world usage",
            html:
                "Every Flask/FastAPI route uses <code>@app.get</code>. Flask adds one more layer: " +
                "<code>@app.route</code> wraps the view in <code>werkzeug</code> request context management. " +
                "<code>functools.lru_cache</code> fronts memoised lookups; <code>@retry</code> and " +
                "<code>@timeout</code> wrap SDK clients; <code>@dataclass</code> turns config classes into " +
                "validated records; <code>@override</code> (3.12+) documents Liskov overrides.",
        },
        {
            kind: "card",
            title: "What to say out loud",
            html:
                "Say the one-liner (<code>f = d(f)</code>), then the application order and the call order, then " +
                "show the three-level parameterised form. Name <code>@wraps</code> and the coroutine-caching trap " +
                "unprompted — that is the detail that separates a memorised answer from a real one.",
        },
    ],
});
