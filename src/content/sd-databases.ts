// src/content/sd-databases.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-databases",
    title: "Databases",
    blocks: [
        {
            kind: "card",
            title: "🧠 Core Idea",
            html:
                "<p>Choosing a database is choosing a data model, a consistency contract, and a scaling " +
                "axis. There is no &quot;NoSQL is faster&quot; — there is &quot;this access pattern " +
                "scales better in this shape, at the cost of this guarantee&quot;.</p>" +
                "<p><strong>The invariant:</strong> <b>the access pattern must be known before the data " +
                "model is chosen.</b> A store that cannot serve your dominant query in O(1) will not " +
                "be saved by adding nodes, and the fix always costs more than choosing correctly the " +
                "first time.</p>",
        },
        {
            kind: "card",
            title: "🧭 Picking the Right Data Model",
            html:
                "<p>Start from the guarantees you need and walk the tree. Most real systems end up " +
                "polyglot — a relational system of record plus a cache or search index in front of " +
                "it.</p>",
        },
        {
            kind: "diagram",
            caption:
                "The decision is driven by the access pattern and the consistency contract, not by fashion",
            source: `flowchart TD
    START{"What does the workload<br/>actually require?"} --> TX{"Must several rows change<br/>atomically with ACID?"}
    TX -->|"yes"| JOIN{"Do you join across<br/>multiple entities?"}
    TX -->|"no"| FIXED{"Is the access pattern<br/>fixed and known?"}
    JOIN -->|"yes"| REL[("Relational<br/>Postgres, MySQL<br/>joins, constraints, ad-hoc queries")]
    JOIN -->|"no"| DOC[("Document<br/>MongoDB, DynamoDB<br/>one entity, flexible fields")]
    FIXED -->|"yes"| SMALL{"Does the value stay<br/>under 100 KB?"}
    FIXED -->|"no"| RANGE{"Is it high-write with<br/>time-range reads?"}
    SMALL -->|"yes"| KV[("Key-value<br/>Redis, DynamoDB<br/>point reads and counters")]
    SMALL -->|"no"| DOC
    RANGE -->|"yes"| WC[("Wide-column<br/>Cassandra, HBase<br/>partition key plus clustering key")]
    RANGE -->|"no"| DOC`,
        },
        {
            kind: "table",
            title: "📊 Data Model Comparison",
            headers: ["Model", "Scales by", "Strong at", "Weak at", "Examples"],
            rows: [
                [
                    "Relational",
                    "read replicas, then partitioning",
                    "multi-row ACID, joins, ad-hoc filters",
                    "single-writer write ceiling, cross-shard joins",
                    "Postgres, MySQL, Spanner",
                ],
                [
                    "Document",
                    "partitioning by shard key",
                    "whole-entity reads, flexible fields",
                    "cross-document queries, unbounded doc growth",
                    "MongoDB, DynamoDB",
                ],
                [
                    "Key-value",
                    "horizontal partitioning",
                    "point lookups, counters, sessions",
                    "anything that is not a point lookup",
                    "Redis, DynamoDB, Riak",
                ],
                [
                    "Wide-column",
                    "partition key, then clustering key",
                    "massive writes, time-series scans",
                    "multi-key queries, ad-hoc filters",
                    "Cassandra, HBase, Bigtable",
                ],
                [
                    "Graph",
                    "traverse edges instead of joining",
                    "multi-hop relationships, recommendations",
                    "bulk scans, high write throughput",
                    "Neo4j, Neptune",
                ],
                [
                    "Search / columnar",
                    "shards and segments",
                    "full-text, fuzzy match, OLAP aggregates",
                    "point writes, transactional updates",
                    "OpenSearch, ClickHouse",
                ],
            ],
        },
        {
            kind: "card",
            title: "⚡ Indexing",
            html:
                "<p>An index is a second copy of a subset of the data, ordered differently, so the " +
                "database can find matching rows without scanning the table. Every index is a pure win " +
                "for reads and a tax paid on every insert, update, and delete — plus extra memory and " +
                "extra WAL traffic.</p>" +
                "<p><strong>Why B-trees win:</strong> a B-tree has a high fan-out, so it is only 3–4 " +
                "levels deep even for hundreds of millions of rows — meaning 3–4 page reads instead of " +
                "a scan. That is true for both ranges and equality, which is why the same structure " +
                "serves <code>WHERE created_at BETWEEN ...</code> and <code>WHERE id = ...</code>.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Composite index column order follows the query, not the table definition",
            source: `flowchart LR
    ROW["One row<br/>e.g. an order"] --> NEED{"What does the<br/>query need?"}
    NEED -->|"equality on a column"| EQ["B-tree index on that column<br/>3 to 4 page reads for any table size"]
    NEED -->|"range or sort"| RANGE["B-tree preserves order<br/>same index serves ORDER BY and BETWEEN"]
    NEED -->|"exact key and no range"| HASH["Hash index<br/>O of 1 but useless for ranges"]
    NEED -->|"full-text or contains"| FULL["Inverted index GIN<br/>build is slow, writes get slower"]
    NEED -->|"two or more columns"| COMP["Composite index<br/>column order is the whole design"]
    COMP --> RULE["leftmost prefix rule:<br/>idx a,b,c serves a / a,b / a,b,c and nothing else"]`,
        },
        {
            kind: "table",
            title: "🗂️ Index Cheat Sheet",
            headers: ["Index", "Serves", "Cost"],
            rows: [
                [
                    "B-tree",
                    "equality, ranges, ORDER BY, prefix matching on strings",
                    "write amplification on every mutation",
                ],
                ["Hash", "exact equality only", "no ordering, no range scans"],
                [
                    "Composite",
                    "multi-column predicates in prefix order",
                    "larger, more writes; wrong column order makes it useless",
                ],
                [
                    "Covering (INCLUDE)",
                    "index-only scans, no table lookup",
                    "wider index, more disk",
                ],
                [
                    "Partial",
                    "only rows matching a predicate",
                    "must be re-evaluated on every write",
                ],
                [
                    "Unique",
                    "enforces a constraint",
                    "one extra index to maintain",
                ],
                [
                    "Full-text (GIN)",
                    "MATCH, word search, arrays",
                    "slow to build, expensive writes",
                ],
            ],
        },
        {
            kind: "card",
            title: "💻 Code: composite index, covering select, and read the plan",
            html:
                '<pre><code class="language-sql">-- Common mistake: two independent indexes. The planner must merge two B-trees\n' +
                "CREATE INDEX idx_orders_customer_created\n" +
                "    ON orders (customer_id, created_at DESC);\n" +
                "\n" +
                "\n" +
                "CREATE INDEX idx_orders_customer_covering\n" +
                "    ON orders (customer_id, created_at DESC) INCLUDE (status, total);\n" +
                "\n" +
                "EXPLAIN (ANALYZE, BUFFERS)\n" +
                "SELECT customer_id, created_at, status, total\n" +
                "FROM orders\n" +
                "WHERE customer_id = 42\n" +
                "ORDER BY created_at DESC\n" +
                "LIMIT 50;</code></pre>\n" +
                "<p><strong>What to read in the plan:</strong> a <code>Seq Scan</code> on a large table " +
                "means the index is not being chosen — usually a type mismatch (<code>bigint</code> " +
                "column compared against a <code>text</code> parameter) that silently disables the " +
                "index, or a low-selectivity predicate where a scan is genuinely cheaper. " +
                "<code>rows=1</code> is a lie caused by stale statistics; <code>ANALYZE</code> " +
                "first.</p>",
        },
        {
            kind: "card",
            title: "⚡ Transactions",
            html:
                "<p>ACID is the contract; <strong>isolation level</strong> is how strictly the database " +
                "honours it, and it is a performance dial. Every level except serializable is defined " +
                "by which anomalies it permits.</p>" +
                "<p><strong>Optimistic vs pessimistic:</strong> optimistic locking adds a version " +
                "column and fails the update if the version moved — cheap when conflicts are rare. " +
                "Pessimistic locking takes a <code>SELECT ... FOR UPDATE</code> up front — correct " +
                "but it holds locks for the whole transaction and turns a concurrency problem into a " +
                "queueing problem.</p>",
        },
        {
            kind: "table",
            headers: [
                "Level",
                "Dirty read",
                "Non-repeatable read",
                "Phantom",
                "Typical use",
            ],
            rows: [
                ["Read uncommitted", "yes", "yes", "yes", "never, really"],
                [
                    "Read committed",
                    "no",
                    "yes",
                    "yes",
                    "the Postgres default, most OLTP",
                ],
                [
                    "Repeatable read",
                    "no",
                    "no",
                    "yes",
                    "reports that aggregate several reads",
                ],
                [
                    "Serializable",
                    "no",
                    "no",
                    "no",
                    "financial ledgers, anything with invariants",
                ],
            ],
        },
        {
            // The legacy markup opened <pre><code> and never closed it, so the
            // trailing paragraph was parsed inside the code block. The tags are
            // closed here; the prose is unchanged.
            kind: "card",
            title: "💻 Code: optimistic concurrency in one round trip",
            html:
                '<pre><code class="language-sql">UPDATE accounts\n' +
                "   SET balance = balance - $1,\n" +
                "       version = version + 1\n" +
                " WHERE id = $2\n" +
                "   AND version = $3          -- expected version\n" +
                "   AND balance &gt;= $1;      -- and the business invariant, enforced by the engine\n" +
                "</code></pre>\n" +
                "<p>The <code>balance &gt;= $1</code> clause is the part people forget: it turns an " +
                "application-level race into a database-enforced invariant, so a bug in a retry loop " +
                "can never overdraw the account.</p>",
        },
        {
            kind: "table",
            title: "📐 Capacity Math",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Rows per shard",
                    "target 50M rows / 100 GB per shard",
                    "shards = total rows / 50M",
                ],
                [
                    "Index overhead",
                    "B-tree row roughly 30–60% of the heap",
                    "&#8776; 1.5&times; total data on disk",
                ],
                [
                    "Row + 2 indexes",
                    "1 KB heap + 0.6 KB + 0.6 KB",
                    "&#8776; 2.2 KB per row",
                ],
                [
                    "WAL and bloat",
                    "updates rewrite the row version",
                    "&#8776; 20–40% table bloat, budget for it",
                ],
                [
                    "Buffer pool",
                    "target a 99% hit ratio",
                    "size &#8776; working set, not whole dataset",
                ],
                [
                    "Writes per core",
                    "fsync-bound, roughly 1K–10K/s per node",
                    "shard when you pass 20–50K writes/s",
                ],
                [
                    "Read scaling",
                    "each replica doubles read capacity",
                    "3 replicas = 3&times; reads, still 1&times; writes",
                ],
                [
                    "Connection pool",
                    "20 per app node &times; 100 nodes",
                    "2,000 &gt; per-process backend limit, use pgbouncer",
                ],
            ],
        },
        {
            kind: "card",
            title: "⚠️ Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>N+1 queries</strong> — 1 query plus 1 per row. Invisible in dev, fatal " +
                "in production. Use eager loading, a join, or a batched <code>IN</code> query.</li>" +
                "<li><strong>Unbounded result sets</strong> — an endpoint with no LIMIT is a " +
                "denial-of-service vector and an OOM. Always paginate, even for admin tools.</li>" +
                "<li><strong>Missing or wrong indexes</strong> — including type mismatches that " +
                "disable an index silently, and indexes on low-selectivity columns that the planner " +
                "correctly ignores.</li>" +
                "<li><strong>Long transactions</strong> — hold locks, bloat the table, block vacuum, " +
                "and pin replication lag. Never open a transaction across a network call.</li>" +
                "<li><strong>Connection pool exhaustion</strong> — 500 app nodes &times; 25 " +
                "connections is 12,500 connections; the database dies before the app does. Pool in " +
                "the middle.</li>" +
                "<li><strong>Schema changes that lock</strong> — a plain <code>ALTER TABLE</code> " +
                "takes an exclusive lock. Use the online / concurrent path and expand-and-contract " +
                "migrations.</li>" +
                "<li><strong>Big batch jobs in the OLTP pool</strong> — reporting and backups share " +
                "the same instance and steal the IO budget from user traffic.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Relational or NoSQL — how do you decide in an interview?",
                    a:
                        "<p>Ask two questions: does the workload need multi-row ACID transactions, and " +
                        "do you know the dominant access pattern? If yes to ACID and you join across " +
                        "entities, relational. If the access pattern is a single-key or single-entity " +
                        "read and you need to scale writes horizontally, a key-value or document " +
                        "store. Most honest answers pick relational for the system of record plus a " +
                        "cache or search index in front — and say why.</p>",
                },
                {
                    q: "How do you choose index columns?",
                    a:
                        "<p>From the queries, in order. Read the actual WHERE and ORDER BY clauses, " +
                        "put equality columns first and the range or sort column last, then check the " +
                        "plan with EXPLAIN ANALYZE. Column order is leftmost-prefix, so idx(a,b,c) " +
                        "serves a, a,b, and a,b,c but not b alone. Every extra index costs write " +
                        "throughput, so justify each one.</p>",
                },
                {
                    q: "What is the difference between read committed and serializable?",
                    a:
                        "<p>Read committed guarantees you never see an uncommitted change but each " +
                        "statement can see a newer snapshot, so two reads in one transaction can " +
                        "disagree. Serializable guarantees the whole transaction sees one consistent " +
                        "snapshot and behaves as if it ran alone — at the cost of aborting transactions " +
                        "that would have caused a serialization anomaly. In Postgres serializable " +
                        "uses SSI plus predicate locks and surfaces conflicts as serialization " +
                        "failures that must be retried.</p>",
                },
                {
                    q: "How would you fix a slow query?",
                    a:
                        "<p>EXPLAIN ANALYZE first, not guess. Check for a Seq Scan on a large table, " +
                        "look for rows estimates that are wildly off (stale stats), confirm the index " +
                        "exists and matches the predicate including types, then look for sort or hash " +
                        "spills to disk. Only after that consider a covering index, a rewrite, or " +
                        "caching the result.</p>",
                },
                {
                    q: "How do you shard a relational database?",
                    a:
                        "<p>Partition by a key that keeps the dominant query on one shard — tenant " +
                        "id, customer id, or a hash — then use native sharding or logical sharding in " +
                        "the app. Introduce the shard key into every primary key so cross-shard " +
                        "uniqueness is enforceable, and expect to pay for scatter-gather queries and " +
                        "cross-shard joins.</p>",
                },
                {
                    q: "Your primary is at 90% CPU on writes. What moves first?",
                    a:
                        "<p>Read replicas take read load but do nothing for writes. For writes: batch " +
                        "and compress them, trim the write-amplifying indexes, move long analytical " +
                        "queries to a replica or a columnar store, and only then consider " +
                        "partitioning. Splitting shards mid-flight is the expensive answer and should " +
                        "be the last one.</p>",
                },
            ],
        },
    ],
});
