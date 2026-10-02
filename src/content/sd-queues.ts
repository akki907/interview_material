// src/content/sd-queues.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-queues",
    title: "Messaging & Queues",
    blocks: [
        {
            // Static legacy markup; only the colours were remapped onto the new
            // app's design tokens (--bg-tertiary / --accent are gone).
            kind: "card",
            title: "🎬 Producer/Consumer",
            html:
                '<div style="display:flex;align-items:center;justify-content:center;gap:24px;">' +
                '<div style="padding:12px 20px;background:var(--neutral);border-radius:8px;"><strong>Producer</strong></div>' +
                '<div style="font-size:1.5rem;">→</div>' +
                '<div style="padding:12px 20px;background:var(--c2);color:var(--c2i);border-radius:8px;"><strong>Queue / Kafka</strong></div>' +
                '<div style="font-size:1.5rem;">→</div>' +
                '<div style="padding:12px 20px;background:var(--neutral);border-radius:8px;"><strong>Consumer</strong></div>' +
                "</div>",
        },
        {
            kind: "card",
            title: "🧠 Core Idea",
            html:
                "<p>A queue decouples the rate at which work is produced from the rate at which it can " +
                "be processed. That single property gives you load smoothing (bursts get absorbed), " +
                "load levelling (slow consumers do not back-pressure producers), and failure isolation " +
                "(a downstream outage becomes a growing backlog instead of a failing request).</p>" +
                "<p><strong>The invariant:</strong> <b>every message must be safe to process more than " +
                "once.</b> Anything less — an in-flight crash between &quot;handled&quot; and " +
                "&quot;acked&quot;, a visibility-timeout expiry, a consumer rebalance — delivers a " +
                "duplicate. If duplicates break your system, the bug is in the consumer, not the " +
                "broker.</p>",
        },
        {
            kind: "table",
            title: "📨 Delivery Semantics",
            headers: [
                "Semantics",
                "What the broker promises",
                "Duplicates",
                "What you must build",
            ],
            rows: [
                [
                    "At-most-once",
                    "ack before processing",
                    "none, messages can be lost",
                    "accept loss; use for metrics, sampling",
                ],
                [
                    "At-least-once",
                    "ack after processing",
                    "possible on crash",
                    "idempotent consumers, dedupe keys",
                ],
                [
                    "Exactly-once",
                    "atomic enqueue and process in one log",
                    "none",
                    "transactions enabled, still build for replay",
                ],
            ],
        },
        {
            kind: "card",
            title: "🔁 At-Least-Once, Made Effectively-Once",
            html:
                "<p>&quot;Exactly-once delivery&quot; does not exist across a network. What exists is " +
                "<em>at-least-once delivery plus an idempotent consumer</em>, which is what every real " +
                "payment or order pipeline does. The idempotency key is written in the <em>same " +
                "database transaction</em> as the state change — that single fact is what makes it " +
                "correct.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Idempotency key and side effect in one transaction: duplicates become no-ops, not double charges",
            source: `sequenceDiagram
    autonumber
    participant P as Producer
    participant B as Broker
    participant C as Consumer
    participant DB as Orders DB
    P->>B: publish order.created<br/>key order_id, idem id ab12
    B-->>C: deliver message, visibility 30 s
    C->>DB: BEGIN, INSERT INTO processed_msg id ab12
    alt first delivery
        DB-->>C: insert succeeded
        C->>DB: apply the state change, COMMIT
        C->>B: ack, commit offset
    else redelivery after a crash
        DB-->>C: unique violation, no-op
        C->>B: ack, commit offset, no side effect
    end`,
        },
        {
            kind: "card",
            title: "💻 Code: idempotent consumer with bounded retries",
            html:
                '<pre><code class="language-javascript">async function handle(message) {\n' +
                "    // 1. Dedupe key lives in the same transaction as the side effect.\n" +
                "    const existing = await db.processedMessages.findUnique({ where: { id: message.id } });\n" +
                "    if (existing) return;                       // already applied, ack immediately\n" +
                "\n" +
                "    try {\n" +
                "        await db.transaction(async (tx) =&gt; {\n" +
                "            await tx.processedMessages.create({ id: message.id });   // unique constraint does the work\n" +
                "            await tx.orders.update({ where: { id: message.orderId }, data: { status: 'CONFIRMED' } });\n" +
                "        });\n" +
                "        await ack(message);\n" +
                "    } catch (err) {\n" +
                "        if (err.isTransient) {\n" +
                "            // 2. Transient: nack with a delay so the retry does not spin.\n" +
                "            await nackWithDelay(message, Math.min(60_000, 2 ** message.attempt * 1000));\n" +
                "        } else {\n" +
                "            // 3. Poison message: do not block the partition forever.\n" +
                "            await db.deadLetters.create({ data: { message, reason: err.message } });\n" +
                "            await ack(message);\n" +
                "        }\n" +
                "    }\n" +
                "}</code></pre>\n" +
                "<p><strong>Line notes:</strong> the unique constraint on " +
                "<code>processed_messages.id</code> is the actual deduplication mechanism — a " +
                "read-then-write check has a race. Transient versus permanent classification is the " +
                "hard part: a timeout is usually transient, a JSON parse error is always permanent, " +
                "and misclassifying a permanent error as transient is how a single bad message fills " +
                "the DLQ ten thousand times.</p>",
        },
        {
            kind: "card",
            title: "🔀 Ordering, Partitions and Backpressure",
            html:
                "<p>Ordering is a partition property, not a broker property. Two messages are only " +
                "guaranteed to arrive in publish order <em>if they share a partition key</em> — " +
                "order_id, user_id, account_id. Choose the key as the smallest unit that must be " +
                "serialised. Making the key the tenant id serialises the whole tenant and destroys " +
                "parallelism; making it random breaks per-order ordering entirely.</p>" +
                "<p>Backpressure is the queue's way of saying &quot;you are producing faster than I can " +
                "consume&quot;. A bounded queue with a reject or shed policy is strictly better than an " +
                "unbounded one: an unbounded queue converts an overload into unbounded latency, which " +
                "looks identical to a hang.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Ordering comes from the partition key; a partition with no consumer stalls but never reorders",
            source: `flowchart TD
    P["Producer publishes<br/>order.created, key = order_id"] --> HASH["Broker hashes the key<br/>to pick a partition"]
    HASH --> PART[("Partition 3<br/>total order inside<br/>no order across partitions")]
    PART --> C1["Consumer 1"]
    PART --> C2["Consumer 2"]
    PART -.->|"a partition with no consumer<br/>stops here while others run"| IDLE["Ordering preserved,<br/>progress lost"]
    C1 --> FULL{"Partition buffer<br/>above the limit?"}
    FULL -->|"yes"| SHED["Backpressure:<br/>reject, block, or shed the producer"]
    FULL -->|"no"| OK["Consume and ack"]
    SHED -.->|"versus an unbounded queue"| LAT["Latency grows without limit<br/>and looks like a hang"]`,
        },
        {
            kind: "table",
            title: "⚡ Broker Options",
            headers: [
                "Broker",
                "Model",
                "Exactly-once",
                "Replay",
                "Pick it for",
            ],
            rows: [
                [
                    "Kafka",
                    "durable partitioned log, consumer offsets",
                    "yes, within a transaction",
                    "yes, from any offset",
                    "event streaming, many independent consumer groups, replay",
                ],
                [
                    "RabbitMQ",
                    "classic work queue, push delivery",
                    "no",
                    "limited, until acked",
                    "task distribution, low latency, routing by key",
                ],
                [
                    "SQS",
                    "managed queue, at-least-once",
                    "no (FIFO gives dedupe)",
                    "limited",
                    "serverless, zero ops, burst absorption",
                ],
                [
                    "NATS / JetStream",
                    "lightweight, subject-based",
                    "limited",
                    "yes",
                    "simple fan-out, edge, low footprint",
                ],
                [
                    "Pub/Sub (GCP, AWS)",
                    "managed topics",
                    "no",
                    "no (ack deadline only)",
                    "managed fan-out, zero ops",
                ],
            ],
        },
        {
            kind: "table",
            title: "📐 Capacity Math",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Peak produce rate",
                    "1M orders/day &times; burst factor 10",
                    "&#8776; 1,200 msg/s peak",
                ],
                [
                    "Consumer lag budget",
                    "at 3 nines, lag must stay under 60 s",
                    "72,000 messages buffered",
                ],
                [
                    "Partitions",
                    "1,200 msg/s &divide; 1,000 msg/s per partition",
                    "&#8776; 2, use 6–12 for headroom",
                ],
                [
                    "Ordering parallelism",
                    "one consumer per partition",
                    "6–12 concurrent consumers, no more",
                ],
                [
                    "Storage",
                    "1 KB msg &times; 40M/day &times; 7 days",
                    "&#8776; 280 GB",
                ],
                [
                    "Backlog recovery",
                    "consumer down 1 h at 1,200 msg/s",
                    "4.3M messages to drain",
                ],
                [
                    "Throughput formula",
                    "throughput &le; consumers &times; partitions",
                    "the real ceiling",
                ],
                [
                    "Poison cost",
                    "5 retries &times; backoff 1+2+4+8+16 s",
                    "&#8776; 31 s of partition stall per bad message",
                ],
            ],
        },
        {
            kind: "card",
            title: "⚠️ Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>Duplicate processing</strong> — a crash between commit and ack. " +
                "Non-negotiable duplicate handling on the consumer side.</li>" +
                "<li><strong>Rebalance storm</strong> — a consumer group rebalances when one member " +
                "is slow or a session times out; with hundreds of partitions this pauses the whole " +
                "group repeatedly. Use static membership and long session timeouts.</li>" +
                "<li><strong>Unbounded queues</strong> — latency grows without any visible failure. " +
                "Always cap and shed.</li>" +
                "<li><strong>Hot partition</strong> — a popular key sends all traffic to one " +
                "partition. Add a sub-key suffix when ordering is not required.</li>" +
                "<li><strong>Long ack latency</strong> — processing before acking increases the " +
                "duplicate window. Ack fast, do slow work after.</li>" +
                "<li><strong>Unbounded DLQ</strong> — a DLQ nobody watches is a data-loss graveyard. " +
                "Alert on its depth and give it a replay tool.</li>" +
                "<li><strong>Broker as a data store</strong> — treating a queue as durable storage " +
                "without a retention and compaction plan is how replay becomes impossible.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Exactly-once — does it exist?",
                    a:
                        "<p>Not as a delivery guarantee across a network. What exists is at-least-once " +
                        "delivery plus an idempotent consumer, implemented by writing a deduplication " +
                        "key in the same transaction as the side effect. Kafka offers exactly-once " +
                        "processing within its own transactions, which covers broker and " +
                        "consumer-group state but not an external database write.</p>",
                },
                {
                    q: "How do you guarantee ordering?",
                    a:
                        "<p>By partitioning on the key that defines the ordering unit — order_id, not " +
                        "tenant_id. Messages with the same key go to the same partition and are " +
                        "consumed in order by one consumer. Trade-off: that partition is your " +
                        "parallelism ceiling and a hot key stalls. If ordering is not required, use a " +
                        "random or time-based sub-key to spread the load.</p>",
                },
                {
                    q: "What goes in a dead-letter queue and what does not?",
                    a:
                        "<p>Put permanent, non-retryable failures there: malformed payloads, missing " +
                        "required fields, references to entities that will never exist. Retriable " +
                        "failures (timeouts, connection resets, lock contention) belong in the retry " +
                        "path. A DLQ entry should be replayable — re-publish it to the original topic " +
                        "with the original key once the bug is fixed.</p>",
                },
                {
                    q: "Consumer lag is climbing. What is wrong?",
                    a:
                        "<p>Either production exceeds consumption (check consumer CPU — likely " +
                        "processing is too slow, so batch it), a consumer died, or a poison message " +
                        "is blocking a partition (look for repeated retries on the same offset). Lag " +
                        "that grows linearly means a throughput deficit; lag that spikes and recovers " +
                        "means a deploy or a rebalance.</p>",
                },
                {
                    q: "Kafka or RabbitMQ?",
                    a:
                        "<p>Kafka when you need replay, many independent consumer groups, and high " +
                        "throughput with a durable log. RabbitMQ for task distribution with routing " +
                        "flexibility and low latency. For serverless where you want zero operations, " +
                        "SQS. State the trade-off: Kafka is an operations burden and RabbitMQ cannot " +
                        "replay.</p>",
                },
                {
                    q: "How do you prevent a producer from overwhelming a slow consumer?",
                    a:
                        "<p>Bounded queues plus backpressure: when the queue is full, the producer " +
                        "either blocks, retries with backoff, or sheds load explicitly. Never let the " +
                        "queue grow without bound — it just converts a throughput problem into an " +
                        "unbounded latency problem that looks like a hang to the user.</p>",
                },
            ],
        },
    ],
});
