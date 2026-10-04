// src/content/sd-microservices.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-microservices",
    title: "Microservices",
    blocks: [
        {
            kind: "card",
            title: "Core Idea",
            html:
                "<p>Microservices is a decision about <strong>team boundaries made " +
                "physical</strong>. Services are split along bounded contexts so that different teams " +
                "can deploy, scale, and fail independently. The benefit is organisational, not " +
                "technical — a monolith split by table does not become microservices, it becomes a " +
                "distributed monolith.</p>" +
                "<p><strong>The invariant:</strong> <b>a service owns its data exclusively.</b> If two " +
                "services read and write the same tables, you have not decoupled anything — you have " +
                "added a network hop and a new class of failure between two pieces of code that used " +
                "to be one function.</p>",
        },
        {
            kind: "table",
            title: "Trade-offs",
            headers: ["", "Microservices", "Monolith"],
            rows: [
                [
                    "Deployment",
                    "independent, per service",
                    "all-or-nothing; one broken module blocks all",
                ],
                [
                    "Scaling",
                    "scale the hot service only",
                    "scale everything, or split first",
                ],
                [
                    "Data",
                    "one owner per bounded context",
                    "shared schema, shared queries",
                ],
                [
                    "Failure blast radius",
                    "one service degrades; others survive",
                    "one bad deploy can take everything down",
                ],
                [
                    "Cross-cutting change",
                    "many coordinated deploys, versioning",
                    "one commit",
                ],
                [
                    "Latency",
                    "network hops add up; failures are partial",
                    "in-process calls, all-or-nothing",
                ],
                [
                    "Transactions",
                    "saga, eventual consistency",
                    "ACID across the whole app",
                ],
                [
                    "Debugging",
                    "distributed traces, no stack traces",
                    "one debugger",
                ],
                [
                    "Team fit",
                    "many teams, parallel work",
                    "small teams, fast iteration",
                ],
                [
                    "Infra cost",
                    "service mesh, pipelines, on-call load",
                    "one deploy, one database",
                ],
            ],
        },
        {
            kind: "card",
            title: "The Boundary and Sync-vs-Async Decision",
            html:
                "<p>Split on a <strong>bounded context</strong> — a region of the domain with its " +
                "own language, rules, and data. Then, for every cross-service call, ask one question: " +
                "does the caller need the answer before it can respond? That single question is the " +
                "whole sync/async decision.</p>",
        },
        {
            kind: "diagram",
            caption:
                'Split on the domain, then let the "does the caller need it now" question decide sync vs async',
            source: `flowchart TD
    NEW["New capability arrives"] --> CTX{"Which bounded context<br/>does it belong to?"}
    CTX -->|"an existing context"| INSIDE["Add it inside that service<br/>same code, same database, same deploy"]
    CTX -->|"needs its own scale,<br/>own data, own team"| NEW["New service with<br/>its own store"]
    NEW --> NEED{"Does the caller need<br/>the answer now?"}
    NEED -->|"yes"| SYNC["Synchronous REST or gRPC<br/>with timeout, retry, circuit breaker"]
    NEED -->|"no"| ASYNC["Publish an event<br/>consumer reacts later"]
    INSIDE --> NOTE["Only split when the boundary<br/>is real, not when it is tidy"]
    SYNC --> COST["Chained calls make p99 the SUM<br/>of every hop and timeout"]
    ASYNC --> BENEFIT["Producer is decoupled,<br/>failures are absorbed by retry"]`,
        },
        {
            kind: "card",
            title: "A Request Crossing Four Services",
            html:
                "<p>This is what a synchronous design costs. Each hop adds RTT, and each hop adds a " +
                "p99 that feeds the next — so the p99 of the composite is close to the <em>sum of the " +
                "p99s</em>, not the average. Note also that a partial failure leaves an inconsistent " +
                "state unless every hop is wrapped in a saga.</p>",
        },
        {
            // The legacy lifecycleSteps() widget listed one string per hop
            // ("Auth 8 ms"); each is split into a stage name and its latency.
            kind: "pipeline",
            stages: [
                { name: "Edge / Gateway", desc: "4 ms" },
                { name: "Auth", desc: "8 ms" },
                { name: "Orders", desc: "15 ms" },
                { name: "Inventory", desc: "25 ms" },
                { name: "Payment", desc: "40 ms" },
                { name: "Response", desc: "5 ms" },
            ],
        },
        {
            kind: "diagram",
            caption:
                "A four-hop synchronous chain: the p99 is the sum of the hops, and failure is all-or-nothing",
            source: `flowchart LR
    GW["Gateway<br/>4 ms"] --> AU["Auth<br/>8 ms"]
    AU --> OR["Orders<br/>15 ms"]
    OR --> IV["Inventory<br/>25 ms"]
    IV --> PY["Payment<br/>40 ms"]
    PY -.->|"p99 is the sum:<br/>97 ms, and any one<br/>hop failing fails the request"| OUT["Client response<br/>5 ms"]`,
        },
        {
            kind: "card",
            title: "Required Platform Patterns",
        },
        {
            kind: "table",
            headers: ["Pattern", "Why it exists", "Without it"],
            rows: [
                [
                    "API Gateway",
                    "one public entry point: auth, TLS, rate limits, routing",
                    "clients couple to internal topology",
                ],
                [
                    "Service discovery",
                    "locate services as instances come and go",
                    "hard-coded IPs, stale endpoints",
                ],
                [
                    "Circuit breaker",
                    "stop calling a failing dependency",
                    "cascading failure across the fleet",
                ],
                [
                    "Bulkhead",
                    "isolated pools per dependency",
                    "one slow call starves everything",
                ],
                [
                    "Saga",
                    "distributed transaction with compensation",
                    "partial commits nobody rolls back",
                ],
                [
                    "Sidecar / service mesh",
                    "retries, mTLS, tracing, metrics per call",
                    "inconsistent per-service behaviour",
                ],
                [
                    "Distributed tracing",
                    "follow one request across services",
                    "latency lives only in one log line",
                ],
                [
                    "Canary deploy",
                    "shift traffic gradually, abort on regression",
                    "all-or-nothing deploys across services",
                ],
            ],
        },
        {
            kind: "card",
            title: "Code: a safe synchronous call",
            html:
                '<pre><code class="language-javascript">// A call that can hang, fail, and be retried — all three must be bounded.\n' +
                "async function reserveInventory(orderId, items, { deadlineMs = 400 } = {}) {\n" +
                "    const deadline = Date.now() + deadlineMs;\n" +
                "\n" +
                "    for (let attempt = 0; attempt &lt; 3; attempt++) {\n" +
                "        // 1. Only retry idempotent failures; a timeout may mean the write landed.\n" +
                "        // 2. Budget: stop if the caller's own deadline is closer than this attempt.\n" +
                "        if (Date.now() + 100 &gt; deadline) break;\n" +
                "\n" +
                "        try {\n" +
                "            const res = await inventoryClient.reserve({\n" +
                "                orderId,\n" +
                "                items,\n" +
                "                timeoutMs: Math.min(150, deadline - Date.now()),   // never outlive the caller\n" +
                "            }, { idempotencyKey: 'reserve:' + orderId });         // safe to retry\n" +
                "            return res;\n" +
                "        } catch (err) {\n" +
                "            if (!err.isRetryable) throw err;\n" +
                "            await sleep(Math.min(1000, 2 ** attempt * 100) + Math.random() * 100);   // exponential + jitter\n" +
                "        }\n" +
                "    }\n" +
                "\n" +
                "    // 3. Degrade, do not hang: the saga compensates or marks the order PENDING.\n" +
                "    circuitBreaker.recordFailure('inventory');\n" +
                "    throw new DependencyUnavailable('inventory', { orderId });\n" +
                "}</code></pre>\n" +
                "<p><strong>Line notes:</strong> the <code>deadline</code> matters more than the retry " +
                "count — a retry that outlives the caller's patience just holds the connection open. " +
                "Jitter on the backoff is what stops 1,000 concurrent callers from retrying in lockstep " +
                "and re-creating the outage they are recovering from. And the idempotency key is what " +
                "makes the retry safe.</p>",
        },
        {
            kind: "table",
            title: "Capacity Math and the Distributed Tax",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Composite p50 vs p99",
                    "4 hops &times; ~10 ms p50 vs 97 ms p99 sum",
                    "p99 is ~10&times; p50",
                ],
                [
                    "Network overhead per hop",
                    "2 &times; 1 ms RTT same region, 4&times; across",
                    "2–4 ms per hop",
                ],
                [
                    "Retry amplification",
                    "3 attempts &times; 20% failure rate",
                    "1.6&times; total load on the dependency",
                ],
                [
                    "Connection overhead",
                    "1M users &times; 2 sockets &times; 10 KB each",
                    "&#8776; 20 GB of ephemeral state",
                ],
                [
                    "Mesh CPU",
                    "sidecar adds ~1 ms and ~30% CPU per call",
                    "priced into the node count",
                ],
                [
                    "Service count overhead",
                    "20 services &times; pipeline, dashboard, on-call",
                    "20&times; the operational surface",
                ],
                [
                    "Cross-service deploy window",
                    "4 services changed, coordinated rollout",
                    "minutes of mixed-version state",
                ],
                [
                    "What actually scales",
                    "one hot service behind 200 nodes",
                    "others stay small, pay little",
                ],
            ],
        },
        {
            kind: "card",
            title: "When NOT to Use Microservices",
            html:
                "<ul>" +
                "<li><strong>One team, small product.</strong> You pay the distributed-systems tax in " +
                "complexity and get none of the organisational benefit.</li>" +
                "<li><strong>No real boundaries.</strong> Splitting by technical layer rather than " +
                "domain produces services that always change together — a distributed monolith with " +
                "network latency.</li>" +
                "<li><strong>The change is cross-cutting.</strong> If every feature touches every " +
                "service, the split did not follow the domain.</li>" +
                "<li><strong>Shared tables.</strong> Two services writing one database is the single " +
                "most common microservices mistake, and it is worse than the monolith it " +
                "replaced.</li>" +
                "<li><strong>Latency-critical synchronous chains.</strong> Adding four network hops " +
                "to a 50 ms budget is a design, not an accident.</li>" +
                "<li><strong>Without tracing and on-call maturity.</strong> Distributed systems " +
                "without observability are undebuggable in production.</li>" +
                "</ul>",
        },
        {
            kind: "card",
            title: "Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>Cascading failure</strong> — no timeouts means one slow dependency stalls " +
                "every caller. Set an aggressive timeout on every outbound call.</li>" +
                "<li><strong>Retry storms</strong> — retries without jitter recreate the outage. " +
                "Bound total retries with a budget, not per call.</li>" +
                "<li><strong>Chatty services</strong> — 10 calls per request turns the network into " +
                "the bottleneck and the p99 into a sum. Use a bulk endpoint or a denormalised " +
                "read.</li>" +
                "<li><strong>Distributed monolith</strong> — coordinated deploys everywhere. The " +
                "signal that your boundaries are wrong.</li>" +
                "<li><strong>Discovery flapping</strong> — DNS TTLs and health checks disagree, and " +
                "calls bounce between instances. Prefer a push-based registry with client-side load " +
                "balancing.</li>" +
                "<li><strong>Shared-database writes</strong> — the coupling never went away, it just " +
                "became harder to reason about.</li>" +
                "<li><strong>No partial-failure story</strong> — a saga that only handles the happy " +
                "path leaves inconsistent state on the exact paths that happen at 3 a.m.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Monolith or microservices?",
                    a:
                        "<p>Start with a well-modularised monolith. Split when a bounded context " +
                        "needs independent scaling, independent deploy cadence, or independent ownership " +
                        "by a different team — and only then. The honest answer in an interview: the " +
                        "benefit is organisational, so if you do not have the teams, the costs are all " +
                        "real and the benefits are theoretical.</p>",
                },
                {
                    q: "Synchronous or asynchronous between two services?",
                    a:
                        "<p>Ask whether the caller needs the answer before responding. Inventory " +
                        "reservation during checkout needs a synchronous answer, so use a call with a " +
                        "tight timeout, a circuit breaker, and a saga compensation. Sending a welcome " +
                        "email or updating a recommendation model does not — use an event, which also " +
                        "means a new consumer can be added later without touching the producer.</p>",
                },
                {
                    q: "How do you handle a transaction spanning three services?",
                    a:
                        "<p>A saga: each step is a local transaction, and each step has a " +
                        "compensating action. Forward recovery retries the step; compensating recovery " +
                        "undoes it. No isolation is provided, so every intermediate state must be valid " +
                        "and observable. Choreographed sagas publish events and react; orchestrated " +
                        "sagas have a coordinator — use the orchestrator when the flow is complex " +
                        "enough that you need one place to see it.</p>",
                },
                {
                    q: "What is a circuit breaker and when do you need one?",
                    a:
                        "<p>A state machine that stops calling a dependency after repeated failures " +
                        "and probes it periodically with a half-open request. It converts a slow " +
                        "dependency into a fast error, protecting the caller. Essential whenever " +
                        "synchronous dependencies exist, because a timeout that is too generous does " +
                        "not protect anything.</p>",
                },
                {
                    q: "How do you debug a request that spans five services?",
                    a:
                        "<p>Distributed tracing with a propagated trace context. Every hop carries the " +
                        "trace id, so you get one timeline instead of five log files. Add RED metrics " +
                        "per service (Rate, Errors, Duration) and a trace-id in every log line. Without " +
                        "this, the honest answer is that the system is undebuggable.</p>",
                },
                {
                    q: "What is the biggest operational downside people forget?",
                    a:
                        "<p>On-call and coordination cost. Every service needs its own pipeline, " +
                        "dashboards, alerts, runbook, and on-call rotation, and a single request now " +
                        "fails in a dozen places instead of one. That cost is linear in service count " +
                        "and it is the main reason teams end up merging services back together.</p>",
                },
            ],
        },
    ],
});
