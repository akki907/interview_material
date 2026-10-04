// src/content/py-interview.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-interview",
    title: "Python Interview Questions",
    blocks: [
        {
            kind: "card",
            title: "How to answer Python questions",
            html:
                "<p>Every Python question is really one of four: <b>object model</b> (names, mutability, hashing), " +
                "<b>language protocol</b> (iterators, descriptors, dunders), <b>runtime semantics</b> (scoping, " +
                "evaluation order, references), or <b>concurrency</b> (GIL, event loop, processes). Name the " +
                "category in your first sentence, give the smallest correct example, then state the trap. Depth " +
                "comes from the trap, not from listing more syntax.</p>",
        },
        {
            kind: "table",
            title: "Core language",
            headers: ["Area", "Must-know"],
            rows: [
                [
                    "Object model",
                    "Names vs objects, mutability, <code>==</code> vs <code>is</code>, " +
                        "<code>hash</code>/<code>__eq__</code> contract, interning",
                ],
                [
                    "Data structures",
                    "dict vs set vs deque, list slicing copies, amortised O(1), hash collisions",
                ],
                [
                    "Functions",
                    "positional-only, keyword-only, <code>*args</code>/<code>**kwargs</code>, closures, late " +
                        "binding, mutable defaults",
                ],
                [
                    "OOP",
                    "MRO/C3, <code>super()</code>, descriptors, <code>property</code>, <code>slots</code>, ABC vs " +
                        "Protocol, dataclass flags",
                ],
                [
                    "Iterators",
                    "<code>__iter__</code>/<code>__next__</code>, generators, <code>yield from</code>, laziness, " +
                        "one-shot iteration",
                ],
                [
                    "Metaprogramming",
                    "<code>getattr</code>/<code>setattr</code>, <code>__getattr__</code>, monkey-patching, decorators " +
                        "with arguments",
                ],
            ],
        },
        // The legacy card was an empty wrapper around the diagram below.
        { kind: "card", title: "Python-specific & version-aware" },
        {
            kind: "diagram",
            caption:
                "Separate language guarantees from CPython version behaviour",
            source: `flowchart TD
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
    V14 --> CHECK`,
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "Performance questions" },
        {
            kind: "collapsible",
            title: "Why is my list operation slow, and how do I profile it?",
            html:
                "<p><b>A:</b> profile before guessing: <code>cProfile</code> for call counts and cumulative time, " +
                "<code>py-spy</code> for sampling a running process with <code>dump</code> or <code>top</code> (no " +
                "instrumentation, works in production), <code>line_profiler</code> for per-line cost, and " +
                "<code>timeit</code> for microbenchmarks. Then look for the usual suspects: O(n) membership on a list " +
                "that should be a set, quadratic <code>+=</code> or <code>pop(0)</code> in a loop, repeated work " +
                "inside a loop, and objects rebuilt on every iteration.</p>",
        },
        {
            kind: "collapsible",
            title: "How is CPython faster now than in 3.10?",
            html:
                "<p><b>A:</b> three separate changes. 3.11 shipped a specialising adaptive interpreter that caches " +
                "instruction-specific fast paths after warm-up and removed per-object type checks in the eval loop — " +
                "that alone was the biggest jump. 3.12 added comprehension inlining (about 1.2x on " +
                "comprehension-heavy code) and immutable <code>dict</code>/<code>list</code> methods that avoid " +
                "copying. 3.13 added an experimental JIT that specialises hot traces, plus the faster free-threaded " +
                "path. Note that " +
                '"faster" here is about the interpreter\'s own overhead, not about your algorithm.</p>',
        },
        {
            kind: "collapsible",
            title: "I want more speed without rewriting in C++.",
            html:
                "<p><b>A:</b> in order: (1) fix the algorithm — an O(n log n) beats a tuned O(n²); (2) eliminate " +
                "work with memoisation; (3) vectorise with NumPy, or use <code>pandas</code>/" +
                "<code>polars</code>/<code>pyarrow</code> for data work; (4) batch instead of looping, using " +
                "C-implemented bulk operations; (5) parallelise with processes for CPU-bound work or " +
                "asyncio/threads for I/O-bound work; (6) only then consider Cython, Rust via PyO3, or " +
                "<code>numba</code>/<code>cython</code> just-in-time compilation. Measure at every step — the first " +
                "two usually close the gap.</p>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "Tricky and gotcha questions" },
        {
            kind: "collapsible",
            title: "What is MRO in Python?",
            html:
                "<p><b>A:</b> Method Resolution Order — C3 linearization defines the order base classes are searched " +
                "for methods.</p>" +
                "<p>The full answer: <code>cls.__mro__</code> is a tuple listing <code>cls</code> and its bases in the " +
                "order Python searches them, computed by the C3 linearisation algorithm (Python 3.7+). Each class's " +
                "MRO is the merge of its parents' MROs followed by the class itself, preserving each parent's local " +
                "order and never reversing an inherited order; contradictory hierarchies raise " +
                "<code>TypeError</code> at class creation. <code>super()</code> follows this list, which is why " +
                "cooperative multiple inheritance works and why a hard-coded <code>Base.__init__()</code> call is a " +
                "bug.</p>",
        },
        {
            kind: "collapsible",
            title: "What are descriptors?",
            html:
                "<p><b>A:</b> objects implementing <code>__get__</code>, <code>__set__</code>, " +
                "<code>__delete__</code>. Used for properties, classmethods, staticmethods.</p>" +
                "<p>The full answer: a descriptor defines <code>__get__</code> (and optionally " +
                "<code>__set__</code>/<code>__delete__</code>); storing an instance of it on a class makes " +
                "attribute access on that class call the descriptor. <b>Data descriptors</b> (those defining " +
                "<code>__set__</code> or <code>__delete__</code>) take precedence over the instance " +
                "<code>__dict__</code>, which is why <code>property</code> can intercept assignment; <b>non-data " +
                "descriptors</b> lose to the instance dict, which is why " +
                "<code>functools.cached_property</code> can write its cached value into the instance. Python's own " +
                "<code>property</code>, <code>classmethod</code>, <code>staticmethod</code>, " +
                "<code>functools.cached_property</code> and <code>functools.singledispatch</code> are all " +
                "descriptors — and so is the attribute mechanism of SQLAlchemy models and older Pydantic " +
                "fields.</p>",
        },
        {
            kind: "collapsible",
            title: "Generator or iterator — what is the difference?",
            html:
                "<p><b>A:</b> an <em>iterable</em> has <code>__iter__</code> and produces an iterator; an " +
                "<em>iterator</em> has <code>__next__</code> and raises <code>StopIteration</code> when done. A " +
                "generator is the function syntax for building an iterator with <code>yield</code>. A generator " +
                "object is its own iterator, which is why iterating it twice yields nothing the second time, while a " +
                "list — being only iterable — starts over on every loop.</p>",
        },
        {
            kind: "collapsible",
            title: "What are `__init__` and `__new__`?",
            html:
                "<p><b>A:</b> <code>__new__</code> creates the object (it is a classmethod-ish static hook that " +
                "receives the class) and <code>__init__</code> initialises the instance that <code>__new__</code> " +
                "returned. Calling a class runs <code>__new__</code> then, if the result is an instance of that " +
                "class, <code>__init__</code>. Immutable types like <code>tuple</code>, <code>int</code> and " +
                "<code>str</code> cannot use <code>__init__</code>, so <code>tuple.__new__</code> does the whole " +
                "job — and that is why <code>__init_subclass__</code> exists for class creation hooks. Use " +
                "<code>__new__</code> sparingly: it is how <code>copy.copy</code>, metaclasses and caching proxies " +
                "work.</p>",
        },
        {
            kind: "collapsible",
            title: "Mutable vs immutable, and why does it matter?",
            html:
                "<p><b>A:</b> immutable objects (<code>int</code>, <code>str</code>, <code>tuple</code>, " +
                "<code>frozenset</code>) can be shared, cached and passed around without defensive copying; mutable " +
                "ones (<code>list</code>, <code>dict</code>, <code>set</code>, instances) alias. It matters because " +
                "assignment binds a name rather than copying, so mutating a shared mutable argument changes the " +
                'caller\'s data — the source of the classic "my function modified my list" bug. Immutability is ' +
                "also what makes tuples usable as dict keys and set members, and what lets CPython intern and " +
                "share strings safely.</p>",
        },
        {
            kind: "collapsible",
            title: "Why use a dataclass instead of a plain class?",
            html:
                "<p><b>A:</b> it removes the boilerplate (<code>__init__</code>, <code>__repr__</code>, " +
                "<code>__eq__</code>) by generating it from annotated fields, and the flags express intent that is " +
                "otherwise easy to get wrong: <code>frozen=True</code> for hashable immutable values, " +
                "<code>slots=True</code> for millions of instances, <code>kw_only=True</code> for evolving optional " +
                "fields, <code>order=True</code> for comparisons, and <code>__post_init__</code> for validation. " +
                "The cost is a small per-instance overhead versus a <code>__slots__</code> class written by hand, and " +
                "the rule that a mutable default requires <code>field(default_factory=...)</code>.</p>",
        },
        {
            kind: "collapsible",
            title: "Explain the GIL and when it matters.",
            html:
                "<p><b>A:</b> it is a per-interpreter lock ensuring only one thread executes Python bytecode at a " +
                "time. It matters for CPU-bound threading (no speedup, sometimes slower) and not for I/O-bound " +
                "work, because CPython drops the lock on the eval breaker and around every blocking syscall and " +
                "many C extensions. Escape routes: processes, native extensions, or a free-threaded 3.13+/3.14 build " +
                "(opt-in, single-threaded slower). Distinguish that from 3.12's per-interpreter GIL, which isolates " +
                "sub-interpreters rather than removing the lock.</p>",
        },
        {
            kind: "card",
            title: "The five answers that always land",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Names bind to objects</b> — assignment copies a reference, never the object.</li>" +
                "<li><b>Keyword-only arguments and <code>@wraps</code></b> are what keep an API and its wrappers " +
                "honest.</li>" +
                "<li><b><code>await</code> suspends a task, not a thread</b> — anything that blocks the thread blocks " +
                "every task.</li>" +
                "<li><b>C3 linearisation</b> determines the MRO, and <code>super()</code> is the only correct way to " +
                "call through it.</li>" +
                "<li><b>Measure with <code>py-spy</code> before optimising</b>, then fix the algorithm, then " +
                "vectorise, then parallelise.</li>" +
                "</ul>",
        },
        {
            kind: "card",
            title: "Interview tactics",
            html:
                "Open with the one-line invariant, give the smallest runnable example, then volunteer the trap you " +
                "have seen in production. Interviewers are listening for whether you know when the technique " +
                "<em>fails</em> — a correct answer with no failure mode reads like recitation. If you are unsure, " +
                "say what you would measure: that is a credible engineering answer and it keeps the conversation on " +
                "your terms.",
        },
    ],
});
