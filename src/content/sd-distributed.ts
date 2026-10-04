// src/content/sd-distributed.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-distributed",
    title: "Distributed Systems",
    blocks: [
        {
            kind: "card",
            title: "Core Idea",
            html:
                "<p>A distributed system is one where &quot;the network is down&quot; and &quot;the " +
                "server is slow&quot; are indistinguishable from the other side. Every hard problem in " +
                "the field — consensus, replication, idempotency, coordination — is a consequence of " +
                "that one sentence.</p>" +
                "<p><strong>The invariant:</strong> <b>assume every operation may be retried, may time " +
                "out after having succeeded, and may run concurrently with itself.</b> Design for " +
                "at-least-once execution and the system becomes tractable; design for exactly-once and " +
                "you are lying to yourself.</p>",
        },
        {
            kind: "card",
            title: "CAP, and Why It Is Misunderstood",
            html:
                "<p>CAP is not &quot;pick two of three&quot;. It is: <strong>when a network partition " +
                "occurs, you must choose between consistency and availability.</strong> Partition " +
                "tolerance is not optional — a partition will happen, so the real decision is CP or " +
                "AP, made per operation, not per system.</p>" +
                "<p><strong>PACELC</strong> extends it with the case CAP ignores: <em>if</em> there " +
                "is no partition, <em>else</em> you still trade latency against consistency. Every " +
                "read that must check a quorum pays that cost even on a perfectly healthy " +
                "cluster.</p>",
        },
        {
            kind: "diagram",
            caption:
                "CAP only applies during a partition; PACELC names the cost you pay when the network is fine",
            source: `flowchart TD
    P["A network partition occurs"] --> DECIDE{"Can the minority side<br/>still accept writes?"}
    DECIDE -->|"no - reject or queue"| CP["CP choice<br/>serialise through a quorum,<br/>sacrifice availability"]
    DECIDE -->|"yes - keep serving"| CONF{"Will two sides accept<br/>conflicting writes?"}
    CONF -->|"yes"| AP["AP choice<br/>serve reads and writes,<br/>reconcile later"]
    CONF -->|"no"| CP2["CP choice<br/>quorum reads and writes,<br/>sacrifices availability"]
    AP --> E["Else branch when there is NO partition:<br/>PACELC - you still trade latency<br/>for consistency on every quorum read"]`,
        },
        {
            kind: "card",
            title: "Consensus: Raft Leader Election and Log Replication",
            html:
                "<p>Consensus gives a replicated state machine one agreed ordering of operations even " +
                "when machines crash, messages are lost, and delays are unbounded. Raft's core loop " +
                "is: elect a leader by majority, replicate the log to a majority, and only commit once " +
                "a majority has it.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Raft: majority to elect, majority to commit, log order is the agreed order",
            source: `flowchart TD
    F["Followers time out<br/>on the leader heartbeat"] --> CAND["Candidate asks for votes<br/>with term plus 1"]
    CAND --> MAJ{"Majority of N acked?"}
    MAJ -->|"no"| AGAIN["Stay candidate<br/>retry with jitter"]
    AGAIN --> CAND
    MAJ -->|"yes"| LEAD["Become leader<br/>start heartbeats"]
    LEAD --> CLI["Clients send commands<br/>to the leader only"]
    CLI --> REP["Append entry to the log,<br/>replicate to followers"]
    REP --> ACK{"Replicated to<br/>a majority?"}
    ACK -->|"no"| RETRY["Uncommitted,<br/>it may be overwritten"]
    RETRY --> CLI
    ACK -->|"yes"| COMMIT["Commit at that index,<br/>apply to the state machine"]`,
        },
        {
            kind: "table",
            title: "Quorum Arithmetic",
            headers: ["Config", "R", "W", "Guarantee", "Cost"],
            rows: [
                [
                    "Fast reads, last-write-wins",
                    "1",
                    "N",
                    "writes consistent, reads may lag",
                    "write latency = slowest replica",
                ],
                [
                    "Balanced",
                    "N/2 + 1",
                    "N/2 + 1",
                    "consistent, highly available",
                    "both slow, 1.5N of traffic",
                ],
                [
                    "Strong reads, fast writes",
                    "N",
                    "1",
                    "reads always latest",
                    "read latency = slowest replica",
                ],
                [
                    "Dynamo-style",
                    "quorum",
                    "quorum",
                    "quorum-like, tunable",
                    "sloppy quorums need hinted handoff",
                ],
            ],
        },
        {
            kind: "card",
            title: "Time, Ordering, and Clocks",
            html:
                "<p>Clocks across machines drift. You cannot order events by <code>timestamp</code> " +
                "and expect correctness — NTP keeps you within milliseconds, not microseconds, and a " +
                "paused VM can jump backwards.</p>" +
                "<ul>" +
                "<li><strong>Monotonic clocks</strong> for measuring durations inside one process (a " +
                "wall clock going backwards makes every timeout calculation wrong).</li>" +
                "<li><strong>Hybrid logical clocks</strong> — a physical clock plus a counter that " +
                "advances on every observed event, so timestamps stay close to real time but never " +
                "go backwards across the cluster. Used by CockroachDB and Spanner.</li>" +
                "<li><strong>Logical and vector clocks</strong> — track causality, not time. Needed " +
                "for conflict detection in multi-master replication, at the cost of metadata per " +
                "node.</li>" +
                "<li><strong>Lamport clocks</strong> — a partial order that respects causality, " +
                "enough to order events within one view.</li>" +
                "</ul>",
        },
        {
            kind: "card",
            title: "Code: retry with full jitter and a circuit breaker",
            html:
                '<pre><code class="language-javascript">// 1. Exponential backoff WITH FULL JITTER. Without jitter, 10,000 clients\n' +
                "//    retrying a 500 ms outage all retry at the same instant and keep it alive.\n" +
                "async function withRetry(fn, { attempts = 4, baseMs = 100, capMs = 2000 } = {}) {\n" +
                "    for (let i = 0; i &lt; attempts; i++) {\n" +
                "        try {\n" +
                "            return await fn();\n" +
                "        } catch (err) {\n" +
                "            if (!err.isRetryable || i === attempts - 1) throw err;\n" +
                "            const ceiling = Math.min(capMs, baseMs * 2 ** i);          // 100, 200, 400, 800...\n" +
                "            const sleepMs = Math.random() * ceiling;                  // full jitter\n" +
                "            await sleep(sleepMs);\n" +
                "        }\n" +
                "    }\n" +
                "}\n" +
                "\n" +
                "// 2. Circuit breaker: stop paying the full timeout for a dependency that is down.\n" +
                "//    closed = normal, open = fail fast, half-open = one probe allowed through.\n" +
                "class Breaker {\n" +
                "    constructor({ threshold = 5, resetMs = 30_000 } = {}) {\n" +
                "        this.state = 'closed';\n" +
                "        this.failures = 0; this.openedAt = 0;\n" +
                "        this.threshold = threshold; this.resetMs = resetMs;\n" +
                "    }\n" +
                "    async call(fn) {\n" +
                "        if (this.state === 'open') {\n" +
                "            if (Date.now() - this.openedAt &gt; this.resetMs) this.state = 'half-open';\n" +
                "            else throw new Error('circuit open');                      // fail FAST, no timeout wait\n" +
                "        }\n" +
                "        try {\n" +
                "            const out = await fn();\n" +
                "            this.state = 'closed'; this.failures = 0;\n" +
                "            return out;\n" +
                "        } catch (err) {\n" +
                "            if (++this.failures &gt;= this.threshold) { this.state = 'open'; this.openedAt = Date.now(); }\n" +
                "            throw err;\n" +
                "        }\n" +
                "    }\n" +
                "}\n" +
                "\n" +
                "// 3. Idempotency: a natural key in the same transaction makes a repeat detectable.\n" +
                "await db.transaction(async (tx) =&gt; {\n" +
                "    await tx.payments.create({\n" +
                "        data: { idemKey: 'charge:' + orderId + ':' + attempt, amount },\n" +
                "    });                                   // unique constraint: a duplicate insert throws, so it runs once\n" +
                "    await tx.accounts.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });\n" +
                "});</code></pre>\n" +
                "<p><strong>Why full jitter, not equal jitter:</strong> it spreads retries uniformly " +
                "across the window instead of clustering them, which measurably reduces " +
                "retry-amplified incidents. Note that an open circuit returns in microseconds " +
                "instead of holding a connection for the full 30-second timeout — that is the " +
                "difference between shedding load and queueing it.</p>",
        },
        {
            kind: "table",
            title: "Capacity Math",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Quorum write amplification",
                    "W = 3 of N = 5",
                    "3&times; the network and disk writes",
                ],
                [
                    "Quorum read latency",
                    "R = 3 of 5",
                    "median of 3 replies, not the fastest",
                ],
                [
                    "R + W &gt; N",
                    "N = 5, R = 3, W = 3",
                    "guarantees at least one overlapping replica",
                ],
                [
                    "Consensus commit",
                    "1 RTT to replicate + 1 RTT to commit",
                    "&#8776; 2 RTT per write, ~2 ms same-region",
                ],
                [
                    "Loss tolerance",
                    "N = 5, quorum = 3",
                    "loses 2 nodes and still commits",
                ],
                [
                    "Retry amplification",
                    "3 attempts &times; 30% failure rate",
                    "1.9&times; load on a struggling dependency",
                ],
                [
                    "CP during a minority partition",
                    "3 of 5, minority side is 2",
                    "0% availability on the minority",
                ],
                [
                    "Circuit breaker benefit",
                    "30 s timeout vs 0.01 ms when open",
                    "connection pool survives the outage",
                ],
            ],
        },
        {
            kind: "card",
            title: "Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>Partial failure</strong> — some operations succeed and some fail with no " +
                "way to tell which. Every operation needs a status query or an idempotent " +
                "retry.</li>" +
                "<li><strong>Retry storms</strong> — retries without jitter or a budget amplify an " +
                "outage into a self-sustaining one.</li>" +
                "<li><strong>Cascading failure</strong> — a slow dependency exhausts the caller's " +
                "thread pool. Timeouts, bulkheads, and circuit breakers are the defence.</li>" +
                "<li><strong>Thundering herd on recovery</strong> — everything retries at once when " +
                "the dependency returns. Stagger reconnects with jitter.</li>" +
                "<li><strong>Split brain</strong> — two nodes believe they own a resource. Needs " +
                "fencing or consensus, never a timeout alone.</li>" +
                "<li><strong>Clock skew</strong> — ordering by timestamp, or leases that assume clocks " +
                "agree. Use monotonic clocks and logical ordering.</li>" +
                "<li><strong>Distributed lock without fencing</strong> — the old holder resumes and " +
                "writes after the lease moved on. A lock must carry a fencing token the resource " +
                "checks.</li>" +
                "<li><strong>Backpressure ignored</strong> — unbounded queues turn a throughput limit " +
                "into unbounded latency. Shed load deliberately.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Explain CAP properly.",
                    a:
                        "<p>Partition tolerance is not a choice. When a partition occurs you must " +
                        "choose between returning an error (CP, sacrificing availability) or serving " +
                        "possibly-stale data (AP, sacrificing consistency). PACELC adds the else " +
                        "branch: even without a partition you trade latency for consistency whenever " +
                        "an operation waits for a quorum. Most real systems are CP for money and AP " +
                        "for social feeds — per operation, not per system.</p>",
                },
                {
                    q: "Why is a distributed lock without fencing unsafe?",
                    a:
                        "<p>Because a lock has a lease, and a paused or partitioned holder can " +
                        "believe it still holds the lock after the lease expired and someone else " +
                        "acquired it. When it wakes up, two holders write. The fix is a monotonically " +
                        "increasing fencing token issued with every acquisition, which the storage " +
                        "layer checks and rejects stale tokens against.</p>",
                },
                {
                    q: "How do you debug a distributed system?",
                    a:
                        "<p>Traces first — a propagated trace context gives one timeline across " +
                        "every service. Then metrics with high cardinality (request IDs, not just " +
                        "service names) so you can isolate the failing requests, then logs keyed by " +
                        "trace ID. Percentile distributions matter more than averages: a p50 of 50 " +
                        "ms can hide a p99 of 5 s, and the p99 is what users report.</p>",
                },
                {
                    q: "When do you need consensus rather than a primary?",
                    a:
                        "<p>When there is no natural single writer and the data cannot tolerate " +
                        "divergence — leader election, distributed locks with fencing, config and " +
                        "membership changes, and replicated coordination state. If one node can " +
                        "legitimately be the only writer, use leader-follower: it is far cheaper than " +
                        "consensus and easier to reason about.</p>",
                },
                {
                    q: "How do you make an operation safe to retry?",
                    a:
                        "<p>Make it idempotent: an idempotency key or natural dedup written in the " +
                        "same transaction as the effect, and a natural key so a repeat is detectable. " +
                        "Then bound the retries with exponential backoff and full jitter, and only " +
                        "retry idempotent failures — a timeout on a non-idempotent write may mean it " +
                        "succeeded.</p>",
                },
                {
                    q: "What is the difference between a timeout and a circuit breaker?",
                    a:
                        "<p>A timeout bounds one call, but the caller still pays the timeout on every " +
                        "attempt and still holds the resources. A circuit breaker notices that the " +
                        "dependency is consistently failing and fails immediately, then probes " +
                        "periodically. Timeouts protect a single call; breakers protect the whole " +
                        "system from a slow dependency.</p>",
                },
            ],
        },
    ],
});
