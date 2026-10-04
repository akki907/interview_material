// src/content/sd-event-driven.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-event-driven",
    title: "Event-Driven Architecture",
    blocks: [
        {
            kind: "card",
            title: "Core Idea",
            html:
                "<p>In event-driven architecture, services do not call each other — they publish " +
                "facts to a broker and whoever cares subscribes. The producer knows nothing about its " +
                "consumers, which means you can add, remove, or replay consumers without touching the " +
                "producer at all.</p>" +
                "<p><strong>The invariant:</strong> <b>an event is a fact in the past tense</b> " +
                "(<code>OrderPlaced</code>, not <code>PlaceOrder</code>). Facts do not get rejected, " +
                "retried into different behaviour, or deleted on failure — they are immutable, so " +
                "every consumer can be replayed independently and reconstruct the same state.</p>" +
                "<p>The price is <strong>eventual consistency</strong>. The order may be written " +
                "before the inventory is reserved, and the system must be designed so that intermediate " +
                "states are valid, not exceptional.</p>",
        },
        {
            kind: "card",
            title: "Request Flow With a Broker and a DLQ",
            html:
                "<p>The classic flow, with the two failure paths that are always left out of the " +
                "diagram: what happens when a consumer throws, and what happens when the database " +
                "write and the publish must both succeed.</p>",
        },
        {
            kind: "diagram",
            caption:
                "The outbox removes the dual-write bug; the DLQ is the only safe destination for a poison message",
            source: `flowchart TD
    API["POST /orders"] --> TX[["Write order row + outbox row<br/>in ONE database transaction"]]
    TX --> R["Relay polls outbox<br/>and publishes, then marks sent"]
    R --> BR{{"Broker topic<br/>orders.v2"}}
    BR --> C1["Fraud check"]
    BR --> C2["Inventory reserve"]
    BR --> C3["Email notifier"]
    BR --> C4["Analytics sink"]
    C1 -->|"ok"| A1["Commit offset"]
    C1 -->|"transient"| RETRY["Retry with backoff,<br/>max 5 attempts"]
    C1 -->|"permanent"| DLQ[["DLQ orders.v2.dlq<br/>alert on depth + replay tool"]]
    RETRY --> BR
    DLQ -.->|"operator fixes and replays"| BR`,
        },
        {
            kind: "table",
            title: "Event-Driven Patterns",
            headers: ["Pattern", "Problem it solves", "Trade-off"],
            rows: [
                [
                    "Event notification",
                    "a service tells others something happened",
                    "every consumer re-fetches; the read pattern is duplicated",
                ],
                [
                    "Event-carried state transfer",
                    "avoiding chatty synchronous calls",
                    "data is duplicated; consumers must tolerate old events",
                ],
                [
                    "Event sourcing",
                    "full audit trail, time-travel queries",
                    "event versioning, replay, and compaction become your job",
                ],
                [
                    "CQRS",
                    "separate write and read models",
                    "two stores to keep consistent; read lag is visible to users",
                ],
                [
                    "Saga",
                    "distributed transaction without 2PC",
                    "compensation logic for every step; no isolation",
                ],
                [
                    "Outbox pattern",
                    "the dual-write problem",
                    "a relay adds latency; duplicate publishes need idempotent consumers",
                ],
                [
                    "Transactional inbox",
                    "deduplicating consumed events",
                    "a dedupe table that must be pruned",
                ],
            ],
        },
        {
            kind: "card",
            title: "Saga: A Distributed Transaction Without 2PC",
            html:
                "<p>A saga is a sequence of local transactions, each paired with a compensating action " +
                "that <em>semantically undoes</em> it. There is no isolation: other services observe " +
                "the intermediate states, so every one of them has to be a valid state a user could " +
                "observe. Choreographed sagas let each service react to events; orchestrated sagas " +
                "route every step through a coordinator that can see the whole flow — use the " +
                "orchestrator once the flow has real branches.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Each step has a semantic undo; there is no isolation, so every intermediate state must be valid",
            source: `flowchart TD
    START["Checkout begins"] --> T1[["Step 1: local tx<br/>create order, PENDING"]]
    T1 --> T2[["Step 2: local tx<br/>reserve inventory"]]
    T2 --> T3[["Step 3: local tx<br/>capture payment"]]
    T3 --> DONE["Commit: order CONFIRMED"]
    T3 -->|"step 3 fails"| C2["Compensate step 2<br/>release the reservation"]
    C2 -->|"release fails too"| C1["Compensate step 1<br/>cancel the order, flag for review"]
    C1 --> OBS["Order CANCELLED,<br/>nothing rolled back atomically"]
    DONE -.->|"invariant:"| RULE["Only one writer owns each state,<br/>compensations are idempotent,<br/>and the user sees a valid state at every step"]`,
        },
        {
            kind: "card",
            title: "Code: the outbox pattern in full",
            html:
                '<pre><code class="language-javascript">// The bug this solves: write to the DB, then publish. If the process dies\n' +
                "// between the two, the event is lost forever and no consumer ever hears about it.\n" +
                "\n" +
                "// Step 1 — same transaction, same fate.\n" +
                "async function placeOrder(req) {\n" +
                "    return db.transaction(async (tx) =&gt; {\n" +
                "        const order = await tx.orders.create({ data: fromRequest(req) });\n" +
                "        await tx.outbox.create({ data: {\n" +
                "            topic: 'orders.v2',\n" +
                "            key: order.id,                       // partition key = ordering unit\n" +
                "            payload: { type: 'OrderPlaced', id: order.id, total: order.total, at: order.createdAt },\n" +
                "        } });\n" +
                "        return order;                            // committed, or neither happened\n" +
                "    });\n" +
                "}\n" +
                "\n" +
                "// Step 2 — a relay publishes outbox rows. It can crash and re-run at any time.\n" +
                "async function relayOutbox() {\n" +
                "    const rows = await db.outbox.findMany({\n" +
                "        where: { publishedAt: null }, take: 500, orderBy: { id: 'asc' },\n" +
                "    });\n" +
                "    for (const row of rows) {\n" +
                "        try {\n" +
                "            await broker.send(row.topic, row.key, row.payload);\n" +
                "            await db.outbox.update({ where: { id: row.id }, data: { publishedAt: new Date() } });\n" +
                "        } catch (err) {\n" +
                "            break;                               // preserve ordering: stop at the first failure\n" +
                "        }\n" +
                "    }\n" +
                "}\n" +
                "\n" +
                "// Step 3 — consumers MUST be idempotent, because step 2 can publish the same row twice.\n" +
                "async function onOrderPlaced(evt) {\n" +
                "    if (await inbox.seen(evt.id)) return;\n" +
                "    await reserveInventory(evt);                // the real side effect\n" +
                "    await inbox.mark(evt.id);\n" +
                "}</code></pre>\n" +
                "<p><strong>Line notes:</strong> the <code>break</code> inside the relay loop is " +
                "deliberate — continuing past a failure would publish later events before earlier " +
                "ones, silently breaking per-key ordering. And because the relay can crash between " +
                "<code>broker.send</code> and marking <code>publishedAt</code>, the publish is " +
                "at-least-once by construction; the inbox check on the consumer is what makes that " +
                "harmless.</p>",
        },
        {
            kind: "card",
            title: "Event Sourcing and CQRS in Practice",
            html:
                "<p><strong>Event sourcing</strong> stores events as the source of truth and derives " +
                "state by folding them. The payoff is a perfect audit trail and the ability to " +
                "re-derive any read model. The cost is that every event schema becomes permanent API, " +
                "replaying 10 years of events must be fast, and &quot;what is the current value&quot; " +
                "becomes a computation rather than a read.</p>" +
                "<p><strong>CQRS</strong> splits the write model (normalised, invariant-enforcing) " +
                "from one or more read models (denormalised, query-shaped) updated asynchronously. " +
                "Now write and read scale independently and reads become trivial — at the price of lag " +
                "that you must expose honestly in the API.</p>",
        },
        {
            kind: "table",
            title: "Capacity Math and Lag Budgets",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Event volume",
                    "1M orders/day &times; 6 events each",
                    "6M events/day",
                ],
                [
                    "Peak publish rate",
                    "6M / 86,400 &times; 10 burst factor",
                    "&#8776; 700 events/s",
                ],
                [
                    "Partitions",
                    "700 / 1000 per partition &times; 3 headroom",
                    "&#8776; 3, use 12",
                ],
                [
                    "Retention",
                    "7 days hot at 6M/day &times; 1 KB",
                    "&#8776; 42 GB",
                ],
                [
                    "Replay duration",
                    "to rebuild a read model from scratch",
                    "6M events &divide; consumer throughput",
                ],
                [
                    "Consumer lag SLO",
                    "read model at most 5 s behind write",
                    "5,000 events buffered at peak",
                ],
                [
                    "Outbox relay poll",
                    "500 rows per poll &times; every 100 ms",
                    "5,000 rows/s publish capacity",
                ],
                [
                    "DLQ budget",
                    "at 3 nines, alert at 100 messages",
                    "a deeper DLQ is an incident, not a metric",
                ],
            ],
        },
        {
            kind: "card",
            title: "Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>The dual-write bug</strong> — DB write succeeds, publish fails, the event " +
                "is gone forever with no trace. The outbox pattern is the fix.</li>" +
                "<li><strong>Schema evolution</strong> — events are permanent API. Version topics, " +
                "keep old readers working, and never repurpose a field's meaning.</li>" +
                "<li><strong>Ordering across partitions</strong> — two events that must be ordered " +
                "must share a partition key, which limits parallelism. Accept it explicitly.</li>" +
                "<li><strong>Replay storms</strong> — resetting offsets on a busy topic can instantly " +
                "produce 10&times; normal traffic. Always rate-limit replays.</li>" +
                "<li><strong>Unbounded event growth</strong> — event sourcing without compaction " +
                "grows forever. Decide the snapshot and retention policy up front.</li>" +
                "<li><strong>Silent coupling through event schemas</strong> — every added field looks " +
                "harmless but changes the contract. Use a schema registry and a compatibility check " +
                "in CI.</li>" +
                "<li><strong>Long-running consumers</strong> — a handler that takes 30 s holds a " +
                "partition and blocks everything behind it. Keep handlers short and push heavy work " +
                "to its own topic.</li>" +
                "<li><strong>Clock skew in event ordering</strong> — never order events by " +
                "<code>timestamp</code>; use the broker offset.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "What problem does the outbox pattern solve?",
                    a:
                        "<p>The dual-write problem: writing to the database and publishing to a broker " +
                        "are two separate systems, so any ordering leaves a failure window where one " +
                        "succeeded and the other did not. The outbox writes an intent row in the same " +
                        "transaction as the business data, then a relay publishes it and marks it " +
                        "sent. The publish becomes at-least-once, and consumers deduplicate.</p>",
                },
                {
                    q: "When is event-driven architecture the wrong choice?",
                    a:
                        "<p>When the user needs an immediate answer — a checkout total, a validation " +
                        "result. Async chains convert a simple local call into a multi-second " +
                        "orchestration with no synchronous error path. Also wrong for workflows where " +
                        "a human decision is required in milliseconds, and for a single-team product " +
                        "where the operational cost of a broker buys nothing.</p>",
                },
                {
                    q: "How do you evolve an event schema without breaking consumers?",
                    a:
                        "<p>Version the topic or use additive-only changes with a schema registry and " +
                        "a CI compatibility check. Never rename or repurpose a field — add the new " +
                        "one, backfill, migrate consumers, then deprecate the old. Because events are " +
                        "permanent, treat every published schema as public API.</p>",
                },
                {
                    q: "Sagas versus 2PC — when do you use which?",
                    a:
                        "<p>2PC when all participants are in the same trust domain and transaction " +
                        "coordinator, since it blocks and has a poor failure record. Sagas when " +
                        "services are independent: a local transaction per step, plus a compensating " +
                        "action for each one. The honest answer in an interview is that sagas give up " +
                        "isolation, so you must handle the intermediate states explicitly.</p>",
                },
                {
                    q: "How do you keep a consumer from falling behind?",
                    a:
                        "<p>Scale consumers up to the partition count, batch records to cut " +
                        "per-record overhead, and make the handler idempotent so you can safely " +
                        "parallelise and rebalance. Track lag as an SLO with alerting on the growth " +
                        "rate, not the absolute value. If lag is structurally growing, the fix is " +
                        "throughput work in the handler, not more consumers.</p>",
                },
                {
                    q: "How do you test an event-driven system?",
                    a:
                        "<p>Unit-test each consumer in isolation, then test contracts with recorded " +
                        "events captured from production — that is what catches schema drift. " +
                        "Integration-test the outbox relay and the failure paths: duplicate delivery, " +
                        "out-of-order arrival, broker outage during publish, and a poison message " +
                        "landing in the DLQ.</p>",
                },
            ],
        },
    ],
});
