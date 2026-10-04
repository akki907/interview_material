// src/content/sd-replication.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-replication",
    title: "Replication",
    blocks: [
        {
            kind: "card",
            title: "Core Idea",
            html:
                "<p>Replication keeps copies of the data so the system survives machine failure, " +
                "serves reads from many places, and survives the loss of a whole failure domain. The " +
                "cost is a consistency contract you must state explicitly.</p>" +
                "<p><strong>The invariant:</strong> <b>there is exactly one place a write is accepted, " +
                "unless you have deliberately chosen multi-leader or quorum semantics — and then the " +
                "conflict resolution rule is part of the data model, not an afterthought.</b></p>" +
                "<p>The second invariant people forget: <b>failover is the hard part.</b> A system " +
                "that replicates beautifully and cannot promote a new leader in time is not highly " +
                "available.</p>",
        },
        {
            kind: "card",
            title: "Sync vs Async",
            html:
                "<ul>" +
                "<li><strong>Synchronous</strong> — the leader waits for a replica to acknowledge " +
                "before replying. Zero data loss on failover; write latency now includes the network " +
                "round trip (often 1–5 ms within a region). One slow replica slows every write.</li>" +
                "<li><strong>Asynchronous</strong> — the leader acknowledges immediately and " +
                "replicates in the background. Lowest latency and highest availability; a hard " +
                "failover can lose the last few seconds of writes.</li>" +
                "<li><strong>Semi-synchronous</strong> — acknowledge once any replica has persisted " +
                "the WAL, no need to wait for all. A middle ground used by MySQL and Postgres " +
                "setups.</li>" +
                "</ul>" +
                "<p><strong>Working rule:</strong> synchronous inside a region where the RTT is " +
                "bounded, asynchronous across regions where it is 50 ms and would dominate every " +
                "write.</p>",
        },
        {
            kind: "table",
            title: "Replication Topologies",
            headers: [
                "Topology",
                "Who accepts writes",
                "Reads",
                "Best for",
                "Cost",
            ],
            rows: [
                [
                    "Leader-follower",
                    "one leader only",
                    "leader or replicas",
                    "the 90% case: a clear owner",
                    "read/write asymmetry; one write hot spot",
                ],
                [
                    "Multi-leader",
                    "every node",
                    "any node",
                    "multi-region writes, offline merge",
                    "write-write conflicts, merge semantics",
                ],
                [
                    "Quorum",
                    "any node, needs R acks",
                    "needs R reads",
                    "coordination, config stores",
                    "quorum latency on every op",
                ],
                [
                    "Chain / cascaded",
                    "one leader per region",
                    "local replicas",
                    "cross-region read latency",
                    "a slow link stalls the whole chain",
                ],
                [
                    "Sync geographic",
                    "one global leader",
                    "local replicas",
                    "strong consistency globally",
                    "cross-ocean write latency",
                ],
            ],
        },
        {
            kind: "card",
            title: "Topology Decision",
            html:
                "<p>Leader-follower is the default because it makes conflict resolution a non-issue. " +
                "Reach for multi-leader only when the workload genuinely writes in several places — " +
                "multi-region users, mobile devices offline for days. Reach for quorums when the data " +
                "is small, coordination is already the norm, and you need linearizable reads and " +
                "writes across the cluster.</p>",
        },
        {
            kind: "diagram",
            caption:
                "The topology is a decision about where writes are allowed to be accepted",
            source: `flowchart TD
    W["A write arrives"] --> TOPO{"Which replication<br/>topology?"}
    TOPO -->|"Leader-follower"| LF["Single leader serialises writes<br/>replicas serve reads only"]
    TOPO -->|"Multi-leader"| ML["Every node accepts writes<br/>last-write-wins or CRDT merge"]
    TOPO -->|"Quorum"| QM["Any node accepts a write<br/>but needs R of N acknowledgements"]
    LF --> LFC["Cost: write hot spot on one node,<br/>reads may be stale"]
    ML --> MLC["Cost: write-write conflicts,<br/>every merge rule must be designed"]
    QM --> QMC["Cost: latency of the slowest<br/>quorum on every operation"]`,
        },
        {
            kind: "card",
            title: "Leader Failover, Step by Step",
            html:
                "<p>The state machine below is the part that actually determines availability: " +
                "detect, elect, catch up, serve. Total time is the detection window plus the election " +
                "window plus the catch-up time — and every one of those has a cost you must " +
                "budget.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Detection + election + catch-up is the real failover budget — not just the election",
            source: `stateDiagram-v2
    [*] --> Leading
    Leading --> LeaderLost: "process dies or heartbeat misses"
    LeaderLost --> Electing: "election timeout expires, 1.5 s"
    Electing --> NewLeader: "majority of 3 acks, term plus 1"
    Electing --> Electing: "split vote, retry with jitter"
    NewLeader --> CatchingUp: "stream WAL from the most advanced replica"
    CatchingUp --> Serving: "lag below threshold, replay caught up"
    Serving --> LeaderLost: "leader dies again"
    Serving --> [*]`,
        },
        {
            kind: "card",
            title: "Code: read-your-writes with a version token",
            html:
                '<pre><code class="language-javascript">// The client sends the last version it successfully observed.\n' +
                "async function readOrders(customerId, minVersion) {\n" +
                "    if (minVersion == null) {\n" +
                "        return replica.query(FROM_ORDERS, [customerId]);   // fast path: stale is fine\n" +
                "    }\n" +
                "\n" +
                "    // Read-your-own-writes: pick a replica whose applied position has caught up.\n" +
                "    const deadline = Date.now() + READ_YOUR_WRITES_MS;    // bound the wait, e.g. 500 ms\n" +
                "    while (Date.now() &lt; deadline) {\n" +
                "        const node = pickReplicaWithPosition(customerId, minVersion);\n" +
                "        if (node) {\n" +
                "            return node.query(FROM_ORDERS, [customerId]);  // guarantee honoured\n" +
                "        }\n" +
                "        await sleep(25);\n" +
                "    }\n" +
                "\n" +
                "    // Fall back to the primary rather than hang: show possibly-stale data\n" +
                "    // instead of an error the user cannot act on.\n" +
                "    return primary.query(FROM_ORDERS, [customerId]);\n" +
                "}</code></pre>\n" +
                "<p><strong>Alternatives and when to use them:</strong> sticky routing to the leader " +
                "(simple, costs locality), a read-your-writes timestamp with the clock shared over " +
                "NTP (cheap, breaks under clock skew), or routing the write itself through a token. " +
                "All of them are heuristics; say that out loud in an interview.</p>",
        },
        {
            kind: "table",
            title: "Capacity Math and Replication Lag",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Replication lag at 1 byte/s",
                    "1 byte/s &times; 1 s = 1 byte behind",
                    "async: measurable staleness",
                ],
                [
                    "Lag at 10 MB/s of writes",
                    "10 MB/s &times; 1 s of backlog",
                    "&#8776; 10 MB and 100K rows behind",
                ],
                [
                    "Read amplification",
                    "1 leader + 4 replicas",
                    "reads scale 5&times;, writes do not",
                ],
                [
                    "Sync write cost",
                    "leader fsync + network RTT + replica fsync",
                    "&#8776; 1–5 ms extra in-region",
                ],
                [
                    "Cross-region sync cost",
                    "RTT us-east to eu-west",
                    "&#8776; 70 ms — usually unacceptable",
                ],
                [
                    "WAL per write",
                    "1 KB row &times; 3&times; amplification",
                    "&#8776; 3 KB per write to ship",
                ],
                [
                    "Single-leader write ceiling",
                    "fsync-bound, high-end hardware",
                    "&#8776; 20K–50K writes/s per leader",
                ],
                [
                    "Failover budget at 3 nines",
                    "52 min/year total downtime allowed",
                    "detection 1 s + election 2 s + catch-up 5 s",
                ],
            ],
        },
        {
            kind: "card",
            title: "Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>Split brain</strong> — two leaders both accepting writes. Prevent with " +
                "fencing tokens, a lease that expires, or consensus; never with a DNS flip.</li>" +
                "<li><strong>Silent data loss on async failover</strong> — the new leader never had " +
                "the last writes. Bound the exposure by measuring replication lag as an SLO and " +
                "alerting on it.</li>" +
                "<li><strong>Lag spikes from bulk work</strong> — a large UPDATE or a schema " +
                "migration generates WAL that floods replication and stalls reads. Chunk batch " +
                "jobs.</li>" +
                "<li><strong>Read your writes violations</strong> — a write to the leader followed by " +
                "a read from a lagging replica. Use the version token above or sticky routing.</li>" +
                "<li><strong>Synchronous replica in another region</strong> — one bad link turns " +
                "every write into a 200 ms operation, or a write outage.</li>" +
                "<li><strong>Failover flapping</strong> — an underprovisioned new leader immediately " +
                "overloaded, killed, and rolled back. Always give the promoted node time to warm " +
                "caches before returning it to rotation.</li>" +
                "<li><strong>Cross-region reads served locally but written globally</strong> — users " +
                "see their own write vanish for seconds. Pick your consistency model per feature, " +
                "deliberately.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Synchronous or asynchronous replication?",
                    a:
                        "<p>Synchronous within a region where the RTT is 1–5 ms and losing writes is " +
                        "unacceptable — payments, orders, anything with an invariant. Asynchronous " +
                        "across regions, where 50–70 ms per write is unacceptable and you accept a " +
                        "bounded staleness window that you then measure as an SLO. Semi-synchronous is " +
                        "a reasonable middle: durable on at least one replica, no wait for all.</p>",
                },
                {
                    q: "How fast can you fail over?",
                    a:
                        "<p>Detection (heartbeat timeout, typically 1–3 s) + election (quorum round " +
                        "trip, ~RTT) + catch-up of the new leader to the last committed position (can " +
                        "be seconds if it fell behind). Be explicit that the last term dominates and " +
                        "that catching up is skipped in practice — the new leader is usually chosen " +
                        "because it is the most advanced replica.</p>",
                },
                {
                    q: "How do you prevent split brain?",
                    a:
                        "<p>Only one node may hold a valid lease or term, and any resource it touches " +
                        "must be fenced — a monotonically increasing epoch, a fencing token checked by " +
                        "the resource, or storage-layer ownership. Time-based leases are only safe if " +
                        "clocks are bounded, so use consensus where you cannot control the " +
                        "resource.</p>",
                },
                {
                    q: "Multi-leader replication: how do you resolve conflicts?",
                    a:
                        "<p>Last-write-wins with a timestamp is the cheap default and is fine for " +
                        "independent keys. For the same key, you need something real: a per-field " +
                        "merge, a CRDT for sets and counters, or an application-level conflict " +
                        "handler. The key insight is that conflict resolution must be designed with " +
                        "the data model, because it becomes the schema.</p>",
                },
                {
                    q: "How do you handle read-your-writes?",
                    a:
                        "<p>Simplest is sticky routing to the leader. More precise is a version " +
                        "token: the client echoes the last version it saw, and we route to a replica " +
                        "that has applied at least that version, waiting up to a bounded timeout and " +
                        "falling back to the primary. Sticky sessions are cheap but break on " +
                        "failover.</p>",
                },
                {
                    q: "Reads are 90% of traffic. How do you scale them?",
                    a:
                        "<p>Add replicas — each roughly doubles read capacity — and put a cache in " +
                        "front for the repeat readers. Measure the hit rate and the tail, not just the " +
                        "average. If reads are the only problem, replication plus caching scales very " +
                        "far before sharding becomes necessary.</p>",
                },
            ],
        },
    ],
});
