// src/content/py-fastapi.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-fastapi",
    title: "FastAPI",
    blocks: [
        // The legacy stages fired a toast on click; the pipeline block keeps the
        // stages but drops that click handler.
        { kind: "card", title: "🏗️ Architecture" },
        {
            kind: "pipeline",
            stages: [
                { name: "Client", desc: "HTTP request" },
                { name: "API Router", desc: "Path operation" },
                { name: "Service", desc: "Business logic" },
                { name: "Repository", desc: "Data access" },
                { name: "Database", desc: "PostgreSQL" },
            ],
        },
        // The legacy lifecycleSteps were a numbered list with no descriptions, so
        // the step names carry the whole content here.
        { kind: "card", title: "🔁 Request lifecycle" },
        {
            kind: "pipeline",
            stages: [
                { name: "ASGI receive", desc: "" },
                { name: "Middleware", desc: "" },
                { name: "Routing", desc: "" },
                { name: "Dependencies", desc: "" },
                { name: "Endpoint", desc: "" },
                { name: "Serialise", desc: "" },
                { name: "Response", desc: "" },
            ],
        },
        {
            kind: "card",
            title: "🧬 What happens per request",
            html:
                "<p>Every request walks the same path. The interesting details are the two <code>async def</code> " +
                "dependency runs (FastAPI inspects signatures at import time and caches the compiled dependant) and " +
                "the fact that response serialisation goes through the same Pydantic model machinery.</p>",
        },
        {
            kind: "diagram",
            caption:
                "FastAPI request lifecycle: routing, dependency resolution, serialisation",
            source: `sequenceDiagram
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
    A-->>C: HTTP response`,
        },
        {
            kind: "code",
            title: "💻 CRUD Example",
            language: "python",
            code: `from fastapi import FastAPI
app = FastAPI()

@app.get("/items/{id}")
async def get_item(id: int):
    return await repo.find(id)

@app.post("/items")
async def create(item: ItemSchema):
    return await repo.save(item)`,
        },
        {
            kind: "card",
            title: "🏗️ A complete app",
            html: `<pre><code class="language-python">from contextlib import asynccontextmanager
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
</table>`,
        },
        {
            kind: "card",
            title: "🧅 Layers, routers and versioning",
            html: `<pre><code class="language-python"># routers/items.py
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
</ul>`,
        },
        {
            kind: "card",
            title: "⏱️ Complexity & performance",
            html: `<table class="complexity-table">
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
process, GIL included.</p>`,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Blocking the event loop</b> — a synchronous DB driver or <code>requests</code> call inside " +
                "an <code>async def</code> route serialises the whole worker. Use <code>asyncpg</code> / " +
                "<code>httpx</code>, or declare the endpoint <code>def</code> so Starlette uses its threadpool.</li>" +
                "<li><b>Returning ORM objects directly.</b> Lazy relationships trigger sync I/O in the serialiser. " +
                "Map to a Pydantic model inside the transaction, or load eagerly.</li>" +
                "<li><b>N+1 queries.</b> A list endpoint that serialises relations issues one query per row. Use " +
                "eager loading or <code>selectinload</code>.</li>" +
                "<li><b>Global mutable state</b> — a module-level cache or connection object is shared by every " +
                "worker and every request; use <code>lifespan</code> and dependency-scoped objects.</li>" +
                "<li><b>Sync dependency inside an async route</b> runs on the threadpool but its teardown can block " +
                "the loop.</li>" +
                "<li><b>Forwarding exceptions raw</b> leaks stack traces to clients; raise " +
                "<code>HTTPException</code> or register an exception handler.</li>" +
                "<li><b>Trusting the type hint is not validation of intent.</b> <code>price_cents: int</code> " +
                "accepts a negative number unless you add <code>Field(ge=0)</code> or a validator.</li>" +
                "</ul>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "🎤 Interview Q&A" },
        {
            kind: "collapsible",
            title: "Explain the FastAPI request lifecycle.",
            html:
                "<p><b>A:</b> Uvicorn receives the ASGI scope, middleware wraps the app, the router matches path and " +
                "method, FastAPI resolves the <code>Depends</code> tree (yielding cached values for repeat " +
                "dependencies), calls the endpoint with validated arguments, converts the return value with the " +
                "response model, and serialises it to JSON. The OpenAPI schema is produced from the same type hints " +
                "at import time, so documentation cannot drift from behaviour.</p>",
        },
        {
            kind: "collapsible",
            title: "Why is FastAPI faster than Flask?",
            html:
                "<p><b>A:</b> three reasons, in order of weight: it is async-first instead of sync-first, so one " +
                "worker serves thousands of connections instead of one request per thread; validation uses compiled " +
                "Pydantic (v2 is Rust-backed) instead of ad-hoc <code>request.form</code> parsing; and the returned " +
                "object is serialised from the response model directly. FastAPI also has near-zero overhead on " +
                "trivial routes — the gap grows with concurrency, not with per-request work.</p>",
        },
        {
            kind: "collapsible",
            title: "`async def` or `def` for an endpoint?",
            html:
                "<p><b>A:</b> <code>async def</code> when everything inside is genuinely async (asyncpg, httpx) — it " +
                "runs on the event loop. Plain <code>def</code> when the body is blocking or sync (a psycopg2 call, " +
                "a CPU-bound function): Starlette runs it in a threadpool, so the loop stays free. The worst option " +
                "is <code>async def</code> wrapping blocking code, which blocks the whole worker.</p>",
        },
        {
            kind: "collapsible",
            title: "What is `Depends` and why would you nest it?",
            html:
                "<p><b>A:</b> <code>Depends</code> declares a dependency the framework resolves before the handler " +
                "runs, so DB sessions, auth checks and pagination parameters become part of the signature rather than " +
                "hidden inside the body. Nesting composes — <code>get_current_user</code> can itself " +
                "<code>Depends(get_db)</code> — and each dependency is cached per request, so declaring it in two " +
                "places costs one execution unless you pass <code>use_cache=False</code>.</p>",
        },
        {
            kind: "collapsible",
            title: "How would you debug a slow endpoint?",
            html:
                "<p><b>A:</b> put middleware timing around routing, dependency resolution, the handler and " +
                "serialisation to find which phase dominates; then check the database first (missing index, N+1, a " +
                "lock waiting on a transaction). <code>EXPLAIN ANALYZE</code> beats guessing. Only after that look " +
                "at the process — if the loop is pinned at 100% with no I/O waiting, the handler is CPU-bound and " +
                "belongs in a worker or a process.</p>",
        },
        {
            kind: "card",
            title: "🔥 Real-world usage",
            html:
                "CRUD and BFF layers in microservice architectures, streaming LLM endpoints that push tokens over " +
                "SSE, ML inference services behind a queue, internal platform APIs generated from OpenAPI, and auth " +
                "middleware with per-request dependency caching. The dependency-injection pattern is also why " +
                "FastAPI endpoints are easy to unit-test — override a dependency and pass it in.",
        },
        {
            kind: "card",
            title: "🗣️ What to say out loud",
            html:
                "Walk the lifecycle in order, then name the three performance traps: blocking the loop, N+1 queries, " +
                "and over-large responses. Finish by saying you would add request timing middleware before optimising " +
                "anything.",
        },
    ],
});
