// src/content/ai-advanced-rag.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-advanced-rag",
    title: "Advanced RAG",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html:
                "<p>Naive RAG embeds the query, retrieves the top k, and generates. Advanced RAG is the\n" +
                "acknowledgement that <b>the query and the document are not the same shape</b>: a user asks a\n" +
                "question, the corpus speaks in declarative prose, and the mismatch is what the retriever sees.\n" +
                "Every \"advanced\" technique is a patch for one of three gaps.</p>\n" +
                "<p><b>The invariant:</b> <b>retrieval quality is bounded by the worst stage, and the stages are\n" +
                "serial.</b> A perfect reranker cannot rescue a query that was rewritten into the wrong question,\n" +
                "and a perfect query rewriter cannot rescue a corpus that was never chunked properly. That is why\n" +
                "advanced RAG work is diagnostic before it is additive — find the failing stage, then choose the\n" +
                "technique that targets it.</p>\n" +
                "<p>The three gaps, and the techniques that close them:</p>\n" +
                "<ul>\n" +
                "<li><b>Query gap</b> — the user is vague, conversational, multi-hop, or uses vocabulary the\n" +
                "corpus does not. Closed by query rewriting, decomposition, HyDE, and multi-query fan-out.</li>\n" +
                "<li><b>Ranking gap</b> — the right chunk is in the candidate set but not in the top few. Closed\n" +
                "by a cross-encoder reranker, which is the single highest-value addition in the whole field.</li>\n" +
                "<li><b>Context gap</b> — 20 retrieved chunks are too much context, so the answer gets diluted.\n" +
                "Closed by compression, parent-child retrieval, and sentence-level extraction.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "Naive vs advanced, stage by stage",
            html:
                "<p>Every box on the right is a decision you can make independently and measure independently. The\n" +
                "green boxes are the ones that reliably pay for themselves; the amber ones need a specific failure\n" +
"mode to justify them.</p>",
        },
        {
            kind: "diagram",
            caption: "The same baseline on both sides: every technique should be justified by a failing metric, not by the technique being fashionable",
            source: `flowchart TD
    subgraph N["Naive RAG, the baseline you must beat"]
        N1["Raw query"] --> N2["Embed and retrieve top k"] --> N3["Stuff all k into the prompt"] --> N4["Generate"]
    end
    subgraph A["Advanced RAG, added only where a metric says so"]
        A0["Raw query"] --> A1{"Which gap is failing?"}
        A1 -->|"query gap"| Q["Rewrite, decompose, HyDE,<br/>or fan out to several queries"]
        A1 -->|"ranking gap"| R["Cross-encoder rerank<br/>the top 50 down to 5"]
        A1 -->|"context gap"| C["Compress, or expand a child<br/>chunk into its parent section"]
        Q --> A2["Hybrid recall: dense plus sparse, fused"]
        A2 --> R
        R --> C
        C --> A3["Cite and verify against the final context"]
    end
    N -.->|"baseline number every<br/>technique must beat"| A`,
        },
        {
            kind: "card",
            title: "The technique landscape",
            html:
                "<p>Use this as a menu against a diagnosis, not a shopping list. The branches are ordered roughly\n" +
"by ratio of benefit to added latency and cost, within each area.</p>",
        },
        {
            kind: "diagram",
            caption: "Grouped by which gap each technique closes — diagnose first, then pick from the matching branch",
            source: `mindmap
  root(("Advanced RAG techniques"))
    Query side
      Query rewriting
        rewrite to standalone question
        add conversation context
        expand acronyms
      Decomposition
        break multi-hop into sub-questions
        answer each, then synthesise
      HyDE
        write a hypothetical answer, embed that
      Multi-query fan-out
        three paraphrases, fuse the results
      Metadata pre-filter
        tenant, date, docType before search
    Ranking side
      Cross-encoder rerank
        over-fetch 50, rerank to 5
      Late interaction, ColBERT
        one vector per token
      Ensemble scoring
        weighted dense plus sparse
    Context side
      Contextual compression
        drop sentences the query does not need
      Parent-child retrieval
        index small, return the parent
      Late chunking
        embed the document, pool per span
    Corpus side
      Graph RAG
        entities and edges, multi-hop questions
      Knowledge graph extraction
        expensive ingest, strong multi-hop
      Hypothetical document updates
        write new text back after an answer`,
        },
        {
            kind: "table",
            title: "Technique trade-offs",
            headers: ["Technique","Fixes","Added latency","Added cost","Verdict"],
            rows: [
                ["Query rewriting with an LLM","vague, conversational, follow-up questions","one extra generation, 100&ndash;500 ms","one call per query","<b>high value</b> once you have history"],
                ["Multi-query fan-out","vocabulary mismatch","parallel, so ~1 extra generation","N calls per query","good, and it parallelises"],
                ["HyDE","queries too short or too abstract to embed well","one extra generation","one call per query","cheap to try, surprisingly effective on abstract questions"],
                ["Cross-encoder reranking","right chunk ranked 5th to 50th","20&ndash;80 ms","one model to host","<b>the single best value in the field</b>"],
                ["Reciprocal rank fusion","dense and sparse disagree","a few ms of arithmetic","nothing","free — always do it"],
                ["Parent-child retrieval","a fact too small to embed on its own","extra metadata lookup","storing two granularities","good for specs, tables, FAQs"],
                ["Contextual compression","too much irrelevant context","one extra model pass","one model to host","only once you have measured context dilution"],
                ["Graph RAG","multi-hop and entity questions","significant at query time","a hard, ongoing ingest","narrow: only for genuinely relational questions"],
                ["Self-refine loop","shallow answers","a second full generation","roughly doubles cost","use on a router-selected subset, not globally"],
            ],
        },
        {
            kind: "card",
            title: "Implementation: query rewriting with a hard budget",
            html:
                "<pre><code class=\"language-javascript\">const REWRITE_PROMPT =\n" +
                "  'Rewrite the user question as a standalone search query. ' +\n" +
                "  'Resolve pronouns from the conversation. Expand acronyms. ' +\n" +
                "  'Output ONLY the query, under 40 words, no punctuation at the end.';\n" +
                "\n" +
                "async function buildQuery(question, history) {\n" +
                "  // 1. cheap gate. most queries in a fresh session need no rewrite at all,\n" +
                "  //    and an unconditional rewrite is a guaranteed extra generation per request\n" +
                "  if (history.length === 0 &amp;&amp; !/^(what|who|when|why|how|which)\b/i.test(question)) {\n" +
                "    return { variants: [question], rewritten: false };\n" +
                "  }\n" +
                "  // 2. a small, fast model is enough. this is a rewriting task, not a\n" +
                "  //    reasoning task, and it is on the critical path\n" +
                "  const rewritten = await llmSmall.generate({\n" +
                "    messages: [{ role: 'user', content: REWRITE_PROMPT + '\\n\\nHistory:\\n' + tail(history, 4) }],\n" +
                "    temperature: 0, maxOutputTokens: 64,\n" +
                "  }).then(r =&gt; r.text.trim());\n" +
                "\n" +
                "  // 3. safety net. a rewrite that drops the entity is worse than no rewrite\n" +
                "  return rewritten.length &gt; 3\n" +
                "    ? { variants: [question, rewritten], rewritten: true }\n" +
                "    : { variants: [question], rewritten: false };\n" +
                "}\n" +
                "\n" +
                "// fan out, then fuse with reciprocal rank fusion\n" +
                "const all = await Promise.all(variants.map(v =&gt; retrieve(v, { topK: 50 })));\n" +
                "const fused = reciprocalRankFusion(all, { k: 60 });\n" +
                "const final = await rerank(fused.slice(0, 60), question).then(r =&gt; r.slice(0, 5));</code></pre>\n" +
                "<p><strong>Line notes.</strong> Line 1 is the optimisation that makes the whole technique\n" +
                "affordable: gating on conversation history and interrogative form removes the extra generation\n" +
                "for most traffic. Line 2 is the reason a small model is correct here — rewriting is a short\n" +
                "transformation and putting a frontier model on it buys nothing. Line 3 matters more than it looks:\n" +
                "rewrites routinely drop the specific noun the user searched for, and keeping the original as one\n" +
"of the variants makes that failure harmless.</p>",
        },
        {
            kind: "card",
            title: "Worked example: what each technique fixes",
            html:
                "<p>Question with conversation history: <em>\"what about the other one then?\"</em> The prior turns\n" +
                "were about a Pro plan trial and a failed payment. Relevant corpus section: \"Downgrading from Pro\n" +
                "to Free takes effect at the end of the current billing period; annual plans are refunded pro\n" +
                "rata.\"</p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Configuration</th><th>Query reaching the retriever</th><th>Top-5 contains the downgrade section?</th></tr>\n" +
                "<tr><td>Naive</td><td><code>what about the other one then</code></td><td>No — four chunks about unrelated billing topics</td></tr>\n" +
                "<tr><td>+ rewriting</td><td><code>downgrade Pro plan to Free during current billing period</code></td><td><b>Yes, ranked 1</b></td></tr>\n" +
                "<tr><td>+ multi-query</td><td>the above, plus \"annual plan refund pro rata\"</td><td>Yes, ranked 1, and the refund sentence is now retrieved</td></tr>\n" +
                "<tr><td>+ reranking only (no rewrite)</td><td><code>what about the other one then</code></td><td>No — reranking cannot rank a document the retriever never returned</td></tr>\n" +
                "</table>\n" +
                "<p>The last row is the point worth remembering in an interview: <b>a reranker fixes ranking, never\n" +
                "recall.</b> If the relevant chunk is not in the candidate set, reranking is rearranging the wrong\n" +
"50 documents. That is why the fix order is always rewrite/recall first, rerank second.</p>",
        },
        {
            kind: "table",
            title: "Cost and latency of the advanced path",
            headers: ["Added stage","Latency","Cost multiplier","Worth it when"],
            rows: [
                ["Query rewriting","100&ndash;500 ms","+1 generation","there is conversation history, or the query is under ~5 words"],
                ["Multi-query fan-out","parallel, so ~1 generation","&times;N calls","queries are short and vocabulary mismatch is measurable"],
                ["HyDE","100&ndash;400 ms","+1 generation","queries are abstract and retrieval recall@5 is low"],
                ["Reranking","20&ndash;80 ms","one hosted model, per candidate","recall@50 is fine but recall@5 is not — the most common diagnosis"],
                ["Contextual compression","50&ndash;200 ms","one model pass","the reranked passages are long and mostly irrelevant"],
                ["Graph retrieval","100&ndash;500 ms","a whole second store","questions are genuinely multi-hop over entities"],
                ["Self-refine","+100% generation","&times;2 total","a cheap router says this query class is hard"],
            ],
        },
        {
            kind: "card",
            title: "When NOT to go advanced",
            html:
                "<ul>\n" +
                "<li><strong>You have not measured the naive baseline.</strong> Most \"we need advanced RAG\" requests\n" +
                "are unmeasured dissatisfaction. Fix the eval first; the technique list is short when you know which\n" +
                "number is wrong.</li>\n" +
                "<li><strong>Your latency budget cannot absorb it.</strong> Rewriting plus reranking plus\n" +
                "compression can add a second to a 900&nbsp;ms budget. Pick the one stage with the best\n" +
                "measured return.</li>\n" +
                "<li><strong>Your corpus is the problem.</strong> Bad parsing, missing headings, and un-deduplicated\n" +
                "mirrors will defeat every technique downstream. Fix ingest first — it is also cheaper.</li>\n" +
                "<li><strong>Single-hop, keyword-shaped questions dominate.</strong> A help-centre search box is\n" +
                "mostly identifier lookups, which BM25 handles and which HyDE actively hurts.</li>\n" +
                "<li><strong>You cannot afford the eval harness.</strong> Techniques chosen by vibes are usually\n" +
                "neutral at best and add a failure mode at worst.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Rewrites that lose the entity.</strong> \"What about the refund for order 4471\" becomes\n" +
                "\"refund policy\" and retrieves policy, not the order. Keep the original as a variant.</li>\n" +
                "<li><strong>Reranking 500 candidates.</strong> Latency goes up linearly and the marginal recall\n" +
                "gain past ~50 is small. Fetch wide, rerank narrow.</li>\n" +
                "<li><strong>Compression that drops the caveat.</strong> An extractor that keeps the headline\n" +
                "sentence and drops \"unless you are on an annual plan\" produces a confidently wrong answer.</li>\n" +
                "<li><strong>Recursive summarisation.</strong> Repeatedly summarising retrieved text accumulates\n" +
                "loss. Compress once, and always keep the original sentences for citation.</li>\n" +
                "<li><strong>Multi-query with a sequential loop.</strong> Three queries run one after another is\n" +
                "three times the latency; they are independent, so fan them out.</li>\n" +
                "<li><strong>HyDE on extractive questions.</strong> A hypothetical answer to \"what is the timeout\n" +
                "value\" invents a number, and the fabricated number then steers retrieval toward the wrong\n" +
                "document.</li>\n" +
                "<li><strong>Technique stacking without ablation.</strong> Four techniques at once, no per-technique\n" +
                "number, means no one can tell which helps — and when quality drops, no one can tell which\n" +
                "caused it.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Where would you start, given a RAG system users call \"dumb\"?",
                    a:
"<p>With a labelled eval set and the oracle test, not with a technique. Build 100 to 200 real questions with known-correct source spans, then measure (a) the recall of the retriever into the top 5, and (b) whether the answer is right when the correct span is force-fed. If (b) is high and (a) is low, it is purely retrieval and you spend the budget on recall first. If (a) is high and (b) is low, no amount of retrieval work will help. Most systems are the first case, and the cheapest first move is over-fetching plus a reranker.</p>",
                },
                {
                    q: "What is HyDE and when does it backfire?",
                    a:
"<p>You generate a hypothetical ideal answer to the question, embed that, and search with the answer vector instead of the question vector. It works because documents and hypothetical answers share a register, while questions do not. It backfires on extractive questions, where the hypothetical answer invents specifics — a made-up timeout value, a fabricated SKU — and that invented token then pulls retrieval toward a document that is merely about timeouts rather than the one containing your actual value.</p>",
                },
                {
                    q: "Explain cross-encoder reranking and why it beats bi-encoder retrieval.",
                    a:
"<p>A bi-encoder embeds query and document independently, so at index time it never sees the query and the two vectors can only encode similarity through a single dot product. A cross-encoder takes the query and the document together and runs full attention between them, so it can model interactions like \"this sentence is only relevant given that the question asked about revocation\". That is far more accurate and far more expensive, which is why it runs on 30 to 60 candidates after recall, not on the whole corpus.</p>",
                },
                {
                    q: "How do you choose between parent-child and plain chunking?",
                    a:
"<p>Look at whether the answer is a specific fact inside a broad explanation. Parent-child wins there: the child sentence embeds precisely, so it retrieves, and the parent section is what you hand the model, so the fact arrives with its context. Plain chunking wins when the document has no natural hierarchy, when sections are short enough already, or when you cannot afford to store and maintain two granularities. It is a corpus property, so decide it by sampling twenty real documents and looking at them.</p>",
                },
                {
                    q: "How would you A/B test a new retrieval technique?",
                    a:
"<p>Offline first, on a fixed labelled set, with the naive pipeline as the control and one technique changed at a time. The metric that matters is end-to-end answer correctness and citation validity, not recall — recall can rise while answers get worse if the extra context is noisier. Then shadow a small slice of production traffic and compare on the judge metric plus latency and cost, because a technique that wins offline by 2% and doubles p99 latency is usually a loss.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "In production",
            html:
                "<ul>\n" +
                "<li><strong>Gate expensive stages behind a router.</strong> A cheap classifier on the query\n" +
                "decides whether it is short/vague enough to need a rewrite; most traffic should skip it.</li>\n" +
                "<li><strong>Cap every stage.</strong> A rewrite budget, a rerank candidate count, a compression\n" +
                "ratio floor, a hop limit for graph traversal. Unbounded loops are how a research demo becomes an\n" +
                "outage.</li>\n" +
                "<li><strong>Ablate on a schedule.</strong> Re-run the per-technique numbers quarterly. Corpus\n" +
                "changes shift which gap is binding, and the right technique changes with it.</li>\n" +
                "<li><strong>Version the whole retrieval config, not just the model.</strong> Top-k, chunk size,\n" +
                "rewrite prompt and reranker together, or a quality change is unattributable.</li>\n" +
                "<li><strong>Keep the naive path as a fallback.</strong> If the rewriter times out or the reranker\n" +
                "is down, degrade to plain hybrid retrieval rather than failing the request.</li>\n" +
"</ul>",
        },
    ],
});
