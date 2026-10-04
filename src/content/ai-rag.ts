// src/content/ai-rag.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-rag",
    title: "RAG Pipeline",
    blocks: [
        {
            // Legacy card title: "RAG Pipeline".
            // The stages fired a toast on click; that is the only
            // interactivity dropped.
            kind: "pipeline",
            stages: [
                { name: "Documents", desc: "Raw data source" },
                { name: "Loader", desc: "Parse & extract" },
                { name: "Chunking", desc: "Split into chunks" },
                { name: "Embedding", desc: "Vectorize chunks" },
                { name: "Vector DB", desc: "Store + index" },
                { name: "Retriever", desc: "Find relevant" },
                { name: "Reranker", desc: "Re-rank results" },
                { name: "LLM", desc: "Generate answer" },
            ],
        },
        {
            kind: "card",
            title: "Mental Model",
            html:
                "<p>RAG is <em>open-book generation</em>. Instead of asking a model to recall something from its\n" +
                "weights, you retrieve the relevant text at request time, put it in the context window, and\n" +
                "instruct the model to answer only from that text. The model's job narrows from \"know the answer\"\n" +
                "to \"select and restate from the provided evidence\" — a task it is far more reliable at, and one\n" +
                "you can evaluate and audit.</p>\n" +
                "<p><b>The invariant that makes it work:</b> <b>every factual claim in the answer must be\n" +
                "attributable to a specific retrieved span.</b> That is the contract. If you cannot cite the\n" +
                "span, you did not retrieve the answer, and no amount of prompt wording changes this — the model's\n" +
                "prior knowledge is always competing with the retrieved context for the same output\n" +
                "distribution.</p>\n" +
                "<p><b>Two halves that fail independently.</b> The <em>offline</em> half decides what exists in\n" +
                "your index: parsing, chunk boundaries, dedup, freshness. The <em>online</em> half decides what\n" +
                "reaches the prompt: query understanding, retrieval, ranking, context assembly. Almost all RAG\n" +
                "debugging is really the question \"which half\", and teams routinely over-invest in the online half\n" +
"while a PDF parser has been silently producing one giant chunk for six months.</p>",
        },
        {
            kind: "card",
            title: "Offline ingest and online query",
            html:
                "<p>The two lanes run on completely different schedules and failure models. Ingest is\n" +
                "batch-friendly, idempotent, and can be retried; query is latency-bound, single-shot, and cannot\n" +
                "be retried without the user noticing. The dashed arrow is the one thing that must stay\n" +
                "consistent: a chunk's vector must be written with the same model and normalisation the query\n" +
"path will use.</p>",
        },
        {
            kind: "diagram",
            caption: "Ingest is a batch job you can retry; query is a latency budget you cannot miss — and the dashed arrow is the contract that breaks silently when violated",
            source: `flowchart TD
    subgraph ING["Offline ingest, batch, idempotent, resumable"]
        S1["Sources: HTML, PDF, docs site, tickets"] --> S2["Parse to text<br/>drop nav, headers, footers"]
        S2 --> S3["Chunk with overlap<br/>respect heading and section boundaries"]
        S3 --> S4["Attach metadata<br/>docId, url, title, heading path, version, acl"]
        S4 --> S5["Embed and L2 normalise"]
        S5 --> S6[("Vector index plus<br/>a sparse index plus<br/>the raw text")]
    end
    subgraph QRY["Online query, latency-bound, single shot"]
        T1["User question"] --> T2["Filter by tenant, acl, recency"]
        T2 --> T3["Embed the query"]
        T3 --> T4["Hybrid recall<br/>dense top 50 plus BM25 top 50"]
        T4 --> T5["Fuse, dedupe, rerank to top 5"]
        T5 --> T6["Assemble the prompt with<br/>numbered, cited context"]
        T6 --> T7["Generate, streaming"]
        T7 --> T8["Post-check: was it grounded?<br/>were the citations real?"]
    end
    S6 -.->|"the only contract between the two lanes:<br/>same model, same normalisation"| T3`,
        },
        {
            kind: "card",
            title: "One query, as a sequence",
            html:
                "<p>Follow the numbers. The two long bars are where the latency actually goes: embedding the query\n" +
                "on the critical path, and generating the answer. Retrieval and reranking are usually both\n" +
                "single-digit-to-tens-of-milliseconds — teams that optimise the wrong stage spend their budget on\n" +
"a 5&nbsp;ms stage and keep a 2&nbsp;s generation.</p>",
        },
        {
            kind: "diagram",
            caption: "The latency budget, stage by stage — reranking and generation dominate, and citation verification happens after the user has already seen the text",
            source: `sequenceDiagram
    autonumber
    participant U as User
    participant API as API
    participant EMB as Embedding API
    participant IDX as Vector and sparse index
    participant RR as Reranker
    participant LLM as LLM
    U->>API: how do I rotate a compromised key
    API->>EMB: embed query
    EMB-->>API: 1536 floats, about 8 ms
    API->>IDX: dense top 50, with tenant and acl prefilter
    IDX-->>API: 50 candidates, about 3 ms
    API->>IDX: BM25 top 50, same predicate
    IDX-->>API: 50 sparse candidates
    API->>API: reciprocal rank fusion, dedupe to 60
    API->>RR: rerank 60 passages
    RR-->>API: ranked top 5, about 25 ms
    API->>LLM: prompt with 5 numbered passages
    LLM-->>API: streamed answer plus citation ids
    API->>API: verify each cited id exists, and that<br/>claims are supported by that passage
    API-->>U: answer with working source links`,
        },
        {
            kind: "card",
            title: "Chunking: the decision with the largest hidden effect",
            html:
                "<p>Chunking is where relevance is decided or lost. A chunk that cuts a rule away from its\n" +
                "\"applies to\" clause produces a passage that is topically perfect and semantically incomplete; a\n" +
                "chunk that is too large dilutes the embedding across several topics and stops matching any of\n" +
                "them.</p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Strategy</th><th>How it splits</th><th>Use when</th><th>Fails when</th></tr>\n" +
                "<tr><td>Fixed size</td><td>N tokens with N tokens of overlap</td><td>fast baseline, unstructured prose</td><td>splits tables, code blocks, and headings from their content</td></tr>\n" +
                "<tr><td>Recursive character</td><td>paragraphs, then sentences, then tokens; never mid-sentence if avoidable</td><td>the sane default for markdown and HTML</td><td>still ignores document semantics</td></tr>\n" +
                "<tr><td>Structure-aware</td><td>on headings, HTML sections, table rows, function boundaries</td><td>docs, wikis, code, anything with real sections</td><td>documents with no reliable structure</td></tr>\n" +
                "<tr><td>Semantic</td><td>split where embedding distance between adjacent sentences spikes</td><td>prose with real topic boundaries</td><td>expensive: one embedding pass per document at ingest</td></tr>\n" +
                "<tr><td>Parent / child</td><td>index small children, return the larger parent</td><td>specific fact inside a long section</td><td>parent may be too broad; you must store both levels</td></tr>\n" +
                "<tr><td>Late chunking</td><td>embed the whole document, then mean-pool per token span</td><td>cross-sentence meaning matters, long legal or narrative text</td><td>needs a long-context embedding model and a bigger ingest budget</td></tr>\n" +
                "</table>\n" +
                "<p><b>Size guidance.</b> 300&ndash;600 tokens with 10&ndash;15% overlap is the usual starting\n" +
                "range, but treat it as a hyperparameter you tune against retrieval recall, not a constant.\n" +
                "Bigger chunks give the model more context but dilute the vector; smaller chunks are precise and\n" +
"starve the generator.</p>",
        },
        {
            kind: "card",
            title: "Worked example: why 512-token chunks lose a question",
            html:
                "<p>One section of a runbook, split at 512 tokens:</p>\n" +
                "<pre><code class=\"language-text\">chunk 41, heading \"API key rotation\"\n" +
                "  Keys are rotated automatically every 90 days. To rotate manually,\n" +
                "  open Settings &gt; Credentials, select the key, and choose Rotate.\n" +
                "  The previous key remains valid for 24 hours after rotation.\n" +
                "\n" +
                "chunk 42, heading \"Emergency revocation\"\n" +
                "  If a key is compromised, revoke it immediately from the Credentials\n" +
                "  page. Revocation is irreversible and any integration using the key\n" +
                "  will begin returning 401 responses within about 60 seconds.</code></pre>\n" +
                "<p>Query: <b>\"our key leaked, what do I do?\"</b> The right facts are all in chunk 42, but:</p>\n" +
                "<ul>\n" +
                "<li><b>Chunk 41</b> scores <i>higher</i> on a dense retriever, because \"rotate\", \"key\" and\n" +
                "\"valid\" dominate the vector and the embedding of the whole chunk is a blur of key-management\n" +
                "vocabulary. Dense similarity is topic-level, not answer-level.</li>\n" +
                "<li><b>Chunk 42</b> holds the answer but has one lexical hit, \"key\", so sparse retrieval may rank\n" +
                "it eighth.</li>\n" +
                "<li>Take the top 5 from either retriever alone and you may get both — or three chunks from an\n" +
                "unrelated \"access control\" section that also talks about keys.</li>\n" +
                "</ul>\n" +
                "<p>What fixes it, in increasing order of cost: <b>hybrid</b> retrieval (dense brings 42, sparse\n" +
                "brings 41, fusion keeps both), <b>structure-aware chunking</b> so the heading travels with the\n" +
                "text, and <b>query rewriting</b> that expands \"our key leaked\" into \"compromised key revocation\"\n" +
"— which lands chunk 42 in the dense top 3 on its own. The third is the Advanced RAG page.</p>",
        },
        {
            kind: "table",
            title: "Retrieval methods",
            headers: ["Method","Strength","Blind spot","Typical use"],
            rows: [
                ["Dense / vector","paraphrase and cross-lingual tolerance","exact identifiers, rare terms, and numbers it has never seen","natural-language questions"],
                ["Sparse / BM25","exact terms, identifiers, current vocabulary","no synonym or paraphrase handling at all","error codes, product names, legal citations"],
                ["Hybrid with RRF fusion","covers both blind spots, and needs no score calibration","roughly doubles retrieval cost; RRF throws away score magnitude","<b>the production default</b>"],
                ["Filtered / metadata","tenancy, ACL, date ranges, document type","useless for relevance; selectivity can starve results","always applied first"],
                ["Reranking, cross-encoder","reorders candidates with full query-document attention","latency scales with candidates; only usable on the top 20&ndash;100","the second stage, never the first"],
                ["Multi-vector, late chunking or ColBERT","stores several vectors per chunk","much larger index and complex serving","long or narrative documents"],
                ["Graph traversal","multi-hop, entity-centric questions","needs an extracted and maintained graph; expensive to build","\"who reported to whom, and when\""],
            ],
        },
        {
            kind: "card",
            title: "Implementation: assembling the grounded prompt",
            html:
                "<pre><code class=\"language-javascript\">const messages = [\n" +
                "  { role: 'system', content:\n" +
                "    'Answer using ONLY the numbered sources. ' +\n" +
                "    'If the sources do not contain the answer, reply exactly: NOT IN SOURCES. ' +\n" +
                "    'Cite every factual claim as [n].' },\n" +
                "  { role: 'user', content:\n" +
                "    'Question: ' + question + '\\n\\nSources:\\n' +\n" +
                "    top5.map((c, i) => '[' + (i + 1) + '] ' + c.chunkText).join('\\n\\n') },\n" +
                "];\n" +
                "\n" +
                "// The post-check is the part teams skip, and it is the part that makes the\n" +
                "// \"cite every claim\" instruction real rather than decorative.\n" +
                "const cited = [...answer.matchAll(/[(d+)]/g)].map(m =&gt; Number(m[1]));\n" +
                "const bad = cited.filter(n =&gt; n &lt; 1 || n &gt; top5.length);\n" +
                "if (bad.length) return fallback('unsupported citation');\n" +
                "if (!cited.length) return fallback('no citation on a factual answer');\n" +
                "if (/NOT IN SOURCES/.test(answer)) return abstainWithLinks(top5);</code></pre>\n" +
                "<p><strong>Line notes.</strong> The regex check is cheap and catches the two dominant failure\n" +
                "modes — a hallucinated citation index, and a confident answer with no citation at all. Numbering\n" +
                "the sources is not cosmetic: it gives the model a stable handle to cite, which is what makes the\n" +
                "output auditable. And returning <code>abstainWithLinks</code> rather than a bare refusal is a\n" +
                "real product decision — users accept \"I could not find that, here are the closest documents\" far\n" +
"better than silence.</p>",
        },
        {
            kind: "table",
            title: "Cost and latency, per query",
            headers: ["Stage","Latency","Cost","Lever"],
            rows: [
                ["Query embedding","5&ndash;30 ms","small","cache repeated phrasings; batch concurrent queries"],
                ["Dense retrieval","1&ndash;10 ms","none","over-fetch, then tune <code>ef_search</code> per query class"],
                ["Sparse retrieval","1&ndash;5 ms","none","cheap enough to always run alongside dense"],
                ["Reranking","15&ndash;80 ms","the most expensive non-LLM stage","rerank 30&ndash;60, not 200; batch and cache"],
                ["Generation","200 ms&ndash;2 s","dominant","stream; cut context length; route to a smaller model"],
                ["Context tokens","affects prefill linearly","proportional","fewer, better chunks beat more chunks"],
                ["End to end","target p95 under ~2 s interactive","&mdash;","overlap retrieval and rerank where you can"],
            ],
        },
        {
            kind: "card",
            title: "When NOT to build RAG",
            html:
                "<ul>\n" +
                "<li><strong>Freshness needs are sub-minute.</strong> Retrieval over an indexed corpus cannot beat\n" +
                "a real-time API call, and adding it anyway just adds a stale layer.</li>\n" +
                "<li><strong>Exact aggregation.</strong> \"How many open tickets did we close last quarter?\"\n" +
                "wants SQL. A model reading retrieved rows will eventually miscount them.</li>\n" +
                "<li><strong>Answers that span the whole corpus.</strong> If the question needs 40% of the\n" +
                "documents, retrieval is selecting the wrong 5%. Build a summary index or hierarchical\n" +
                "aggregation instead.</li>\n" +
                "<li><strong>You have fewer than a few hundred documents and a strong baseline already.</strong>\n" +
                "Long-context stuffing of 30 pages will often match it, and it is far simpler to operate.</li>\n" +
                "<li><strong>The corpus is not yours to quote.</strong> Retrieval does not launder copyright or\n" +
                "PII; the obligations are identical to serving the source.</li>\n" +
                "<li><strong>Your data is already structured and queryable.</strong> Text-to-SQL over a schema is\n" +
                "the better shape for a metrics product.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Uncited answers ship anyway.</strong> Enforce the citation rule in code, not in the\n" +
                "prompt. A prompt-level instruction has no guarantee attached to it.</li>\n" +
                "<li><strong>Overlap is not free.</strong> 20% overlap on 10M chunks is 2M duplicate vectors that\n" +
                "inflate the index and can surface the same passage twice in one context.</li>\n" +
                "<li><strong>Chunk titles are discarded.</strong> Dropping the heading path during parsing removes\n" +
                "the single strongest relevance signal a section has.</li>\n" +
                "<li><strong>Freshness has no mechanism.</strong> Without a re-ingest trigger tied to the source,\n" +
                "the index silently rots and nothing alerts you.</li>\n" +
                "<li><strong>Stale chunks outrank fresh ones.</strong> Version documents in metadata and filter,\n" +
                "rather than trusting the index to prefer the current revision.</li>\n" +
                "<li><strong>Context is cropped by the window, not by the retriever.</strong> When the assembled\n" +
                "context exceeds the window the model silently loses the tail — usually the oldest sources, which\n" +
                "is not the safe default.</li>\n" +
                "<li><strong>ACL filtering applied after retrieval.</strong> Retrieve, then filter by tenant, and\n" +
                "one bug leaks another customer's document. Pre-filter, and test it as a security case.</li>\n" +
                "<li><strong>One global chunk size for every document type.</strong> An FAQ and a legal contract\n" +
                "want different sizes and different strategies.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Why not just put the whole corpus in the context window?",
                    a:
"<p>Three reasons, in order of how often they bite. First, cost and latency: prefill scales linearly with tokens, so a 200k-token corpus is unusable interactively. Second, attention over relevance: models attend reliably to a needle but degrade when most of the context is noise, so you often get <em>worse</em> answers with 5 good passages than with a full dump. Third, freshness — a long window does not help if the documents behind it are a month old. Long-context stuffing is reasonable only when the corpus genuinely fits and genuinely changes slowly.</p>",
                },
                {
                    q: "Fixed-size vs semantic chunking — what would you pick?",
                    a:
"<p>Recursive structure-aware, as the default, because it is predictable and cheap. Semantic chunking earns its cost on long narrative or legal prose where topic boundaries are not marked by headings. The honest answer also includes measurement: build a labelled set first, then compare recall@10 across three or four chunk sizes. Teams are routinely surprised by how flat the curve is until they try structure-aware, and how steep it is once the corpus has real sections.</p>",
                },
                {
                    q: "How do you debug a bad RAG answer?",
                    a:
"<p>Determine which half failed before touching any code. (1) Does the answer contain the right fact anywhere in the index? Search the store with the exact phrase. If not, it is an ingest or chunking bug. (2) If it is in the index, did it come back? Log the full ranked candidate list, not just what reached the prompt. (3) If it came back, was it above the cutoff? Often the right chunk ranked 4th, and a reranker or a query rewrite fixes it. (4) If it made the prompt and the answer is still wrong, it is a prompt or model problem. Most teams skip to step 4 and prompt-engineer their way around a chunking bug.</p>",
                },
                {
                    q: "How do you know retrieval is the bottleneck and not generation?",
                    a:
"<p>Run the pipeline against an oracle in two places. Oracle retrieval with real generation isolates retrieval; real retrieval with an oracle answer isolates grounding. There is also a cheap production signal: the rate at which users re-ask a question or abandon an answer correlates strongly with retrieval failure and only weakly with generation quality. Track the two separately, because they have different owners and different fixes.</p>",
                },
                {
                    q: "How would you keep the index fresh?",
                    a:
"<p>Three triggers, in increasing order of cost. Webhooks or change-data-capture from the source of truth for incremental updates. A scheduled full re-crawl, diffed by content hash so unchanged chunks are not re-embedded. And a periodic reconciliation that counts indexed documents against the source, because a silent crawl failure is otherwise invisible. Version every chunk with its source revision and filter on it, so you can prefer current content and roll back.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "In production",
            html:
                "<ul>\n" +
                "<li><strong>Observability is the product.</strong> Log the query, the ranked candidate ids with\n" +
                "scores, the ids that reached the prompt, the model's citation ids, and per-stage latency. Without\n" +
                "all five, every bug report becomes archaeology.</li>\n" +
                "<li><strong>Ship an abstention path from day one.</strong> \"Not in the sources, here are the\n" +
                "closest matches\" is a feature and the cheapest hallucination mitigation available.</li>\n" +
                "<li><strong>Start with one document type.</strong> Depth on a narrow corpus beats breadth over\n" +
                "messy sources, and it is what produces a measurable baseline.</li>\n" +
                "<li><strong>Cache the retrieval, not the answer.</strong> Repeated phrasings are common in\n" +
                "support; caching ranked chunk ids is safe in a way that caching generated text is not.</li>\n" +
                "<li><strong>Make citations a product surface.</strong> Click-through on sources is the strongest\n" +
                "relevance feedback signal you will ever get, and it is free.</li>\n" +
"</ul>",
        },
    ],
});
