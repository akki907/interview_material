// src/content/py-oop.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-oop",
    title: "OOP",
    intro: "Classes, inheritance, MRO (C3 linearization), dataclasses, abstract base classes.",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>Classes, inheritance, MRO (C3 linearization), dataclasses, abstract base classes.</p>" +
                "<p><b>The invariant that makes attribute access work:</b> <code>obj.attr</code> is never " +
                '"a field" — it is a protocol. Python looks up <code>type(obj).__mro__</code> for a data ' +
                "descriptor, then the instance <code>__dict__</code>, then a non-data descriptor, and only then " +
                "raises <code>AttributeError</code>. A <code>property</code> is simply a descriptor sitting in that " +
                "lookup.</p>",
        },
        // The legacy card held the diagram between two paragraphs; the diagram is a
        // sibling block now, so both paragraphs live in the card body.
        {
            kind: "card",
            title: "🧭 Attribute lookup and the MRO",
            html:
                "<p>Every attribute read walks the method resolution order computed by the C3 linearisation " +
                "algorithm. Descriptor precedence is what makes <code>property</code>, " +
                "<code>functools.cached_property</code> and validation setters composable instead of magical.</p>" +
                "<p>The C3 linearisation (Python 3.7+, it replaced the old depth-first, left-to-right rule) builds " +
                "each class MRO as the merge of its parents' MROs plus itself, preserving local precedence and " +
                "monotonicity.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Lookup order: data descriptor, instance dict, non-data descriptor",
            source: `flowchart TD
    A["obj.attr"] --> B{"Data descriptor found<br/>in type obj mro?<br/>defines __set__ or __delete__"}
    B -->|"yes"| C["call its __get__<br/>property, cached_property, dataclass field"]
    B -->|"no"| D{"Key in instance __dict__?"}
    D -->|"yes"| E["return the instance value"]
    D -->|"no"| F{"Non-data descriptor or plain<br/>attribute in type obj mro?"}
    F -->|"yes"| G["return the descriptor value<br/>plain function binds as a bound method"]
    F -->|"no"| H["AttributeError"]
    C --> I["Instance __setattr__ runs<br/>data descriptors win over __dict__"]`,
        },
        {
            kind: "card",
            title: "🔢 Worked example — C3 linearisation",
            html: `<p>For <code>class D(B, C)</code> with <code>B(A)</code> and <code>C(A)</code>:</p>
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
also needs initialising, which turns a diamond into a partially built object.</p>`,
        },
        {
            kind: "code",
            title: "💻 Example",
            language: "python",
            code: `from abc import ABC, abstractmethod
class Repository(ABC):
    @abstractmethod
    def save(self, entity): pass

class PostgresRepo(Repository):
    def save(self, entity):
        # INSERT INTO ...
        pass`,
        },
        {
            kind: "card",
            title: "🏗️ Dataclasses, ABCs and protocols",
            html: `<table class="complexity-table">
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
    repo.save(order)</code></pre>`,
        },
        {
            kind: "card",
            title: "🔌 Descriptors & special methods",
            html: `<p>Anything that implements <code>__get__</code>, <code>__set__</code> or <code>__delete__</code> is a
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
</table>`,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Mutable class attributes are shared by every instance.</b> <code>items = []</code> in the " +
                "class body is one list for the whole class; use a <code>field(default_factory=list)</code>.</li>" +
                "<li><b><code>__eq__</code> without <code>__hash__</code></b> makes instances unhashable (Python sets " +
                "it to <code>None</code>). Re-declare it, or use <code>frozen=True</code>.</li>" +
                "<li><b>Equality across types.</b> Return <code>NotImplemented</code>, do not raise — it lets Python " +
                "fall back to the reflected operation.</li>" +
                "<li><b>Forgetting <code>super().__init__()</code></b> in a multiple-inheritance hierarchy leaves the " +
                "other bases uninitialised; the classic symptom is a missing attribute only on one code " +
                "path.</li>" +
                "<li><b><code>@property</code> that does heavy work.</b> Every read recomputes, and it now looks like " +
                "a free attribute. Use <code>cached_property</code>, or compute once in " +
                "<code>__post_init__</code>.</li>" +
                "<li><b>Deep inheritance chains</b> make the MRO hard to reason about and make <code>super()</code> " +
                "chains expensive to debug. Prefer composition.</li>" +
                "<li><b>Dunder methods are looked up on the type, not the instance</b> — " +
                "<code>obj.__len__()</code> bypasses normal instance lookup and can break for proxies; implement " +
                "<code>__len__</code> and let the syntax do the work.</li>" +
                "<li><b>Adding attributes in <code>__init__</code> without annotations</b> works, but " +
                "<code>slots</code> classes, dataclass <code>repr</code>, and type checkers will all " +
                "complain.</li>" +
                "</ul>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "🎤 Interview Q&A" },
        {
            kind: "collapsible",
            title: "What is the MRO and how is it computed?",
            html:
                "<p><b>A:</b> the Method Resolution Order is the order Python searches " +
                "<code>type(cls).__mro__</code> for an attribute. It is built by the C3 linearisation of the " +
                "class's direct bases: take each parent's MRO, merge them while preserving local precedence " +
                "order, then append the class itself. Consistency is checked at class creation, so " +
                "contradictory hierarchies raise <code>TypeError</code>. <code>super()</code> is simply " +
                '"the next class in this MRO".</p>',
        },
        {
            kind: "collapsible",
            title: "ABC or Protocol — how do you choose?",
            html:
                "<p><b>A:</b> <code>ABC</code> is nominal: subclasses must explicitly inherit to satisfy it, and " +
                "you get a runtime instantiation check plus shared base-class code. <code>Protocol</code> is " +
                "structural: anything with the right methods qualifies, giving duck typing with static-checker " +
                "support. Use protocols at your own API boundaries so callers are not forced into your hierarchy, " +
                "and ABCs where you own the hierarchy and want enforcement or shared implementation.</p>",
        },
        {
            kind: "collapsible",
            title: "When would you use `__slots__`?",
            html:
                "<p><b>A:</b> when you create very many instances with a fixed shape — parsed syntax nodes, " +
                "protocol messages, cached rows. It removes the per-instance <code>__dict__</code>, so memory drops " +
                "noticeably and attribute access is a fixed-offset load instead of a hash lookup. It also makes " +
                "typos in attribute names fail loudly at construction. The cost: no dynamic attributes, no weak " +
                "references, and it interacts badly with <code>cached_property</code>.</p>",
        },
        {
            kind: "collapsible",
            title: "Where do descriptors actually appear in production code?",
            html:
                "<p><b>A:</b> <code>property</code>, <code>classmethod</code>, <code>staticmethod</code>, " +
                "<code>functools.cached_property</code>, <code>abc.abstractproperty</code>, SQLAlchemy's " +
                "<code>InstrumentedAttribute</code>, Pydantic v1's <code>ModelField</code>, ORM lazy columns, and " +
                "dependency-injection containers that inject attributes on assignment. Descriptors are how a library " +
                "hooks itself into <code>obj.attr</code> without the caller knowing.</p>",
        },
        {
            kind: "collapsible",
            title: "Composition vs inheritance?",
            html:
                "<p><b>A:</b> prefer composition — hold a collaborator and delegate. Inheritance couples you to a " +
                "base class you do not control (the fragile base class problem), while composition lets you swap " +
                "behaviour at runtime and test each part alone. Inherit only for genuine is-a relationships and " +
                "when you can own both sides of the hierarchy.</p>",
        },
        {
            kind: "card",
            title: "🔥 Real-world usage",
            html:
                "Dataclasses model DTOs and events everywhere (Pydantic leans on them, FastAPI generates schemas " +
                "from annotated functions). <code>ABC</code> underpins repository interfaces in Django service " +
                "layers. <code>Protocol</code> is the standard trick for typing duck-typed plugins, and " +
                "<code>__slots__</code> shows up in CPython itself, in dataclass-heavy ETL code, and in parsers " +
                "holding millions of nodes.",
        },
        {
            kind: "card",
            title: "🗣️ What to say out loud",
            html:
                "Anchor on attribute lookup: instance dict versus descriptor is the single idea that explains " +
                "properties, slots, cached_property and validation in one breath. Then show the MRO for a diamond " +
                'and say "always super()". If asked for the algorithm, name C3 and describe the merge.',
        },
        {
            kind: "table",
            title: "📋 Model choice matrix",
            headers: ["Situation", "Reach for", "Why"],
            rows: [
                [
                    "A flat record with a handful of fields",
                    "<code>@dataclass(frozen=True)</code>",
                    "Free <code>__init__</code>/<code>__repr__</code>/<code>__eq__</code>, hashable, " +
                        "self-documenting",
                ],
                [
                    "A record with a validation rule",
                    "dataclass + <code>__post_init__</code>",
                    "One place for invariants, raising before the object escapes",
                ],
                [
                    "Many instances in a hot path",
                    "dataclass with <code>slots=True</code>, or a plain class with <code>__slots__</code>",
                    "Drops the instance <code>__dict__</code>",
                ],
                [
                    "A family of interchangeable implementations",
                    "<code>ABC</code> + <code>@abstractmethod</code>",
                    "Failures at construction, not at first use",
                ],
                [
                    "Accepting anything shaped right",
                    "<code>Protocol</code>",
                    "No inheritance required, still type-checked",
                ],
                [
                    "Expensive derived value",
                    "<code>@cached_property</code>",
                    "Computed on first read, then stored per instance",
                ],
                [
                    "Shared base behaviour plus a stable contract",
                    "Inheritance with cooperative <code>super()</code>",
                    "Only when you own both classes",
                ],
                [
                    "Deep nesting of helpers",
                    "Composition",
                    "Swap, stub and test each part independently",
                ],
            ],
        },
        {
            kind: "card",
            title: "🗣️ Model choice answers",
            html:
                "If you freeze a dataclass and need a mutable variant later, pass " +
                "<code>dataclasses.replace()</code> a new instance instead of mutating in place — that keeps the " +
                '"never change a value that has been shared" rule intact and makes updates easy to log.',
        },
    ],
});
