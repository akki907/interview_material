// src/renderers/systemDesign.ts
import { h, toast } from '../utils';
import { card, diagram, pipelineStages, lifecycleSteps, tableCard, qaCard } from '../components';

// ── 1. Scalability ───────────────────────────────────────────────────
export function renderSDScalability(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Scalability'));

    section.appendChild(card('🧠 Core Idea', `
        <p><strong>Scale up (vertical):</strong> buy a bigger machine — more cores, more RAM, faster disk.
        <strong>Scale out (horizontal):</strong> add more machines behind a load balancer and split both
        traffic and data across them.</p>
        <p><strong>The invariant that makes horizontal scaling correct:</strong>
        <b>any request can be served by any node</b>, so no node holds state that another node needs.
        The moment an app tier keeps a session, a counter, or a file handle, that request is pinned
        and adding nodes stops adding capacity.</p>
        <p><strong>The invariant that makes vertical scaling run out:</strong>
        <b>the ceiling is the largest SKU money can buy.</b> Past that point the only lever is more nodes.</p>
        <p>Real systems use both: scale vertically inside a single failure domain (fast, simple, keeps
        transactions cheap) and horizontally across failure domains (bounded, redundant, elastic).</p>
    `));

    section.appendChild(card('🔀 Two Ways to Grow', `
        <p>Both paths give you more capacity. They differ in what breaks when you push on them.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    REQ["Traffic arrives<br/>1 request at a time"] --> CHOICE{"Which lever<br/>do you pull first?"}
    CHOICE -->|"Scale up"| V["One bigger box<br/>64 cores, 512 GB RAM, NVMe"]
    CHOICE -->|"Scale out"| H["N identical boxes<br/>behind a load balancer"]
    V --> VC["Ceiling: biggest SKU<br/>plus a fat cloud bill"]
    H --> HC["Ceiling: shared state<br/>plus coordination bugs"]
    VC --> SWITCH["Hit the ceiling?<br/>Migrate the hot path to scale out"]
    HC --> SWITCH
`, 'Vertical scaling raises one ceiling; horizontal scaling moves the ceiling out to the data tier'));

    section.appendChild(card('🚧 Why Stateful Apps Block Scale-Out', `
        <p>In-memory session, in-process counter, uploaded file on local disk: all three pin a user to
        one node. Autoscaling then behaves perversely — adding capacity does nothing for the users who
        are pinned, and a node restart logs out everyone it owned.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart LR
    S1["Session state<br/>lives on Server 1"] --> S2["User pinned<br/>to Server 1"]
    S2 --> S3["Adding Server 2<br/>adds zero capacity for that user"]
    S1 -->|"Move state to a shared store"| T1["Stateless tier<br/>any node serves any request"]
    T1 --> T2["Autoscaling now<br/>actually adds capacity"]
`, 'Hoisting session state off the app tier is the single change that makes horizontal scaling work'));

    section.appendChild(tableCard('📐 Back-of-Envelope Capacity Math', ['Quantity', 'How we get there', 'Number'], [
        ['Daily requests', '5M DAU &times; 4 sessions/day &times; 6 API calls/session', '120M/day'],
        ['Average RPS', '120M / 86,400 s', '&#8776; 1,390 RPS'],
        ['Peak RPS', 'traffic is not flat: assume 10&times; the daily average', '&#8776; 14,000 RPS'],
        ['Design target', 'peak &times; 3 for retries, deploys, and bursts', '&#8776; 42,000 RPS'],
        ['In-flight requests', "Little's Law: throughput &times; latency = 14,000 &times; 0.3 s", '&#8776; 4,200'],
        ['App nodes needed', '4,200 in flight / 200 per node at 300 ms', '&#8776; 21, round to 40 for N+1 headroom'],
        ['Bandwidth', '14,000 RPS &times; 8 KB avg payload', '&#8776; 112 MB/s &asymp; 0.9 Gbps'],
        ['Primary data', '5M users &times; 1.5 KB row &times; 3 for index overhead', '&#8776; 23 GB'],
        ['Log volume', '120M req/day &times; 5% sampled &times; 4 KB', '&#8776; 24 GB/day &rarr; 8.6 TB/month'],
    ]));

    section.appendChild(card('🧾 Availability and the Error Budget', `
        <p>An availability target is really a budget for how many requests may fail. 99.9% sounds
        excellent until you convert it: at a peak of 14,000 RPS, three nines lets you burn
        roughly 120,000 failed requests per day. Four nines cuts that budget 10&times;.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    SLO["Availability target<br/>for example 99.9 percent"] --> BUDGET["Error budget<br/>failed requests you may spend"]
    BUDGET --> OBS["Watch burn rate<br/>not just the monthly total"]
    OBS -->|"under 100 percent"| SHIP["Ship and deploy freely"]
    OBS -->|"over 100 percent"| FREEZE["Freeze risky changes<br/>spend the budget on reliability"]
    SHIP --> LOOP["Burn rate returns to normal"]
    FREEZE --> LOOP
`, 'Error-budget alerting turns a monthly availability number into a weekly decision'));

    section.appendChild(tableCard('⚖️ Vertical vs Horizontal Side by Side', ['Dimension', 'Scale up', 'Scale out'], [
        ['Blast radius', 'Everything dies with one box', 'One node dies, the rest absorb traffic'],
        ['Cost curve', 'Linear to exponential as you chase bigger SKUs', 'Linear, and you can bid unused nodes away'],
        ['Network hop', 'None — one process', 'Adds RTT and a load-balancer hop on every call'],
        ['Transactions', 'Cheap: one writer, no coordination', 'Expensive: 2PC or partition the data'],
        ['Deploys', 'Short downtime, shared blast radius', 'Rolling or canary, no downtime'],
        ['Hard limit', 'The largest SKU on the market', 'Software bugs in state replication'],
        ['Good for', 'Databases, low-traffic early stage, tight data', 'Stateless services, high growth, blast-radius control'],
    ]));

    section.appendChild(card('🔍 Little\'s Law, the workhorse of every estimate', `
        <p><strong>L = &lambda; &times; W</strong> — the number of things concurrently in the system equals
        the arrival rate multiplied by how long each thing takes. Every capacity question in an interview
        reduces to this: <em>how many connections, threads, queue slots, and buffers do I need?</em></p>
        <p><strong>Worked trace:</strong> at 14,000 RPS with a 300 ms p99, roughly 4,200 requests are in
        flight at any instant. If each holds a 32 KB in-process buffer that is 134 MB of live state — fine.
        Now fix a memory leak that grows the buffer to 3 MB per request and the same maths needs 12.6 GB,
        which is exactly how a slow memory leak becomes an outage that looks like a traffic spike.</p>
        <p><strong>Pitfall:</strong> Little's Law uses <em>average</em> latency with <em>average</em>
        throughput. Plugging in p99 &times; peak over-estimates; the practical rule is to size for the
        <em>mean</em> number and then stress-test to the tail, because concurrency is driven by the mean
        while memory spikes are driven by the tail.</p>
    `));

    section.appendChild(qaCard([
        ['What is the difference between scale-up and scale-out?',
            'Scale-up makes one machine bigger; scale-out adds machines. Scale-out is preferred because it is bounded, redundant, and elastic, but it only works for stateless tiers and it pushes the hard problem down into sharding and replication. Scale-up is faster to execute and keeps transactions local, so real systems use it for the data tier and scale-out for the request tier.'],
        ['Your service leaks 2 MB per request. Traffic is 1,000 RPS at 400 ms average latency. What breaks?',
            'Little\'s Law gives L = 1000 &times; 0.4 = 400 concurrent requests. At 2 MB per request that is 800 MB of live state. The container dies, the pod restarts, in-flight requests are lost, and the client retries — which adds load, which adds more leaked memory. This is the classic retry-amplified leak, and the fix is a bounded queue plus backpressure, not a bigger machine.'],
        ['When would you deliberately scale up instead of out?',
            'When the work is stateful and coordination is the dominant cost — a single Postgres primary, a Redis leader, or a Kafka broker. Splitting those horizontally buys less than the coordination overhead costs. Also early in a product\'s life, when one well-tuned box is cheaper and far simpler than the operational surface of a distributed one.'],
        ['How do you make autoscaling actually work?',
            'Remove state from the app tier first, then pick a signal that leads load — CPU over 30–60 s, or better, in-flight requests or queue depth. Scale on CPU and you react after the queue has already backed up. Always scale out before scale in to absorb the load, and configure a scale-down cooldown so flapping does not create a cold-start storm.'],
        ['What does "scalable" mean when you say it in an interview?',
            'That adding one more node adds roughly one node\'s worth of throughput with no change in correctness and no manual repartitioning. If adding a node requires a migration window, the system is not horizontally scalable — it is just replicated.'],
    ]));

    container.appendChild(section);
}

export function renderSDLoadBalancing(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Load Balancing'));
    section.appendChild(card('🎬 Request Distribution', '<div class="viz-area" id="lb-viz"></div>'));

    section.appendChild(card('🧠 Core Idea', `
        <p>A load balancer is a single logical entry point that decides, for every connection, which
        server actually handles it. It exists for three reasons: <strong>distribution</strong> so no
        server saturates first, <strong>health</strong> so dead servers stop receiving traffic, and
        <strong>termination</strong> — TLS handshake, compression, and request routing happen once in
        one place instead of N places.</p>
        <p><strong>The invariant that keeps it correct:</strong> <b>a server is only allowed back into
        the rotation after it has proven it can serve, and a server is ejected after it is proven not to.
        Everything else — algorithm, tier, protocol — is a detail on top of that loop.</p>
    `));

    section.appendChild(card('🧭 Where the Decision Happens: L4 vs L7', `
        <p><strong>L4 (transport)</strong> balances TCP or UDP connections without reading the payload.
        It is fast, protocol-agnostic, preserves the client IP, and cannot route on path or headers —
        but every connection is pinned to one backend for its whole life.</p>
        <p><strong>L7 (application)</strong> reads HTTP and can route on host, path, header, cookie, or
        JWT claim, terminate TLS in one place, cache and compress, and return a 503 from the balancer
        itself. It costs more CPU per request and holds more state per connection.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    CLI["Client connection"] --> DNS["Anycast IP or DNS answer<br/>resolves to the LB VIP"]
    DNS --> LAYER{"Which layer<br/>balances?"}
    LAYER -->|"L4 - TCP and UDP"| L4["Forward the byte stream<br/>pinned to one backend for life"]
    LAYER -->|"L7 - HTTP"| L7["Read host, path, header, cookie<br/>route, cache, compress, 503 early"]
    L4 --> POOL{"Backend pool"}
    L7 --> POOL
    POOL --> B1["Backend A"]
    POOL --> B2["Backend B"]
    POOL -.->|"backend unhealthy"| BYP["Return 503 from the LB<br/>instead of a 502 from nginx"]
`, 'L4 is cheap and opaque; L7 is expensive and can make routing decisions the client cannot'));

    section.appendChild(card('🩺 The Health-Check Loop', `
        <p>Active checks probe a known endpoint; passive checks watch real traffic for failures. Active
        finds a hung process before users do. Passive finds failures that only appear under real load
        (bad arguments, slow DB, a leaking dependency) but needs traffic to flow. Production systems
        run both: active to eject, passive to drain before the active threshold is reached.</p>
        <p>The three parameters that decide how well this behaves are the interval, the failure
        threshold, and the cooldown. Too aggressive and a brief GC pause ejects a healthy server and
        every remaining server gets hotter — a positive feedback loop that turns a blip into an outage.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    SER["Server in the rotation"] --> CHECK{"Health check every 5 s<br/>timeout 1 s"}
    CHECK -->|"pass"| SER
    CHECK -->|"1 failure"| PASSIVE["Passive signal: errors or<br/>latency breach in real traffic"]
    PASSIVE --> COUNT{"Failure count<br/>reached threshold 3?"}
    COUNT -->|"no"| SER
    COUNT -->|"yes"| EJECT["Eject from the pool<br/>LB stops sending new connections"]
    EJECT --> COOL["Cooldown 30 s<br/>then re-probe gradually"]
    COOL --> CHECK
    EJECT -.->|"and answer requests with 503"| FAST["Fail fast at the edge<br/>instead of a 502 timeout"]
`, 'Failure threshold plus cooldown is the difference between shedding load and amplifying it'));

    section.appendChild(tableCard('⚡ Algorithms', ['Algorithm', 'How it picks', 'Good for', 'Breaks when'], [
        ['Round-robin', 'Next server in the list', 'Homogeneous nodes, even request cost', 'One slow node gets its exact share of slow'],
        ['Least connections', 'Server with the fewest in-flight requests', 'Mixed request cost, long-lived connections', 'In-flight count ignores per-request latency'],
        ['Weighted round-robin', 'Round-robin by capacity weight', 'Nodes of different sizes', 'Weights drift as capacity changes'],
        ['IP or key hash', 'hash of client IP or session key', 'Session affinity without sticky cookies', 'Distribution skews with few clients'],
        ['Least response time', 'Lowest weighted latency + in-flight score', 'Cloud with heterogeneous instances', 'Sensitive to a single slow outlier'],
        ['Consistent hashing', 'Walk the ring clockwise from the key', 'Caches and DB shards, minimal remap on change', 'Poor key choice puts many keys on one node'],
    ]));

    section.appendChild(card('🔗 Consistent Hashing and Sticky Sessions', `
        <p>Sticky sessions buy cache locality at a price: when a server dies, 1/N of users all land on
        the survivors at once. Consistent hashing makes that reshuffle proportional — adding a 4th node
        to 3 moves roughly 1/4 of the keys, not all of them. Virtual nodes (many points per physical
        node) smooth the ring so keys spread evenly even when the node count is small.</p>
        <p>Honest caveat: consistent hashing on the load balancer is <em>not</em> real failover
        insurance. Health checks lag, in-flight requests on the dead node still die, and sessions die
        with them. Use it to keep caches warm, and prefer stateless services plus a shared session
        store so that node loss costs nothing.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    RING(("Hash ring 0 to 16383<br/>node A: 4 vnodes<br/>node B: 4 vnodes<br/>node C: 4 vnodes"))
    K1["key chat:42"] -->|"walk clockwise"| OWN1["owned by node C"]
    K2["key chat:43"] -->|"walk clockwise"| OWN2["owned by node A"]
    OWN2 --> ADD["Add node D<br/>only node D's slice moves"]
    ADD -->|"versus plain mod 4"| SKIP["Every key remaps<br/>cold cache everywhere"]
`, 'Virtual nodes make the ring smooth; adding a node moves only its own slice of keys'));

    section.appendChild(tableCard('📐 Capacity Math and the LB Itself Is a SPOF', ['Quantity', 'Math', 'Number'], [
        ['Peak throughput', '14,000 RPS from the scalability page', '14,000 conn/s'],
        ['New conn/s per core', 'L4 roughly 50K, L7 with TLS roughly 8–15K', 'L7 needs &#8776; 1–2 cores for 14K'],
        ['Bandwidth, 1 Gbps NIC', '1 Gbps = 125 MB/s; 14,000 &times; 8 KB', '112 MB/s &rarr; 90% of one NIC'],
        ['conntrack table', '2M entries &times; ~300 bytes', '600 MB RAM, must be sized up front'],
        ['DNS TTL window', 'how long a dead VIP is still in caches', '30–60 s TTL survives an LB failover'],
        ['Failover budget', '3 nines = 52 min/year total', 'one LB restart must be well under that'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>Cascading failure / retry storm.</strong> When a node slows, clients retry, the
            balancer routes those retries to the same slow cluster, and the healthy nodes drown. Fix with
            retry budgets and exponential backoff with jitter on the client.</li>
            <li><strong>Keep-alive pinning.</strong> With a long-lived connection, one unhealthy backend
            still serves thousands of requests until the idle timeout fires. Fix with max-connections
            per backend plus a max-idle time.</li>
            <li><strong>Health-check flapping.</strong> A check more aggressive than the server's GC or
            warm-up time ejects servers in waves. Add a startup delay and a ramp-up weight.</li>
            <li><strong>Weighted drift.</strong> Static weights do not track a node whose CPU throttling
            halves its real capacity, so "capacity weighted" quietly becomes "wrongly weighted".</li>
            <li><strong>One LB is still a SPOF.</strong> Two instances behind a floating VIP or anycast
            IP only help if the data path is active-active; active-passive leaves the failover time in
            your error budget.</li>
            <li><strong>DNS TTL trap.</strong> Clients cache the VIP. A 5-minute TTL means a 5-minute
            tail of traffic aimed at a dead load balancer after every deploy.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['L4 or L7 — when do you pick which?',
            'L4 for TCP/UDP services that need client IP preserved, need very high connection counts, or are not HTTP at all (databases, game servers, gRPC without routing). L7 for HTTP: path-based routing to /api vs /static, TLS termination in one place, per-route rate limits, compression, and being able to answer 503 before touching a backend. The tiebreaker is usually cost — L7 with TLS is CPU-bound around 10–20K requests per core.'],
        ['How do you keep one slow server from taking down the cluster?',
            'Three layers: passive ejection on latency or error rate with a short window, a max-connections-per-backend cap so the slow server gets a bounded share, and client-side retry budgets with jitter so retries cannot all land on the survivors at once. Watch the failure count and latency together — an error-rate-only check misses a server that returns 200 with 10-second responses.'],
        ['Explain consistent hashing.',
            'Map both nodes and keys onto a circle, find the key point, and walk clockwise to the first node. Rehash with remapping of only the keys in that node\'s range. Modulo hashing fails because adding a node remaps everything. Virtual nodes place many points per physical node to smooth the distribution when node counts are small.'],
        ['Sticky sessions: when are they justified?',
            'When you cannot externalize session state and the cache-warming cost of a cold session exceeds the imbalance cost of stickiness. Otherwise they are a liability: an uneven load, a hard failover with 1/N of sessions gone, and cross-region traffic. Say out loud that the first thing to try is a shared session store.'],
        ['How would you load-balance a fleet of 100 nodes where requests cost wildly different amounts?',
            'Least-connections or least-response-time, not round-robin — round-robin assumes every request costs the same, so a 50 ms request and a 5 s request get equal weight. Pair it with per-backend connection caps and weight updates driven by observed capacity rather than static config.'],
        ['The load balancer is at 70% CPU during peak. What do you do?',
            'First identify whether it is L7 TLS termination (move to a cheaper path, offload to a CDN, or enable session reuse) or connection churn (raise keep-alive so handshakes amortize). Then scale LB instances horizontally and verify the LB tier itself is not now the new single point of failure.'],
    ]));

    container.appendChild(section);

    setTimeout(() => {
        const viz = document.getElementById('lb-viz');
        if (!viz) return;
        viz.innerHTML = `
            <div style="text-align:center;">
                <div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;">
                    <div style="padding:12px 16px;background:var(--bg-tertiary);border:1px solid var(--accent);border-radius:8px;color:var(--accent-light);">Server 1</div>
                    <div style="padding:12px 16px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;">Server 2</div>
                    <div style="padding:12px 16px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;">Server 3</div>
                </div>
                <div style="margin-top:12px;font-size:0.8rem;color:var(--text-muted);">Requests distributed across servers</div>
            </div>
        `;
    }, 100);
}

export function renderSDCaching(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Caching'));

    section.appendChild(card('🎬 Cache Flow', pipelineStages([
        { name: 'Client', desc: 'Request' },
        { name: 'Cache', desc: 'HIT → Response' },
        { name: 'Cache', desc: 'MISS → Database' },
        { name: 'Database', desc: 'Query + Store' },
    ], (_i, s) => toast(`Stage: ${s.name}`, 'info'))));

    section.appendChild(card('🧠 Core Idea', `
        <p>Caching trades freshness and memory for latency and load. You are not making the database
        faster — you are deciding how many requests the database never has to see.</p>
        <p><strong>The invariant that makes a cache correct:</strong> <b>a value that is read from a
        cache must be indistinguishable from a value that is read from the source of truth, or the
        staleness bound must be explicit and acceptable.</b> Everything else — tiering, eviction,
        invalidation — exists to keep that promise cheap.</p>
        <p>Three numbers describe any cache: the <strong>hit rate</strong> (how often it is used),
        the <strong>working set</strong> (how much must be resident to hit that rate), and the
        <strong>staleness bound</strong> (how wrong an answer may be). Optimize those three, not
        "add Redis".</p>
    `));

    section.appendChild(card('🏗️ The Cache Hierarchy', `
        <p>Layer the caches so each one absorbs the traffic of the layer below. The rule of thumb:
        put a cache as close to the requester as the data's staleness budget allows, and give the
        nearest cache the smallest, hottest slice of the data.</p>
        <table class="complexity-table">
            <tr><th>Tier</th><th>Typical latency</th><th>Scope</th><th>Serves</th></tr>
            <tr><td>L1 in-process</td><td>nanoseconds</td><td>one node</td><td>per-request memoization, hot config</td></tr>
            <tr><td>L2 shared cache</td><td>0.2–1 ms</td><td>one region</td><td>Redis or Memcached cluster</td></tr>
            <tr><td>CDN edge</td><td>10–50 ms</td><td>global</td><td>images, video, JS, whole pages</td></tr>
            <tr><td>Read-through proxy</td><td>adds one hop</td><td>global</td><td>caches any query, not just objects</td></tr>
            <tr><td>Source of truth</td><td>5–100 ms</td><td>global</td><td>the database</td></tr>
        </table>
    `));
    section.lastChild!.appendChild(diagram(`
sequenceDiagram
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
    end
`, 'Each tier absorbs the layer below it; a miss walks the whole ladder exactly once'));

    section.appendChild(card('✍️ Write Strategies', `
        <p>Read paths are easy to get right; write paths are where caches break. The four patterns
        differ in <em>who</em> writes the cache and <em>when</em> the source of truth is updated.</p>
        <table class="complexity-table">
            <tr><th>Strategy</th><th>Who writes cache</th><th>Consistency</th><th>Use when</th></tr>
            <tr><td>Cache-aside</td><td>the application, on read miss</td><td>eventual, window = TTL</td><td>default choice; cheapest, most tolerant</td></tr>
            <tr><td>Read-through</td><td>the cache itself loads on miss</td><td>eventual</td><td>you want miss logic in one place, not every caller</td></tr>
            <tr><td>Write-through</td><td>every write hits cache and store</td><td>cache never ahead</td><td>cache is a true replica; writes can afford the extra hop</td></tr>
            <tr><td>Write-behind</td><td>queue flushes cache to store later</td><td>store can lag behind</td><td>very high write rate and the store tolerates batching</td></tr>
        </table>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    W["Application receives a write"] --> S{"Which strategy?"}
    S -->|"Cache-aside"| CA["Write the store,<br/>then delete or refresh the key"]
    S -->|"Read-through"| RT["Store the write,<br/>invalidate so the next read reloads"]
    S -->|"Write-through"| WT["Write store and cache<br/>in one request, cache never ahead"]
    S -->|"Write-behind"| WB["Write cache, buffer,<br/>flush to store in batches"]
    CA --> TRADE["Trade: brief staleness,<br/>misses handled by your code"]
    WT --> TRADE2["Trade: one extra hop and<br/>write amplification per write"]
    WB --> TRADE3["Trade: possible data loss<br/>if the buffer dies unflushed"]
`, 'Write-behind is the fastest and the only one that can lose writes — pick it deliberately'));

    section.appendChild(card('💥 Stampede Protection', `
        <p>When one hot key expires, every concurrent request misses at the same instant and they all
        hit the database together. A 20,000-instance fleet turns a single expiry into a 20,000-query
        burst. Three defences, in order of preference:</p>
        <ul>
            <li><strong>Logical expiry</strong> — serve the stale value while a single background task
            refreshes it. Users never see the miss.</li>
            <li><strong>Single-flight</strong> — collapse concurrent misses for the same key into one
            loader; everyone else waits on the same promise.</li>
            <li><strong>TTL jitter</strong> — set TTL to <code>base &plusmn; 10%</code> so keys populated
            together do not expire together.</li>
        </ul>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    R1["1000 concurrent requests<br/>for key K"] --> HIT{"Cache get K"}
    HIT -->|"expired"| SF{"Is a loader<br/>already in flight?"}
    SF -->|"yes"| WAIT["Wait on the same<br/>in-flight promise"]
    SF -->|"no"| LOAD["One request loads K<br/>from the database"]
    LOAD --> SET["Set K with jittered TTL"]
    SET --> FAN["All 1000 get the value"]
    WAIT --> FAN
    FAN -.->|"versus no protection"| BAD["1000 identical queries<br/>sweep the primary"]
`, 'Single-flight turns a thundering herd into one query — the cheapest and most effective fix'));

    section.appendChild(card('💻 Code: read-through with single-flight and jitter', `
<pre><code class="language-javascript">const inFlight = new Map();

async function getUser(id) {
    const cached = await redis.get('user:' + id);
    if (cached !== null) return JSON.parse(cached);        // fast path, no lock taken

    const existing = inFlight.get(id);
    if (existing) return existing;                          // collapse the herd: join the in-flight load

    const promise = (async () =&gt; {
        const row = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        if (!row) {
            // Negative caching stops "key does not exist" probes from reaching the DB forever
            await redis.setex('user:' + id, 30, JSON.stringify(null));
            return null;
        }
        // Jitter so keys written together do not expire together
        const ttl = 300 + Math.floor(Math.random() * 60) - 30;
        await redis.setex('user:' + id, ttl, JSON.stringify(row));
        return row;
    })();

    inFlight.set(id, promise);
    try {
        return await promise;
    } finally {
        inFlight.delete(id);                                // always clear, even on throw
    }
}

// Invalidation is a delete, never a recompute: the next reader repopulates
async function onUserUpdated(user) {
    await redis.del('user:' + user.id);
    await redis.del('feed:' + user.id);                     // derived keys must go too
}</code></pre>
        <p><strong>Line notes:</strong> the <code>finally</code> block matters — without it a thrown
        query leaves a rejected promise cached in <code>inFlight</code> and every later caller for that
        key gets the same failure forever. Negative caching is what stops an attacker (or a typo) from
        generating infinite unique misses.</p>
    `));

    section.appendChild(tableCard('📐 Capacity Math for a Cache Tier', ['Quantity', 'Math', 'Number'], [
        ['Database QPS avoided', '14,000 RPS &times; (1 &minus; 0.92 hit rate)', '&#8776; 1,120 QPS saved'],
        ['Miss load still hitting DB', '14,000 &times; 0.08', '&#8776; 1,120 QPS'],
        ['Hot working set', 'top 5% of objects carry ~80% of hits<br/>500K objects &times; 2 KB', '&#8776; 1 GB'],
        ['Redis nodes', '1 GB hot set / 10 GB per node, &times; 2 for replica', '&#8776; 1–2 nodes, say 6 for HA'],
        ['Hit rate to target', '0.90 saves 25% load; 0.99 saves 37%', 'diminishing returns'],
        ['Hit rate to expect', 'skewed data, keys too granular, no invalidation', 'often 0.30–0.60'],
        ['CPU saved', 'a 40 ms DB query replaced by a 0.3 ms cache read', '&#8776; 130&times; faster p99'],
        ['Staleness budget', 'TTL 300 s at a 5% daily write rate per object', '&#8776; 1% of keys stale at any instant'],
    ]));

    section.appendChild(tableCard('🧮 Eviction and Expiry Policies', ['Policy', 'Idea', 'Best for', 'Failure mode'], [
        ['LRU / LFU', 'evict least recently / frequently used', 'general purpose, Redis defaults', 'LRU is scan-resistant but not access-pattern aware'],
        ['TTL', 'expire by age', 'data with a known staleness budget', 'mass expiry creates an avalanche'],
        ['Random / segmented LRU', 'evict from a random segment', 'scan-heavy workloads', 'higher miss rate than true LRU'],
        ['ARC', 'adapt LRU or LFU per access pattern', 'mixed workloads', 'more CPU, more bookkeeping'],
        ['Write-back / WAL', 'evict only clean keys, flush dirty first', 'large object caches', 'can pin dirty data forever'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>Cache stampede</strong> — mass simultaneous expiry. Single-flight plus TTL jitter.</li>
            <li><strong>Cache penetration</strong> — requests for keys that never exist bypass every cache
            and always hit the DB. Negative caching, or a Bloom filter in front of the lookup.</li>
            <li><strong>Cache avalanche</strong> — a whole cache node or region restarts and the entire
            key space misses at once. Warm caches before they rejoin, or serve stale on error.</li>
            <li><strong>Stale derived data</strong> — invalidating the object but not the list that
            embeds it. Invalidate the whole key family or use versioned keys.</li>
            <li><strong>Big keys</strong> — a 4 MB blob blocks the Redis event loop for every client on
            that shard. Split it or cache a pointer.</li>
            <li><strong>Cache stamp on a hot key</strong> — even at a 99% hit rate, 1% of 1M RPS is
            10,000 DB queries per second for that one key. That key needs its own tier.</li>
            <li><strong>Serialization traps</strong> — timestamps in local time, floating-point drift,
            and <code>JSON.parse</code> cost on every hit all quietly dominate p99. Pre-serialize and
            benchmark the decode.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['Cache-aside vs write-through — when do you choose which?',
            'Cache-aside when most reads are much more frequent than writes: it adds zero cost to the write path and lets the cache serve many different readers. Write-through when the cache must be an exact mirror of the store and the write rate is low enough that the extra synchronous hop is affordable — it removes the miss path entirely and simplifies correctness.'],
        ['How do you handle a hot key expiring under heavy load?',
            'Single-flight so only one request loads it, TTL jitter so the whole population does not expire together, and — for extreme keys — logical expiry, where you keep serving the slightly stale value while one background task refreshes it. Users never block on the miss.'],
        ['Your hit rate dropped from 95% to 40% overnight. Debug order?',
            'Check whether the cache lost nodes (eviction or restart), whether TTLs changed, whether key cardinality grew so the working set no longer fits, and whether a deploy changed the serialization format so old entries fail to deserialize. Segment the hit rate by key prefix — it almost always identifies the culprit immediately.'],
        ['How big should the cache be?',
            'Size it to the working set: the smallest amount of memory that holds the keys responsible for the hit rate you target. Measure access distribution, take the top 5% of keys, add 2&times; headroom, and divide by usable memory per node. Never size to total dataset size — that is how caches end up evicting everything and providing negative value.'],
        ['Does a cache help availability?',
            'It can, and people underrate this: a healthy cache lets you serve most traffic while the database is down or degraded, which is a very common pattern for read-heavy sites. But it also introduces staleness during recovery, and a cold, empty cache after a restart is an availability event of its own.'],
    ]));

    container.appendChild(section);
}

export function renderSDDatabases(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Databases'));

    section.appendChild(card('🧠 Core Idea', `
        <p>Choosing a database is choosing a data model, a consistency contract, and a scaling axis.
        There is no "NoSQL is faster" — there is "this access pattern scales better in this shape,
        at the cost of this guarantee".</p>
        <p><strong>The invariant:</strong> <b>the access pattern must be known before the data model
        is chosen.</b> A store that cannot serve your dominant query in O(1) will not be saved by
        adding nodes, and the fix always costs more than choosing correctly the first time.</p>
    `));

    section.appendChild(card('🧭 Picking the Right Data Model', `
        <p>Start from the guarantees you need and walk the tree. Most real systems end up polyglot —
        a relational system of record plus a cache or search index in front of it.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
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
    RANGE -->|"no"| DOC
`, 'The decision is driven by the access pattern and the consistency contract, not by fashion'));

    section.appendChild(tableCard('📊 Data Model Comparison', ['Model', 'Scales by', 'Strong at', 'Weak at', 'Examples'], [
        ['Relational', 'read replicas, then partitioning', 'multi-row ACID, joins, ad-hoc filters', 'single-writer write ceiling, cross-shard joins', 'Postgres, MySQL, Spanner'],
        ['Document', 'partitioning by shard key', 'whole-entity reads, flexible fields', 'cross-document queries, unbounded doc growth', 'MongoDB, DynamoDB'],
        ['Key-value', 'horizontal partitioning', 'point lookups, counters, sessions', 'anything that is not a point lookup', 'Redis, DynamoDB, Riak'],
        ['Wide-column', 'partition key, then clustering key', 'massive writes, time-series scans', 'multi-key queries, ad-hoc filters', 'Cassandra, HBase, Bigtable'],
        ['Graph', 'traverse edges instead of joining', 'multi-hop relationships, recommendations', 'bulk scans, high write throughput', 'Neo4j, Neptune'],
        ['Search / columnar', 'shards and segments', 'full-text, fuzzy match, OLAP aggregates', 'point writes, transactional updates', 'OpenSearch, ClickHouse'],
    ]));

    section.appendChild(card('⚡ Indexing', `
        <p>An index is a second copy of a subset of the data, ordered differently, so the database can
        find matching rows without scanning the table. Every index is a pure win for reads and a tax
        paid on every insert, update, and delete — plus extra memory and extra WAL traffic.</p>
        <p><strong>Why B-trees win:</strong> a B-tree has a high fan-out, so it is only 3–4 levels
        deep even for hundreds of millions of rows — meaning 3–4 page reads instead of a scan. That is
        true for both ranges and equality, which is why the same structure serves
        <code>WHERE created_at BETWEEN ...</code> and <code>WHERE id = ...</code>.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart LR
    ROW["One row<br/>e.g. an order"] --> NEED{"What does the<br/>query need?"}
    NEED -->|"equality on a column"| EQ["B-tree index on that column<br/>3 to 4 page reads for any table size"]
    NEED -->|"range or sort"| RANGE["B-tree preserves order<br/>same index serves ORDER BY and BETWEEN"]
    NEED -->|"exact key and no range"| HASH["Hash index<br/>O of 1 but useless for ranges"]
    NEED -->|"full-text or contains"| FULL["Inverted index GIN<br/>build is slow, writes get slower"]
    NEED -->|"two or more columns"| COMP["Composite index<br/>column order is the whole design"]
    COMP --> RULE["leftmost prefix rule:<br/>idx a,b,c serves a / a,b / a,b,c and nothing else"]
`, 'Composite index column order follows the query, not the table definition'));

    section.appendChild(tableCard('🗂️ Index Cheat Sheet', ['Index', 'Serves', 'Cost'], [
        ['B-tree', 'equality, ranges, ORDER BY, prefix matching on strings', 'write amplification on every mutation'],
        ['Hash', 'exact equality only', 'no ordering, no range scans'],
        ['Composite', 'multi-column predicates in prefix order', 'larger, more writes; wrong column order makes it useless'],
        ['Covering (INCLUDE)', 'index-only scans, no table lookup', 'wider index, more disk'],
        ['Partial', 'only rows matching a predicate', 'must be re-evaluated on every write'],
        ['Unique', 'enforces a constraint', 'one extra index to maintain'],
        ['Full-text (GIN)', 'MATCH, word search, arrays', 'slow to build, expensive writes'],
    ]));

    section.appendChild(card('💻 Code: composite index, covering select, and read the plan', `
<pre><code class="language-sql">-- Common mistake: two independent indexes. The planner must merge two B-trees
CREATE INDEX idx_orders_customer_created
    ON orders (customer_id, created_at DESC);


CREATE INDEX idx_orders_customer_covering
    ON orders (customer_id, created_at DESC) INCLUDE (status, total);

EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, created_at, status, total
FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC
LIMIT 50;</code></pre>
        <p><strong>What to read in the plan:</strong> a <code>Seq Scan</code> on a large table means the
        index is not being chosen — usually a type mismatch (<code>bigint</code> column compared against
        a <code>text</code> parameter) that silently disables the index, or a low-selectivity predicate
        where a scan is genuinely cheaper. <code>rows=1</code> is a lie caused by stale statistics;
        <code>ANALYZE</code> first.</p>
    `));

    section.appendChild(card('⚡ Transactions', `
        <p>ACID is the contract; <strong>isolation level</strong> is how strictly the database honours
        it, and it is a performance dial. Every level except serializable is defined by which anomalies
        it permits.</p>
        <table class="complexity-table">
            <tr><th>Level</th><th>Dirty read</th><th>Non-repeatable read</th><th>Phantom</th><th>Typical use</th></tr>
            <tr><td>Read uncommitted</td><td>yes</td><td>yes</td><td>yes</td><td>never, really</td></tr>
            <tr><td>Read committed</td><td>no</td><td>yes</td><td>yes</td><td>the Postgres default, most OLTP</td></tr>
            <tr><td>Repeatable read</td><td>no</td><td>no</td><td>yes</td><td>reports that aggregate several reads</td></tr>
            <tr><td>Serializable</td><td>no</td><td>no</td><td>no</td><td>financial ledgers, anything with invariants</td></tr>
        </table>
        <p><strong>Optimistic vs pessimistic:</strong> optimistic locking adds a version column and
        fails the update if the version moved — cheap when conflicts are rare. Pessimistic locking
        takes a <code>SELECT ... FOR UPDATE</code> up front — correct but it holds locks for the whole
        transaction and turns a concurrency problem into a queueing problem.</p>
    `));

    section.appendChild(card('💻 Code: optimistic concurrency in one round trip', `
<pre><code class="language-sql">UPDATE accounts
   SET balance = balance - $1,
       version = version + 1
 WHERE id = $2
   AND version = $3          -- expected version
   AND balance &gt;= $1;      -- and the business invariant, enforced by the engine

        <p>The <code>balance &gt;= $1</code> clause is the part people forget: it turns an
        application-level race into a database-enforced invariant, so a bug in a retry loop can never
        overdraw the account.</p>
    `));

    section.appendChild(tableCard('📐 Capacity Math', ['Quantity', 'Math', 'Number'], [
        ['Rows per shard', 'target 50M rows / 100 GB per shard', 'shards = total rows / 50M'],
        ['Index overhead', 'B-tree row roughly 30–60% of the heap', '&#8776; 1.5&times; total data on disk'],
        ['Row + 2 indexes', '1 KB heap + 0.6 KB + 0.6 KB', '&#8776; 2.2 KB per row'],
        ['WAL and bloat', 'updates rewrite the row version', '&#8776; 20–40% table bloat, budget for it'],
        ['Buffer pool', 'target a 99% hit ratio', 'size &#8776; working set, not whole dataset'],
        ['Writes per core', 'fsync-bound, roughly 1K–10K/s per node', 'shard when you pass 20–50K writes/s'],
        ['Read scaling', 'each replica doubles read capacity', '3 replicas = 3&times; reads, still 1&times; writes'],
        ['Connection pool', '20 per app node &times; 100 nodes', '2,000 &gt; per-process backend limit, use pgbouncer'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>N+1 queries</strong> — 1 query plus 1 per row. Invisible in dev, fatal in
            production. Use eager loading, a join, or a batched <code>IN</code> query.</li>
            <li><strong>Unbounded result sets</strong> — an endpoint with no LIMIT is a denial-of-service
            vector and an OOM. Always paginate, even for admin tools.</li>
            <li><strong>Missing or wrong indexes</strong> — including type mismatches that disable an
            index silently, and indexes on low-selectivity columns that the planner correctly ignores.</li>
            <li><strong>Long transactions</strong> — hold locks, bloat the table, block vacuum, and pin
            replication lag. Never open a transaction across a network call.</li>
            <li><strong>Connection pool exhaustion</strong> — 500 app nodes &times; 25 connections is
            12,500 connections; the database dies before the app does. Pool in the middle.</li>
            <li><strong>Schema changes that lock</strong> — a plain <code>ALTER TABLE</code> takes an
            exclusive lock. Use the online / concurrent path and expand-and-contract migrations.</li>
            <li><strong>Big batch jobs in the OLTP pool</strong> — reporting and backups share the same
            instance and steal the IO budget from user traffic.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['Relational or NoSQL — how do you decide in an interview?',
            'Ask two questions: does the workload need multi-row ACID transactions, and do you know the dominant access pattern? If yes to ACID and you join across entities, relational. If the access pattern is a single-key or single-entity read and you need to scale writes horizontally, a key-value or document store. Most honest answers pick relational for the system of record plus a cache or search index in front — and say why.'],
        ['How do you choose index columns?',
            'From the queries, in order. Read the actual WHERE and ORDER BY clauses, put equality columns first and the range or sort column last, then check the plan with EXPLAIN ANALYZE. Column order is leftmost-prefix, so idx(a,b,c) serves a, a,b, and a,b,c but not b alone. Every extra index costs write throughput, so justify each one.'],
        ['What is the difference between read committed and serializable?',
            'Read committed guarantees you never see an uncommitted change but each statement can see a newer snapshot, so two reads in one transaction can disagree. Serializable guarantees the whole transaction sees one consistent snapshot and behaves as if it ran alone — at the cost of aborting transactions that would have caused a serialization anomaly. In Postgres serializable uses SSI plus predicate locks and surfaces conflicts as serialization failures that must be retried.'],
        ['How would you fix a slow query?',
            'EXPLAIN ANALYZE first, not guess. Check for a Seq Scan on a large table, look for rows estimates that are wildly off (stale stats), confirm the index exists and matches the predicate including types, then look for sort or hash spills to disk. Only after that consider a covering index, a rewrite, or caching the result.'],
        ['How do you shard a relational database?',
            'Partition by a key that keeps the dominant query on one shard — tenant id, customer id, or a hash — then use native sharding or logical sharding in the app. Introduce the shard key into every primary key so cross-shard uniqueness is enforceable, and expect to pay for scatter-gather queries and cross-shard joins.'],
        ['Your primary is at 90% CPU on writes. What moves first?',
            'Read replicas take read load but do nothing for writes. For writes: batch and compress them, trim the write-amplifying indexes, move long analytical queries to a replica or a columnar store, and only then consider partitioning. Splitting shards mid-flight is the expensive answer and should be the last one.'],
    ]));

    container.appendChild(section);
}

export function renderSDReplication(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Replication'));

    section.appendChild(card('🧠 Core Idea', `
        <p>Replication keeps copies of the data so the system survives machine failure, serves reads
        from many places, and survives the loss of a whole failure domain. The cost is a consistency
        contract you must state explicitly.</p>
        <p><strong>The invariant:</strong> <b>there is exactly one place a write is accepted, unless
        you have deliberately chosen multi-leader or quorum semantics — and then the conflict
        resolution rule is part of the data model, not an afterthought.</b></p>
        <p>The second invariant people forget: <b>failover is the hard part.</b> A system that
        replicates beautifully and cannot promote a new leader in time is not highly available.</p>
    `));

    section.appendChild(card('⚡ Sync vs Async', `
        <ul>
            <li><strong>Synchronous</strong> — the leader waits for a replica to acknowledge before
            replying. Zero data loss on failover; write latency now includes the network round trip
            (often 1–5 ms within a region). One slow replica slows every write.</li>
            <li><strong>Asynchronous</strong> — the leader acknowledges immediately and replicates in
            the background. Lowest latency and highest availability; a hard failover can lose the last
            few seconds of writes.</li>
            <li><strong>Semi-synchronous</strong> — acknowledge once any replica has persisted the WAL,
            no need to wait for all. A middle ground used by MySQL and Postgres setups.</li>
        </ul>
        <p><strong>Working rule:</strong> synchronous inside a region where the RTT is bounded,
        asynchronous across regions where it is 50 ms and would dominate every write.</p>
    `));

    section.appendChild(tableCard('📋 Replication Topologies', ['Topology', 'Who accepts writes', 'Reads', 'Best for', 'Cost'], [
        ['Leader-follower', 'one leader only', 'leader or replicas', 'the 90% case: a clear owner', 'read/write asymmetry; one write hot spot'],
        ['Multi-leader', 'every node', 'any node', 'multi-region writes, offline merge', 'write-write conflicts, merge semantics'],
        ['Quorum', 'any node, needs R acks', 'needs R reads', 'coordination, config stores', 'quorum latency on every op'],
        ['Chain / cascaded', 'one leader per region', 'local replicas', 'cross-region read latency', 'a slow link stalls the whole chain'],
        ['Sync geographic', 'one global leader', 'local replicas', 'strong consistency globally', 'cross-ocean write latency'],
    ]));

    section.appendChild(card('🗺️ Topology Decision', `
        <p>Leader-follower is the default because it makes conflict resolution a non-issue. Reach for
        multi-leader only when the workload genuinely writes in several places — multi-region users,
        mobile devices offline for days. Reach for quorums when the data is small, coordination is
        already the norm, and you need linearizable reads and writes across the cluster.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    W["A write arrives"] --> TOPO{"Which replication<br/>topology?"}
    TOPO -->|"Leader-follower"| LF["Single leader serialises writes<br/>replicas serve reads only"]
    TOPO -->|"Multi-leader"| ML["Every node accepts writes<br/>last-write-wins or CRDT merge"]
    TOPO -->|"Quorum"| QM["Any node accepts a write<br/>but needs R of N acknowledgements"]
    LF --> LFC["Cost: write hot spot on one node,<br/>reads may be stale"]
    ML --> MLC["Cost: write-write conflicts,<br/>every merge rule must be designed"]
    QM --> QMC["Cost: latency of the slowest<br/>quorum on every operation"]
`, 'The topology is a decision about where writes are allowed to be accepted'));

    section.appendChild(card('🔁 Leader Failover, Step by Step', `
        <p>The state machine below is the part that actually determines availability: detect, elect,
        catch up, serve. Total time is the detection window plus the election window plus the catch-up
        time — and every one of those has a cost you must budget.</p>
    `));
    section.lastChild!.appendChild(diagram(`
stateDiagram-v2
    [*] --> Leading
    Leading --> LeaderLost: "process dies or heartbeat misses"
    LeaderLost --> Electing: "election timeout expires, 1.5 s"
    Electing --> NewLeader: "majority of 3 acks, term plus 1"
    Electing --> Electing: "split vote, retry with jitter"
    NewLeader --> CatchingUp: "stream WAL from the most advanced replica"
    CatchingUp --> Serving: "lag below threshold, replay caught up"
    Serving --> LeaderLost: "leader dies again"
    Serving --> [*]
`, 'Detection + election + catch-up is the real failover budget — not just the election'));

    section.appendChild(card('💻 Code: read-your-writes with a version token', `
<pre><code class="language-javascript">// The client sends the last version it successfully observed.
async function readOrders(customerId, minVersion) {
    if (minVersion == null) {
        return replica.query(FROM_ORDERS, [customerId]);   // fast path: stale is fine
    }

    // Read-your-own-writes: pick a replica whose applied position has caught up.
    const deadline = Date.now() + READ_YOUR_WRITES_MS;    // bound the wait, e.g. 500 ms
    while (Date.now() &lt; deadline) {
        const node = pickReplicaWithPosition(customerId, minVersion);
        if (node) {
            return node.query(FROM_ORDERS, [customerId]);  // guarantee honoured
        }
        await sleep(25);
    }

    // Fall back to the primary rather than hang: show possibly-stale data
    // instead of an error the user cannot act on.
    return primary.query(FROM_ORDERS, [customerId]);
}</code></pre>
        <p><strong>Alternatives and when to use them:</strong> sticky routing to the leader (simple,
        costs locality), a read-your-writes timestamp with the clock shared over NTP (cheap, breaks
        under clock skew), or routing the write itself through a token. All of them are heuristics;
        say that out loud in an interview.</p>
    `));

    section.appendChild(tableCard('📐 Capacity Math and Replication Lag', ['Quantity', 'Math', 'Number'], [
        ['Replication lag at 1 byte/s', '1 byte/s &times; 1 s = 1 byte behind', 'async: measurable staleness'],
        ['Lag at 10 MB/s of writes', '10 MB/s &times; 1 s of backlog', '&#8776; 10 MB and 100K rows behind'],
        ['Read amplification', '1 leader + 4 replicas', 'reads scale 5&times;, writes do not'],
        ['Sync write cost', 'leader fsync + network RTT + replica fsync', '&#8776; 1–5 ms extra in-region'],
        ['Cross-region sync cost', 'RTT us-east to eu-west', '&#8776; 70 ms — usually unacceptable'],
        ['WAL per write', '1 KB row &times; 3&times; amplification', '&#8776; 3 KB per write to ship'],
        ['Single-leader write ceiling', 'fsync-bound, high-end hardware', '&#8776; 20K–50K writes/s per leader'],
        ['Failover budget at 3 nines', '52 min/year total downtime allowed', 'detection 1 s + election 2 s + catch-up 5 s'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>Split brain</strong> — two leaders both accepting writes. Prevent with
            fencing tokens, a lease that expires, or consensus; never with a DNS flip.</li>
            <li><strong>Silent data loss on async failover</strong> — the new leader never had the last
            writes. Bound the exposure by measuring replication lag as an SLO and alerting on it.</li>
            <li><strong>Lag spikes from bulk work</strong> — a large UPDATE or a schema migration
            generates WAL that floods replication and stalls reads. Chunk batch jobs.</li>
            <li><strong>Read your writes violations</strong> — a write to the leader followed by a read
            from a lagging replica. Use the version token above or sticky routing.</li>
            <li><strong>Synchronous replica in another region</strong> — one bad link turns every write
            into a 200 ms operation, or a write outage.</li>
            <li><strong>Failover flapping</strong> — an underprovisioned new leader immediately
            overloaded, killed, and rolled back. Always give the promoted node time to warm caches
            before returning it to rotation.</li>
            <li><strong>Cross-region reads served locally but written globally</strong> — users see
            their own write vanish for seconds. Pick your consistency model per feature, deliberately.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['Synchronous or asynchronous replication?',
            'Synchronous within a region where the RTT is 1–5 ms and losing writes is unacceptable — payments, orders, anything with an invariant. Asynchronous across regions, where 50–70 ms per write is unacceptable and you accept a bounded staleness window that you then measure as an SLO. Semi-synchronous is a reasonable middle: durable on at least one replica, no wait for all.'],
        ['How fast can you fail over?',
            'Detection (heartbeat timeout, typically 1–3 s) + election (quorum round trip, ~RTT) + catch-up of the new leader to the last committed position (can be seconds if it fell behind). Be explicit that the last term dominates and that catching up is skipped in practice — the new leader is usually chosen because it is the most advanced replica.'],
        ['How do you prevent split brain?',
            'Only one node may hold a valid lease or term, and any resource it touches must be fenced — a monotonically increasing epoch, a fencing token checked by the resource, or storage-layer ownership. Time-based leases are only safe if clocks are bounded, so use consensus where you cannot control the resource.'],
        ['Multi-leader replication: how do you resolve conflicts?',
            'Last-write-wins with a timestamp is the cheap default and is fine for independent keys. For the same key, you need something real: a per-field merge, a CRDT for sets and counters, or an application-level conflict handler. The key insight is that conflict resolution must be designed with the data model, because it becomes the schema.'],
        ['How do you handle read-your-writes?',
            'Simplest is sticky routing to the leader. More precise is a version token: the client echoes the last version it saw, and we route to a replica that has applied at least that version, waiting up to a bounded timeout and falling back to the primary. Sticky sessions are cheap but break on failover.'],
        ['Reads are 90% of traffic. How do you scale them?',
            'Add replicas — each roughly doubles read capacity — and put a cache in front for the repeat readers. Measure the hit rate and the tail, not just the average. If reads are the only problem, replication plus caching scales very far before sharding becomes necessary.'],
    ]));

    container.appendChild(section);
}

export function renderSDSharding(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Sharding'));

    section.appendChild(card('🧠 Core Idea', `
        <p>Sharding splits one logical dataset across many physical stores so each holds a slice.
        Unlike replication, which multiplies copies of the <em>whole</em> dataset, sharding partitions
        it — this is the only way to scale writes beyond one machine's fsync ceiling.</p>
        <p><strong>The invariant:</strong> <b>the shard key must be present in the primary key and in
        every query you care about</b>, so the overwhelming majority of requests touch exactly one
        shard. Get the shard key right and sharding is invisible; get it wrong and it is an
        operational tax you pay forever.</p>
    `));

    section.appendChild(tableCard('🗂️ Sharding Strategies', ['Strategy', 'How keys map', 'Great for', 'Breaks when'], [
        ['Hash', 'hash of the shard key mod N, or consistent hashing', 'evenly distributed, uniform keys', 'range scans become scatter-gather; hot tenants'],
        ['Range', 'key ranges, e.g. by time or ID band', 'range queries, time-series, append-heavy', 'a monotonically increasing key lands everything on the newest shard'],
        ['Directory', 'a lookup service maps key to shard', 'keys need to move, tenants need pinning', 'the directory becomes a critical, stateful service'],
        ['Geo / zone', 'user, tenant, or region affinity', 'data residency, latency, local reads', 'uneven region sizes and cross-region writes'],
        ['Graph-aware', 'neighbours colocated', 'traversals, recommendations', 'rebalancing becomes graph partitioning'],
    ]));

    section.appendChild(card('🔗 Consistent Hashing with Virtual Nodes', `
        <p>Modulo hashing (<code>shard = hash(id) % N</code>) is the trap: change N and
        <em>every</em> key moves, so a resize is a full data migration and a total cache flush.
        Consistent hashing moves only 1/N of the keys. Virtual nodes solve the distribution problem:
        with 3 physical nodes and one point each, 40% of keys can land on one node by luck; with 160
        points each, the spread is tight.</p>
        <p><strong>Variants:</strong> rendezvous (highest-random-weight) hashing gives the same
        minimal-movement property with no ring to keep in sync and a cheap "which server owns this
        key" query — the modern default for Memcached-style sharding.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    RING(("Ring 0 to 16383<br/>3 nodes &times; 160 vnodes = 480 points"))
    K1["key user:9"] -->|"walk clockwise"| N1["node C owns it"]
    K2["key user:10"] -->|"walk clockwise"| N2["node A owns it"]
    K3["key user:11"] -->|"walk clockwise"| N3["node B owns it"]
    N3 --> GROW["Add node D<br/>it claims 1/4 of the ring"]
    GROW -.->|"versus mod 4"| SKIP["Modulo: 100 percent of keys<br/>move, full cache flush"]
    GROW --> MOVE["Only keys in D's arc move,<br/>~1/4 of traffic, resumable"]
`, 'Virtual nodes smooth the ring so the load is even even with a handful of machines'));

    section.appendChild(card('🔄 Online Rebalancing', `
        <p>Adding a shard is a migration, and migrations fail when done naively. The safe sequence is
        <strong>expand</strong> (create capacity, keep serving), <strong>backfill</strong> (copy data
        while serving both), <strong>cut over</strong> (switch reads gradually), <strong>contract</strong>
        (remove the old copies). At no point do you take a write outage.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    M0["Shard map v1<br/>4 shards, each at 90 percent full"] --> WARN{"Disk or QPS<br/>above 70 percent?"}
    WARN -->|no| M0
    WARN -->|"yes"| S1["1 Announce map v2<br/>dual-write affected keys to both shards"]
    S1 --> S2["2 Backfill new shards<br/>throttled copy, at reduced replica rate"]
    S2 --> S3["3 Verify per key<br/>checksum and row count"]
    S3 --> S4{"All keys match?"}
    S4 -->|"no"| S2
    S4 -->|"yes"| S5["4 Cut reads over<br/>1 percent at a time, watch p99"]
    S5 --> S6["5 Stop dual write<br/>drain and delete the old shard"]
`, 'Dual write then backfill then cut over — the only migration order that never blocks writes'));

    section.appendChild(card('🔥 Hot Shards and Hot Keys', `
        <p>The average is a lie: with a hash of a tenant ID, one whale tenant can be 100&times; the
        median shard. Detection is straightforward — shard-level QPS or disk is not flat — and the
        remedies are, in order of preference:</p>
        <ul>
            <li><strong>Split the hot shard only</strong> — logical shards per tenant, so one tenant can
            occupy many physical shards.</li>
            <li><strong>Add a second-level hash</strong> — <code>shard = hash(tenant) then hash(item)</code>,
            so a single tenant spreads across its own shards.</li>
            <li><strong>Promote hot data to cache</strong> or to a separate read store entirely.</li>
            <li><strong>Rewrite the key</strong> — prefix a counter or bucket number into the key so
            the distribution is fixed at write time.</li>
        </ul>
    `));

    section.appendChild(card('💻 Code: shard-key-aware lookup and cross-shard fan-out', `
<pre><code class="language-javascript">// The shard key is derivable from the request, so routing needs no directory service.
function shardFor(tenantId) {
    return ring.ownerOf(hash32(tenantId));   // walk clockwise from hash to the next vnode point
}

// Point read: one shard, no scatter
async function getOrder(tenantId, orderId) {
    return db(shardFor(tenantId)).orders.findUnique({ where: { id: orderId } });
}

// The query below has no shard key in the predicate, so it MUST fan out.
// Aggregate at the shard, not in the app, or you ship 100x the rows.
async function totalSpendForUser(userId) {
    // 1. Which tenants does this user belong to? (small, cached)
    const tenantIds = await tenantIndex.forUser(userId);       // usually 1, sometimes a few
    const perTenant = await Promise.all(
        tenantIds.map(id =&gt; db(shardFor(id)).orders.aggregate({ _sum: { total: true }, where: { userId } }))
    );
    return perTenant.reduce((sum, r) =&gt; sum + r._sum.total, 0);   // 1 row per tenant, not 1 per order
}

// Scatter-gather with a cap: a cross-shard query must never be unbounded
async function crossShardSearch(query) {
    const shards = ring.allOwners();
    return Promise.all(shards.map(s =&gt; db(s).search(query, { limit: 10 })));
}</code></pre>
        <p><strong>Line notes:</strong> pushing the aggregation into each shard is what keeps a
        cross-shard query from shipping millions of rows to the app tier. The fan-out is unbounded by
        nature — a 1,000-shard cluster means 1,000 concurrent queries — so it needs its own timeout,
        concurrency limit, and a circuit breaker.</p>
    `));

    section.appendChild(tableCard('📐 Capacity Math', ['Quantity', 'Math', 'Number'], [
        ['Data per shard', 'target 100 GB or 50M rows per shard', '1 TB dataset = 10 shards'],
        ['QPS per shard', 'peak 42,000 / 32 shards', '&#8776; 1,300 QPS per shard'],
        ['Growth headroom', 'shard count must cover 12–18 months', 'start with 2&times; the shards you need today'],
        ['Reshard data moved', '1/32 of the dataset if you add one shard', '&#8776; 31 GB to copy'],
        ['Copy window', '31 GB at 200 MB/s throttled', '&#8776; 3 minutes of copy, hours of verification'],
        ['Cross-shard query cost', '1 aggregate per shard', '32 round trips = 32 &times; p50 — always parallel'],
        ['Whale tenant ratio', 'largest tenant = 10 percent of traffic', 'needs its own logical shards'],
        ['Replica cost', 'each shard &times; 2 replicas &times; 32 shards', '96 shards of paid disk'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>Hot shard</strong> — one tenant or one key dominating. Monitor per-shard QPS and
            bytes, not averages.</li>
            <li><strong>Resharding stalls</strong> — a migration that runs at full speed starves the
            primary of IO and turns a background job into an outage. Always throttle and lower the
            replica rate during backfill.</li>
            <li><strong>Cross-shard joins in the hot path</strong> — a request that fans out to 32
            shards has 32 chances to be slow. Move it to a read replica, a cache, or a denormalised
            copy.</li>
            <li><strong>Shard count as a permanent decision</strong> — pick a scheme (rendezvous, or a
            directory) that supports growth without renumbering everything.</li>
            <li><strong>Shard key missing from the primary key</strong> — uniqueness becomes
            unenforceable and duplicates appear. Include the shard key in every PK.</li>
            <li><strong>Unbalanced hash from non-uniform keys</strong> — sequential IDs hashed into a
            small keyspace cluster badly. Add a seed or a virtual-node layer.</li>
            <li><strong>Cascade of retries across shards</strong> — a partial failure triggers retries
            that amplify load on the healthy shards. Bound retries per shard, not per request.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['How do you choose a shard key?',
            'It must be the key the dominant query filters on, must have high cardinality and even distribution, and must not leak across shards on hot paths. Then check three things: is it present in every primary key, is it stable for the life of the object, and does one customer dominate? Tenant or user ID is the usual answer, but it fails when one tenant is 10% of traffic — that is when you add a second-level hash so a tenant spans its own logical shards.'],
        ['Why not just modulo hashing?',
            'Because N is baked into every key. Doubling from 4 to 8 moves essentially every key, so a resize becomes a full offline migration plus a total cache flush. Consistent hashing moves only 1/N of keys, and with virtual nodes the load stays even. Rendezvous hashing gives the same property without a ring to keep in sync.'],
        ['How do you rebalance without downtime?',
            'Expand-and-contract: announce a new shard map and dual-write, backfill the new shards at a throttled rate, verify checksums and row counts per key, cut reads over gradually in small percentages while watching p99 and error rate, then stop the dual write and drain the old shards. Every step is reversible until the final one.'],
        ['How do you handle a query that must touch every shard?',
            'Push computation down: run the filter and aggregate on each shard, return only partial results, and merge in the app or in a dedicated scatter-gather service. Fan out in parallel with a global deadline, cap the concurrency, and serve the result from a cache or a denormalised read model so the expensive path is off the hot path.'],
        ['Sharding versus replication — what do I use first?',
            'Replication first. It is far simpler and it scales reads linearly with zero downside to writes. Shard only when the single write leader saturates or the dataset no longer fits on one machine. Many systems need neither: caching plus a faster index often buys a year.'],
        ['How do you test a sharding scheme?',
            'Measure the distribution with a real or synthetic key histogram before committing — the answer is almost never uniform. Then simulate a reshard end to end, including the dual-write window and a mid-migration crash, because that is the code path that only runs during incidents.'],
    ]));

    container.appendChild(section);
}

export function renderSDQueues(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Messaging & Queues'));
    section.appendChild(card('🎬 Producer/Consumer', '<div class="viz-area"><div style="display:flex;align-items:center;justify-content:center;gap:24px;"><div style="padding:12px 20px;background:var(--bg-tertiary);border-radius:8px;"><strong>Producer</strong></div><div style="font-size:1.5rem;">→</div><div style="padding:12px 20px;background:var(--accent);border-radius:8px;color:white;"><strong>Queue / Kafka</strong></div><div style="font-size:1.5rem;">→</div><div style="padding:12px 20px;background:var(--bg-tertiary);border-radius:8px;"><strong>Consumer</strong></div></div></div>'));

    section.appendChild(card('🧠 Core Idea', `
        <p>A queue decouples the rate at which work is produced from the rate at which it can be
        processed. That single property gives you load smoothing (bursts get absorbed), load levelling
        (slow consumers do not back-pressure producers), and failure isolation (a downstream outage
        becomes a growing backlog instead of a failing request).</p>
        <p><strong>The invariant:</strong> <b>every message must be safe to process more than once.</b>
        Anything less — an in-flight crash between "handled" and "acked", a visibility-timeout expiry,
        a consumer rebalance — delivers a duplicate. If duplicates break your system, the bug is in
        the consumer, not the broker.</p>
    `));

    section.appendChild(tableCard('📨 Delivery Semantics', ['Semantics', 'What the broker promises', 'Duplicates', 'What you must build'], [
        ['At-most-once', 'ack before processing', 'none, messages can be lost', 'accept loss; use for metrics, sampling'],
        ['At-least-once', 'ack after processing', 'possible on crash', 'idempotent consumers, dedupe keys'],
        ['Exactly-once', 'atomic enqueue and process in one log', 'none', 'transactions enabled, still build for replay'],
    ]));

    section.appendChild(card('🔁 At-Least-Once, Made Effectively-Once', `
        <p>"Exactly-once delivery" does not exist across a network. What exists is <em>at-least-once
        delivery plus an idempotent consumer</em>, which is what every real payment or order pipeline
        does. The idempotency key is written in the <em>same database transaction</em> as the state
        change — that single fact is what makes it correct.</p>
    `));
    section.lastChild!.appendChild(diagram(`
sequenceDiagram
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
    end
`, 'Idempotency key and side effect in one transaction: duplicates become no-ops, not double charges'));

    section.appendChild(card('💻 Code: idempotent consumer with bounded retries', `
<pre><code class="language-javascript">async function handle(message) {
    // 1. Dedupe key lives in the same transaction as the side effect.
    const existing = await db.processedMessages.findUnique({ where: { id: message.id } });
    if (existing) return;                       // already applied, ack immediately

    try {
        await db.transaction(async (tx) =&gt; {
            await tx.processedMessages.create({ id: message.id });   // unique constraint does the work
            await tx.orders.update({ where: { id: message.orderId }, data: { status: 'CONFIRMED' } });
        });
        await ack(message);
    } catch (err) {
        if (err.isTransient) {
            // 2. Transient: nack with a delay so the retry does not spin.
            await nackWithDelay(message, Math.min(60_000, 2 ** message.attempt * 1000));
        } else {
            // 3. Poison message: do not block the partition forever.
            await db.deadLetters.create({ data: { message, reason: err.message } });
            await ack(message);
        }
    }
}</code></pre>
        <p><strong>Line notes:</strong> the unique constraint on <code>processed_messages.id</code> is
        the actual deduplication mechanism — a read-then-write check has a race. Transient versus
        permanent classification is the hard part: a timeout is usually transient, a JSON parse error
        is always permanent, and misclassifying a permanent error as transient is how a single bad
        message fills the DLQ ten thousand times.</p>
    `));

    section.appendChild(card('🔀 Ordering, Partitions and Backpressure', `
        <p>Ordering is a partition property, not a broker property. Two messages are only guaranteed to
        arrive in publish order <em>if they share a partition key</em> — order_id, user_id, account_id.
        Choose the key as the smallest unit that must be serialised. Making the key the tenant id
        serialises the whole tenant and destroys parallelism; making it random breaks per-order
        ordering entirely.</p>
        <p>Backpressure is the queue's way of saying "you are producing faster than I can consume".
        A bounded queue with a reject or shed policy is strictly better than an unbounded one: an
        unbounded queue converts an overload into unbounded latency, which looks identical to a hang.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    P["Producer publishes<br/>order.created, key = order_id"] --> HASH["Broker hashes the key<br/>to pick a partition"]
    HASH --> PART[("Partition 3<br/>total order inside<br/>no order across partitions")]
    PART --> C1["Consumer 1"]
    PART --> C2["Consumer 2"]
    PART -.->|"a partition with no consumer<br/>stops here while others run"| IDLE["Ordering preserved,<br/>progress lost"]
    C1 --> FULL{"Partition buffer<br/>above the limit?"}
    FULL -->|"yes"| SHED["Backpressure:<br/>reject, block, or shed the producer"]
    FULL -->|"no"| OK["Consume and ack"]
    SHED -.->|"versus an unbounded queue"| LAT["Latency grows without limit<br/>and looks like a hang"]
`, 'Ordering comes from the partition key; a partition with no consumer stalls but never reorders'));

    section.appendChild(tableCard('⚡ Broker Options', ['Broker', 'Model', 'Exactly-once', 'Replay', 'Pick it for'], [
        ['Kafka', 'durable partitioned log, consumer offsets', 'yes, within a transaction', 'yes, from any offset', 'event streaming, many independent consumer groups, replay'],
        ['RabbitMQ', 'classic work queue, push delivery', 'no', 'limited, until acked', 'task distribution, low latency, routing by key'],
        ['SQS', 'managed queue, at-least-once', 'no (FIFO gives dedupe)', 'limited', 'serverless, zero ops, burst absorption'],
        ['NATS / JetStream', 'lightweight, subject-based', 'limited', 'yes', 'simple fan-out, edge, low footprint'],
        ['Pub/Sub (GCP, AWS)', 'managed topics', 'no', 'no (ack deadline only)', 'managed fan-out, zero ops'],
    ]));

    section.appendChild(tableCard('📐 Capacity Math', ['Quantity', 'Math', 'Number'], [
        ['Peak produce rate', '1M orders/day &times; burst factor 10', '&#8776; 1,200 msg/s peak'],
        ['Consumer lag budget', 'at 3 nines, lag must stay under 60 s', '72,000 messages buffered'],
        ['Partitions', '1,200 msg/s &divide; 1,000 msg/s per partition', '&#8776; 2, use 6–12 for headroom'],
        ['Ordering parallelism', 'one consumer per partition', '6–12 concurrent consumers, no more'],
        ['Storage', '1 KB msg &times; 40M/day &times; 7 days', '&#8776; 280 GB'],
        ['Backlog recovery', 'consumer down 1 h at 1,200 msg/s', '4.3M messages to drain'],
        ['Throughput formula', 'throughput &le; consumers &times; partitions', 'the real ceiling'],
        ['Poison cost', '5 retries &times; backoff 1+2+4+8+16 s', '&#8776; 31 s of partition stall per bad message'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>Duplicate processing</strong> — a crash between commit and ack. Non-negotiable
            duplicate handling on the consumer side.</li>
            <li><strong>Rebalance storm</strong> — a consumer group rebalances when one member is slow or
            a session times out; with hundreds of partitions this pauses the whole group repeatedly.
            Use static membership and long session timeouts.</li>
            <li><strong>Unbounded queues</strong> — latency grows without any visible failure. Always
            cap and shed.</li>
            <li><strong>Hot partition</strong> — a popular key sends all traffic to one partition. Add a
            sub-key suffix when ordering is not required.</li>
            <li><strong>Long ack latency</strong> — processing before acking increases the duplicate
            window. Ack fast, do slow work after.</li>
            <li><strong>Unbounded DLQ</strong> — a DLQ nobody watches is a data-loss graveyard. Alert on
            its depth and give it a replay tool.</li>
            <li><strong>Broker as a data store</strong> — treating a queue as durable storage without a
            retention and compaction plan is how replay becomes impossible.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['Exactly-once — does it exist?',
            'Not as a delivery guarantee across a network. What exists is at-least-once delivery plus an idempotent consumer, implemented by writing a deduplication key in the same transaction as the side effect. Kafka offers exactly-once processing within its own transactions, which covers broker and consumer-group state but not an external database write.'],
        ['How do you guarantee ordering?',
            'By partitioning on the key that defines the ordering unit — order_id, not tenant_id. Messages with the same key go to the same partition and are consumed in order by one consumer. Trade-off: that partition is your parallelism ceiling and a hot key stalls. If ordering is not required, use a random or time-based sub-key to spread the load.'],
        ['What goes in a dead-letter queue and what does not?',
            'Put permanent, non-retryable failures there: malformed payloads, missing required fields, references to entities that will never exist. Retriable failures (timeouts, connection resets, lock contention) belong in the retry path. A DLQ entry should be replayable — re-publish it to the original topic with the original key once the bug is fixed.'],
        ['Consumer lag is climbing. What is wrong?',
            'Either production exceeds consumption (check consumer CPU — likely processing is too slow, so batch it), a consumer died, or a poison message is blocking a partition (look for repeated retries on the same offset). Lag that grows linearly means a throughput deficit; lag that spikes and recovers means a deploy or a rebalance.'],
        ['Kafka or RabbitMQ?',
            'Kafka when you need replay, many independent consumer groups, and high throughput with a durable log. RabbitMQ for task distribution with routing flexibility and low latency. For serverless where you want zero operations, SQS. State the trade-off: Kafka is an operations burden and RabbitMQ cannot replay.'],
        ['How do you prevent a producer from overwhelming a slow consumer?',
            'Bounded queues plus backpressure: when the queue is full, the producer either blocks, retries with backoff, or sheds load explicitly. Never let the queue grow without bound — it just converts a throughput problem into an unbounded latency problem that looks like a hang to the user.'],
    ]));

    container.appendChild(section);
}

export function renderSDEventDriven(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Event-Driven Architecture'));

    section.appendChild(card('🧠 Core Idea', `
        <p>In event-driven architecture, services do not call each other — they publish facts to a
        broker and whoever cares subscribes. The producer knows nothing about its consumers, which
        means you can add, remove, or replay consumers without touching the producer at all.</p>
        <p><strong>The invariant:</strong> <b>an event is a fact in the past tense</b>
        (<code>OrderPlaced</code>, not <code>PlaceOrder</code>). Facts do not get rejected, retried into
        different behaviour, or deleted on failure — they are immutable, so every consumer can be
        replayed independently and reconstruct the same state.</p>
        <p>The price is <strong>eventual consistency</strong>. The order may be written before the
        inventory is reserved, and the system must be designed so that intermediate states are valid,
        not exceptional.</p>
    `));

    section.appendChild(card('🏗️ Request Flow With a Broker and a DLQ', `
        <p>The classic flow, with the two failure paths that are always left out of the diagram:
        what happens when a consumer throws, and what happens when the database write and the publish
        must both succeed.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
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
    DLQ -.->|"operator fixes and replays"| BR
`, 'The outbox removes the dual-write bug; the DLQ is the only safe destination for a poison message'));

    section.appendChild(tableCard('🧩 Event-Driven Patterns', ['Pattern', 'Problem it solves', 'Trade-off'], [
        ['Event notification', 'a service tells others something happened', 'every consumer re-fetches; the read pattern is duplicated'],
        ['Event-carried state transfer', 'avoiding chatty synchronous calls', 'data is duplicated; consumers must tolerate old events'],
        ['Event sourcing', 'full audit trail, time-travel queries', 'event versioning, replay, and compaction become your job'],
        ['CQRS', 'separate write and read models', 'two stores to keep consistent; read lag is visible to users'],
        ['Saga', 'distributed transaction without 2PC', 'compensation logic for every step; no isolation'],
        ['Outbox pattern', 'the dual-write problem', 'a relay adds latency; duplicate publishes need idempotent consumers'],
        ['Transactional inbox', 'deduplicating consumed events', 'a dedupe table that must be pruned'],
    ]));

    section.appendChild(card('🧵 Saga: A Distributed Transaction Without 2PC', `
        <p>A saga is a sequence of local transactions, each paired with a compensating action that
        <em>semantically undoes</em> it. There is no isolation: other services observe the intermediate
        states, so every one of them has to be a valid state a user could observe. Choreographed sagas
        let each service react to events; orchestrated sagas route every step through a coordinator that
        can see the whole flow — use the orchestrator once the flow has real branches.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    START["Checkout begins"] --> T1[["Step 1: local tx<br/>create order, PENDING"]]
    T1 --> T2[["Step 2: local tx<br/>reserve inventory"]]
    T2 --> T3[["Step 3: local tx<br/>capture payment"]]
    T3 --> DONE["Commit: order CONFIRMED"]
    T3 -->|"step 3 fails"| C2["Compensate step 2<br/>release the reservation"]
    C2 -->|"release fails too"| C1["Compensate step 1<br/>cancel the order, flag for review"]
    C1 --> OBS["Order CANCELLED,<br/>nothing rolled back atomically"]
    DONE -.->|"invariant:"| RULE["Only one writer owns each state,<br/>compensations are idempotent,<br/>and the user sees a valid state at every step"]
`, 'Each step has a semantic undo; there is no isolation, so every intermediate state must be valid'));

    section.appendChild(card('💻 Code: the outbox pattern in full', `
<pre><code class="language-javascript">// The bug this solves: write to the DB, then publish. If the process dies
// between the two, the event is lost forever and no consumer ever hears about it.

// Step 1 — same transaction, same fate.
async function placeOrder(req) {
    return db.transaction(async (tx) =&gt; {
        const order = await tx.orders.create({ data: fromRequest(req) });
        await tx.outbox.create({ data: {
            topic: 'orders.v2',
            key: order.id,                       // partition key = ordering unit
            payload: { type: 'OrderPlaced', id: order.id, total: order.total, at: order.createdAt },
        } });
        return order;                            // committed, or neither happened
    });
}

// Step 2 — a relay publishes outbox rows. It can crash and re-run at any time.
async function relayOutbox() {
    const rows = await db.outbox.findMany({
        where: { publishedAt: null }, take: 500, orderBy: { id: 'asc' },
    });
    for (const row of rows) {
        try {
            await broker.send(row.topic, row.key, row.payload);
            await db.outbox.update({ where: { id: row.id }, data: { publishedAt: new Date() } });
        } catch (err) {
            break;                               // preserve ordering: stop at the first failure
        }
    }
}

// Step 3 — consumers MUST be idempotent, because step 2 can publish the same row twice.
async function onOrderPlaced(evt) {
    if (await inbox.seen(evt.id)) return;
    await reserveInventory(evt);                // the real side effect
    await inbox.mark(evt.id);
}</code></pre>
        <p><strong>Line notes:</strong> the <code>break</code> inside the relay loop is deliberate —
        continuing past a failure would publish later events before earlier ones, silently breaking
        per-key ordering. And because the relay can crash between
        <code>broker.send</code> and marking <code>publishedAt</code>, the publish is at-least-once
        by construction; the inbox check on the consumer is what makes that harmless.</p>
    `));

    section.appendChild(card('🔄 Event Sourcing and CQRS in Practice', `
        <p><strong>Event sourcing</strong> stores events as the source of truth and derives state by
        folding them. The payoff is a perfect audit trail and the ability to re-derive any read model.
        The cost is that every event schema becomes permanent API, replaying 10 years of events must be
        fast, and "what is the current value" becomes a computation rather than a read.</p>
        <p><strong>CQRS</strong> splits the write model (normalised, invariant-enforcing) from one or
        more read models (denormalised, query-shaped) updated asynchronously. Now write and read scale
        independently and reads become trivial — at the price of lag that you must expose honestly in
        the API.</p>
    `));

    section.appendChild(tableCard('📐 Capacity Math and Lag Budgets', ['Quantity', 'Math', 'Number'], [
        ['Event volume', '1M orders/day &times; 6 events each', '6M events/day'],
        ['Peak publish rate', '6M / 86,400 &times; 10 burst factor', '&#8776; 700 events/s'],
        ['Partitions', '700 / 1000 per partition &times; 3 headroom', '&#8776; 3, use 12'],
        ['Retention', '7 days hot at 6M/day &times; 1 KB', '&#8776; 42 GB'],
        ['Replay duration', 'to rebuild a read model from scratch', '6M events &divide; consumer throughput'],
        ['Consumer lag SLO', 'read model at most 5 s behind write', '5,000 events buffered at peak'],
        ['Outbox relay poll', '500 rows per poll &times; every 100 ms', '5,000 rows/s publish capacity'],
        ['DLQ budget', 'at 3 nines, alert at 100 messages', 'a deeper DLQ is an incident, not a metric'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>The dual-write bug</strong> — DB write succeeds, publish fails, the event is
            gone forever with no trace. The outbox pattern is the fix.</li>
            <li><strong>Schema evolution</strong> — events are permanent API. Version topics, keep old
            readers working, and never repurpose a field's meaning.</li>
            <li><strong>Ordering across partitions</strong> — two events that must be ordered must
            share a partition key, which limits parallelism. Accept it explicitly.</li>
            <li><strong>Replay storms</strong> — resetting offsets on a busy topic can instantly
            produce 10&times; normal traffic. Always rate-limit replays.</li>
            <li><strong>Unbounded event growth</strong> — event sourcing without compaction grows
            forever. Decide the snapshot and retention policy up front.</li>
            <li><strong>Silent coupling through event schemas</strong> — every added field looks
            harmless but changes the contract. Use a schema registry and a compatibility check in CI.</li>
            <li><strong>Long-running consumers</strong> — a handler that takes 30 s holds a partition
            and blocks everything behind it. Keep handlers short and push heavy work to its own topic.</li>
            <li><strong>Clock skew in event ordering</strong> — never order events by
            <code>timestamp</code>; use the broker offset.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['What problem does the outbox pattern solve?',
            'The dual-write problem: writing to the database and publishing to a broker are two separate systems, so any ordering leaves a failure window where one succeeded and the other did not. The outbox writes an intent row in the same transaction as the business data, then a relay publishes it and marks it sent. The publish becomes at-least-once, and consumers deduplicate.'],
        ['When is event-driven architecture the wrong choice?',
            'When the user needs an immediate answer — a checkout total, a validation result. Async chains convert a simple local call into a multi-second orchestration with no synchronous error path. Also wrong for workflows where a human decision is required in milliseconds, and for a single-team product where the operational cost of a broker buys nothing.'],
        ['How do you evolve an event schema without breaking consumers?',
            'Version the topic or use additive-only changes with a schema registry and a CI compatibility check. Never rename or repurpose a field — add the new one, backfill, migrate consumers, then deprecate the old. Because events are permanent, treat every published schema as public API.'],
        ['Sagas versus 2PC — when do you use which?',
            '2PC when all participants are in the same trust domain and transaction coordinator, since it blocks and has a poor failure record. Sagas when services are independent: a local transaction per step, plus a compensating action for each one. The honest answer in an interview is that sagas give up isolation, so you must handle the intermediate states explicitly.'],
        ['How do you keep a consumer from falling behind?',
            'Scale consumers up to the partition count, batch records to cut per-record overhead, and make the handler idempotent so you can safely parallelise and rebalance. Track lag as an SLO with alerting on the growth rate, not the absolute value. If lag is structurally growing, the fix is throughput work in the handler, not more consumers.'],
        ['How do you test an event-driven system?',
            'Unit-test each consumer in isolation, then test contracts with recorded events captured from production — that is what catches schema drift. Integration-test the outbox relay and the failure paths: duplicate delivery, out-of-order arrival, broker outage during publish, and a poison message landing in the DLQ.'],
    ]));

    container.appendChild(section);
}

export function renderSDMicroservices(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Microservices'));

    section.appendChild(card('🧠 Core Idea', `
        <p>Microservices is a decision about <strong>team boundaries made physical</strong>. Services
        are split along bounded contexts so that different teams can deploy, scale, and fail
        independently. The benefit is organisational, not technical — a monolith split by table does
        not become microservices, it becomes a distributed monolith.</p>
        <p><strong>The invariant:</strong> <b>a service owns its data exclusively.</b> If two services
        read and write the same tables, you have not decoupled anything — you have added a network hop
        and a new class of failure between two pieces of code that used to be one function.</p>
    `));

    section.appendChild(tableCard('⚖️ Trade-offs', ['', 'Microservices', 'Monolith'], [
        ['Deployment', 'independent, per service', 'all-or-nothing; one broken module blocks all'],
        ['Scaling', 'scale the hot service only', 'scale everything, or split first'],
        ['Data', 'one owner per bounded context', 'shared schema, shared queries'],
        ['Failure blast radius', 'one service degrades; others survive', 'one bad deploy can take everything down'],
        ['Cross-cutting change', 'many coordinated deploys, versioning', 'one commit'],
        ['Latency', 'network hops add up; failures are partial', 'in-process calls, all-or-nothing'],
        ['Transactions', 'saga, eventual consistency', 'ACID across the whole app'],
        ['Debugging', 'distributed traces, no stack traces', 'one debugger'],
        ['Team fit', 'many teams, parallel work', 'small teams, fast iteration'],
        ['Infra cost', 'service mesh, pipelines, on-call load', 'one deploy, one database'],
    ]));

    section.appendChild(card('🚦 The Boundary and Sync-vs-Async Decision', `
        <p>Split on a <strong>bounded context</strong> — a region of the domain with its own language,
        rules, and data. Then, for every cross-service call, ask one question: does the caller need
        the answer before it can respond? That single question is the whole sync/async decision.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    NEW["New capability arrives"] --> CTX{"Which bounded context<br/>does it belong to?"}
    CTX -->|"an existing context"| INSIDE["Add it inside that service<br/>same code, same database, same deploy"]
    CTX -->|"needs its own scale,<br/>own data, own team"| NEW["New service with<br/>its own store"]
    NEW --> NEED{"Does the caller need<br/>the answer now?"}
    NEED -->|"yes"| SYNC["Synchronous REST or gRPC<br/>with timeout, retry, circuit breaker"]
    NEED -->|"no"| ASYNC["Publish an event<br/>consumer reacts later"]
    INSIDE --> NOTE["Only split when the boundary<br/>is real, not when it is tidy"]
    SYNC --> COST["Chained calls make p99 the SUM<br/>of every hop and timeout"]
    ASYNC --> BENEFIT["Producer is decoupled,<br/>failures are absorbed by retry"]
`, 'Split on the domain, then let the "does the caller need it now" question decide sync vs async'));

    section.appendChild(card('🕐 A Request Crossing Four Services', `
        <p>This is what a synchronous design costs. Each hop adds RTT, and each hop adds a p99 that
        feeds the next — so the p99 of the composite is close to the <em>sum of the p99s</em>, not the
        average. Note also that a partial failure leaves an inconsistent state unless every hop is
        wrapped in a saga.</p>
    `));
    section.lastChild!.appendChild(lifecycleSteps([
        'Edge / Gateway 4 ms',
        'Auth 8 ms',
        'Orders 15 ms',
        'Inventory 25 ms',
        'Payment 40 ms',
        'Response 5 ms',
    ]));
    section.lastChild!.appendChild(diagram(`
flowchart LR
    GW["Gateway<br/>4 ms"] --> AU["Auth<br/>8 ms"]
    AU --> OR["Orders<br/>15 ms"]
    OR --> IV["Inventory<br/>25 ms"]
    IV --> PY["Payment<br/>40 ms"]
    PY -.->|"p99 is the sum:<br/>97 ms, and any one<br/>hop failing fails the request"| OUT["Client response<br/>5 ms"]
`, 'A four-hop synchronous chain: the p99 is the sum of the hops, and failure is all-or-nothing'));

    section.appendChild(card('🎭 Required Platform Patterns', `
        <table class="complexity-table">
            <tr><th>Pattern</th><th>Why it exists</th><th>Without it</th></tr>
            <tr><td>API Gateway</td><td>one public entry point: auth, TLS, rate limits, routing</td><td>clients couple to internal topology</td></tr>
            <tr><td>Service discovery</td><td>locate services as instances come and go</td><td>hard-coded IPs, stale endpoints</td></tr>
            <tr><td>Circuit breaker</td><td>stop calling a failing dependency</td><td>cascading failure across the fleet</td></tr>
            <tr><td>Bulkhead</td><td>isolated pools per dependency</td><td>one slow call starves everything</td></tr>
            <tr><td>Saga</td><td>distributed transaction with compensation</td><td>partial commits nobody rolls back</td></tr>
            <tr><td>Sidecar / service mesh</td><td>retries, mTLS, tracing, metrics per call</td><td>inconsistent per-service behaviour</td></tr>
            <tr><td>Distributed tracing</td><td>follow one request across services</td><td>latency lives only in one log line</td></tr>
            <tr><td>Canary deploy</td><td>shift traffic gradually, abort on regression</td><td>all-or-nothing deploys across services</td></tr>
        </table>
    `));

    section.appendChild(card('💻 Code: a safe synchronous call', `
<pre><code class="language-javascript">// A call that can hang, fail, and be retried — all three must be bounded.
async function reserveInventory(orderId, items, { deadlineMs = 400 } = {}) {
    const deadline = Date.now() + deadlineMs;

    for (let attempt = 0; attempt &lt; 3; attempt++) {
        // 1. Only retry idempotent failures; a timeout may mean the write landed.
        // 2. Budget: stop if the caller's own deadline is closer than this attempt.
        if (Date.now() + 100 &gt; deadline) break;

        try {
            const res = await inventoryClient.reserve({
                orderId,
                items,
                timeoutMs: Math.min(150, deadline - Date.now()),   // never outlive the caller
            }, { idempotencyKey: 'reserve:' + orderId });         // safe to retry
            return res;
        } catch (err) {
            if (!err.isRetryable) throw err;
            await sleep(Math.min(1000, 2 ** attempt * 100) + Math.random() * 100);   // exponential + jitter
        }
    }

    // 3. Degrade, do not hang: the saga compensates or marks the order PENDING.
    circuitBreaker.recordFailure('inventory');
    throw new DependencyUnavailable('inventory', { orderId });
}</code></pre>
        <p><strong>Line notes:</strong> the <code>deadline</code> matters more than the retry count —
        a retry that outlives the caller's patience just holds the connection open. Jitter on the
        backoff is what stops 1,000 concurrent callers from retrying in lockstep and re-creating the
        outage they are recovering from. And the idempotency key is what makes the retry safe.</p>
    `));

    section.appendChild(tableCard('📐 Capacity Math and the Distributed Tax', ['Quantity', 'Math', 'Number'], [
        ['Composite p50 vs p99', '4 hops &times; ~10 ms p50 vs 97 ms p99 sum', 'p99 is ~10&times; p50'],
        ['Network overhead per hop', '2 &times; 1 ms RTT same region, 4&times; across', '2–4 ms per hop'],
        ['Retry amplification', '3 attempts &times; 20% failure rate', '1.6&times; total load on the dependency'],
        ['Connection overhead', '1M users &times; 2 sockets &times; 10 KB each', '&#8776; 20 GB of ephemeral state'],
        ['Mesh CPU', 'sidecar adds ~1 ms and ~30% CPU per call', 'priced into the node count'],
        ['Service count overhead', '20 services &times; pipeline, dashboard, on-call', '20&times; the operational surface'],
        ['Cross-service deploy window', '4 services changed, coordinated rollout', 'minutes of mixed-version state'],
        ['What actually scales', 'one hot service behind 200 nodes', 'others stay small, pay little'],
    ]));

    section.appendChild(card('🚫 When NOT to Use Microservices', `
        <ul>
            <li><strong>One team, small product.</strong> You pay the distributed-systems tax in
            complexity and get none of the organisational benefit.</li>
            <li><strong>No real boundaries.</strong> Splitting by technical layer rather than domain
            produces services that always change together — a distributed monolith with network latency.</li>
            <li><strong>The change is cross-cutting.</strong> If every feature touches every service,
            the split did not follow the domain.</li>
            <li><strong>Shared tables.</strong> Two services writing one database is the single most
            common microservices mistake, and it is worse than the monolith it replaced.</li>
            <li><strong>Latency-critical synchronous chains.</strong> Adding four network hops to a
            50 ms budget is a design, not an accident.</li>
            <li><strong>Without tracing and on-call maturity.</strong> Distributed systems without
            observability are undebuggable in production.</li>
        </ul>
    `));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>Cascading failure</strong> — no timeouts means one slow dependency stalls every
            caller. Set an aggressive timeout on every outbound call.</li>
            <li><strong>Retry storms</strong> — retries without jitter recreate the outage. Bound total
            retries with a budget, not per call.</li>
            <li><strong>Chatty services</strong> — 10 calls per request turns the network into the
            bottleneck and the p99 into a sum. Use a bulk endpoint or a denormalised read.</li>
            <li><strong>Distributed monolith</strong> — coordinated deploys everywhere. The signal that
            your boundaries are wrong.</li>
            <li><strong>Discovery flapping</strong> — DNS TTLs and health checks disagree, and calls
            bounce between instances. Prefer a push-based registry with client-side load balancing.</li>
            <li><strong>Shared-database writes</strong> — the coupling never went away, it just became
            harder to reason about.</li>
            <li><strong>No partial-failure story</strong> — a saga that only handles the happy path
            leaves inconsistent state on the exact paths that happen at 3 a.m.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['Monolith or microservices?',
            'Start with a well-modularised monolith. Split when a bounded context needs independent scaling, independent deploy cadence, or independent ownership by a different team — and only then. The honest answer in an interview: the benefit is organisational, so if you do not have the teams, the costs are all real and the benefits are theoretical.'],
        ['Synchronous or asynchronous between two services?',
            'Ask whether the caller needs the answer before responding. Inventory reservation during checkout needs a synchronous answer, so use a call with a tight timeout, a circuit breaker, and a saga compensation. Sending a welcome email or updating a recommendation model does not — use an event, which also means a new consumer can be added later without touching the producer.'],
        ['How do you handle a transaction spanning three services?',
            'A saga: each step is a local transaction, and each step has a compensating action. Forward recovery retries the step; compensating recovery undoes it. No isolation is provided, so every intermediate state must be valid and observable. Choreographed sagas publish events and react; orchestrated sagas have a coordinator — use the orchestrator when the flow is complex enough that you need one place to see it.'],
        ['What is a circuit breaker and when do you need one?',
            'A state machine that stops calling a dependency after repeated failures and probes it periodically with a half-open request. It converts a slow dependency into a fast error, protecting the caller. Essential whenever synchronous dependencies exist, because a timeout that is too generous does not protect anything.'],
        ['How do you debug a request that spans five services?',
            'Distributed tracing with a propagated trace context. Every hop carries the trace id, so you get one timeline instead of five log files. Add RED metrics per service (Rate, Errors, Duration) and a trace-id in every log line. Without this, the honest answer is that the system is undebuggable.'],
        ['What is the biggest operational downside people forget?',
            'On-call and coordination cost. Every service needs its own pipeline, dashboards, alerts, runbook, and on-call rotation, and a single request now fails in a dozen places instead of one. That cost is linear in service count and it is the main reason teams end up merging services back together.'],
    ]));

    container.appendChild(section);
}

export function renderSDAPI(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'API Design'));

    section.appendChild(card('🧠 Core Idea', `
        <p>An API is a contract with an unknown number of clients, some of which you cannot upgrade.
        Design it as you would a database schema: versioned, additive, and boring — because the cost of
        a breaking change is paid by every client, and clients are the part of your system you do not
        own.</p>
        <p><strong>The invariant:</strong> <b>a change is backwards compatible unless it removes a
        field, narrows a type, changes a default, or alters a semantic.</b> Adding an optional field
        and ignoring it is always safe; everything else needs a version or a migration window.</p>
    `));

    section.appendChild(tableCard('🧪 REST vs GraphQL vs gRPC', ['', 'REST', 'GraphQL', 'gRPC'], [
        ['Transport', 'HTTP/1.1 or HTTP/2', 'HTTP POST to one endpoint', 'HTTP/2, protobuf'],
        ['Payload', 'JSON, verbose', 'JSON, exactly what you asked for', 'binary, compact and typed'],
        ['Overfetching', 'common, needs field selection', 'none by design', 'none by design'],
        ['Underfetching', 'N+1 round trips', 'possible, needs dataloader', 'none — batch RPCs'],
        ['Caching', 'trivial: URL is the cache key', 'hard: POST body is not cacheable', 'not cacheable by default'],
        ['Introspection', 'OpenAPI, explicit', 'built in', 'protobuf descriptors'],
        ['Debugging', 'curl', 'GraphiQL', 'grpcurl'],
        ['Best for', 'public CRUD APIs, browsers', 'aggregated dashboards, mobile clients', 'internal service-to-service'],
    ]));

    section.appendChild(card('🎛️ Choosing the Wire Format', `
        <p>Protocol choice is a caching decision first and a typing decision second. Anything a client
        might want to cache or a CDN must serve gets a URL-keyed, cacheable shape; anything internal and
        latency-sensitive gets a typed binary one.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    N["A new interface is needed"] --> Q1{"Who calls it?"}
    Q1 -->|"public clients,<br/>browsers, third parties"| Q2{"Must a CDN or browser<br/>cache the response?"}
    Q1 -->|"internal services only"| GRPC["gRPC over HTTP/2<br/>protobuf, typed, batchable,<br/>small on the wire"]
    Q2 -->|"yes"| REST["REST over HTTP<br/>GET is cacheable by URL,<br/>simple to debug and proxy"]
    Q2 -->|"no"| Q3{"Do clients need<br/>different field selections?"}
    Q3 -->|"yes"| GQL["GraphQL<br/>one endpoint, exact fields,<br/>but needs depth and cost limits"]
    Q3 -->|"no"| REST
    GRPC --> NOTE["Never expose gRPC publicly<br/>without a gateway: browsers<br/>cannot speak it"]
    GQL --> NOTE2["Needs DataLoader<br/>or N+1 becomes the default"]
`, 'URL-cacheable for the public edge, typed and batched for the internal mesh'));

    section.appendChild(card('🛡️ Versioning, Rate Limiting, and Idempotency', `
        <p>Three things every production API needs, and all three fail silently if omitted. Versioning
        lets clients migrate on their own schedule; rate limiting protects your dependencies from one
        bad client; idempotency keys turn a retry from a duplicate charge into a replayed response.</p>
    `));
    section.lastChild!.appendChild(diagram(`
sequenceDiagram
    autonumber
    participant C as Client
    participant G as API Gateway
    participant RL as Token bucket
    participant S as Orders service
    participant DB as Orders DB
    C->>G: POST /v2/orders<br/>Idempotency-Key 9f2c
    G->>RL: take 1 token for tenant acme
    alt bucket empty
        RL-->>G: deny, reset in 2 s
        G-->>C: 429, Retry-After 2<br/>X-RateLimit-Remaining 0
    else token taken
        RL-->>G: grant, remaining 971
        G->>S: forward with tenant claim attached
        S->>DB: INSERT idempotency_keys 9f2c
        alt key already seen
            DB-->>S: conflict, stored response found
            S-->>G: replay the stored 201 response
        else new key
            DB-->>S: inserted
            S->>DB: create order, store response
            S-->>G: 201 Created
        end
        G-->>C: 201, X-RateLimit-Remaining 971
    end
`, 'Rate limit first (cheap rejection), then idempotency (safe retry), then the actual work'));

    section.appendChild(tableCard('🏷️ Versioning Strategies', ['Strategy', 'Shape', 'Pros', 'Cons'], [
        ['URI path', '/v2/orders', 'obvious, cacheable, trivial to route', 'URL is now versioned forever'],
        ['Header', 'Accept: application/vnd.api+2', 'URL stays clean', 'easy to forget, harder to test by hand'],
        ['Date based', '2024-01-15', 'ties to a release cadence', 'looks fake, awkward for internal APIs'],
        ['No versioning', 'additive fields only', 'zero migration cost', 'cannot remove or change meaning'],
        ['Contract-first', 'schema in CI, generated clients', 'breaks caught before merge', 'requires discipline'],
    ]));

    section.appendChild(card('💻 Code: token-bucket rate limiter and idempotency', `
<pre><code class="language-javascript">// Token bucket: capacity = burst, refill = sustained rate.
// More forgiving than a fixed window (which allows 2x the limit at the boundary).
function allow(key, { capacity = 1000, refillPerSec = 500 } = {}) {
    const bucket = buckets.get(key) ?? { tokens: capacity, ts: Date.now() };
    const now = Date.now();
    const elapsedSec = (now - bucket.ts) / 1000;

    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);   // refill
    bucket.ts = now;

    if (bucket.tokens &lt; 1) {
        const retryAfter = Math.ceil((1 - bucket.tokens) / refillPerSec);
        return { allowed: false, remaining: 0, retryAfter };   // 429 + Retry-After
    }
    bucket.tokens -= 1;                                          // consume
    buckets.set(key, bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
}

// Idempotency: the key is stored in the SAME transaction as the effect.
async function createOrder(req, idemKey) {
    if (!idemKey) return orders.create(req);                     // no protection offered

    const prior = await db.idempotencyKeys.findUnique({ where: { key: idemKey } });
    if (prior) return prior.response;                            // replay, never re-execute

    try {
        return await db.transaction(async (tx) =&gt; {
            await tx.idempotencyKeys.create({ data: { key: idemKey, tenant: req.tenantId } });
            const order = await tx.orders.create({ data: req });
            const response = { status: 201, body: order };
            await tx.idempotencyKeys.update({ where: { key: idemKey }, data: { response } });
            return response;
        });
    } catch (err) {
        if (err.isUniqueViolation) return orders.findBy(req.tenantId);   // concurrent duplicate won
        throw err;
    }
}

// Purge: keys are only useful for the retry window, not forever.
setInterval(() =&gt; db.idempotencyKeys.deleteMany({ where: { createdAt: { lt: hoursAgo(24) } } }), 3600_000);</code></pre>
        <p><strong>Line notes:</strong> a fixed-window limiter lets a client send the full quota at
        10:00:59 and again at 10:01:00 — double the intended rate. Token bucket allows a defined burst
        and then enforces the sustained rate, which is what clients can actually reason about. On the
        idempotency side, the unique-violation branch handles the true race where two concurrent
        requests carry the same key.</p>
    `));

    section.appendChild(card('📄 Pagination, Errors, and Status Codes', `
        <p><strong>Offset pagination</strong> (<code>?limit=50&amp;offset=1000</code>) is simple and
        breaks under concurrent writes: an insert at the front shifts every subsequent page, so clients
        see duplicates and miss rows. <strong>Cursor pagination</strong> anchors on the last key seen
        (<code>?after=cursor</code>) and is stable, at the cost of not being able to jump to page 37.
        For anything large or changing, use a cursor and say why.</p>
        <p><strong>Errors</strong> should be machine-readable and consistent. A single error envelope —
        a stable <code>code</code>, a human message, a request id — means clients can branch on
        <code>code</code> instead of parsing English. 429 for rate limits, 409 for conflicts,
        422 for validation, 503 with <code>Retry-After</code> for dependency failures. Never return
        200 with an error body.</p>
    `));

    section.appendChild(tableCard('📐 Capacity Math', ['Quantity', 'Math', 'Number'], [
        ['Rate limit header cost', '4 headers &times; 60 bytes on every response', '240 bytes, ~3% overhead'],
        ['Token bucket memory', '1 entry per client &times; 64 bytes', '1M clients = 64 MB'],
        ['Limit enforcement cost', 'one Redis round trip per request', '+0.5 ms p50 — batch or cache locally'],
        ['Quota sizing', '14,000 RPS peak / 500 clients', '28 RPS sustained per client, burst 50'],
        ['Idempotency table', '14,000 writes/s &times; 200 bytes &times; 24 h', '&#8776; 600 GB — must be partitioned and pruned'],
        ['Cursor page size', '50 rows &times; 1 KB', '50 KB per response, under the gRPC size limit'],
        ['gRPC vs JSON size', '1 KB JSON vs ~300 bytes protobuf', '3&times; smaller, less parsing'],
        ['Version retention', 'support v1 and v2 for 12 months', 'two deploys and two test suites'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>Breaking changes shipped silently</strong> — removing a field, tightening
            validation, or changing a default. Contract tests in CI catch what review misses.</li>
            <li><strong>Chatty APIs</strong> — the client makes 20 calls to render one screen. Bundle
            the read or offer a GraphQL / BFF layer.</li>
            <li><strong>GraphQL N+1</strong> — the gateway resolves nested fields one query at a time.
            DataLoader batching is mandatory, plus query depth and complexity limits.</li>
            <li><strong>Unbounded queries</strong> — no page limit, no query timeout, no max page size.
            Every one of these is a denial-of-service vector.</li>
            <li><strong>429 retry storms</strong> — every client retries the same instant. Return
            <code>Retry-After</code> and tell clients to add jitter.</li>
            <li><strong>Idempotency keys that grow forever</strong> — the table becomes the largest
            table in the database. Prune on a TTL matched to your retry window.</li>
            <li><strong>No request id in responses or logs</strong> — support cannot correlate a user
            report with a trace. Return it as a header and log it everywhere.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['How do you version an API?',
            'Default to additive-only: new optional fields, new endpoints, new enum values that old clients ignore. When you must break something, use a URI version or a dated header and support the old version for a stated window. Version at the edge, keep old versions thin by forwarding to the same service, and give every client a deprecation date with usage telemetry so you know who still depends on it.'],
        ['Client-side or server-side rate limiting?',
            'Both. Server-side is the real enforcement point and needs to be distributed across instances (Redis token bucket, or the gateway). Client-side keeps well-behaved clients off the limit entirely and is free. Never rely on client-side alone, and never let one tenant starve another — always key the bucket per tenant, not per IP.'],
        ['How do you make an API idempotent?',
            'The client generates a key for the logical operation and retries with the same key. The server stores that key with the response inside the same transaction as the effect, so a repeat returns the stored response instead of re-executing. The critical detail is that the key insert and the side effect commit together — otherwise a crash between them replays the effect.'],
        ['Cursor or offset pagination?',
            'Cursor for anything that changes while it is being read: it is stable under concurrent inserts and skips the OFFSET scan cost that grows with page depth. Offset is acceptable for static admin data where jumping to a page matters more than stability. Whichever you pick, always enforce a maximum page size.'],
        ['How do you design an error response?',
            'One envelope for every error: a stable machine-readable code, a human-readable message, a field-level detail array for validation, and a request id. Clients branch on the code; humans read the message; support traces the request id. Use the status code for the broad category and never bury an error in a 200.'],
        ['GraphQL versus REST — when do you pick which?',
            'REST for public APIs, simple CRUD, and anything that benefits from HTTP caching. GraphQL when clients need different field selections from the same data — dashboards and mobile apps that would otherwise make many calls. Both need limits: GraphQL especially, with depth, complexity, and timeout caps, plus DataLoader to prevent N+1.'],
    ]));

    container.appendChild(section);
}

export function renderSDDistributed(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Distributed Systems'));

    section.appendChild(card('🧠 Core Idea', `
        <p>A distributed system is one where "the network is down" and "the server is slow" are
        indistinguishable from the other side. Every hard problem in the field — consensus,
        replication, idempotency, coordination — is a consequence of that one sentence.</p>
        <p><strong>The invariant:</strong> <b>assume every operation may be retried, may time out after
        having succeeded, and may run concurrently with itself.</b> Design for at-least-once execution
        and the system becomes tractable; design for exactly-once and you are lying to yourself.</p>
    `));

    section.appendChild(card('📐 CAP, and Why It Is Misunderstood', `
        <p>CAP is not "pick two of three". It is: <strong>when a network partition occurs, you must
        choose between consistency and availability.</strong> Partition tolerance is not optional — a
        partition will happen, so the real decision is CP or AP, made per operation, not per system.</p>
        <p><strong>PACELC</strong> extends it with the case CAP ignores: <em>if</em> there is no
        partition, <em>else</em> you still trade latency against consistency. Every read that must check
        a quorum pays that cost even on a perfectly healthy cluster.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    P["A network partition occurs"] --> DECIDE{"Can the minority side<br/>still accept writes?"}
    DECIDE -->|"no - reject or queue"| CP["CP choice<br/>serialise through a quorum,<br/>sacrifice availability"]
    DECIDE -->|"yes - keep serving"| CONF{"Will two sides accept<br/>conflicting writes?"}
    CONF -->|"yes"| AP["AP choice<br/>serve reads and writes,<br/>reconcile later"]
    CONF -->|"no"| CP2["CP choice<br/>quorum reads and writes,<br/>sacrifices availability"]
    AP --> E["Else branch when there is NO partition:<br/>PACELC - you still trade latency<br/>for consistency on every quorum read"]
`, 'CAP only applies during a partition; PACELC names the cost you pay when the network is fine'));

    section.appendChild(card('🤝 Consensus: Raft Leader Election and Log Replication', `
        <p>Consensus gives a replicated state machine one agreed ordering of operations even when
        machines crash, messages are lost, and delays are unbounded. Raft's core loop is: elect a
        leader by majority, replicate the log to a majority, and only commit once a majority has it.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
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
    ACK -->|"yes"| COMMIT["Commit at that index,<br/>apply to the state machine"]
`, 'Raft: majority to elect, majority to commit, log order is the agreed order'));

    section.appendChild(tableCard('🧮 Quorum Arithmetic', ['Config', 'R', 'W', 'Guarantee', 'Cost'], [
        ['Fast reads, last-write-wins', '1', 'N', 'writes consistent, reads may lag', 'write latency = slowest replica'],
        ['Balanced', 'N/2 + 1', 'N/2 + 1', 'consistent, highly available', 'both slow, 1.5N of traffic'],
        ['Strong reads, fast writes', 'N', '1', 'reads always latest', 'read latency = slowest replica'],
        ['Dynamo-style', 'quorum', 'quorum', 'quorum-like, tunable', 'sloppy quorums need hinted handoff'],
    ]));

    section.appendChild(card('⏱️ Time, Ordering, and Clocks', `
        <p>Clocks across machines drift. You cannot order events by <code>timestamp</code> and expect
        correctness — NTP keeps you within milliseconds, not microseconds, and a paused VM can jump
        backwards.</p>
        <ul>
            <li><strong>Monotonic clocks</strong> for measuring durations inside one process (a wall
            clock going backwards makes every timeout calculation wrong).</li>
            <li><strong>Hybrid logical clocks</strong> — a physical clock plus a counter that advances
            on every observed event, so timestamps stay close to real time but never go backwards
            across the cluster. Used by CockroachDB and Spanner.</li>
            <li><strong>Logical and vector clocks</strong> — track causality, not time. Needed for
            conflict detection in multi-master replication, at the cost of metadata per node.</li>
            <li><strong>Lamport clocks</strong> — a partial order that respects causality, enough to
            order events within one view.</li>
        </ul>
    `));

    section.appendChild(card('💻 Code: retry with full jitter and a circuit breaker', `
<pre><code class="language-javascript">// 1. Exponential backoff WITH FULL JITTER. Without jitter, 10,000 clients
//    retrying a 500 ms outage all retry at the same instant and keep it alive.
async function withRetry(fn, { attempts = 4, baseMs = 100, capMs = 2000 } = {}) {
    for (let i = 0; i &lt; attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            if (!err.isRetryable || i === attempts - 1) throw err;
            const ceiling = Math.min(capMs, baseMs * 2 ** i);          // 100, 200, 400, 800...
            const sleepMs = Math.random() * ceiling;                  // full jitter
            await sleep(sleepMs);
        }
    }
}

// 2. Circuit breaker: stop paying the full timeout for a dependency that is down.
//    closed = normal, open = fail fast, half-open = one probe allowed through.
class Breaker {
    constructor({ threshold = 5, resetMs = 30_000 } = {}) {
        this.state = 'closed';
        this.failures = 0; this.openedAt = 0;
        this.threshold = threshold; this.resetMs = resetMs;
    }
    async call(fn) {
        if (this.state === 'open') {
            if (Date.now() - this.openedAt &gt; this.resetMs) this.state = 'half-open';
            else throw new Error('circuit open');                      // fail FAST, no timeout wait
        }
        try {
            const out = await fn();
            this.state = 'closed'; this.failures = 0;
            return out;
        } catch (err) {
            if (++this.failures &gt;= this.threshold) { this.state = 'open'; this.openedAt = Date.now(); }
            throw err;
        }
    }
}

// 3. Idempotency: a natural key in the same transaction makes a repeat detectable.
await db.transaction(async (tx) =&gt; {
    await tx.payments.create({
        data: { idemKey: 'charge:' + orderId + ':' + attempt, amount },
    });                                   // unique constraint: a duplicate insert throws, so it runs once
    await tx.accounts.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
});</code></pre>
        <p><strong>Why full jitter, not equal jitter:</strong> it spreads retries uniformly across the
        window instead of clustering them, which measurably reduces retry-amplified incidents. Note
        that an open circuit returns in microseconds instead of holding a connection for the full
        30-second timeout — that is the difference between shedding load and queueing it.</p>
    `));

    section.appendChild(tableCard('📐 Capacity Math', ['Quantity', 'Math', 'Number'], [
        ['Quorum write amplification', 'W = 3 of N = 5', '3&times; the network and disk writes'],
        ['Quorum read latency', 'R = 3 of 5', 'median of 3 replies, not the fastest'],
        ['R + W &gt; N', 'N = 5, R = 3, W = 3', 'guarantees at least one overlapping replica'],
        ['Consensus commit', '1 RTT to replicate + 1 RTT to commit', '&#8776; 2 RTT per write, ~2 ms same-region'],
        ['Loss tolerance', 'N = 5, quorum = 3', 'loses 2 nodes and still commits'],
        ['Retry amplification', '3 attempts &times; 30% failure rate', '1.9&times; load on a struggling dependency'],
        ['CP during a minority partition', '3 of 5, minority side is 2', '0% availability on the minority'],
        ['Circuit breaker benefit', '30 s timeout vs 0.01 ms when open', 'connection pool survives the outage'],
    ]));

    section.appendChild(card('⚠️ Failure Modes and Pitfalls', `
        <ul>
            <li><strong>Partial failure</strong> — some operations succeed and some fail with no way to
            tell which. Every operation needs a status query or an idempotent retry.</li>
            <li><strong>Retry storms</strong> — retries without jitter or a budget amplify an outage
            into a self-sustaining one.</li>
            <li><strong>Cascading failure</strong> — a slow dependency exhausts the caller's thread
            pool. Timeouts, bulkheads, and circuit breakers are the defence.</li>
            <li><strong>Thundering herd on recovery</strong> — everything retries at once when the
            dependency returns. Stagger reconnects with jitter.</li>
            <li><strong>Split brain</strong> — two nodes believe they own a resource. Needs fencing or
            consensus, never a timeout alone.</li>
            <li><strong>Clock skew</strong> — ordering by timestamp, or leases that assume clocks agree.
            Use monotonic clocks and logical ordering.</li>
            <li><strong>Distributed lock without fencing</strong> — the old holder resumes and writes
            after the lease moved on. A lock must carry a fencing token the resource checks.</li>
            <li><strong>Backpressure ignored</strong> — unbounded queues turn a throughput limit into
            unbounded latency. Shed load deliberately.</li>
        </ul>
    `));

    section.appendChild(qaCard([
        ['Explain CAP properly.',
            'Partition tolerance is not a choice. When a partition occurs you must choose between returning an error (CP, sacrificing availability) or serving possibly-stale data (AP, sacrificing consistency). PACELC adds the else branch: even without a partition you trade latency for consistency whenever an operation waits for a quorum. Most real systems are CP for money and AP for social feeds — per operation, not per system.'],
        ['Why is a distributed lock without fencing unsafe?',
            'Because a lock has a lease, and a paused or partitioned holder can believe it still holds the lock after the lease expired and someone else acquired it. When it wakes up, two holders write. The fix is a monotonically increasing fencing token issued with every acquisition, which the storage layer checks and rejects stale tokens against.'],
        ['How do you debug a distributed system?',
            'Traces first — a propagated trace context gives one timeline across every service. Then metrics with high cardinality (request IDs, not just service names) so you can isolate the failing requests, then logs keyed by trace ID. Percentile distributions matter more than averages: a p50 of 50 ms can hide a p99 of 5 s, and the p99 is what users report.'],
        ['When do you need consensus rather than a primary?',
            'When there is no natural single writer and the data cannot tolerate divergence — leader election, distributed locks with fencing, config and membership changes, and replicated coordination state. If one node can legitimately be the only writer, use leader-follower: it is far cheaper than consensus and easier to reason about.'],
        ['How do you make an operation safe to retry?',
            'Make it idempotent: an idempotency key or natural dedup written in the same transaction as the effect, and a natural key so a repeat is detectable. Then bound the retries with exponential backoff and full jitter, and only retry idempotent failures — a timeout on a non-idempotent write may mean it succeeded.'],
        ['What is the difference between a timeout and a circuit breaker?',
            'A timeout bounds one call, but the caller still pays the timeout on every attempt and still holds the resources. A circuit breaker notices that the dependency is consistently failing and fails immediately, then probes periodically. Timeouts protect a single call; breakers protect the whole system from a slow dependency.'],
    ]));

    container.appendChild(section);
}

export function renderSDRealWorld(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Real-World System Designs'));

    section.appendChild(card('🧭 The Framework Every Question Uses', `
        <p>Interviews are not about the diagram. They are about the <strong>order</strong> in which you
        reason, and the numbers you commit to along the way.</p>
        <ol style="font-size:15px;color:var(--ink);line-height:1.6">
            <li><strong>Clarify requirements</strong> — 5 minutes. Functional: what does it do, for
            whom? Non-functional: how many users, what read/write ratio, what latency and durability?
            Pick a scale and say it out loud; the interviewer will correct you if it is off.</li>
            <li><strong>Estimate capacity</strong> — DAU to requests per second, requests to storage,
            storage to bandwidth. Show the arithmetic, not the conclusion.</li>
            <li><strong>Define the interface</strong> — the API shape and the read/write split. This
            forces you to think about the access pattern.</li>
            <li><strong>High-level design</strong> — services, storage, caching, queues. Draw the data
            path for one concrete request, not just the boxes.</li>
            <li><strong>Deep dive</strong> — pick the <em>one</em> component the interviewer cares about
            and go three levels deep. Pick your own: that is what separates a candidate who knows a
            design from one who memorised a list.</li>
            <li><strong>Failure and trade-offs</strong> — what happens when a box dies, a shard is
            slow, or the cache goes cold. This is where the strongest answers are won.</li>
        </ol>
        <p><strong>The invariant of the whole exercise:</strong> <b>every number in your design must
        follow from a number you were given or estimated.</b> 10,000 users per second is a choice you
        made; every downstream figure has to be traceable to it.</p>
    `));

    // ── URL shortener ─────────────────────────────────────────────────
    section.appendChild(card('🔗 Design: URL Shortener', `
        <p><strong>Requirements.</strong> Given a long URL, return a short one. Given the short one,
        redirect. Reads outnumber writes by 100&times;1, and every read is a 301 that must be globally
        available within milliseconds. Durability matters only for writes — losing a redirect is a
        broken link, losing the write is the same as never creating it.</p>
        <p><strong>Core idea.</strong> The system is a key-value store with a cache in front and a CDN
        on top. The only interesting design decision is how the short id is generated: an atomic
        counter (unique, sequential, one point of contention) or a hash of the URL (decentralised,
        but you must handle collisions).</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart LR
    C1["POST /shorten<br/>long url, 800 chars"] --> EDGE["Anycast edge"]
    EDGE --> API["Shorten service"]
    API --> G{"How is the id generated?"}
    G -->|"atomic counter"| CNT["Redis INCR or a Snowflake id<br/>unique, sequential, one hot spot"]
    G -->|"hash of the url"| HSH["7-char base62 of a hash<br/>decentralised, needs collision checks"]
    CNT --> KV[("KV store<br/>id to long url")]
    HSH --> KV
    KV --> CACHE[("Hot cache<br/>top 20 percent of keys")]
    KV --> STORE[("Primary store<br/>sharded by id")]
    RDR["GET /aB3xY9"] --> CDNC["CDN cached 301<br/>Cache-Control 30 days"]
    CDNC --> CACHE
`, 'A shortener is a KV store with two caches; id generation is the only real design decision'));

    section.appendChild(card('💻 Key Detail: 7 characters Are Enough', `
<pre><code class="language-javascript">// base62 alphabet: 0-9, a-z, A-Z  =>  62 symbols
// 62^5 = 916M     too few
// 62^6 = 56.8B    below one year of new links
// 62^7 = 3.52T    comfortably above ~100 years at 100M links/day
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function encodeId(counter) {
    let out = '';
    let n = counter;
    while (n &gt; 0) {
        out = ALPHABET[n % 62] + out;   // least significant digit first
        n = Math.floor(n / 62);
    }
    return out;
}

// Sequential ids are enumerable: /a, /b, /c lets anyone walk your whole table.
// Start the counter at a random 6-digit offset, or shuffle the alphabet per deployment.
function makeId() {
    return encodeId(START_OFFSET + counter.incr());
}</code></pre>
    `));

    section.appendChild(tableCard('📐 URL Shortener Capacity', ['Quantity', 'Math', 'Number'], [
        ['New URLs per day', 'given', '100M/day'],
        ['Write throughput', '100M / 86,400 &times; 10 burst', '&#8776; 11,600 writes/s peak'],
        ['Read amplification', '100:1 read to write', '10B reads/day'],
        ['Read throughput', '10B / 86,400 &times; 10 burst', '&#8776; 1.16M reads/s peak'],
        ['Bandwidth', '1.16M &times; 200 B redirect', '&#8776; 232 MB/s, ~1.9 Gbps'],
        ['Storage per year', '100M &times; 365 &times; 300 B', '&#8776; 11 TB/year'],
        ['Id length needed', '62^7 = 3.52T vs 36.5B/year', '7 characters'],
        ['Cache sizing', 'top 20% of links carry 80% of reads<br/>7.3B keys is too big for one cache', 'CDN edge first, then a regional cache'],
        ['Redirect latency budget', 'CDN hit 10 ms, cache hit 1 ms, miss 40 ms', 'p99 target 100 ms'],
    ]));

    section.appendChild(card('⚠️ URL Shortener Failure Modes', `
        <ul>
            <li><strong>Counter hotspot</strong> — a single Redis key taking 11,600 writes/s. Shard the
            counter (allocate ranges per writer) or use a Snowflake-style time-prefixed id.</li>
            <li><strong>Cache stampede on a viral link</strong> — one hot key expiring. Logical expiry
            plus a CDN with a long TTL.</li>
            <li><strong>Deleted or modified targets</strong> — 301s are cached by browsers for a year and
            cannot be revoked. Decide the policy explicitly: 302 for mutable targets, 301 only for
            immutable ones.</li>
            <li><strong>Hash collisions</strong> — with a hashed id, two URLs can map to one. Resolve by
            storing a short URL fingerprint and regenerating on collision.</li>
            <li><strong>Abuse and enumeration</strong> — sequential ids invite crawling. Randomise the
            start offset and rate-limit by IP and by target domain.</li>
        </ul>
    `));

    // ── News feed ─────────────────────────────────────────────────────
    section.appendChild(card('📰 Design: News Feed', `
        <p><strong>Requirements.</strong> Each user sees the newest posts from the accounts they follow,
        ordered by recency. Highly read, lightly written, and intensely personalised — which is exactly
        why the fan-out decision dominates the design.</p>
        <p><strong>Core idea.</strong> Fan-out on read is cheap to write and expensive to read; fan-out
        on write is the opposite. Real systems split by follower count rather than picking a side.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    POST["A user posts"] --> N{"How is the feed assembled?"}
    N -->|"Fan out on read"| FR["At read time, pull the newest items<br/>from every follow and merge<br/>cheap write, expensive read"]
    N -->|"Fan out on write"| FW["At write time, push the item into<br/>every follower's precomputed list<br/>expensive write, read is trivial"]
    N -->|"Hybrid"| HY["Push for the few authors with many followers,<br/>pull for the long tail at read time"]
    FR --> FRP["200 follows &times; 116K reads/s<br/>= 23M item fetches/s — unaffordable"]
    FW --> FWP["20M posts/day &times; 200 followers<br/>= 4B writes/day — also unaffordable"]
    HY --> OK["Bounded on both sides:<br/>push where fan-out is small, pull where it is large"]
`, 'Pure pull and pure push both blow up; the hybrid bounds each side'));

    section.appendChild(tableCard('📐 News Feed Capacity', ['Quantity', 'Math', 'Number'], [
        ['Daily active users', 'given', '5M'],
        ['Feed loads', '200 per user per day', '1B reads/day'],
        ['Read throughput', '1B / 86,400 &times; 10 burst', '&#8776; 116K feed reads/s peak'],
        ['Follows', '500M total, 200 per user', 'merge cost per read = 200 items'],
        ['Pull cost', '116K &times; 200', '&#8776; 23M item fetches/s'],
        ['Push cost', '20M posts/day &times; 200 followers', '&#8776; 4B writes/day'],
        ['Hybrid push set', 'authors with &lt;1000 followers, avg 100', '&#8776; 2B pushes/day = 23K msg/s'],
        ['Feed storage', '200 items &times; 500 B per user', '&#8776; 500 GB for 5M users'],
        ['Cache target', '20% hottest feeds &rarr; 80% of reads', '100 GB, fits comfortably'],
    ]));

    section.appendChild(card('⚠️ News Feed Failure Modes', `
        <ul>
            <li><strong>Celebrity writes</strong> — one post to 10M followers is 10M writes. Cap it:
            push a notification and let readers pull.</li>
            <li><strong>Fan-out queue explosion</strong> — a viral post backs the queue up for hours.
            Bound the queue, drop to pull-only for very high follower counts.</li>
            <li><strong>Cancelled or deleted posts</strong> — they are already in thousands of feeds.
            Tombstones plus a fan-out delete, or accept eventual removal.</li>
            <li><strong>Ranking regression</strong> — a new model changes feed contents globally.
            Shadow-run it against the old ranking before flipping.</li>
            <li><strong>Unfollowing does not clean up</strong> — precomputed lists keep items from
            unfollowed accounts. Filter at read time as well as delete asynchronously.</li>
        </ul>
    `));

    // ── Chat ──────────────────────────────────────────────────────────
    section.appendChild(card('💬 Design: Chat (WhatsApp)', `
        <p><strong>Requirements.</strong> Deliver messages to recipients who may be offline, preserve
        per-conversation order, show delivery and read receipts, work on flaky mobile networks, and
        scale to conversations with a million subscribers.</p>
        <p><strong>Core idea.</strong> Store each message <strong>once</strong>, assign a monotonic
        sequence number per conversation, and have clients pull everything after the last sequence they
        saw. Push is only a nudge to come and pull. That single decision is what makes a million-recipient
        broadcast one write instead of a million.</p>
    `));
    section.lastChild!.appendChild(diagram(`
flowchart TD
    S["Sender sends a message"] --> ST[("Store ONCE,<br/>assign sequence 4172")]
    ST --> FAN{"How does it reach recipients?"}
    FAN -->|"1:1 chat"| ONE["Push to the recipient's<br/>sync queue"]
    FAN -->|"Group of 100"| GRP["One sequence per conversation,<br/>recipients pull the delta"]
    FAN -->|"1M subscribers"| BROAD["Never fan out on write<br/>readers pull since their<br/>last sequence number"]
    BROAD --> PUSH["Push a lightweight<br/>notification only, no payload"]
    GRP --> SYNC["Sync ack per device,<br/>cursor stored per client"]
`, 'Store once with a sequence number; push is a nudge, the pull is the source of truth'));

    section.appendChild(tableCard('📐 Chat Capacity', ['Quantity', 'Math', 'Number'], [
        ['Daily active users', 'given', '10M'],
        ['Messages', '20 per user per day', '200M messages/day'],
        ['Message throughput', '200M / 86,400 &times; 10 burst', '&#8776; 23K messages/s peak'],
        ['Message row', 'payload plus metadata', '&#8776; 200 B'],
        ['Storage', '200M &times; 200 B', '&#8776; 40 GB/day, 15 TB/year'],
        ['1:1 fan-out', '2 recipients per message', '46K deliveries/s'],
        ['Group of 100', '100 deliveries per message', '&#8776; 2.3M deliveries/s'],
        ['Broadcast to 1M', '1M deliveries per message', '23M msg/s &times; 1M — impossible on write'],
        ['Sync traffic', '10M users &times; 100 pings/day &times; 1 KB', '&#8776; 1 GB/day'],
        ['Encryption cost', '200M messages &times; per-device keys', 'the real bottleneck, not storage'],
    ]));

    section.appendChild(card('⚠️ Chat Failure Modes', `
        <ul>
            <li><strong>Duplicate and reordered delivery</strong> — clients dedupe on
            (conversation, sequence number) and fetch a range, never a position.</li>
            <li><strong>Ordering breaks with multiple senders</strong> — order within a conversation is
            the server-assigned sequence, never the client timestamp.</li>
            <li><strong>Receipts that lie</strong> — a delivered receipt can arrive after a later read
            receipt. Monotonic per-recipient state, never decrementing counters.</li>
            <li><strong>End-to-end encryption and fan-out</strong> — a group key must be available to
            every member; the sender ships a new key to devices it can reach, and everyone else needs it
            fetched on next connect.</li>
            <li><strong>Sync storms on reconnect</strong> — a plane lands and 200 devices reconnect at
            once. Stagger with jitter and cap concurrent syncs.</li>
            <li><strong>Media upload death spiral</strong> — a large upload retries forever on a flaky
            link. Resumable, chunked uploads with an explicit abort.</li>
        </ul>
    `));

    // ── remaining reference designs ───────────────────────────────────
    const problems: string[] = [
        'WhatsApp', 'YouTube', 'Instagram', 'Uber', 'Netflix', 'Twitter/X',
        'Notification System', 'Payment System', 'File Storage', 'Search System',
        'AI Chatbot', 'RAG Platform', 'Agent Platform'
    ];

    section.appendChild(card('📚 The Other Reference Designs', `
        <p>Each of these has one decision that dominates the rest of the design. Know the decision and
        the capacity anchor for each, and you can rebuild the architecture in an interview.</p>
    `));
    section.appendChild(tableCard('🗺️ Reference Designs at a Glance', ['Design', 'Dominant decision', 'Capacity anchor'], [
        ['YouTube', 'video is written once and read 1000&times; — transcode async, serve from CDN', '1M hours/day uploaded &rarr; ~100 GB/s egress'],
        ['Netflix', 'cache the top of the catalogue on CDN edge boxes; the origin serves the long tail', '70% of viewing from the top 1000 titles'],
        ['Instagram', 'fan-out hybrid for feeds; media through a CDN with derived sizes', '500M photos/day &rarr; 80 GB/day of media'],
        ['Uber', 'match in real time — the matching service must answer in ~1 s', '10M rides/day, geospatial index on cell + H3'],
        ['Twitter/X', 'hybrid feed, separate write path for celebrities, immutable post ids', '300M posts/day &rarr; ~15B timeline writes/day'],
        ['Notification', 'tiered fan-out with provider quotas and per-user rate limits', '1B pushes/day with 2% to 5% OS delivery rates'],
        ['Payment', 'exactly-once charging with idempotency keys, ledger not state, saga over PSPs', 'double-entry ledger, reconciliation, PCI scope'],
        ['File storage', 'content-addressed blobs + a metadata store; everything else is derived', 'S3-style durability, presigned URLs, multipart'],
        ['Search', 'inverted index built incrementally from an event stream; no live indexing', 'crawl 10B docs, serve 100K QPS at p99 &lt; 200 ms'],
        ['AI Chatbot', 'streaming responses, per-user concurrency caps, prompt caching', 'streams are 50&times; the tokens of a normal request'],
        ['RAG Platform', 'embed once, hybrid retrieval, rerank, cite; never retrieve unbounded', 'chunk + embedding cost dominates storage'],
        ['Agent Platform', 'durable execution: checkpoint every step so a crash resumes', '10+ tool calls per task, each one a distributed call'],
    ]));

    problems.forEach(p => {
        section.appendChild(card(`Design ${p}`, `
            <p><strong>Requirements:</strong> state the functional scope in one sentence, then the
            non-functional constraints — scale, read/write ratio, latency budget, and the one guarantee
            that must never break.</p>
            <p><strong>Capacity:</strong> show DAU to requests per second, requests per second to
            storage, and storage to bandwidth. Round hard, keep the arithmetic visible.</p>
            <p><strong>Architecture:</strong> name the dominant decision (fan-out model, storage
            strategy, consistency choice), then draw one concrete request end to end.</p>
            <p><strong>Trade-offs:</strong> state what you gave up. Every design above pays for its
            speed with staleness, its scale with coordination, or its cost with latency.</p>
        `));
    });

    section.appendChild(qaCard([
        ['How do you open a system design interview?',
            'Clarify for about five minutes before drawing anything: who uses it, what it must do, what the scale is, the read/write ratio, and which guarantee matters most. Then state the numbers you are assuming out loud. The interviewer is checking whether you can scope a problem — drawing boxes first is the fastest way to fail.'],
        ['Walk me through the URL shortener.',
            'Counter or hash for the id, base62 encode to seven characters, store id to URL in a sharded KV store, cache the hot keys, put a CDN in front of the redirect. Capacity: 100M new links/day, 100:1 read amplification, so ~1.16M reads/s at peak and 232 MB/s. Deep dive on id generation: an atomic counter is unique but a hotspot, so shard the counter by allocating ranges.'],
        ['Why not just use the hash of the URL as the id?',
            'It removes the counter hotspot and makes generation decentralised, but collisions become possible and the same URL always produces the same id — which is sometimes a feature and sometimes leaks how often a link was shared. Also, with a hash you cannot enumerate or expire by time. Both designs are defensible; say which trade-off you are making.'],
        ['Fan-out on read or fan-out on write for a feed?',
            'Pull is right when most users have few follows and write rarely: writing is one insert and reads do the merge. Push is right when read volume is enormous and follows are dense. Real systems split by follower count — push for the long tail of authors with few followers, pull for the celebrities. The arithmetic decides it: 116K reads/s times 200 follows is 23M item fetches/s for pure pull, and 4B writes/day for pure push.'],
        ['How do you send a message to a million people in chat?',
            'Store the message once with a sequence number and push only a lightweight notification. Each client pulls everything after the last sequence it saw. Delivery is then a pull-time cost per device, not a write-time fan-out per recipient — the broadcast becomes one write plus one notification.'],
        ['What is the most common mistake candidates make?',
            'Jumping to a technology before doing the maths, and describing an average-heavy design while the real product is tail-dominated. The second most common is having no failure story: if you cannot say what happens when a shard dies, when a cache goes cold, or when a consumer restarts, the design is incomplete regardless of how elegant the diagram is.'],
    ]));

    container.appendChild(section);
}
