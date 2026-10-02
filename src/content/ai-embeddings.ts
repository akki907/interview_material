// src/content/ai-embeddings.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-embeddings",
    title: "Embeddings",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>An embedding model is a trained function from text (or image, or audio) to a fixed-length\n" +
                "vector, trained so that texts which answer the same question land near each other. It is not a\n" +
                "database and not a search index: it is a <em>geometry function</em>. Everything downstream —\n" +
                "vector databases, semantic caches, clustering, dedup — is bookkeeping on top of the geometry\n" +
                "this one function defines.</p>\n" +
                "<p><b>The invariant:</b> similarity in the vector space is only meaningful for pairs produced by\n" +
                "the <em>same</em> model, at the <em>same</em> dimensionality, with the <em>same</em> preprocessing.\n" +
                "Mixing even two embeddings from the same family's different versions silently produces a\n" +
                "neighbourhood that looks plausible and is wrong, with no error anywhere.</p>\n" +
                "<p><b>Why cosine and not Euclidean.</b> Text length inflates vector magnitude, so a long document\n" +
                "is farther from everything by Euclidean distance even when it is on-topic. Cosine discards\n" +
                "magnitude and keeps direction. If you L2-normalise every vector at write time, cosine similarity\n" +
                "collapses to a plain dot product — which is why most vector databases are fastest on normalised\n" +
                "inputs.</p>\n" +
                "<p>Symmetric embedding models map query and document into the same space. Asymmetric\n" +
                "(question / passage) models map them into deliberately different regions, which usually ranks\n" +
"better for retrieval at the cost of a separate query encoder.</p>",
        },
        {
            kind: "card",
            title: "🔀 From a string to a searchable point",
            html:
                "<p>The two encoder paths differ in one way that matters: a <b>document</b> is embedded once and\n" +
                "reused, so you can spend heavily on it (long input, batching, offline). A <b>query</b> is\n" +
                "embedded on every request inside the user's latency budget, so it is tokenised, sent, and\n" +
                "scored on the critical path. Nearly every cost optimisation in a RAG system is really an attempt\n" +
"to get the query side cheaper.</p>",
        },
        {
            kind: "diagram",
            caption: "The offline index path and the online query path share an encoder but nothing else — mismatching them is the classic silent failure",
            source: `flowchart LR
    subgraph OFF["Offline, once per document"]
        D1["Parse to text<br/>strip boilerplate, keep headings"] --> D2["Tokenise to 512-token windows<br/>then mean-pool or CLS"]
        D2 --> D3["Encoder forward pass<br/>batch 64 or 256 for throughput"]
        D3 --> D4["L2 normalise"] --> D5[("Store vector + id + metadata<br/>in the vector index")]
    end
    subgraph ON["Online, once per query"]
        Q1["User question"] --> Q2["Tokenise, usually under 32 tokens"]
        Q2 --> Q3["Same encoder,<br/>same model, same preprocessing"]
        Q3 --> Q4["L2 normalise"] --> Q5["ANN search, top k neighbours"]
    end
    D5 -.->|"the index the query hits"| Q5`,
        },
        {
            kind: "card",
            title: "🧭 Which retriever handles which failure",
            html:
                "<p>Read the axes as two failure pressures: moving right buys paraphrase tolerance, moving up\n" +
                "costs noise. No point dominates the square, which is exactly why production retrieval is hybrid\n" +
"rather than a single choice.</p>",
        },
        {
            kind: "diagram",
            caption: "No single method owns a corner: exact identifiers favour sparse, paraphrases favour dense, and the top-right corner is what a reranker exists to clean up",
            source: `quadrantChart
    title Where each retrieval method fails
    x-axis "Needs the exact term" --> "Handles paraphrase"
    y-axis "Low risk of noise" --> "High risk of noise"
    quadrant-1 "Dense embeddings"
    quadrant-2 "Hybrid search"
    quadrant-3 "Sparse, BM25 style"
    quadrant-4 "Dense plus a reranker"
    "Exact SKU lookup": [0.08, 0.30]
    "Paraphrased policy question": [0.86, 0.48]
    "Topically right, wrong section": [0.74, 0.92]
    "Rare term, rare phrasing": [0.14, 0.16]`,
        },
        {
            kind: "card",
            title: "🔢 Worked example: computing similarity by hand",
            html:
                "<p>Two 3-dimensional vectors, so the arithmetic is checkable:</p>\n" +
                "<pre><code class=\"language-python\">a = [1.0, 2.0, 3.0]     # \"reset my password\"\n" +
                "b = [4.0, 5.0, 6.0]     # \"forgot password, click here\"\n" +
                "c = [-1.0, 0.0, 1.0]   # \"invoice #4471 due\"\n" +
                "\n" +
                "# dot(a, b) = 4 + 10 + 18 = 32\n" +
                "# |a| = sqrt(1 + 4 + 9)  = 3.7417\n" +
                "# |b| = sqrt(16 + 25 + 36) = 8.7750\n" +
                "# cosine(a, b) = 32 / (3.7417 * 8.7750) = 0.9746\n" +
                "# cosine(a, c) = (-1 + 0 + 3) / (3.7417 * 1.4142) = 2 / 5.2915 = 0.3780</code></pre>\n" +
                "<p>Euclidean for the same pair: <code>sqrt(9 + 9 + 9) = 5.196</code>. Note what normalisation\n" +
                "changes: if <code>a</code> were scaled to <code>[2, 4, 6]</code> — the same meaning, a longer\n" +
                "document — cosine stays 0.9746 while Euclidean drops to 0. That is the entire argument for\n" +
                "cosine, and for normalising before you store.</p>\n" +
                "<p>In practice a real query lands around <b>0.4–0.8 against a relevant chunk</b> and\n" +
                "<b>0.1–0.3 against an irrelevant one</b>, and the margin between those bands is far more\n" +
                "informative than either absolute number. Set your top-k threshold on the margin you observe on\n" +
"your own data, not on a number from a blog post.</p>",
        },
        {
            kind: "table",
            title: "⚙️ Embedding API mechanics",
            headers: ["Choice","Effect","How to decide"],
            rows: [
                ["Dimensionality","storage is <code>4 &times; d</code> bytes per vector, and a d-dimensional index is far more expensive than a lower one","take whatever the model emits; only shorten it if the model was trained for Matryoshka truncation"],
                ["Normalisation","lets the store use dot product, and makes thresholds comparable","always L2-normalise unless your model documentation says otherwise"],
                ["Input truncation","the model silently cuts past its token limit","measure the real distribution of your token lengths; average 0.2% of your corpus being truncated can skew results badly"],
                ["Batching","the only lever on embedding cost and throughput","batch 64&ndash;256 on the ingest path; on the query path, batch concurrent queries together"],
                ["Text preparation","HTML, nav bars, and cookie banners become noise vectors","strip boilerplate at parse time; it is far cheaper to fix than to filter later"],
                ["Asymmetric vs symmetric","asymmetric ranks better for query/document, symmetric halves your model count","use asymmetric for RAG, symmetric for clustering and dedup"],
                ["Fine-tuning","can beat a 3&times; larger general model on a narrow domain","only after you have a labelled set and a measured baseline gap"],
            ],
        },
        {
            kind: "table",
            title: "💰 Cost and latency",
            headers: ["Quantity","Rule of thumb","Note"],
            rows: [
                ["Ingest cost","proportional to total tokens, not document count","a 300-page PDF costs more than 300 one-page docs"],
                ["Ingest rate","batch size times per-batch latency","batching is often a 5&ndash;20&times; throughput win for free"],
                ["Query embedding","one network round trip plus one forward pass","typically 5&ndash;30 ms — a real slice of a 300 ms budget"],
                ["Query-side cost reduction","cache embeddings of repeated queries","identical user phrasing is common enough that a small LRU pays off"],
                ["Storage per vector","<code>d &times; 4</code> bytes raw, plus graph or list overhead","1M vectors at d=1536 is about 6 GB before index overhead"],
                ["HNSW graph overhead","roughly <code>M &times; 2 &times; links</code> bytes on top","at M=16 that is ~128 bytes per vector extra"],
                ["Re-embedding cost","full ingest plus a shadow index rebuild","budget for it before you choose the model, not after"],
            ],
        },
        {
            kind: "card",
            title: "🚫 When NOT to use embeddings",
            html:
                "<ul>\n" +
                "<li><strong>Exact-match filtering over known fields.</strong> A SQL <code>WHERE status = 'open'</code>\n" +
                "beats every vector index; use embeddings to narrow, then a filter to finish.</li>\n" +
                "<li><strong>Precise identifiers.</strong> Order numbers, error codes, and version strings are\n" +
                "exactly the tokens embeddings are worst at, and exactly the tokens users type. Keep BM25 or an\n" +
                "exact-match index alongside.</li>\n" +
                "<li><strong>A corpus under a few thousand items.</strong> Brute-force cosine over 2,000 vectors is\n" +
                "sub-millisecond and needs no index, no recall tuning, and no rebuild story.</li>\n" +
                "<li><strong>You cannot re-embed later.</strong> A model change invalidates every stored vector;\n" +
                "if there is no ingest pipeline to rebuild against, embeddings are a one-way door.</li>\n" +
                "<li><strong>High-cardinality categorical data.</strong> One-hot or hashing handles those\n" +
                "deterministically and is debuggable.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Mixed models in one index.</strong> The single most damaging bug here, and it produces\n" +
                "no exception. Store the model name and dimension on every row and assert on write.</li>\n" +
                "<li><strong>Normalising only the query.</strong> Cosine normalises both sides internally, but\n" +
                "if the store uses dot product, normalising one side turns the score into a magnitude comparison\n" +
                "and the ranking goes quietly wrong.</li>\n" +
                "<li><strong>Over-trusting near-duplicate semantics.</strong> \"Refund policy\" and \"cancellation\n" +
                "policy\" are topically adjacent and answer different questions. Chunk boundaries decide whether\n" +
                "that distinction survives.</li>\n" +
                "<li><strong>Silent truncation.</strong> Most APIs truncate at a few hundred tokens with no error.\n" +
                "Log the truncation rate as a metric.</li>\n" +
                "<li><strong>Symmetric models for query/document.</strong> A question and the paragraph that\n" +
                "answers it are not symmetric inputs; asymmetric encoders exist for a reason.</li>\n" +
                "<li><strong>Distance thresholds copied between models.</strong> A 0.75 cosine means nothing\n" +
                "until measured on your corpus with your model.</li>\n" +
                "<li><strong>No baseline.</strong> Dense retrieval that beats random by 5% can still lose to\n" +
                "BM25. Always measure the sparse baseline before committing.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Cosine vs dot product vs Euclidean — when does it matter?",
                    a:
"<p>If you L2-normalise, all three collapse to the same ranking, because <code>|a| = |b| = 1</code> makes Euclidean distance a monotone function of the dot product. It matters only in the un-normalised case, where document length leaks into the score: long chunks drift away from short queries, and dot product inflates with magnitude. The safe engineering answer is normalise at write and use dot product, which is also what makes the index fast.</p>",
                },
                {
                    q: "Why is semantic search worse than keyword search for finding a specific error code?",
                    a:
"<p>Embedding models compress meaning, and compression is lossy in exactly the places where strings are information. \"ERR_QUOTA_4471\" and \"ERR_QUOTA_8820\" are nearly identical as text and encode completely different events, so they land on top of each other. Keyword indexes key on the exact token and separate them perfectly. The production answer is hybrid: sparse for the identifier, dense for the intent.</p>",
                },
                {
                    q: "How do you choose dimensionality?",
                    a:
"<p>Start with the model default and measure. Higher dimensions almost always give better retrieval, so the question is really about index cost — a d-dimensional index has far more cells to search as d grows, so latency and memory climb faster than linearly. If the model was trained with Matryoshka-style truncation you can shorten the vector and trade a little recall for a lot of memory; if it was not, truncating produces vectors that are not comparable to the full-size ones.</p>",
                },
                {
                    q: "How would you evaluate a new embedding model without user-facing tests?",
                    a:
"<p>Build a labelled set of 200&ndash;500 real query / relevant-chunk pairs from click logs, support tickets, or query logs with reformulations. Measure recall@k and nDCG@10 against that fixed set, and — critically — also report a slice by query type: short identifier lookups, long natural-language questions, and non-English queries. A model can win overall and lose badly on your identifier traffic, which is precisely the slice where users notice.</p>",
                },
                {
                    q: "What breaks when you swap embedding models in production?",
                    a:
"<p>Every stored vector becomes meaningless relative to new query vectors, so recall collapses silently. The safe sequence is: dual-write into a new index, keep the old one serving, compare offline on a fixed eval set, then shadow a percentage of traffic, and only then cut over. Budget for a full re-embed — for 10M chunks that is an overnight job plus a parallel index, and it is the main reason teams hesitate to adopt a better model later.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🏭 In production",
            html:
                "<ul>\n" +
                "<li><strong>Everything in the index row.</strong> Vector, model id, dimension, source document\n" +
                "id, chunk ordinal, and a content hash. Without the hash you cannot deduplicate re-ingests.</li>\n" +
                "<li><strong>Ingest is a pipeline with a dead-letter queue, not a loop.</strong> A parse failure on\n" +
                "one of 200k pages should not stop the run, and should be retryable.</li>\n" +
                "<li><strong>Track truncation rate and empty-vector rate.</strong> Both are silent and both\n" +
                "correlate with user-visible retrieval failures.</li>\n" +
                "<li><strong>Store the raw chunk text beside the vector.</strong> You will need it to build the\n" +
                "prompt, to display citations, and to debug a bad hit without a database round trip.</li>\n" +
                "<li><strong>Version the embedding step independently of the app deploy.</strong> Ingest jobs\n" +
                "should be resumable and idempotent, keyed by content hash.</li>\n" +
"</ul>",
        },
    ],
});
