// src/content/sd-load-balancing.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-load-balancing",
    title: "Load Balancing",
    blocks: [
        {
            // The legacy card body was an empty <div id="lb-viz"> filled in a
            // setTimeout with a static three-box layout. The boxes are captured
            // here as text; the legacy inline styles were rewritten to the new
            // app's theme classes because styles.css is no longer loaded.
            kind: "card",
            title: "🎬 Request Distribution",
            html:
                '<div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;">' +
                '<div style="padding:12px 16px;border-radius:8px;background:var(--c4);color:var(--c1i);">Server 1</div>' +
                '<div style="padding:12px 16px;border-radius:8px;border:1px solid var(--rule);">Server 2</div>' +
                '<div style="padding:12px 16px;border-radius:8px;border:1px solid var(--rule);">Server 3</div>' +
                "</div>" +
                '<p style="text-align:center;font-size:0.8rem;color:var(--muted);">Requests distributed across servers</p>',
        },
        {
            kind: "card",
            title: "🧠 Core Idea",
            html:
                "<p>A load balancer is a single logical entry point that decides, for every connection, " +
                "which server actually handles it. It exists for three reasons: " +
                "<strong>distribution</strong> so no server saturates first, <strong>health</strong> so " +
                "dead servers stop receiving traffic, and <strong>termination</strong> — TLS handshake, " +
                "compression, and request routing happen once in one place instead of N places.</p>" +
                "<p><strong>The invariant that keeps it correct:</strong> <b>a server is only allowed " +
                "back into the rotation after it has proven it can serve, and a server is ejected after " +
                "it is proven not to. Everything else — algorithm, tier, protocol — is a detail on top " +
                "of that loop.</p>",
        },
        {
            kind: "card",
            title: "🧭 Where the Decision Happens: L4 vs L7",
            html:
                "<p><strong>L4 (transport)</strong> balances TCP or UDP connections without reading the " +
                "payload. It is fast, protocol-agnostic, preserves the client IP, and cannot route on " +
                "path or headers — but every connection is pinned to one backend for its whole " +
                "life.</p>" +
                "<p><strong>L7 (application)</strong> reads HTTP and can route on host, path, header, " +
                "cookie, or JWT claim, terminate TLS in one place, cache and compress, and return a 503 " +
                "from the balancer itself. It costs more CPU per request and holds more state per " +
                "connection.</p>",
        },
        {
            kind: "diagram",
            caption:
                "L4 is cheap and opaque; L7 is expensive and can make routing decisions the client cannot",
            source: `flowchart TD
    CLI["Client connection"] --> DNS["Anycast IP or DNS answer<br/>resolves to the LB VIP"]
    DNS --> LAYER{"Which layer<br/>balances?"}
    LAYER -->|"L4 - TCP and UDP"| L4["Forward the byte stream<br/>pinned to one backend for life"]
    LAYER -->|"L7 - HTTP"| L7["Read host, path, header, cookie<br/>route, cache, compress, 503 early"]
    L4 --> POOL{"Backend pool"}
    L7 --> POOL
    POOL --> B1["Backend A"]
    POOL --> B2["Backend B"]
    POOL -.->|"backend unhealthy"| BYP["Return 503 from the LB<br/>instead of a 502 from nginx"]`,
        },
        {
            kind: "card",
            title: "🩺 The Health-Check Loop",
            html:
                "<p>Active checks probe a known endpoint; passive checks watch real traffic for failures. " +
                "Active finds a hung process before users do. Passive finds failures that only appear " +
                "under real load (bad arguments, slow DB, a leaking dependency) but needs traffic to " +
                "flow. Production systems run both: active to eject, passive to drain before the active " +
                "threshold is reached.</p>" +
                "<p>The three parameters that decide how well this behaves are the interval, the failure " +
                "threshold, and the cooldown. Too aggressive and a brief GC pause ejects a healthy " +
                "server and every remaining server gets hotter — a positive feedback loop that turns a " +
                "blip into an outage.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Failure threshold plus cooldown is the difference between shedding load and amplifying it",
            source: `flowchart TD
    SER["Server in the rotation"] --> CHECK{"Health check every 5 s<br/>timeout 1 s"}
    CHECK -->|"pass"| SER
    CHECK -->|"1 failure"| PASSIVE["Passive signal: errors or<br/>latency breach in real traffic"]
    PASSIVE --> COUNT{"Failure count<br/>reached threshold 3?"}
    COUNT -->|"no"| SER
    COUNT -->|"yes"| EJECT["Eject from the pool<br/>LB stops sending new connections"]
    EJECT --> COOL["Cooldown 30 s<br/>then re-probe gradually"]
    COOL --> CHECK
    EJECT -.->|"and answer requests with 503"| FAST["Fail fast at the edge<br/>instead of a 502 timeout"]`,
        },
        {
            kind: "table",
            title: "⚡ Algorithms",
            headers: ["Algorithm", "How it picks", "Good for", "Breaks when"],
            rows: [
                [
                    "Round-robin",
                    "Next server in the list",
                    "Homogeneous nodes, even request cost",
                    "One slow node gets its exact share of slow",
                ],
                [
                    "Least connections",
                    "Server with the fewest in-flight requests",
                    "Mixed request cost, long-lived connections",
                    "In-flight count ignores per-request latency",
                ],
                [
                    "Weighted round-robin",
                    "Round-robin by capacity weight",
                    "Nodes of different sizes",
                    "Weights drift as capacity changes",
                ],
                [
                    "IP or key hash",
                    "hash of client IP or session key",
                    "Session affinity without sticky cookies",
                    "Distribution skews with few clients",
                ],
                [
                    "Least response time",
                    "Lowest weighted latency + in-flight score",
                    "Cloud with heterogeneous instances",
                    "Sensitive to a single slow outlier",
                ],
                [
                    "Consistent hashing",
                    "Walk the ring clockwise from the key",
                    "Caches and DB shards, minimal remap on change",
                    "Poor key choice puts many keys on one node",
                ],
            ],
        },
        {
            kind: "card",
            title: "🔗 Consistent Hashing and Sticky Sessions",
            html:
                "<p>Sticky sessions buy cache locality at a price: when a server dies, 1/N of users " +
                "all land on the survivors at once. Consistent hashing makes that reshuffle " +
                "proportional — adding a 4th node to 3 moves roughly 1/4 of the keys, not all of " +
                "them. Virtual nodes (many points per physical node) smooth the ring so keys spread " +
                "evenly even when the node count is small.</p>" +
                "<p>Honest caveat: consistent hashing on the load balancer is <em>not</em> real failover " +
                "insurance. Health checks lag, in-flight requests on the dead node still die, and " +
                "sessions die with them. Use it to keep caches warm, and prefer stateless services plus " +
                "a shared session store so that node loss costs nothing.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Virtual nodes make the ring smooth; adding a node moves only its own slice of keys",
            source: `flowchart TD
    RING(("Hash ring 0 to 16383<br/>node A: 4 vnodes<br/>node B: 4 vnodes<br/>node C: 4 vnodes"))
    K1["key chat:42"] -->|"walk clockwise"| OWN1["owned by node C"]
    K2["key chat:43"] -->|"walk clockwise"| OWN2["owned by node A"]
    OWN2 --> ADD["Add node D<br/>only node D's slice moves"]
    ADD -->|"versus plain mod 4"| SKIP["Every key remaps<br/>cold cache everywhere"]`,
        },
        {
            kind: "table",
            title: "📐 Capacity Math and the LB Itself Is a SPOF",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                [
                    "Peak throughput",
                    "14,000 RPS from the scalability page",
                    "14,000 conn/s",
                ],
                [
                    "New conn/s per core",
                    "L4 roughly 50K, L7 with TLS roughly 8–15K",
                    "L7 needs &#8776; 1–2 cores for 14K",
                ],
                [
                    "Bandwidth, 1 Gbps NIC",
                    "1 Gbps = 125 MB/s; 14,000 &times; 8 KB",
                    "112 MB/s &rarr; 90% of one NIC",
                ],
                [
                    "conntrack table",
                    "2M entries &times; ~300 bytes",
                    "600 MB RAM, must be sized up front",
                ],
                [
                    "DNS TTL window",
                    "how long a dead VIP is still in caches",
                    "30–60 s TTL survives an LB failover",
                ],
                [
                    "Failover budget",
                    "3 nines = 52 min/year total",
                    "one LB restart must be well under that",
                ],
            ],
        },
        {
            kind: "card",
            title: "⚠️ Failure Modes and Pitfalls",
            html:
                "<ul>" +
                "<li><strong>Cascading failure / retry storm.</strong> When a node slows, clients " +
                "retry, the balancer routes those retries to the same slow cluster, and the healthy " +
                "nodes drown. Fix with retry budgets and exponential backoff with jitter on the " +
                "client.</li>" +
                "<li><strong>Keep-alive pinning.</strong> With a long-lived connection, one unhealthy " +
                "backend still serves thousands of requests until the idle timeout fires. Fix with " +
                "max-connections per backend plus a max-idle time.</li>" +
                "<li><strong>Health-check flapping.</strong> A check more aggressive than the " +
                "server's GC or warm-up time ejects servers in waves. Add a startup delay and a " +
                "ramp-up weight.</li>" +
                "<li><strong>Weighted drift.</strong> Static weights do not track a node whose CPU " +
                'throttling halves its real capacity, so "capacity weighted" quietly becomes "wrongly ' +
                'weighted".</li>' +
                "<li><strong>One LB is still a SPOF.</strong> Two instances behind a floating VIP or " +
                "anycast IP only help if the data path is active-active; active-passive leaves the " +
                "failover time in your error budget.</li>" +
                "<li><strong>DNS TTL trap.</strong> Clients cache the VIP. A 5-minute TTL means a " +
                "5-minute tail of traffic aimed at a dead load balancer after every deploy.</li>" +
                "</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "L4 or L7 — when do you pick which?",
                    a:
                        "<p>L4 for TCP/UDP services that need client IP preserved, need very high " +
                        "connection counts, or are not HTTP at all (databases, game servers, gRPC without " +
                        "routing). L7 for HTTP: path-based routing to /api vs /static, TLS termination " +
                        "in one place, per-route rate limits, compression, and being able to answer 503 " +
                        "before touching a backend. The tiebreaker is usually cost — L7 with TLS is " +
                        "CPU-bound around 10–20K requests per core.</p>",
                },
                {
                    q: "How do you keep one slow server from taking down the cluster?",
                    a:
                        "<p>Three layers: passive ejection on latency or error rate with a short " +
                        "window, a max-connections-per-backend cap so the slow server gets a bounded " +
                        "share, and client-side retry budgets with jitter so retries cannot all land on " +
                        "the survivors at once. Watch the failure count and latency together — an " +
                        "error-rate-only check misses a server that returns 200 with 10-second " +
                        "responses.</p>",
                },
                {
                    q: "Explain consistent hashing.",
                    a:
                        "<p>Map both nodes and keys onto a circle, find the key point, and walk " +
                        "clockwise to the first node. Rehash with remapping of only the keys in that " +
                        "node's range. Modulo hashing fails because adding a node remaps everything. " +
                        "Virtual nodes place many points per physical node to smooth the distribution " +
                        "when node counts are small.</p>",
                },
                {
                    q: "Sticky sessions: when are they justified?",
                    a:
                        "<p>When you cannot externalize session state and the cache-warming cost of a " +
                        "cold session exceeds the imbalance cost of stickiness. Otherwise they are a " +
                        "liability: an uneven load, a hard failover with 1/N of sessions gone, and " +
                        "cross-region traffic. Say out loud that the first thing to try is a shared " +
                        "session store.</p>",
                },
                {
                    q: "How would you load-balance a fleet of 100 nodes where requests cost wildly different amounts?",
                    a:
                        "<p>Least-connections or least-response-time, not round-robin — round-robin " +
                        "assumes every request costs the same, so a 50 ms request and a 5 s request get " +
                        "equal weight. Pair it with per-backend connection caps and weight updates " +
                        "driven by observed capacity rather than static config.</p>",
                },
                {
                    q: "The load balancer is at 70% CPU during peak. What do you do?",
                    a:
                        "<p>First identify whether it is L7 TLS termination (move to a cheaper path, " +
                        "offload to a CDN, or enable session reuse) or connection churn (raise " +
                        "keep-alive so handshakes amortize). Then scale LB instances horizontally and " +
                        "verify the LB tier itself is not now the new single point of failure.</p>",
                },
            ],
        },
    ],
});
