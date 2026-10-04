// src/content/sd-caching.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-caching",
    title: "Caching",
    blocks: [
        {
            // The legacy card body was a pipelineStages widget whose stage click
            // fired a toast. The stage data is expressed as a pipeline block
            // below; the click-to-toast interactivity has no content-data
            // equivalent.
            kind: "card",
            title: "Cache Flow",
            html:
                "<p>The request path through the cache tiers: the client asks, the cache either " +
                "answers or walks down to the database and stores on the way back. The legacy page " +
                "clicked a stage to see its name; the stage list is the pipeline block below.</p>",
        },
        {
            kind: "pipeline",
            stages: [
                { name: "Client", desc: "Request" },
                { name: "Cache", desc: "HIT → Response" },
                { name: "Cache", desc: "MISS → Database" },
                { name: "Database", desc: "Query + Store" },
            ],
        },
        {
            kind: "card",
            title: "Core Idea",
            html:
                "<p>Caching trades freshness and memory for latency and load. You are not making the " +
                "database faster — you are deciding how many requests the database never has to " +
                "see.</p>" +
                "<p><strong>The invariant that makes a cache correct:</strong> <b>a value that is read " +
                "from a cache must be indistinguishable from a value that is read from the source of " +
                "truth, or the staleness bound must be explicit and acceptable.</b> Everything else — " +
                "tiering, eviction, invalidation — exists to keep that promise cheap.</p>" +
                "<p>Three numbers describe any cache: the <strong>hit rate</strong> (how often it is " +
                "used), the <strong>working set</strong> (how much must be resident to hit that rate), " +
                "and the <strong>staleness bound</strong> (how wrong an answer may be). Optimize those " +
                'three, not "add Redis".</p>',
        },
        {
            kind: "card",
            title: "The Cache Hierarchy",
            html:
                "<p>Layer the caches so each one absorbs the traffic of the layer below. The rule of " +
                "thumb: put a cache as close to the requester as the data's staleness budget allows, " +
                "and give the nearest cache the smallest, hottest slice of the data.</p>",
        },
        {
            kind: "table",
            headers: ["Tier", "Typical latency", "Scope", "Serves"],
            rows: [
                [
                    "L1 in-process",
                    "nanoseconds",
                    "one node",
                    "per-request memoization, hot config",
                ],
                [
                    "L2 shared cache",
                    "0.2–1 ms",
                    "one region",
                    "Redis or Memcached cluster",
                ],
                [
                    "CDN edge",
                    "10–50 ms",
                    "global",
                    "images, video, JS, whole pages",
                ],
                [
                    "Read-through proxy",
                    "adds one hop",
                    "global",
                    "caches any query, not just objects",
                ],
                ["Source of truth", "5–100 ms", "global", "the database"],
            ],
        },
        {
            kind: "diagram",
            caption:
                "Each tier absorbs the layer below it; a miss walks the whole ladder exactly once",
            source: `sequenceDiagram
    autonumber
    participant U as Browser
    participant CDN as CDN edge
    participant L1 as L1 in-process
    participant L2 as L2 Redis cluster
    participant DB as Primary database
    U->>CDN: GET /api/orders
    alt CDN hit
        CDN-->>U: 200 served from edge
    else CDN miss
        CDN->>L1: forward to origin
        alt L1 hit
            L1-->>CDN: value
        else L1 miss
            L1->>L2: GET order:8821
            alt L2 hit
                L2-->>L1: value, TTL 300 s
            else L2 miss
                L2->>DB: SELECT ... WHERE id = 8821
                DB-->>L2: row
                L2->>L2: SETEX order:8821 300
            end
            L1-->>CDN: value
        end
        CDN-->>U: 200, Cache-Control max-age 60
    end`,
        },
        {
            kind: "card",
            title: "Write Strategies",
            html:
                "<p>Read paths are easy to get right; write paths are where caches break. The four " +
                "patterns differ in <em>who</em> writes the cache and <em>when</em> the source of truth " +
                "is updated.</p>",
        },
        {
            kind: "table",
            headers: [
                "Strategy",
                "Who writes cache",
                "Consistency",
                "Use when",
            ],
            rows: [
                [
                    "Cache-aside",
                    "the application, on read miss",
                    "eventual, window = TTL",
                    "default choice; cheapest, most tolerant",
                ],
                [
                    "Read-through",
                    "the cache itself loads on miss",
                    "eventual",
                    "you want miss logic in one place, not every caller",
                ],
                [
                    "Write-through",
                    "every write hits cache and store",
                    "cache never ahead",
                    "cache is a true replica; writes can afford the extra hop",
                ],
                [
                    "Write-behind",
                    "queue flushes cache to store later",
                    "store can lag behind",
                    "very high write rate and the store tolerates batching",
                ],
            ],
        },
        {
            kind: "diagram",
            caption:
                "Write-behind is the fastest and the only one that can lose writes — pick it deliberately",
            source: `flowchart TD
    W["Application receives a write"] --> S{"Which strategy?"}
    S -->|"Cache-aside"| CA["Write the store,<br/>then delete or refresh the key"]
    S -->|"Read-through"| RT["Store the write,<br/>invalidate so the next read reloads"]
    S -->|"Write-through"| WT["Write store and cache<br/>in one request, cache never ahead"]
    S -->|"Write-behind"| WB["Write cache, buffer,<br/>flush to store in batches"]
    CA --> TRADE["Trade: brief staleness,<br/>misses handled by your code"]
    WT --> TRADE2["Trade: one extra hop and<br/>write amplification per write"]
    WB --> TRADE3["Trade: possible data loss<br/>if the buffer dies unflushed"]`,
        },
        {
            kind: "card",
            title: "Stampede Protection",
            html:
                "<p>When one hot key expires, every concurrent request misses at the same instant and " +
                "they all hit the database together. A 20,000-instance fleet turns a single expiry into " +
                "a 20,000-query burst. Three defences, in order of preference:</p>" +
                "<ul>" +
                "<li><strong>Logical expiry</strong> — serve the stale value while a single background " +
                "task refreshes it. Users never see the miss.</li>" +
                "<li><strong>Single-flight</strong> — collapse concurrent misses for the same key " +
                "into one loader; everyone else waits on the same promise.</li>" +
                "<li><strong>TTL jitter</strong> — set TTL to <code>base &plusmn; 10%</code> so keys " +
                "populated together do not expire together.</li>" +
                "</ul>",
        },
        {
            kind: "diagram",
            caption:
                "Single-flight turns a thundering herd into one query — the cheapest and most effective fix",
            source: `flowchart TD
    R1["1000 concurrent requests<br/>for key K"] --> HIT{"Cache get K"}
    HIT -->|"expired"| SF{"Is a loader<br/>already in flight?"}
    SF -->|"yes"| WAIT["Wait on the same<br/>in-flight promise"]
    SF -->|"no"| LOAD["One request loads K<br/>from the database"]
    LOAD --> SET["Set K with jittered TTL"]
    SET --> FAN["All 1000 get the value"]
    WAIT --> FAN
    FAN -.->|"versus no protection"| BAD["1000 identical queries<br/>sweep the primary"]`,
        },
        {
            kind: "card",
            title: "Code: read-through with single-flight and jitter",
            html:
                '<pre><code class="language-javascript">const inFlight = new Map();\n' +
                "\n" +
                "async function getUser(id) {\n" +
                "    const cached = await redis.get('user:' + id);\n" +
                "    if (cached !== null) return JSON.parse(cached);        // fast path, no lock taken\n" +
                "\n" +
                "    const existing = inFlight.get(id);\n" +
                "    if (existing) return existing;                          // collapse the herd: join the in-flight load\n" +
                "\n" +
                "    const promise = (async () =&gt; {\n" +
                "        const row = await db.query('SELECT * FROM users WHERE id = $1', [id]);\n" +
                "        if (!row) {\n" +
                '            // Negative caching stops "key does not exist" probes from reaching the DB forever\n' +
                "            await redis.setex('user:' + id, 30, JSON.stringify(null));\n" +
                "            return null;\n" +
                "        }\n" +
                "        // Jitter so keys written together do not expire together\n" +
                "        const ttl = 300 + Math.floor(Math.random() * 60) - 30;\n" +
                "        await redis.setex('user:' + id, ttl, JSON.stringify(row));\n" +
                "        return row;\n" +
                "    })();\n" +
                "\n" +
                "    inFlight.set(id, promise);\n" +
                "    try {\n" +
                "        return await promise;\n" +
                "    } finally {\n" +
                "        inFlight.delete(id);                                // always clear, even on throw\n" +
                "    }\n" +
                "}\n" +
                "\n" +
                "// Invalidation is a delete, never a recompute: the next reader repopulates\n" +
                "async function onUserUpdated(user) {\n" +
                "    await redis.del('user:' + user.id);\n" +
                "    await redis.del('feed:' + user.id);                     // derived keys must go too\n" +
                "}</code></pre>\n" +
                "<p><strong>Line notes:</strong> the <code>finally</code> block matters — without it a " +
                "thrown query leaves a rejected promise cached in <code>inFlight</code> and every later " +
                "caller for that key gets the same failure forever. Negative caching is what stops an " +
                "attacker (or a typo) from generating infinite unique misses.</p>",
        },
        {
            kind: "table",
            title: "Capacity Math for a Cache Tier",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Database QPS avoided",
                    "14,000 RPS &times; (1 &minus; 0.92 hit rate)",
                    "&#8776; 1,120 QPS saved",
                ],
                [
                    "Miss load still hitting DB",
                    "14,000 &times; 0.08",
                    "&#8776; 1,120 QPS",
                ],
                [
                    "Hot working set",
                    "top 5% of objects carry ~80% of hits<br/>500K objects &times; 2 KB",
                    "&#8776; 1 GB",
                ],
                [
                    "Redis nodes",
                    "1 GB hot set / 10 GB per node, &times; 2 for replica",
                    "&#8776; 1–2 nodes, say 6 for HA",
                ],
                [
                    "Hit rate to target",
                    "0.90 saves 25% load; 0.99 saves 37%",
                    "diminishing returns",
                ],
                [
                    "Hit rate to expect",
                    "skewed data, keys too granular, no invalidation",
                    "often 0.30–0.60",
                ],
                [
                    "CPU saved",
                    "a 40 ms DB query replaced by a 0.3 ms cache read",
                    "&#8776; 130&times; faster p99",
                ],
                [
                    "Staleness budget",
                    "TTL 300 s at a 5% daily write rate per object",
                    "&#8776; 1% of keys stale at any instant",
                ],
            ],
        },
        {
            kind: "table",
            title: "Eviction and Expiry Policies",
            headers: ["Policy", "Idea", "Best for", "Failure mode"],
            rows: [
                [
                    "LRU / LFU",
                    "evict least recently / frequently used",
                    "general purpose, Redis defaults",
                    "LRU is scan-resistant but not access-pattern aware",
                ],
                [
                    "TTL",
                    "expire by age",
                    "data with a known staleness budget",
                    "mass expiry creates an avalanche",
                ],
                [
                    "Random / segmented LRU",
                    "evict from a random segment",
                    "scan-heavy workloads",
                    "higher miss rate than true LRU",
                ],
                [
                    "ARC",
                    "adapt LRU or LFU per access pattern",
                    "mixed workloads",
                    "more CPU, more bookkeeping",
                ],
                [
                    "Write-back / WAL",
                    "evict only clean keys, flush dirty first",
                    "large object caches",
                    "can pin dirty data forever",
                ],
            ],
        },
        {
            kind: "card",
            title: "Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>Cache stampede</strong> — mass simultaneous expiry. Single-flight plus " +
                "TTL jitter.</li>" +
                "<li><strong>Cache penetration</strong> — requests for keys that never exist bypass " +
                "every cache and always hit the DB. Negative caching, or a Bloom filter in front of " +
                "the lookup.</li>" +
                "<li><strong>Cache avalanche</strong> — a whole cache node or region restarts and the " +
                "entire key space misses at once. Warm caches before they rejoin, or serve stale on " +
                "error.</li>" +
                "<li><strong>Stale derived data</strong> — invalidating the object but not the list " +
                "that embeds it. Invalidate the whole key family or use versioned keys.</li>" +
                "<li><strong>Big keys</strong> — a 4 MB blob blocks the Redis event loop for every " +
                "client on that shard. Split it or cache a pointer.</li>" +
                "<li><strong>Cache stamp on a hot key</strong> — even at a 99% hit rate, 1% of 1M RPS " +
                "is 10,000 DB queries per second for that one key. That key needs its own tier.</li>" +
                "<li><strong>Serialization traps</strong> — timestamps in local time, floating-point " +
                "drift, and <code>JSON.parse</code> cost on every hit all quietly dominate p99. " +
                "Pre-serialize and benchmark the decode.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Cache-aside vs write-through — when do you choose which?",
                    a:
                        "<p>Cache-aside when most reads are much more frequent than writes: it adds zero " +
                        "cost to the write path and lets the cache serve many different readers. " +
                        "Write-through when the cache must be an exact mirror of the store and the " +
                        "write rate is low enough that the extra synchronous hop is affordable — it " +
                        "removes the miss path entirely and simplifies correctness.</p>",
                },
                {
                    q: "How do you handle a hot key expiring under heavy load?",
                    a:
                        "<p>Single-flight so only one request loads it, TTL jitter so the whole " +
                        "population does not expire together, and — for extreme keys — logical expiry, " +
                        "where you keep serving the slightly stale value while one background task " +
                        "refreshes it. Users never block on the miss.</p>",
                },
                {
                    q: "Your hit rate dropped from 95% to 40% overnight. Debug order?",
                    a:
                        "<p>Check whether the cache lost nodes (eviction or restart), whether TTLs " +
                        "changed, whether key cardinality grew so the working set no longer fits, and " +
                        "whether a deploy changed the serialization format so old entries fail to " +
                        "deserialize. Segment the hit rate by key prefix — it almost always identifies " +
                        "the culprit immediately.</p>",
                },
                {
                    q: "How big should the cache be?",
                    a:
                        "<p>Size it to the working set: the smallest amount of memory that holds the " +
                        "keys responsible for the hit rate you target. Measure access distribution, " +
                        "take the top 5% of keys, add 2&times; headroom, and divide by usable memory " +
                        "per node. Never size to total dataset size — that is how caches end up " +
                        "evicting everything and providing negative value.</p>",
                },
                {
                    q: "Does a cache help availability?",
                    a:
                        "<p>It can, and people underrate this: a healthy cache lets you serve most " +
                        "traffic while the database is down or degraded, which is a very common pattern " +
                        "for read-heavy sites. But it also introduces staleness during recovery, and a " +
                        "cold, empty cache after a restart is an availability event of its own.</p>",
                },
            ],
        },
    ],
});
