// src/content/sd-scalability.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-scalability",
    title: "Scalability",
    blocks: [
        {
            kind: "card",
            title: "🧠 Core Idea",
            html:
                "<p><strong>Scale up (vertical):</strong> buy a bigger machine — more cores, more RAM, " +
                "faster disk. <strong>Scale out (horizontal):</strong> add more machines behind a load " +
                "balancer and split both traffic and data across them.</p>" +
                "<p><strong>The invariant that makes horizontal scaling correct:</strong> " +
                "<b>any request can be served by any node</b>, so no node holds state that another node " +
                "needs. The moment an app tier keeps a session, a counter, or a file handle, that request " +
                "is pinned and adding nodes stops adding capacity.</p>" +
                "<p><strong>The invariant that makes vertical scaling run out:</strong> " +
                "<b>the ceiling is the largest SKU money can buy.</b> Past that point the only lever is " +
                "more nodes.</p>" +
                "<p>Real systems use both: scale vertically inside a single failure domain (fast, simple, " +
                "keeps transactions cheap) and horizontally across failure domains (bounded, redundant, " +
                "elastic).</p>",
        },
        {
            kind: "card",
            title: "🔀 Two Ways to Grow",
            html:
                "<p>Both paths give you more capacity. They differ in what breaks when you push on " +
                "them.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Vertical scaling raises one ceiling; horizontal scaling moves the ceiling out to the data tier",
            source: `flowchart TD
    REQ["Traffic arrives<br/>1 request at a time"] --> CHOICE{"Which lever<br/>do you pull first?"}
    CHOICE -->|"Scale up"| V["One bigger box<br/>64 cores, 512 GB RAM, NVMe"]
    CHOICE -->|"Scale out"| H["N identical boxes<br/>behind a load balancer"]
    V --> VC["Ceiling: biggest SKU<br/>plus a fat cloud bill"]
    H --> HC["Ceiling: shared state<br/>plus coordination bugs"]
    VC --> SWITCH["Hit the ceiling?<br/>Migrate the hot path to scale out"]
    HC --> SWITCH`,
        },
        {
            kind: "card",
            title: "🚧 Why Stateful Apps Block Scale-Out",
            html:
                "<p>In-memory session, in-process counter, uploaded file on local disk: all three pin a " +
                "user to one node. Autoscaling then behaves perversely — adding capacity does nothing " +
                "for the users who are pinned, and a node restart logs out everyone it owned.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Hoisting session state off the app tier is the single change that makes horizontal scaling work",
            source: `flowchart LR
    S1["Session state<br/>lives on Server 1"] --> S2["User pinned<br/>to Server 1"]
    S2 --> S3["Adding Server 2<br/>adds zero capacity for that user"]
    S1 -->|"Move state to a shared store"| T1["Stateless tier<br/>any node serves any request"]
    T1 --> T2["Autoscaling now<br/>actually adds capacity"]`,
        },
        {
            kind: "table",
            title: "📐 Back-of-Envelope Capacity Math",
            headers: ["Quantity", "How we get there", "Number"],
            rows: [
                [
                    "Daily requests",
                    "5M DAU &times; 4 sessions/day &times; 6 API calls/session",
                    "120M/day",
                ],
                ["Average RPS", "120M / 86,400 s", "&#8776; 1,390 RPS"],
                [
                    "Peak RPS",
                    "traffic is not flat: assume 10&times; the daily average",
                    "&#8776; 14,000 RPS",
                ],
                [
                    "Design target",
                    "peak &times; 3 for retries, deploys, and bursts",
                    "&#8776; 42,000 RPS",
                ],
                [
                    "In-flight requests",
                    "Little's Law: throughput &times; latency = 14,000 &times; 0.3 s",
                    "&#8776; 4,200",
                ],
                [
                    "App nodes needed",
                    "4,200 in flight / 200 per node at 300 ms",
                    "&#8776; 21, round to 40 for N+1 headroom",
                ],
                [
                    "Bandwidth",
                    "14,000 RPS &times; 8 KB avg payload",
                    "&#8776; 112 MB/s &asymp; 0.9 Gbps",
                ],
                [
                    "Primary data",
                    "5M users &times; 1.5 KB row &times; 3 for index overhead",
                    "&#8776; 23 GB",
                ],
                [
                    "Log volume",
                    "120M req/day &times; 5% sampled &times; 4 KB",
                    "&#8776; 24 GB/day &rarr; 8.6 TB/month",
                ],
            ],
        },
        {
            kind: "card",
            title: "🧾 Availability and the Error Budget",
            html:
                "<p>An availability target is really a budget for how many requests may fail. 99.9% " +
                "sounds excellent until you convert it: at a peak of 14,000 RPS, three nines lets you " +
                "burn roughly 120,000 failed requests per day. Four nines cuts that budget " +
                "10&times;.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Error-budget alerting turns a monthly availability number into a weekly decision",
            source: `flowchart TD
    SLO["Availability target<br/>for example 99.9 percent"] --> BUDGET["Error budget<br/>failed requests you may spend"]
    BUDGET --> OBS["Watch burn rate<br/>not just the monthly total"]
    OBS -->|"under 100 percent"| SHIP["Ship and deploy freely"]
    OBS -->|"over 100 percent"| FREEZE["Freeze risky changes<br/>spend the budget on reliability"]
    SHIP --> LOOP["Burn rate returns to normal"]
    FREEZE --> LOOP`,
        },
        {
            kind: "table",
            title: "⚖️ Vertical vs Horizontal Side by Side",
            headers: ["Dimension", "Scale up", "Scale out"],
            rows: [
                [
                    "Blast radius",
                    "Everything dies with one box",
                    "One node dies, the rest absorb traffic",
                ],
                [
                    "Cost curve",
                    "Linear to exponential as you chase bigger SKUs",
                    "Linear, and you can bid unused nodes away",
                ],
                [
                    "Network hop",
                    "None — one process",
                    "Adds RTT and a load-balancer hop on every call",
                ],
                [
                    "Transactions",
                    "Cheap: one writer, no coordination",
                    "Expensive: 2PC or partition the data",
                ],
                [
                    "Deploys",
                    "Short downtime, shared blast radius",
                    "Rolling or canary, no downtime",
                ],
                [
                    "Hard limit",
                    "The largest SKU on the market",
                    "Software bugs in state replication",
                ],
                [
                    "Good for",
                    "Databases, low-traffic early stage, tight data",
                    "Stateless services, high growth, blast-radius control",
                ],
            ],
        },
        {
            kind: "card",
            title: "🔍 Little's Law, the workhorse of every estimate",
            html:
                "<p><strong>L = &lambda; &times; W</strong> — the number of things concurrently in the " +
                "system equals the arrival rate multiplied by how long each thing takes. Every capacity " +
                "question in an interview reduces to this: <em>how many connections, threads, queue " +
                "slots, and buffers do I need?</em></p>" +
                "<p><strong>Worked trace:</strong> at 14,000 RPS with a 300 ms p99, roughly 4,200 " +
                "requests are in flight at any instant. If each holds a 32 KB in-process buffer that is " +
                "134 MB of live state — fine. Now fix a memory leak that grows the buffer to 3 MB per " +
                "request and the same maths needs 12.6 GB, which is exactly how a slow memory leak " +
                "becomes an outage that looks like a traffic spike.</p>" +
                "<p><strong>Pitfall:</strong> Little's Law uses <em>average</em> latency with " +
                "<em>average</em> throughput. Plugging in p99 &times; peak over-estimates; the practical " +
                "rule is to size for the <em>mean</em> number and then stress-test to the tail, because " +
                "concurrency is driven by the mean while memory spikes are driven by the tail.</p>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "What is the difference between scale-up and scale-out?",
                    a:
                        "<p>Scale-up makes one machine bigger; scale-out adds machines. Scale-out is " +
                        "preferred because it is bounded, redundant, and elastic, but it only works for " +
                        "stateless tiers and it pushes the hard problem down into sharding and " +
                        "replication. Scale-up is faster to execute and keeps transactions local, so real " +
                        "systems use it for the data tier and scale-out for the request tier.</p>",
                },
                {
                    q: "Your service leaks 2 MB per request. Traffic is 1,000 RPS at 400 ms average latency. What breaks?",
                    a:
                        "<p>Little's Law gives L = 1000 &times; 0.4 = 400 concurrent requests. At 2 MB " +
                        "per request that is 800 MB of live state. The container dies, the pod restarts, " +
                        "in-flight requests are lost, and the client retries — which adds load, which " +
                        "adds more leaked memory. This is the classic retry-amplified leak, and the fix " +
                        "is a bounded queue plus backpressure, not a bigger machine.</p>",
                },
                {
                    q: "When would you deliberately scale up instead of out?",
                    a:
                        "<p>When the work is stateful and coordination is the dominant cost — a single " +
                        "Postgres primary, a Redis leader, or a Kafka broker. Splitting those " +
                        "horizontally buys less than the coordination overhead costs. Also early in a " +
                        "product's life, when one well-tuned box is cheaper and far simpler than the " +
                        "operational surface of a distributed one.</p>",
                },
                {
                    q: "How do you make autoscaling actually work?",
                    a:
                        "<p>Remove state from the app tier first, then pick a signal that leads load — " +
                        "CPU over 30–60 s, or better, in-flight requests or queue depth. Scale on CPU and " +
                        "you react after the queue has already backed up. Always scale out before scale " +
                        "in to absorb the load, and configure a scale-down cooldown so flapping does not " +
                        "create a cold-start storm.</p>",
                },
                {
                    q: 'What does "scalable" mean when you say it in an interview?',
                    a:
                        "<p>That adding one more node adds roughly one node's worth of throughput with no " +
                        "change in correctness and no manual repartitioning. If adding a node requires a " +
                        "migration window, the system is not horizontally scalable — it is just " +
                        "replicated.</p>",
                },
            ],
        },
    ],
});
