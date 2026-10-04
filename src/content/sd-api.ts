// src/content/sd-api.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-api",
    title: "API Design",
    blocks: [
        {
            kind: "card",
            title: "Core Idea",
            html:
                "<p>An API is a contract with an unknown number of clients, some of which you cannot " +
                "upgrade. Design it as you would a database schema: versioned, additive, and boring " +
                "— because the cost of a breaking change is paid by every client, and clients are the " +
                "part of your system you do not own.</p>" +
                "<p><strong>The invariant:</strong> <b>a change is backwards compatible unless it " +
                "removes a field, narrows a type, changes a default, or alters a semantic.</b> Adding " +
                "an optional field and ignoring it is always safe; everything else needs a version or " +
                "a migration window.</p>",
        },
        {
            kind: "table",
            title: "REST vs GraphQL vs gRPC",
            headers: ["", "REST", "GraphQL", "gRPC"],
            rows: [
                [
                    "Transport",
                    "HTTP/1.1 or HTTP/2",
                    "HTTP POST to one endpoint",
                    "HTTP/2, protobuf",
                ],
                [
                    "Payload",
                    "JSON, verbose",
                    "JSON, exactly what you asked for",
                    "binary, compact and typed",
                ],
                [
                    "Overfetching",
                    "common, needs field selection",
                    "none by design",
                    "none by design",
                ],
                [
                    "Underfetching",
                    "N+1 round trips",
                    "possible, needs dataloader",
                    "none — batch RPCs",
                ],
                [
                    "Caching",
                    "trivial: URL is the cache key",
                    "hard: POST body is not cacheable",
                    "not cacheable by default",
                ],
                [
                    "Introspection",
                    "OpenAPI, explicit",
                    "built in",
                    "protobuf descriptors",
                ],
                ["Debugging", "curl", "GraphiQL", "grpcurl"],
                [
                    "Best for",
                    "public CRUD APIs, browsers",
                    "aggregated dashboards, mobile clients",
                    "internal service-to-service",
                ],
            ],
        },
        {
            kind: "card",
            title: "Choosing the Wire Format",
            html:
                "<p>Protocol choice is a caching decision first and a typing decision second. Anything " +
                "a client might want to cache or a CDN must serve gets a URL-keyed, cacheable shape; " +
                "anything internal and latency-sensitive gets a typed binary one.</p>",
        },
        {
            kind: "diagram",
            caption:
                "URL-cacheable for the public edge, typed and batched for the internal mesh",
            source: `flowchart TD
    N["A new interface is needed"] --> Q1{"Who calls it?"}
    Q1 -->|"public clients,<br/>browsers, third parties"| Q2{"Must a CDN or browser<br/>cache the response?"}
    Q1 -->|"internal services only"| GRPC["gRPC over HTTP/2<br/>protobuf, typed, batchable,<br/>small on the wire"]
    Q2 -->|"yes"| REST["REST over HTTP<br/>GET is cacheable by URL,<br/>simple to debug and proxy"]
    Q2 -->|"no"| Q3{"Do clients need<br/>different field selections?"}
    Q3 -->|"yes"| GQL["GraphQL<br/>one endpoint, exact fields,<br/>but needs depth and cost limits"]
    Q3 -->|"no"| REST
    GRPC --> NOTE["Never expose gRPC publicly<br/>without a gateway: browsers<br/>cannot speak it"]
    GQL --> NOTE2["Needs DataLoader<br/>or N+1 becomes the default"]`,
        },
        {
            kind: "card",
            title: "Versioning, Rate Limiting, and Idempotency",
            html:
                "<p>Three things every production API needs, and all three fail silently if omitted. " +
                "Versioning lets clients migrate on their own schedule; rate limiting protects your " +
                "dependencies from one bad client; idempotency keys turn a retry from a duplicate " +
                "charge into a replayed response.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Rate limit first (cheap rejection), then idempotency (safe retry), then the actual work",
            source: `sequenceDiagram
    autonumber
    participant C as Client
    participant G as API Gateway
    participant RL as Token bucket
    participant S as Orders service
    participant DB as Orders DB
    C->>G: POST /v2/orders<br/>Idempotency-Key 9f2c
    G->>RL: take 1 token for tenant acme
    alt bucket empty
        RL-->>G: deny, reset in 2 s
        G-->>C: 429, Retry-After 2<br/>X-RateLimit-Remaining 0
    else token taken
        RL-->>G: grant, remaining 971
        G->>S: forward with tenant claim attached
        S->>DB: INSERT idempotency_keys 9f2c
        alt key already seen
            DB-->>S: conflict, stored response found
            S-->>G: replay the stored 201 response
        else new key
            DB-->>S: inserted
            S->>DB: create order, store response
            S-->>G: 201 Created
        end
        G-->>C: 201, X-RateLimit-Remaining 971
    end`,
        },
        {
            kind: "table",
            title: "Versioning Strategies",
            headers: ["Strategy", "Shape", "Pros", "Cons"],
            rows: [
                [
                    "URI path",
                    "/v2/orders",
                    "obvious, cacheable, trivial to route",
                    "URL is now versioned forever",
                ],
                [
                    "Header",
                    "Accept: application/vnd.api+2",
                    "URL stays clean",
                    "easy to forget, harder to test by hand",
                ],
                [
                    "Date based",
                    "2024-01-15",
                    "ties to a release cadence",
                    "looks fake, awkward for internal APIs",
                ],
                [
                    "No versioning",
                    "additive fields only",
                    "zero migration cost",
                    "cannot remove or change meaning",
                ],
                [
                    "Contract-first",
                    "schema in CI, generated clients",
                    "breaks caught before merge",
                    "requires discipline",
                ],
            ],
        },
        {
            kind: "card",
            title: "Code: token-bucket rate limiter and idempotency",
            html:
                '<pre><code class="language-javascript">// Token bucket: capacity = burst, refill = sustained rate.\n' +
                "// More forgiving than a fixed window (which allows 2x the limit at the boundary).\n" +
                "function allow(key, { capacity = 1000, refillPerSec = 500 } = {}) {\n" +
                "    const bucket = buckets.get(key) ?? { tokens: capacity, ts: Date.now() };\n" +
                "    const now = Date.now();\n" +
                "    const elapsedSec = (now - bucket.ts) / 1000;\n" +
                "\n" +
                "    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);   // refill\n" +
                "    bucket.ts = now;\n" +
                "\n" +
                "    if (bucket.tokens &lt; 1) {\n" +
                "        const retryAfter = Math.ceil((1 - bucket.tokens) / refillPerSec);\n" +
                "        return { allowed: false, remaining: 0, retryAfter };   // 429 + Retry-After\n" +
                "    }\n" +
                "    bucket.tokens -= 1;                                          // consume\n" +
                "    buckets.set(key, bucket);\n" +
                "    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };\n" +
                "}\n" +
                "\n" +
                "// Idempotency: the key is stored in the SAME transaction as the effect.\n" +
                "async function createOrder(req, idemKey) {\n" +
                "    if (!idemKey) return orders.create(req);                     // no protection offered\n" +
                "\n" +
                "    const prior = await db.idempotencyKeys.findUnique({ where: { key: idemKey } });\n" +
                "    if (prior) return prior.response;                            // replay, never re-execute\n" +
                "\n" +
                "    try {\n" +
                "        return await db.transaction(async (tx) =&gt; {\n" +
                "            await tx.idempotencyKeys.create({ data: { key: idemKey, tenant: req.tenantId } });\n" +
                "            const order = await tx.orders.create({ data: req });\n" +
                "            const response = { status: 201, body: order };\n" +
                "            await tx.idempotencyKeys.update({ where: { key: idemKey }, data: { response } });\n" +
                "            return response;\n" +
                "        });\n" +
                "    } catch (err) {\n" +
                "        if (err.isUniqueViolation) return orders.findBy(req.tenantId);   // concurrent duplicate won\n" +
                "        throw err;\n" +
                "    }\n" +
                "}\n" +
                "\n" +
                "// Purge: keys are only useful for the retry window, not forever.\n" +
                "setInterval(() =&gt; db.idempotencyKeys.deleteMany({ where: { createdAt: { lt: hoursAgo(24) } } }), 3600_000);</code></pre>\n" +
                "<p><strong>Line notes:</strong> a fixed-window limiter lets a client send the full " +
                "quota at 10:00:59 and again at 10:01:00 — double the intended rate. Token bucket " +
                "allows a defined burst and then enforces the sustained rate, which is what clients " +
                "can actually reason about. On the idempotency side, the unique-violation branch " +
                "handles the true race where two concurrent requests carry the same key.</p>",
        },
        {
            kind: "card",
            title: "Pagination, Errors, and Status Codes",
            html:
                "<p><strong>Offset pagination</strong> (<code>?limit=50&amp;offset=1000</code>) is " +
                "simple and breaks under concurrent writes: an insert at the front shifts every " +
                "subsequent page, so clients see duplicates and miss rows. <strong>Cursor " +
                "pagination</strong> anchors on the last key seen (<code>?after=cursor</code>) and is " +
                "stable, at the cost of not being able to jump to page 37. For anything large or " +
                "changing, use a cursor and say why.</p>" +
                "<p><strong>Errors</strong> should be machine-readable and consistent. A single error " +
                "envelope — a stable <code>code</code>, a human message, a request id — means clients " +
                "can branch on <code>code</code> instead of parsing English. 429 for rate limits, 409 " +
                "for conflicts, 422 for validation, 503 with <code>Retry-After</code> for dependency " +
                "failures. Never return 200 with an error body.</p>",
        },
        {
            kind: "table",
            title: "Capacity Math",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Rate limit header cost",
                    "4 headers &times; 60 bytes on every response",
                    "240 bytes, ~3% overhead",
                ],
                [
                    "Token bucket memory",
                    "1 entry per client &times; 64 bytes",
                    "1M clients = 64 MB",
                ],
                [
                    "Limit enforcement cost",
                    "one Redis round trip per request",
                    "+0.5 ms p50 — batch or cache locally",
                ],
                [
                    "Quota sizing",
                    "14,000 RPS peak / 500 clients",
                    "28 RPS sustained per client, burst 50",
                ],
                [
                    "Idempotency table",
                    "14,000 writes/s &times; 200 bytes &times; 24 h",
                    "&#8776; 600 GB — must be partitioned and pruned",
                ],
                [
                    "Cursor page size",
                    "50 rows &times; 1 KB",
                    "50 KB per response, under the gRPC size limit",
                ],
                [
                    "gRPC vs JSON size",
                    "1 KB JSON vs ~300 bytes protobuf",
                    "3&times; smaller, less parsing",
                ],
                [
                    "Version retention",
                    "support v1 and v2 for 12 months",
                    "two deploys and two test suites",
                ],
            ],
        },
        {
            kind: "card",
            title: "Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>Breaking changes shipped silently</strong> — removing a field, " +
                "tightening validation, or changing a default. Contract tests in CI catch what review " +
                "misses.</li>" +
                "<li><strong>Chatty APIs</strong> — the client makes 20 calls to render one screen. " +
                "Bundle the read or offer a GraphQL / BFF layer.</li>" +
                "<li><strong>GraphQL N+1</strong> — the gateway resolves nested fields one query at a " +
                "time. DataLoader batching is mandatory, plus query depth and complexity limits.</li>" +
                "<li><strong>Unbounded queries</strong> — no page limit, no query timeout, no max " +
                "page size. Every one of these is a denial-of-service vector.</li>" +
                "<li><strong>429 retry storms</strong> — every client retries the same instant. " +
                "Return <code>Retry-After</code> and tell clients to add jitter.</li>" +
                "<li><strong>Idempotency keys that grow forever</strong> — the table becomes the " +
                "largest table in the database. Prune on a TTL matched to your retry window.</li>" +
                "<li><strong>No request id in responses or logs</strong> — support cannot correlate " +
                "a user report with a trace. Return it as a header and log it everywhere.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "How do you version an API?",
                    a:
                        "<p>Default to additive-only: new optional fields, new endpoints, new enum " +
                        "values that old clients ignore. When you must break something, use a URI " +
                        "version or a dated header and support the old version for a stated window. " +
                        "Version at the edge, keep old versions thin by forwarding to the same " +
                        "service, and give every client a deprecation date with usage telemetry so " +
                        "you know who still depends on it.</p>",
                },
                {
                    q: "Client-side or server-side rate limiting?",
                    a:
                        "<p>Both. Server-side is the real enforcement point and needs to be " +
                        "distributed across instances (Redis token bucket, or the gateway). " +
                        "Client-side keeps well-behaved clients off the limit entirely and is free. " +
                        "Never rely on client-side alone, and never let one tenant starve another — " +
                        "always key the bucket per tenant, not per IP.</p>",
                },
                {
                    q: "How do you make an API idempotent?",
                    a:
                        "<p>The client generates a key for the logical operation and retries with the " +
                        "same key. The server stores that key with the response inside the same " +
                        "transaction as the effect, so a repeat returns the stored response instead " +
                        "of re-executing. The critical detail is that the key insert and the side " +
                        "effect commit together — otherwise a crash between them replays the " +
                        "effect.</p>",
                },
                {
                    q: "Cursor or offset pagination?",
                    a:
                        "<p>Cursor for anything that changes while it is being read: it is stable " +
                        "under concurrent inserts and skips the OFFSET scan cost that grows with page " +
                        "depth. Offset is acceptable for static admin data where jumping to a page " +
                        "matters more than stability. Whichever you pick, always enforce a maximum " +
                        "page size.</p>",
                },
                {
                    q: "How do you design an error response?",
                    a:
                        "<p>One envelope for every error: a stable machine-readable code, a " +
                        "human-readable message, a field-level detail array for validation, and a " +
                        "request id. Clients branch on the code; humans read the message; support " +
                        "traces the request id. Use the status code for the broad category and never " +
                        "bury an error in a 200.</p>",
                },
                {
                    q: "GraphQL versus REST — when do you pick which?",
                    a:
                        "<p>REST for public APIs, simple CRUD, and anything that benefits from HTTP " +
                        "caching. GraphQL when clients need different field selections from the same " +
                        "data — dashboards and mobile apps that would otherwise make many calls. " +
                        "Both need limits: GraphQL especially, with depth, complexity, and timeout " +
                        "caps, plus DataLoader to prevent N+1.</p>",
                },
            ],
        },
    ],
});
