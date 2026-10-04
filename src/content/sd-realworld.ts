// src/content/sd-realworld.ts
import { registerContent } from "./registry";

registerContent({
    id: "sd-realworld",
    title: "Real-World System Designs",
    blocks: [
        {
            kind: "card",
            title: "The Framework Every Question Uses",
            html:
                "<p>Interviews are not about the diagram. They are about the <strong>order</strong> in " +
                "which you reason, and the numbers you commit to along the way.</p>" +
                '<ol style="font-size:15px;color:var(--ink);line-height:1.6">' +
                "<li><strong>Clarify requirements</strong> — 5 minutes. Functional: what does it do, " +
                "for whom? Non-functional: how many users, what read/write ratio, what latency and " +
                "durability? Pick a scale and say it out loud; the interviewer will correct you if " +
                "it is off.</li>" +
                "<li><strong>Estimate capacity</strong> — DAU to requests per second, requests to " +
                "storage, storage to bandwidth. Show the arithmetic, not the conclusion.</li>" +
                "<li><strong>Define the interface</strong> — the API shape and the read/write split. " +
                "This forces you to think about the access pattern.</li>" +
                "<li><strong>High-level design</strong> — services, storage, caching, queues. Draw " +
                "the data path for one concrete request, not just the boxes.</li>" +
                "<li><strong>Deep dive</strong> — pick the <em>one</em> component the interviewer " +
                "cares about and go three levels deep. Pick your own: that is what separates a " +
                "candidate who knows a design from one who memorised a list.</li>" +
                "<li><strong>Failure and trade-offs</strong> — what happens when a box dies, a shard " +
                "is slow, or the cache goes cold. This is where the strongest answers are won.</li>" +
                "</ol>" +
                "<p><strong>The invariant of the whole exercise:</strong> <b>every number in your " +
                "design must follow from a number you were given or estimated.</b> 10,000 users per " +
                "second is a choice you made; every downstream figure has to be traceable to it.</p>",
        },
        // ── URL shortener ───────────────────────────────────────────────
        {
            kind: "card",
            title: "Design: URL Shortener",
            html:
                "<p><strong>Requirements.</strong> Given a long URL, return a short one. Given the " +
                "short one, redirect. Reads outnumber writes by 100&times;1, and every read is a 301 " +
                "that must be globally available within milliseconds. Durability matters only for " +
                "writes — losing a redirect is a broken link, losing the write is the same as never " +
                "creating it.</p>" +
                "<p><strong>Core idea.</strong> The system is a key-value store with a cache in front " +
                "and a CDN on top. The only interesting design decision is how the short id is " +
                "generated: an atomic counter (unique, sequential, one point of contention) or a hash " +
                "of the URL (decentralised, but you must handle collisions).</p>",
        },
        {
            kind: "diagram",
            caption:
                "A shortener is a KV store with two caches; id generation is the only real design decision",
            source: `flowchart LR
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
    CDNC --> CACHE`,
        },
        {
            kind: "card",
            title: "Key Detail: 7 characters Are Enough",
            html:
                '<pre><code class="language-javascript">// base62 alphabet: 0-9, a-z, A-Z  =&gt;  62 symbols\n' +
                "// 62^5 = 916M     too few\n" +
                "// 62^6 = 56.8B    below one year of new links\n" +
                "// 62^7 = 3.52T    comfortably above ~100 years at 100M links/day\n" +
                "const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';\n" +
                "\n" +
                "function encodeId(counter) {\n" +
                "    let out = '';\n" +
                "    let n = counter;\n" +
                "    while (n &gt; 0) {\n" +
                "        out = ALPHABET[n % 62] + out;   // least significant digit first\n" +
                "        n = Math.floor(n / 62);\n" +
                "    }\n" +
                "    return out;\n" +
                "}\n" +
                "\n" +
                "// Sequential ids are enumerable: /a, /b, /c lets anyone walk your whole table.\n" +
                "// Start the counter at a random 6-digit offset, or shuffle the alphabet per deployment.\n" +
                "function makeId() {\n" +
                "    return encodeId(START_OFFSET + counter.incr());\n" +
                "}</code></pre>",
        },
        {
            kind: "table",
            title: "URL Shortener Capacity",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                ["New URLs per day", "given", "100M/day"],
                [
                    "Write throughput",
                    "100M / 86,400 &times; 10 burst",
                    "&#8776; 11,600 writes/s peak",
                ],
                ["Read amplification", "100:1 read to write", "10B reads/day"],
                [
                    "Read throughput",
                    "10B / 86,400 &times; 10 burst",
                    "&#8776; 1.16M reads/s peak",
                ],
                [
                    "Bandwidth",
                    "1.16M &times; 200 B redirect",
                    "&#8776; 232 MB/s, ~1.9 Gbps",
                ],
                [
                    "Storage per year",
                    "100M &times; 365 &times; 300 B",
                    "&#8776; 11 TB/year",
                ],
                [
                    "Id length needed",
                    "62^7 = 3.52T vs 36.5B/year",
                    "7 characters",
                ],
                [
                    "Cache sizing",
                    "top 20% of links carry 80% of reads<br/>7.3B keys is too big for one cache",
                    "CDN edge first, then a regional cache",
                ],
                [
                    "Redirect latency budget",
                    "CDN hit 10 ms, cache hit 1 ms, miss 40 ms",
                    "p99 target 100 ms",
                ],
            ],
        },
        {
            kind: "card",
            title: "URL Shortener Failure Modes",
            html:
                "<ul>" +
                "<li><strong>Counter hotspot</strong> — a single Redis key taking 11,600 writes/s. " +
                "Shard the counter (allocate ranges per writer) or use a Snowflake-style time-prefixed " +
                "id.</li>" +
                "<li><strong>Cache stampede on a viral link</strong> — one hot key expiring. Logical " +
                "expiry plus a CDN with a long TTL.</li>" +
                "<li><strong>Deleted or modified targets</strong> — 301s are cached by browsers for a " +
                "year and cannot be revoked. Decide the policy explicitly: 302 for mutable targets, " +
                "301 only for immutable ones.</li>" +
                "<li><strong>Hash collisions</strong> — with a hashed id, two URLs can map to one. " +
                "Resolve by storing a short URL fingerprint and regenerating on collision.</li>" +
                "<li><strong>Abuse and enumeration</strong> — sequential ids invite crawling. " +
                "Randomise the start offset and rate-limit by IP and by target domain.</li>" +
                "</ul>",
        },
        // ── News feed ───────────────────────────────────────────────────
        {
            kind: "card",
            title: "Design: News Feed",
            html:
                "<p><strong>Requirements.</strong> Each user sees the newest posts from the accounts " +
                "they follow, ordered by recency. Highly read, lightly written, and intensely " +
                "personalised — which is exactly why the fan-out decision dominates the " +
                "design.</p>" +
                "<p><strong>Core idea.</strong> Fan-out on read is cheap to write and expensive to " +
                "read; fan-out on write is the opposite. Real systems split by follower count rather " +
                "than picking a side.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Pure pull and pure push both blow up; the hybrid bounds each side",
            source: `flowchart TD
    POST["A user posts"] --> N{"How is the feed assembled?"}
    N -->|"Fan out on read"| FR["At read time, pull the newest items<br/>from every follow and merge<br/>cheap write, expensive read"]
    N -->|"Fan out on write"| FW["At write time, push the item into<br/>every follower's precomputed list<br/>expensive write, read is trivial"]
    N -->|"Hybrid"| HY["Push for the few authors with many followers,<br/>pull for the long tail at read time"]
    FR --> FRP["200 follows &times; 116K reads/s<br/>= 23M item fetches/s — unaffordable"]
    FW --> FWP["20M posts/day &times; 200 followers<br/>= 4B writes/day — also unaffordable"]
    HY --> OK["Bounded on both sides:<br/>push where fan-out is small, pull where it is large"]`,
        },
        {
            kind: "table",
            title: "News Feed Capacity",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                ["Daily active users", "given", "5M"],
                ["Feed loads", "200 per user per day", "1B reads/day"],
                [
                    "Read throughput",
                    "1B / 86,400 &times; 10 burst",
                    "&#8776; 116K feed reads/s peak",
                ],
                [
                    "Follows",
                    "500M total, 200 per user",
                    "merge cost per read = 200 items",
                ],
                ["Pull cost", "116K &times; 200", "&#8776; 23M item fetches/s"],
                [
                    "Push cost",
                    "20M posts/day &times; 200 followers",
                    "&#8776; 4B writes/day",
                ],
                [
                    "Hybrid push set",
                    "authors with &lt;1000 followers, avg 100",
                    "&#8776; 2B pushes/day = 23K msg/s",
                ],
                [
                    "Feed storage",
                    "200 items &times; 500 B per user",
                    "&#8776; 500 GB for 5M users",
                ],
                [
                    "Cache target",
                    "20% hottest feeds &rarr; 80% of reads",
                    "100 GB, fits comfortably",
                ],
            ],
        },
        {
            kind: "card",
            title: "News Feed Failure Modes",
            html:
                "<ul>" +
                "<li><strong>Celebrity writes</strong> — one post to 10M followers is 10M writes. " +
                "Cap it: push a notification and let readers pull.</li>" +
                "<li><strong>Fan-out queue explosion</strong> — a viral post backs the queue up for " +
                "hours. Bound the queue, drop to pull-only for very high follower counts.</li>" +
                "<li><strong>Cancelled or deleted posts</strong> — they are already in thousands of " +
                "feeds. Tombstones plus a fan-out delete, or accept eventual removal.</li>" +
                "<li><strong>Ranking regression</strong> — a new model changes feed contents " +
                "globally. Shadow-run it against the old ranking before flipping.</li>" +
                "<li><strong>Unfollowing does not clean up</strong> — precomputed lists keep items " +
                "from unfollowed accounts. Filter at read time as well as delete asynchronously.</li>" +
                "</ul>",
        },
        // ── Chat ────────────────────────────────────────────────────────
        {
            kind: "card",
            title: "Design: Chat (WhatsApp)",
            html:
                "<p><strong>Requirements.</strong> Deliver messages to recipients who may be offline, " +
                "preserve per-conversation order, show delivery and read receipts, work on flaky " +
                "mobile networks, and scale to conversations with a million subscribers.</p>" +
                "<p><strong>Core idea.</strong> Store each message <strong>once</strong>, assign a " +
                "monotonic sequence number per conversation, and have clients pull everything after " +
                "the last sequence they saw. Push is only a nudge to come and pull. That single " +
                "decision is what makes a million-recipient broadcast one write instead of a " +
                "million.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Store once with a sequence number; push is a nudge, the pull is the source of truth",
            source: `flowchart TD
    S["Sender sends a message"] --> ST[("Store ONCE,<br/>assign sequence 4172")]
    ST --> FAN{"How does it reach recipients?"}
    FAN -->|"1:1 chat"| ONE["Push to the recipient's<br/>sync queue"]
    FAN -->|"Group of 100"| GRP["One sequence per conversation,<br/>recipients pull the delta"]
    FAN -->|"1M subscribers"| BROAD["Never fan out on write<br/>readers pull since their<br/>last sequence number"]
    BROAD --> PUSH["Push a lightweight<br/>notification only, no payload"]
    GRP --> SYNC["Sync ack per device,<br/>cursor stored per client"]`,
        },
        {
            kind: "table",
            title: "Chat Capacity",
            headers: ["Quantity", "Math", "Number"],
            rows: [
                ["Daily active users", "given", "10M"],
                ["Messages", "20 per user per day", "200M messages/day"],
                [
                    "Message throughput",
                    "200M / 86,400 &times; 10 burst",
                    "&#8776; 23K messages/s peak",
                ],
                ["Message row", "payload plus metadata", "&#8776; 200 B"],
                [
                    "Storage",
                    "200M &times; 200 B",
                    "&#8776; 40 GB/day, 15 TB/year",
                ],
                ["1:1 fan-out", "2 recipients per message", "46K deliveries/s"],
                [
                    "Group of 100",
                    "100 deliveries per message",
                    "&#8776; 2.3M deliveries/s",
                ],
                [
                    "Broadcast to 1M",
                    "1M deliveries per message",
                    "23M msg/s &times; 1M — impossible on write",
                ],
                [
                    "Sync traffic",
                    "10M users &times; 100 pings/day &times; 1 KB",
                    "&#8776; 1 GB/day",
                ],
                [
                    "Encryption cost",
                    "200M messages &times; per-device keys",
                    "the real bottleneck, not storage",
                ],
            ],
        },
        {
            kind: "card",
            title: "Chat Failure Modes",
            html:
                "<ul>" +
                "<li><strong>Duplicate and reordered delivery</strong> — clients dedupe on " +
                "(conversation, sequence number) and fetch a range, never a position.</li>" +
                "<li><strong>Ordering breaks with multiple senders</strong> — order within a " +
                "conversation is the server-assigned sequence, never the client timestamp.</li>" +
                "<li><strong>Receipts that lie</strong> — a delivered receipt can arrive after a later " +
                "read receipt. Monotonic per-recipient state, never decrementing counters.</li>" +
                "<li><strong>End-to-end encryption and fan-out</strong> — a group key must be " +
                "available to every member; the sender ships a new key to devices it can reach, and " +
                "everyone else needs it fetched on next connect.</li>" +
                "<li><strong>Sync storms on reconnect</strong> — a plane lands and 200 devices " +
                "reconnect at once. Stagger with jitter and cap concurrent syncs.</li>" +
                "<li><strong>Media upload death spiral</strong> — a large upload retries forever on " +
                "a flaky link. Resumable, chunked uploads with an explicit abort.</li>" +
                "</ul>",
        },
        // ── remaining reference designs ─────────────────────────────────
        {
            kind: "card",
            title: "The Other Reference Designs",
            html:
                "<p>Each of these has one decision that dominates the rest of the design. Know the " +
                "decision and the capacity anchor for each, and you can rebuild the architecture in " +
                "an interview.</p>",
        },
        {
            kind: "table",
            title: "Reference Designs at a Glance",
            headers: ["Design", "Dominant decision", "Capacity anchor"],
            rows: [
                [
                    "YouTube",
                    "video is written once and read 1000&times; — transcode async, serve from CDN",
                    "1M hours/day uploaded &rarr; ~100 GB/s egress",
                ],
                [
                    "Netflix",
                    "cache the top of the catalogue on CDN edge boxes; the origin serves the long tail",
                    "70% of viewing from the top 1000 titles",
                ],
                [
                    "Instagram",
                    "fan-out hybrid for feeds; media through a CDN with derived sizes",
                    "500M photos/day &rarr; 80 GB/day of media",
                ],
                [
                    "Uber",
                    "match in real time — the matching service must answer in ~1 s",
                    "10M rides/day, geospatial index on cell + H3",
                ],
                [
                    "Twitter/X",
                    "hybrid feed, separate write path for celebrities, immutable post ids",
                    "300M posts/day &rarr; ~15B timeline writes/day",
                ],
                [
                    "Notification",
                    "tiered fan-out with provider quotas and per-user rate limits",
                    "1B pushes/day with 2% to 5% OS delivery rates",
                ],
                [
                    "Payment",
                    "exactly-once charging with idempotency keys, ledger not state, saga over PSPs",
                    "double-entry ledger, reconciliation, PCI scope",
                ],
                [
                    "File storage",
                    "content-addressed blobs + a metadata store; everything else is derived",
                    "S3-style durability, presigned URLs, multipart",
                ],
                [
                    "Search",
                    "inverted index built incrementally from an event stream; no live indexing",
                    "crawl 10B docs, serve 100K QPS at p99 &lt; 200 ms",
                ],
                [
                    "AI Chatbot",
                    "streaming responses, per-user concurrency caps, prompt caching",
                    "streams are 50&times; the tokens of a normal request",
                ],
                [
                    "RAG Platform",
                    "embed once, hybrid retrieval, rerank, cite; never retrieve unbounded",
                    "chunk + embedding cost dominates storage",
                ],
                [
                    "Agent Platform",
                    "durable execution: checkpoint every step so a crash resumes",
                    "10+ tool calls per task, each one a distributed call",
                ],
            ],
        },
        // The legacy page rendered this scaffold once per reference design via a
        // forEach over the design names. The content model has no way to express
        // "instantiate one card N times", so it was inlined below 13 times with
        // byte-identical prose. Collapsed to a single card that names the designs
        // it covers, which is what the forEach was expressing.
        {
            kind: "card",
            title: "Shared Answer Scaffold — applies to all 13 reference designs",
            html: `
                <p>Every reference design on this page is answered with the same four
                moves. Work through them in order; only the numbers and the dominant
                decision change from design to design.</p>
                <p><strong>Requirements:</strong> state the functional scope in one sentence,
                then the non-functional constraints — scale, read/write ratio, latency budget,
                and the one guarantee that must never break.</p>
                <p><strong>Capacity:</strong> show DAU to requests per second, requests per
                second to storage, and storage to bandwidth. Round hard, keep the arithmetic
                visible.</p>
                <p><strong>Architecture:</strong> name the dominant decision (fan-out model,
                storage strategy, consistency choice), then draw one concrete request end to
                end.</p>
                <p><strong>Trade-offs:</strong> state what you gave up. Every design above pays
                for its speed with staleness, its scale with coordination, or its cost with
                latency.</p>
                <p><strong>The 13 designs it covers:</strong></p>
                <ul><li>WhatsApp</li><li>YouTube</li><li>Instagram</li><li>Uber</li>
                <li>Netflix</li><li>Twitter/X</li><li>Notification System</li>
                <li>Payment System</li><li>File Storage</li><li>Search System</li>
                <li>AI Chatbot</li><li>RAG Platform</li><li>Agent Platform</li></ul>
                <p>Each is also summarised in the reference table above.</p>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "How do you open a system design interview?",
                    a:
                        "<p>Clarify for about five minutes before drawing anything: who uses it, what " +
                        "it must do, what the scale is, the read/write ratio, and which guarantee " +
                        "matters most. Then state the numbers you are assuming out loud. The " +
                        "interviewer is checking whether you can scope a problem — drawing boxes " +
                        "first is the fastest way to fail.</p>",
                },
                {
                    q: "Walk me through the URL shortener.",
                    a:
                        "<p>Counter or hash for the id, base62 encode to seven characters, store id " +
                        "to URL in a sharded KV store, cache the hot keys, put a CDN in front of the " +
                        "redirect. Capacity: 100M new links/day, 100:1 read amplification, so " +
                        "~1.16M reads/s at peak and 232 MB/s. Deep dive on id generation: an atomic " +
                        "counter is unique but a hotspot, so shard the counter by allocating " +
                        "ranges.</p>",
                },
                {
                    q: "Why not just use the hash of the URL as the id?",
                    a:
                        "<p>It removes the counter hotspot and makes generation decentralised, but " +
                        "collisions become possible and the same URL always produces the same id — " +
                        "which is sometimes a feature and sometimes leaks how often a link was " +
                        "shared. Also, with a hash you cannot enumerate or expire by time. Both " +
                        "designs are defensible; say which trade-off you are making.</p>",
                },
                {
                    q: "Fan-out on read or fan-out on write for a feed?",
                    a:
                        "<p>Pull is right when most users have few follows and write rarely: writing " +
                        "is one insert and reads do the merge. Push is right when read volume is " +
                        "enormous and follows are dense. Real systems split by follower count — push " +
                        "for the long tail of authors with few followers, pull for the celebrities. " +
                        "The arithmetic decides it: 116K reads/s times 200 follows is 23M item " +
                        "fetches/s for pure pull, and 4B writes/day for pure push.</p>",
                },
                {
                    q: "How do you send a message to a million people in chat?",
                    a:
                        "<p>Store the message once with a sequence number and push only a lightweight " +
                        "notification. Each client pulls everything after the last sequence it saw. " +
                        "Delivery is then a pull-time cost per device, not a write-time fan-out per " +
                        "recipient — the broadcast becomes one write plus one notification.</p>",
                },
                {
                    q: "What is the most common mistake candidates make?",
                    a:
                        "<p>Jumping to a technology before doing the maths, and describing an " +
                        "average-heavy design while the real product is tail-dominated. The second " +
                        "most common is having no failure story: if you cannot say what happens when " +
                        "a shard dies, when a cache goes cold, or when a consumer restarts, the " +
                        "design is incomplete regardless of how elegant the diagram is.</p>",
                },
            ],
        },
    ],
});
