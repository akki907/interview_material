// src/content/ai-vector-db.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-vector-db",
    title: "Vector Databases",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html:
                "<p>A vector database answers <code>find the k vectors most similar to this query, among billions,\n" +
                "in single-digit milliseconds</code>. Exact search is a full scan — O(N) distance computations per\n" +
                "query, which is 1 billion comparisons for a 1-billion-vector index. Approximate nearest neighbour\n" +
                "trades a little recall for orders of magnitude of speed, and the entire field is a catalogue of\n" +
                "ways to be approximately right cheaply.</p>\n" +
                "<p><b>The invariant:</b> an index is a <em>lossy summary of the space</em>, so recall@10 is a\n" +
                "function of the index <em>parameters</em>, not of the data alone. \"95% recall\" is meaningless\n" +
                "without the corpus size, the query distribution, and the <code>ef_search</code> / probe count\n" +
                "that produced it. If you cannot state those, you have not measured recall — you have measured\n" +
                "latency.</p>\n" +
                "<p><b>Filter-then-search vs search-then-filter.</b> This single distinction explains most of the\n" +
                "architectural variety. Pre-filtering applies metadata predicates inside the index and searches\n" +
                "only the survivors (correct, but the index must be able to use the filter — IVF often cannot\n" +
                "selectively, HNSW degrades toward a scan). Post-filtering searches first and drops non-matches\n" +
                "afterwards, which silently returns fewer than k results when the predicate is selective. The\n" +
                "\"hybrid\" behaviour where you get <em>fewer</em> than k results is almost always this, not a bug\n" +
"in your data.</p>",
        },
        {
            kind: "card",
            title: "What happens on a search",
            html:
                "<p>Three stages, and each index type differs only in the first one. Stage 2 is cheap, stage 3 is\n" +
                "where recall is finally decided, and stage 2 is the one people forget when tuning — searching\n" +
                "<code>ef = 200</code> candidates and keeping 10 is far more reliable than searching 10 and\n" +
"hoping.</p>",
        },
        {
            kind: "diagram",
            caption: "Only the first box differs between index types; the candidate-set-then-rerank tail is identical and is where most of the recall comes from",
            source: `flowchart TD
    Q["Query vector arrives<br/>plus optional metadata filter"] --> NORM["L2 normalise<br/>must match how vectors were written"]
    NORM --> IDX{"Which index?"}
    IDX -->|"HNSW"| H["Greedy walk a layered graph<br/>entry point, then descend<br/>ef_search candidates per layer"]
    IDX -->|"IVF, inverted file"| I["Assign query to one or a few<br/>list centroids, scan only those lists"]
    IDX -->|"PQ compressed"| P["Decode a small code per vector<br/>then score with a lookup table"]
    H --> CAND["Candidate set, typically 10x to 50x k"]
    I --> CAND
    P --> CAND
    CAND --> RESCORE["Exact distance on the full vectors<br/>this is where recall is recovered"]
    RESCORE --> TOPK["Sort, apply post-filter, return top k<br/>plus the raw text for citation"]`,
        },
        {
            kind: "card",
            title: "Which index, and when",
            html:
                "<p>Follow the decision tree. Two rules dominate: below ~100k vectors just brute-force, and above\n" +
                "~10M with a memory budget that cannot hold the vectors, reach for compression. Everything in\n" +
"between is HNSW, because its quality/memory knob is the most predictable.</p>",
        },
        {
            kind: "diagram",
            caption: "Below ~100k vectors brute force is the right answer; HNSW owns the middle; compression is a last resort that needs a measured recall budget",
            source: `flowchart TD
    START["How many vectors<br/>and how much RAM?"] --> SMALL{"Under about 100k?"}
    SMALL -->|"yes"| FLAT["Flat, brute-force scan<br/>exact, no tuning, no recall loss,<br/>a few ms on a modern core"]
    SMALL -->|"no"| MEM{"Does the vector set<br/>fit in RAM with<br/>graph overhead?"}
    MEM -->|"yes"| HNSW["HNSW<br/>sub-millisecond, high recall,<br/>tune M for memory and ef_search for recall"]
    MEM -->|"no"| COMP{"Do you need that<br/>much recall?"}
    COMP -->|"yes"| DISK["Disk-backed HNSW or a<br/>tiered store with a hot cache"]
    COMP -->|"no"| COMPACT["IVF plus PQ or scalar quantisation<br/>10x to 64x smaller,<br/>recall drops and must be measured"]`,
        },
        {
            kind: "table",
            title: "Index comparison",
            headers: ["Index","Build","Query","Recall","Knobs that matter"],
            rows: [
                ["Flat (brute force)","O(n) to store, nothing to build","O(n), embarrassingly parallel","<b>Exact — 100%</b>","batch size, SIMD, GPU"],
                ["HNSW","O(n log n)","roughly O(log n) for small <code>ef_search</code>","High, tunable","<code>M</code> links per node, <code>ef_construction</code>, <code>ef_search</code>"],
                ["IVF","O(n) to train centroids, then assign","O(n / nprobe)","Medium, collapses for outlier queries","<code>nlist</code>, <code>nprobe</code>"],
                ["IVF + PQ","same, plus a codebook per subspace","same, cheaper per candidate","Noticeably lower","<code>m</code> subspaces, codebook size"],
                ["Disk-backed graph","slower build","page reads dominate","High if cached well","cache budget vs index size"],
                ["Flat + GPU","same as flat","very fast, bandwidth-bound","Exact","batch size, VRAM"],
            ],
        },
        {
            kind: "card",
            title: "Worked example: HNSW parameters against measured recall",
            html:
                "<p>Same 1M-chunk corpus, same 200 held-out queries with a known relevant chunk, d = 1536.\n" +
                "Latency is p99, recall is recall@10. The numbers below are the shape of a real sweep, not\n" +
                "someone's vendor table — the point is that <b>memory and latency trade directly against\n" +
                "recall</b>, and both are yours to spend.</p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>M</th><th>ef_search</th><th>Memory</th><th>p99 latency</th><th>Recall@10</th></tr>\n" +
                "<tr><td>8</td><td>50</td><td>~1.3 GB</td><td>~2 ms</td><td>0.82</td></tr>\n" +
                "<tr><td>16</td><td>50</td><td>~1.9 GB</td><td>~3 ms</td><td>0.91</td></tr>\n" +
                "<tr><td>16</td><td>200</td><td>~1.9 GB</td><td>~6 ms</td><td>0.97</td></tr>\n" +
                "<tr><td>32</td><td>200</td><td>~3.4 GB</td><td>~11 ms</td><td>0.99</td></tr>\n" +
                "<tr><td>32</td><td>500</td><td>~3.4 GB</td><td>~24 ms</td><td>0.995</td></tr>\n" +
                "</table>\n" +
                "<p>Read the two ends: <code>M</code> buys recall almost for free (1.9&nbsp;GB to 3.4&nbsp;GB for\n" +
                "0.91&nbsp;&rarr;&nbsp;0.99) while <code>ef_search</code> buys it expensively (6&nbsp;ms to\n" +
                "24&nbsp;ms for 0.97&nbsp;&rarr;&nbsp;0.995). So the tuning order is: raise <code>M</code> until\n" +
                "memory binds, then raise <code>ef_search</code> only for the queries that need it — which is why\n" +
"per-query adaptive <code>ef_search</code> beats one global value.</p>",
        },
        {
            kind: "card",
            title: "Implementation: a search you can actually reason about",
            html:
                "<pre><code class=\"language-javascript\">const hits = await index.search({\n" +
                "  vector: normalize(queryVec),      // 1. must be the same normalisation used at write time\n" +
                "  topK: 20,                         // 2. over-fetch. retrieve 20, rerank, then take 5 —\n" +
                "                                    //    a vector index has no notion of which 5 matter,\n" +
                "                                    //    so it cannot be the thing that picks the final k\n" +
                "  filter: { tenantId: 'acme', docType: 'runbook' },\n" +
                "  efSearch: 200,                    // 3. search 200 candidates, not 20. recall lives in the\n" +
                "                                    //    candidate pool, not in the final slice\n" +
                "  returnMetadata: ['docId', 'chunkText', 'sourceUrl'],   // 4. return the text too, so the\n" +
                "                                    //    prompt build needs no second database round trip\n" +
                "});\n" +
                "if (hits.length &lt; 5) {\n" +
                "  // 5. pre-filtered search can legitimately return fewer than topK. that is a signal\n" +
                "  //    your predicate is too selective, not that the index is broken\n" +
                "  metrics.increment('vector.search.underfilled', { tenant: 'acme' });\n" +
                "}</code></pre>\n" +
                "<p><strong>Line notes.</strong> Over-fetching is the single highest-leverage habit here, because\n" +
                "it converts an approximate index into a good candidate generator for an exact reranker.\n" +
                "Normalisation drift between write and query is the second most common cause of mysteriously bad\n" +
                "recall. And a <code>returnMetadata</code> that carries the chunk text removes a whole database\n" +
"query from the hot path.</p>",
        },
        {
            kind: "table",
            title: "Cost and latency",
            headers: ["Quantity","Rule","Why it matters"],
            rows: [
                ["Memory","<code>n &times; (4d bytes + M &times; 2 &times; 4 bytes)</code>","at 10M vectors and d=1536 with M=16 that is roughly 80 GB — this is the number that forces a sharded or compressed design"],
                ["Build time","seconds to minutes per million vectors, index-type dependent","a re-embed is also a re-build; budget the whole job"],
                ["Query cost, memory-resident","sub-millisecond to low single-digit ms","the network round trip usually dominates, not the search"],
                ["Query cost, disk-backed","page reads, milliseconds to tens of ms","an SSD and a hot cache are worth more than a cleverer index"],
                ["Write amplification","HNSW inserts touch several graph layers","bulk-load far faster than row-by-row insert — ingest in batches"],
                ["Sharding","partitions multiply recall losses at the boundaries","a query that should span 4 shards may return 4 &times; 10 results and you still take 10"],
                ["Cost control lever","quantise first, add a second index second","a smaller index buys more than a faster instance does"],
            ],
        },
        {
            kind: "card",
            title: "When NOT to use a dedicated vector database",
            html:
                "<ul>\n" +
                "<li><strong>You already run Postgres and have under a few million rows.</strong> <code>pgvector</code>\n" +
                "with an HNSW index is the same algorithm with joins, transactions, backups and no new service. Most\n" +
                "teams that migrate do so for scale reasons, not quality reasons.</li>\n" +
                "<li><strong>The queries are mostly filters, not similarity.</strong> \"All open tickets for this\n" +
                "customer\" wants a B-tree.</li>\n" +
                "<li><strong>The dataset fits in a brute-force scan.</strong> Do not build an index for 2,000\n" +
                "documents; you will add a tuning surface with no payoff.</li>\n" +
                "<li><strong>You cannot evaluate recall.</strong> An approximate index you cannot measure is just a\n" +
                "randomness source, and this is the strongest argument for starting with flat search.</li>\n" +
                "<li><strong>You need transactional consistency with the source data.</strong> Two stores means\n" +
                "eventual consistency and a reconciliation job; that is a real ongoing cost.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Post-filtering silently under-fills.</strong> Filter after a <code>topK=10</code>\n" +
                "search with a 5% selectivity and you get 0 or 1 result. Pre-filter, or over-fetch enough to\n" +
                "survive the filter.</li>\n" +
                "<li><strong>One global <code>ef_search</code> for every query.</strong> Head queries need 20,\n" +
                "tail queries need 500, and one value is wrong for both. Set it per query class.</li>\n" +
                "<li><strong>Deleting vectors does not reclaim memory in every engine.</strong> Tombstones are\n" +
                "normal; compaction has to be scheduled, and forgetting a document for GDPR reasons is not\n" +
                "complete until it runs.</li>\n" +
                "<li><strong>Multi-tenancy via metadata filter on a shared index.</strong> Either the filter is\n" +
                "pre-applied and you get proper isolation, or a bug leaks another tenant's data. Verify which,\n" +
                "per tenant, in a test.</li>\n" +
                "<li><strong>Rebuilding on every re-embed.</strong> Dual-write to a new index and cut over; an\n" +
                "in-place rebuild is a multi-hour outage in the making.</li>\n" +
                "<li><strong>Ignoring the dimension in the index definition.</strong> Re-embedding to a new\n" +
                "dimension against an old index either errors or, worse, silently truncates.</li>\n" +
                "<li><strong>Assuming <code>topK</code> results are the best <code>topK</code>.</strong> They are\n" +
                "the best <em>found</em> topK. That is what the reranker in the next page exists to fix.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Why not just brute-force the cosine similarity?",
                    a:
"<p>Because it is O(n) per query and does not shrink. One billion float32 vectors is 4&nbsp;GB to stream per query; at 100&nbsp;GB/s that is a 40&nbsp;ms floor before any arithmetic, and you pay it on every single request. An approximate index turns that into a graph walk touching a few hundred vectors. Brute force is still the right answer below roughly 100k vectors, where the whole thing fits in cache and the exactness is worth more than the speed.</p>",
                },
                {
                    q: "HNSW vs IVF — when do you pick which?",
                    a:
"<p>HNSW when you need high recall, low latency, and can afford the memory, and when the index must support selective metadata pre-filtering. IVF when the data is large and statistically uniform, when you will compress anyway, and when a training pass over centroids is acceptable. The real differentiator in practice is outlier queries: a query far from every centroid scans the wrong lists and recall craters, which is why IVF-heavy systems probe multiple lists.</p>",
                },
                {
                    q: "How do you decide the recall/latency operating point?",
                    a:
"<p>Take a labelled set of real queries, run an exact flat search to produce the ground-truth top-10, then sweep <code>ef_search</code> and measure recall against it. Plot the curve. The knee is usually around 0.95 recall, and the curve is steep before it and flat after — which is the argument for accepting 0.95 rather than paying 4&times; the latency for 0.995. Then check whether downstream answer quality actually moved; often it does not past 0.9.</p>",
                },
                {
                    q: "Product quantisation — what exactly is being lost?",
                    a:
"<p>The vector is split into <code>m</code> subspaces and each is replaced by the index of its nearest centroid in a learned codebook. Storage drops by roughly <code>32 / (4m)</code> — 768&times; for m=8 at d=1536. What is lost is precision in the distance estimate: PQ ranks by an approximation, so near-ties get ordered wrongly. Rescoring the top candidates against the full vectors recovers most of it, which is why PQ and rescoring are almost always used together.</p>",
                },
                {
                    q: "How would you shard one index across 50 machines?",
                    a:
"<p>Route by a partition key derived from the vector itself — a random hyperplane or the leading bits of the vector — so every query can be fanned out to all shards and each shard returns a local topK. That preserves recall but costs a fan-out to every shard per query. Routing by tenant or by document is much cheaper but caps recall at the true nearest neighbour living in another shard. The fan-out approach is why managed vector services price per query with a per-shard cost multiplier.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "In production",
            html:
                "<ul>\n" +
                "<li><strong>Most traffic never needs the vector index.</strong> Metadata-first resolution\n" +
                "(known doc, known user) beats similarity for a large share of real queries; detect that case\n" +
                "before you search.</li>\n" +
                "<li><strong>Monitor recall proxies in production.</strong> Click-through on cited chunks, answer\n" +
                "abandonment, and reranker score distributions catch a broken index faster than any uptime\n" +
                "metric.</li>\n" +
                "<li><strong>Keep the flat-search oracle.</strong> A periodic exact scan on a sample of queries is\n" +
                "the only way to know whether the index has silently degraded after compaction or deletion.</li>\n" +
                "<li><strong>Over-fetch and rerank as the default pattern.</strong> It makes index tuning\n" +
                "forgiving and pushes quality decisions into a component you can evaluate offline.</li>\n" +
                "<li><strong>Version the index alongside the embedding model.</strong> Records the model, dimension\n" +
                "and index parameters, so a bad week is traceable to a specific combination.</li>\n" +
"</ul>",
        },
    ],
});
