// src/content/sd-sharding.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-sharding",
    title: "Sharding",
    blocks: [
        {
            kind: "card",
            title: "Core Idea",
            html:
                "<p>Sharding splits one logical dataset across many physical stores so each holds a " +
                "slice. Unlike replication, which multiplies copies of the <em>whole</em> dataset, " +
                "sharding partitions it — this is the only way to scale writes beyond one machine's " +
                "fsync ceiling.</p>" +
                "<p><strong>The invariant:</strong> <b>the shard key must be present in the primary " +
                "key and in every query you care about</b>, so the overwhelming majority of requests " +
                "touch exactly one shard. Get the shard key right and sharding is invisible; get it " +
                "wrong and it is an operational tax you pay forever.</p>",
        },
        {
            kind: "table",
            title: "Sharding Strategies",
            headers: ["Strategy", "How keys map", "Great for", "Breaks when"],
            rows: [
                [
                    "Hash",
                    "hash of the shard key mod N, or consistent hashing",
                    "evenly distributed, uniform keys",
                    "range scans become scatter-gather; hot tenants",
                ],
                [
                    "Range",
                    "key ranges, e.g. by time or ID band",
                    "range queries, time-series, append-heavy",
                    "a monotonically increasing key lands everything on the newest shard",
                ],
                [
                    "Directory",
                    "a lookup service maps key to shard",
                    "keys need to move, tenants need pinning",
                    "the directory becomes a critical, stateful service",
                ],
                [
                    "Geo / zone",
                    "user, tenant, or region affinity",
                    "data residency, latency, local reads",
                    "uneven region sizes and cross-region writes",
                ],
                [
                    "Graph-aware",
                    "neighbours colocated",
                    "traversals, recommendations",
                    "rebalancing becomes graph partitioning",
                ],
            ],
        },
        {
            kind: "card",
            title: "Consistent Hashing with Virtual Nodes",
            html:
                "<p>Modulo hashing (<code>shard = hash(id) % N</code>) is the trap: change N and " +
                "<em>every</em> key moves, so a resize is a full data migration and a total cache " +
                "flush. Consistent hashing moves only 1/N of the keys. Virtual nodes solve the " +
                "distribution problem: with 3 physical nodes and one point each, 40% of keys can land " +
                "on one node by luck; with 160 points each, the spread is tight.</p>" +
                "<p><strong>Variants:</strong> rendezvous (highest-random-weight) hashing gives the " +
                "same minimal-movement property with no ring to keep in sync and a cheap &quot;which " +
                "server owns this key&quot; query — the modern default for Memcached-style " +
                "sharding.</p>",
        },
        {
            kind: "interactive",
            algo: "sharding",
            html:
                `Add a node to the cluster and watch where the keys land. Modulo moves almost everything; a hash ring moves only one slice.`,
        },
        {
            kind: "diagram",
            caption:
                "Virtual nodes smooth the ring so the load is even even with a handful of machines",
            source: `flowchart TD
    RING(("Ring 0 to 16383<br/>3 nodes &times; 160 vnodes = 480 points"))
    K1["key user:9"] -->|"walk clockwise"| N1["node C owns it"]
    K2["key user:10"] -->|"walk clockwise"| N2["node A owns it"]
    K3["key user:11"] -->|"walk clockwise"| N3["node B owns it"]
    N3 --> GROW["Add node D<br/>it claims 1/4 of the ring"]
    GROW -.->|"versus mod 4"| SKIP["Modulo: 100 percent of keys<br/>move, full cache flush"]
    GROW --> MOVE["Only keys in D's arc move,<br/>~1/4 of traffic, resumable"]`,
        },
        {
            kind: "card",
            title: "Online Rebalancing",
            html:
                "<p>Adding a shard is a migration, and migrations fail when done naively. The safe " +
                "sequence is <strong>expand</strong> (create capacity, keep serving), " +
                "<strong>backfill</strong> (copy data while serving both), <strong>cut over</strong> " +
                "(switch reads gradually), <strong>contract</strong> (remove the old copies). At no " +
                "point do you take a write outage.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Dual write then backfill then cut over — the only migration order that never blocks writes",
            source: `flowchart TD
    M0["Shard map v1<br/>4 shards, each at 90 percent full"] --> WARN{"Disk or QPS<br/>above 70 percent?"}
    WARN -->|no| M0
    WARN -->|"yes"| S1["1 Announce map v2<br/>dual-write affected keys to both shards"]
    S1 --> S2["2 Backfill new shards<br/>throttled copy, at reduced replica rate"]
    S2 --> S3["3 Verify per key<br/>checksum and row count"]
    S3 --> S4{"All keys match?"}
    S4 -->|"no"| S2
    S4 -->|"yes"| S5["4 Cut reads over<br/>1 percent at a time, watch p99"]
    S5 --> S6["5 Stop dual write<br/>drain and delete the old shard"]`,
        },
        {
            kind: "card",
            title: "Hot Shards and Hot Keys",
            html:
                "<p>The average is a lie: with a hash of a tenant ID, one whale tenant can be " +
                "100&times; the median shard. Detection is straightforward — shard-level QPS or disk " +
                "is not flat — and the remedies are, in order of preference:</p>" +
                "<ul>" +
                "<li><strong>Split the hot shard only</strong> — logical shards per tenant, so one " +
                "tenant can occupy many physical shards.</li>" +
                "<li><strong>Add a second-level hash</strong> — <code>shard = hash(tenant) then " +
                "hash(item)</code>, so a single tenant spreads across its own shards.</li>" +
                "<li><strong>Promote hot data to cache</strong> or to a separate read store " +
                "entirely.</li>" +
                "<li><strong>Rewrite the key</strong> — prefix a counter or bucket number into the " +
                "key so the distribution is fixed at write time.</li>" +
                "</ul>",
        },
        {
            kind: "card",
            title: "Code: shard-key-aware lookup and cross-shard fan-out",
            html:
                '<pre><code class="language-javascript">// The shard key is derivable from the request, so routing needs no directory service.\n' +
                "function shardFor(tenantId) {\n" +
                "    return ring.ownerOf(hash32(tenantId));   // walk clockwise from hash to the next vnode point\n" +
                "}\n" +
                "\n" +
                "// Point read: one shard, no scatter\n" +
                "async function getOrder(tenantId, orderId) {\n" +
                "    return db(shardFor(tenantId)).orders.findUnique({ where: { id: orderId } });\n" +
                "}\n" +
                "\n" +
                "// The query below has no shard key in the predicate, so it MUST fan out.\n" +
                "// Aggregate at the shard, not in the app, or you ship 100x the rows.\n" +
                "async function totalSpendForUser(userId) {\n" +
                "    // 1. Which tenants does this user belong to? (small, cached)\n" +
                "    const tenantIds = await tenantIndex.forUser(userId);       // usually 1, sometimes a few\n" +
                "    const perTenant = await Promise.all(\n" +
                "        tenantIds.map(id =&gt; db(shardFor(id)).orders.aggregate({ _sum: { total: true }, where: { userId } }))\n" +
                "    );\n" +
                "    return perTenant.reduce((sum, r) =&gt; sum + r._sum.total, 0);   // 1 row per tenant, not 1 per order\n" +
                "}\n" +
                "\n" +
                "// Scatter-gather with a cap: a cross-shard query must never be unbounded\n" +
                "async function crossShardSearch(query) {\n" +
                "    const shards = ring.allOwners();\n" +
                "    return Promise.all(shards.map(s =&gt; db(s).search(query, { limit: 10 })));\n" +
                "}</code></pre>\n" +
                "<p><strong>Line notes:</strong> pushing the aggregation into each shard is what keeps " +
                "a cross-shard query from shipping millions of rows to the app tier. The fan-out is " +
                "unbounded by nature — a 1,000-shard cluster means 1,000 concurrent queries — so it " +
                "needs its own timeout, concurrency limit, and a circuit breaker.</p>",
        },
        {
            kind: "table",
            title: "Capacity Math",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Data per shard",
                    "target 100 GB or 50M rows per shard",
                    "1 TB dataset = 10 shards",
                ],
                [
                    "QPS per shard",
                    "peak 42,000 / 32 shards",
                    "&#8776; 1,300 QPS per shard",
                ],
                [
                    "Growth headroom",
                    "shard count must cover 12–18 months",
                    "start with 2&times; the shards you need today",
                ],
                [
                    "Reshard data moved",
                    "1/32 of the dataset if you add one shard",
                    "&#8776; 31 GB to copy",
                ],
                [
                    "Copy window",
                    "31 GB at 200 MB/s throttled",
                    "&#8776; 3 minutes of copy, hours of verification",
                ],
                [
                    "Cross-shard query cost",
                    "1 aggregate per shard",
                    "32 round trips = 32 &times; p50 — always parallel",
                ],
                [
                    "Whale tenant ratio",
                    "largest tenant = 10 percent of traffic",
                    "needs its own logical shards",
                ],
                [
                    "Replica cost",
                    "each shard &times; 2 replicas &times; 32 shards",
                    "96 shards of paid disk",
                ],
            ],
        },
        {
            kind: "card",
            title: "Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>Hot shard</strong> — one tenant or one key dominating. Monitor per-shard " +
                "QPS and bytes, not averages.</li>" +
                "<li><strong>Resharding stalls</strong> — a migration that runs at full speed starves " +
                "the primary of IO and turns a background job into an outage. Always throttle and " +
                "lower the replica rate during backfill.</li>" +
                "<li><strong>Cross-shard joins in the hot path</strong> — a request that fans out to " +
                "32 shards has 32 chances to be slow. Move it to a read replica, a cache, or a " +
                "denormalised copy.</li>" +
                "<li><strong>Shard count as a permanent decision</strong> — pick a scheme (rendezvous, " +
                "or a directory) that supports growth without renumbering everything.</li>" +
                "<li><strong>Shard key missing from the primary key</strong> — uniqueness becomes " +
                "unenforceable and duplicates appear. Include the shard key in every PK.</li>" +
                "<li><strong>Unbalanced hash from non-uniform keys</strong> — sequential IDs hashed " +
                "into a small keyspace cluster badly. Add a seed or a virtual-node layer.</li>" +
                "<li><strong>Cascade of retries across shards</strong> — a partial failure triggers " +
                "retries that amplify load on the healthy shards. Bound retries per shard, not per " +
                "request.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "How do you choose a shard key?",
                    a:
                        "<p>It must be the key the dominant query filters on, must have high " +
                        "cardinality and even distribution, and must not leak across shards on hot " +
                        "paths. Then check three things: is it present in every primary key, is it " +
                        "stable for the life of the object, and does one customer dominate? Tenant or " +
                        "user ID is the usual answer, but it fails when one tenant is 10% of traffic " +
                        "— that is when you add a second-level hash so a tenant spans its own logical " +
                        "shards.</p>",
                },
                {
                    q: "Why not just modulo hashing?",
                    a:
                        "<p>Because N is baked into every key. Doubling from 4 to 8 moves essentially " +
                        "every key, so a resize becomes a full offline migration plus a total cache " +
                        "flush. Consistent hashing moves only 1/N of keys, and with virtual nodes the " +
                        "load stays even. Rendezvous hashing gives the same property without a ring to " +
                        "keep in sync.</p>",
                },
                {
                    q: "How do you rebalance without downtime?",
                    a:
                        "<p>Expand-and-contract: announce a new shard map and dual-write, backfill " +
                        "the new shards at a throttled rate, verify checksums and row counts per key, " +
                        "cut reads over gradually in small percentages while watching p99 and error " +
                        "rate, then stop the dual write and drain the old shards. Every step is " +
                        "reversible until the final one.</p>",
                },
                {
                    q: "How do you handle a query that must touch every shard?",
                    a:
                        "<p>Push computation down: run the filter and aggregate on each shard, return " +
                        "only partial results, and merge in the app or in a dedicated scatter-gather " +
                        "service. Fan out in parallel with a global deadline, cap the concurrency, and " +
                        "serve the result from a cache or a denormalised read model so the expensive " +
                        "path is off the hot path.</p>",
                },
                {
                    q: "Sharding versus replication — what do I use first?",
                    a:
                        "<p>Replication first. It is far simpler and it scales reads linearly with " +
                        "zero downside to writes. Shard only when the single write leader saturates or " +
                        "the dataset no longer fits on one machine. Many systems need neither: caching " +
                        "plus a faster index often buys a year.</p>",
                },
                {
                    q: "How do you test a sharding scheme?",
                    a:
                        "<p>Measure the distribution with a real or synthetic key histogram before " +
                        "committing — the answer is almost never uniform. Then simulate a reshard end " +
                        "to end, including the dual-write window and a mid-migration crash, because " +
                        "that is the code path that only runs during incidents.</p>",
                },
            ],
        },
    ],
});
