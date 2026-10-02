// src/renderers/ai.ts — AI Engineering renderers
import { h, toast } from '../utils';
import { card, diagram, pipelineStages, tableCard, qaCard } from '../components';


// ── 1. LLM fundamentals ──────────────────────────────────────────────
export function renderAILLM(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'LLM Fundamentals'));

    section.appendChild(card('🧠 Mental Model', `
<p>A decoder-only LLM does exactly one thing, repeatedly: given a prefix of tokens, emit a
probability distribution over the vocabulary for the token that comes next. Everything else —
reasoning, code, JSON, tool calls, refusals, multilingual ability — is a regular pattern that
survives in that distribution. Sampling from it and appending the winner <em>is</em> the
generation loop.</p>
<p><b>The invariant the rest of the field depends on:</b> the model never stores anything you can
point at and never performs a lookup. So anything you want from it has to be sampled out and then
verified externally. That is why temperature is a <em>reproducibility</em> knob and not a
<em>correctness</em> knob, and why retrieval beats "just prompting harder".</p>
<p>Three independent axes that get conflated in interviews:</p>
<ul>
<li><b>Context window</b> — how many tokens attention can attend over at once. A hard ceiling,
not a memory size; anything older is gone and re-adding it costs a full re-read of the prefix.</li>
<li><b>Parameter count</b> — capacity for patterns, and the cost of every token you decode.</li>
<li><b>Training cutoff</b> — the only thing that bounds freshness. Retrieval and fine-tuning
exist precisely to move this boundary without retraining.</li>
</ul>
<p><b>Prefill vs decode.</b> The prompt is processed in one batched pass (prefill) that writes the
KV cache; the answer is then produced one token at a time (decode), each step reading that whole
cache. Prefill is compute-bound and parallelises to the last core. Decode is memory-bandwidth
bound, cannot be parallelised within a single request, and is where your per-user latency
actually lives.</p>
    `));

    const flowCard = card('🔀 One request, end to end', `
<p>Trace the loop. The two arrows that return to <code>Token ids</code> are the whole generation
process: everything else is setup. Note that the <code>Embedding table lookup</code> is a pure
dictionary lookup — token ids are not learned from scratch per request, which is why prompt
caching can reuse them across calls.</p>
    `);
    flowCard.appendChild(diagram(`
flowchart TD
    TXT["Prompt text"] --> TOK["Tokenizer, usually BPE<br/>4 characters is often 1 token, other 4 are 7"]
    TOK --> IDS["Token ids<br/>15339, 1917, 30071, 13"]
    IDS --> EMB["Embedding table lookup<br/>one cached vector per id"]
    EMB --> BLK["Decoder block repeated L times<br/>attention plus MLP, residual"]
    BLK --> NORM["Final RMSNorm"]
    NORM --> LOGITS["Logits<br/>one score per vocabulary item"]
    LOGITS --> SAMP{"Sampling step"}
    SAMP -->|"argmax, temperature 0"| IDS
    SAMP -->|"temperature above 0"| NUC["Top-k and top-p filter,<br/>softmax over survivors, draw"]
    NUC -->|"chosen token is appended"| IDS
`, 'Tokenize, embed, run the decoder stack, project to logits, sample, append — and repeat'));
    section.appendChild(flowCard);

    section.appendChild(tableCard('⚙️ Decoding knobs', ['Knob', 'What it changes', 'Failure mode', 'Use it when'], [
        ['<code>argmax</code> / T = 0', 'always the highest-logit token', 'repeats and loops; cannot escape a bad prefix', 'classification, extraction, tests, anything compared by string'],
        ['Temperature', 'scales logits before softmax; 1 is the model default', 'below ~0.4 collapses into loops; above ~1.2 produces non-sequiturs', 'creative drafting where you re-read the output'],
        ['Top-k', 'keeps only the k best tokens', 'k too small reintroduces the argmax loop', 'you know the answer lives in a small candidate set'],
        ['Top-p (nucleus)', 'keeps the smallest set whose probability mass is at least p', 'non-deterministic set membership; awkward to unit test', 'general open-ended generation'],
        ['Min-p', 'keeps tokens within a fixed log-prob ratio of the top token', 'a scale-free alternative to p; less popular in tooling', 'you want one stable cutoff across easy and hard prompts'],
        ['Repetition penalty', 'down-weights already-seen tokens', 'breaks legitimate repetition — code, quotes, names', 'long generations only, and set below ~1.05'],
        ['Beam search', 'keeps several partial sequences', 'worse quality than sampling on open-ended text, still 3&times; the cost', 'speech transcription and translation with a real scoring metric'],
    ]));

    section.appendChild(card('💻 Implementation: one client, the settings that matter', `
<pre><code class="language-javascript">const res = await llm.generate({
  model: 'some-model-id',
  messages: [{ role: 'user', content: 'Translate to French: "The meeting is moved to Thursday."' }],
  maxOutputTokens: 128,     // 1. hard ceiling. If it truncates, you get half a JSON object
                            //    with no error, so treat a finish_reason other than
                            //    'stop' as a failure in the caller, never as an answer
  temperature: 0,           // 2. 0 means argmax through the provider's sampler
  seed: 42,                 // 3. reproducibility only WITH a pinned model version
                            //    and identical prompt bytes — providers silently
                            //    re-rank, and aliases float to new snapshots
  stop: ['\\n\\nHuman:'],   // 4. must be escaped as a literal, and must not occur in the data
});

if (res.finishReason !== 'stop') throw new Error('truncated: ' + res.finishReason);</code></pre>
<p><strong>Line notes.</strong> <code>maxOutputTokens</code> is the single most common silent
failure: with JSON tool calls the truncation lands mid-argument and the parse error surfaces
three layers away from the cause. The <code>seed</code> comment is the production lesson —
seeding pins sampling, not the model, so a snapshot bump under the same alias still changes
outputs. That is why regression tests need the resolved model revision recorded alongside the
expected output.</p>
    `));

    section.appendChild(card('🧪 Worked example: one prompt, three temperatures', `
<p>Prompt: <code>Translate to French: "The meeting is moved to Thursday."</code> Greedy picks
<code>à</code> because it is the marginally likelier bigram after <em>déplacée</em>, and once
<code>à</code> is committed the model continues down a path where the next-highest token is a
bare weekday, with no article. It is <b>stable and confidently wrong</b>, which is exactly the
failure shape temperature cannot fix.</p>
<table class="complexity-table">
<tr><th>Setting</th><th>Output</th><th>Verdict</th></tr>
<tr><td>T = 0 (greedy)</td><td><code>La réunion est déplacée à jeudi.</code></td><td>reproducible, wrong article — identical every run</td></tr>
<tr><td>T = 0.7 (default-ish)</td><td><code>La réunion a été déplacée au jeudi.</code></td><td>usually right; varies between runs at the same seed across revisions</td></tr>
<tr><td>T = 1.2</td><td><code>Réunion déplacée jeudi svp</code></td><td>creative, unusable for a translation field</td></tr>
</table>
<p>The interview lesson: if the task has a single correct output, sample at 0 and move the
variance into your own retry or self-consistency loop, where you can measure it. If the task has
many acceptable outputs, sample above 0 and judge the output. Do not set a mid temperature
"because it sounds reasonable".</p>
    `));

    const kvCard = card('🗄️ Prefill and decode, and what the KV cache costs', `
<p>Follow the two lanes. Prefill touches every prompt token at once and writes a cache entry per
layer per token. Decode re-reads the entire cache on every single step — which is why a 4,000
token prompt makes the <em>first output token</em> slow and the <em>rest</em> fast, and why long
contexts fight concurrency rather than just costing more.</p>
    `);
    kvCard.appendChild(diagram(`
flowchart LR
    subgraph PF["Prefill, one batched pass, compute bound"]
        P1["3200 prompt tokens<br/>all positions computed together"] --> P2["Write one KV entry<br/>per layer per token"]
    end
    subgraph DC["Decode, one token per step, bandwidth bound"]
        D1["Output token 1<br/>reads the whole cache"] --> D2["Output token 2<br/>reads a slightly larger cache"]
        D2 --> D3["Output token N"]
    end
    P2 --> D1
`, 'Prefill parallelises across tokens; decode cannot, so its cost is a function of how many requests share the cache at once'));
    section.appendChild(kvCard);

    section.appendChild(tableCard('💰 Cost and latency, derived not guessed', ['Quantity', 'Formula', 'Worked number'], [
        ['Prefill FLOPs', 'roughly <code>2 &times; params &times; prompt tokens</code>', '2 &times; 7e9 &times; 3,200 &asymp; 4.5e13 FLOPs'],
        ['Weight bytes read per decode step', '<code>params &times; bytes per param</code>', '7e9 &times; 2 (bf16) = 14 GB, read <b>per token per sequence</b>'],
        ['Time per output token', '<code>weight bytes / memory bandwidth</code>', '14 GB / 1 TB/s &asymp; 14 ms, before overhead'],
        ['KV bytes per token', '<code>2 &times; layers &times; kv heads &times; head dim &times; bytes</code>', '2 &times; 32 &times; 8 &times; 128 &times; 2 B = 128 KiB per token'],
        ['KV for an 8k context', 'per-token cost &times; context', '128 KiB &times; 8,192 &asymp; 1 GiB for one sequence'],
        ['KV at batch 32', '&times; concurrent sequences', '&asymp; 32 GiB — the real reason context and concurrency trade off'],
        ['Throughput from batching', 'weight read is amortised across the batch', 'batch 32 is nearly free per token until KV capacity binds'],
        ['Biggest latency lever', 'usually not the model', 'prefix caching, smaller max output tokens, a faster model tier'],
    ]));

    section.appendChild(card('🚫 When NOT to reach for an LLM', `
<ul>
<li><strong>Exact lookup over known data.</strong> "Row for order 8812" is a SQL query. An LLM
adds hallucination risk, latency and cost for zero gain.</li>
<li><strong>Deterministic transformation with a spec.</strong> A JSON Schema validator is faster,
free, and correct. Reserve the model for the parts a schema cannot express.</li>
<li><strong>High-volume classification into a small label set.</strong> A fine-tuned encoder
classifier is typically an order of magnitude cheaper per item, and a threshold plus a logit is
auditable where a sampled string is not.</li>
<li><strong>Fresh facts.</strong> Anything after the training cutoff, unless you retrieve it.</li>
<li><strong>Sub-100ms interactive latency budgets.</strong> A single decode step at 7B is
already ~14 ms of pure weight reads before any queueing.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Tokens, not characters.</strong> Budget the context in tokens and measure with the
model's own tokenizer. <code>len(text) / 4</code> is a decent English approximation and a
terrible one for code, JSON, or non-Latin scripts, where it can be off by 2&times;.</li>
<li><strong>Long-context dilution.</strong> A needle is retrievable in a 100k window; reasoning
across 30 pages of mixed relevance is not. Put the instruction at the top, repeat the key
constraint at the bottom, and put the retrieved evidence adjacent to the question.</li>
<li><strong>Truncation is silent.</strong> When <code>maxOutputTokens</code> cuts the response you
usually get a parse error or a half-sentence, not an exception. Check the finish reason.</li>
<li><strong>T = 0 loops.</strong> Repetition is the canonical failure. If the model repeats a
phrase three times, add a repetition penalty or a stop sequence rather than raising temperature.</li>
<li><strong>Stop sequences in the data.</strong> A stop string that occurs in retrieved documents
terminates the answer mid-sentence. Prefer a model-provided stop reason over a hand-rolled one.</li>
<li><strong>Reasoning effort is a dial, not a slider to max.</strong> Longer thinking traces
raise quality on hard problems and cost latency on easy ones. Route by difficulty, not globally.</li>
<li><strong>Logprobs for exact match.</strong> If you need "did it say exactly <code>42</code>",
compare logprobs of the alternative tokens rather than string-comparing sampled text.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['Why is decoding memory-bandwidth bound rather than compute bound?',
            '<p>Arithmetic intensity drops as the batch shrinks. At batch 1 a decode step does one '
            + 'matrix-vector product per layer: it reads every weight exactly once to produce one '
            + 'output token, so almost all the time is spent streaming 14 GB of bf16 weights over '
            + 'the memory bus, and the multiplies are hidden underneath. Prefill has the opposite '
            + 'profile — thousands of tokens of independent work per weight read — so it saturates '
            + 'the FLOPs. This is also why batching is nearly free: the second sequence in a batch '
            + 'reuses the same weight read.</p>'],
        ['How would you cut p99 latency for a chat endpoint without changing the model?',
            '<p>In rough order of payoff: (1) stream the response so time-to-first-token is what '
            + 'the user feels, (2) prefix-cache the system prompt and any long shared context — the '
            + 'prefill is the dominant cost and it is identical across every request in a '
            + 'conversation, (3) cut <code>maxOutputTokens</code> to what answers actually need, '
            + '(4) reduce the retrieved context, which shrinks prefill linearly, and (5) route to a '
            + 'smaller model and escalate only when a cheap classifier or a self-consistency check '
            + 'says it was hard.</p>'],
        ['KV cache in one sentence, plus when you would drop it.',
            '<p>It stores the per-layer key and value vectors for every previous token so attention '
            + 'over the prefix is not recomputed at each step; without it, generating N tokens costs '
            + 'O(N&sup2;) instead of O(N). Drop it when the prefix is long and reused by few '
            + 'requests — a one-shot summarisation job spends more memory on cache than on compute — '
            + 'or when the sequence is about to end anyway. Grouped-query attention and quantised '
            + 'KV are the two ways to make it smaller rather than absent.</p>'],
        ['When is a bigger model actually the right call?',
            '<p>When the failure is a missing capability, not a missing fact. A model that cannot '
            + 'hold a multi-step constraint in mind will not be fixed by a longer prompt; a model '
            + 'that knows the answer but was not shown it is fixed by retrieval. Before upgrading, '
            + 'check the eval set for whether errors cluster on capability or on grounding — they '
            + 'have completely different fixes and completely different costs.</p>'],
        ['Why do people still say "the model is just a next-token predictor"?',
            '<p>Because it is a precise statement of the training objective and a bad description of '
            + 'the system. Enough capability is a property of the distribution, not of any single '
            + 'sample from it. The practical reading is not "it cannot reason" but "nothing it '
            + 'produces is checked" — so the engineering work is verification, tool use, and '
            + 'evals, not persuading it to try harder.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Everything is a state machine around a sampling loop.</strong> Real systems add
stop conditions, tool round-trips, retry budgets, and cancellation — the token loop is the
smallest part.</li>
<li><strong>Pin the model revision, not the alias.</strong> Record the resolved version in every
log line and in the eval run, or you cannot attribute a regression.</li>
<li><strong>Cache on the prefix, not the answer.</strong> Semantic caching of whole responses
fails on the long tail; a prefix cache is exact and hits on the system prompt plus history.</li>
<li><strong>Budget tokens, not requests.</strong> Rate limits and cost caps belong on input and
output tokens per tenant, since that is what actually moves the bill.</li>
<li><strong>Log finish reasons and token counts as first-class metrics.</strong> A rise in
truncation rate is the earliest signal that a prompt change got too long.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 2. Embeddings ────────────────────────────────────────────────────
export function renderAIEmbeddings(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Embeddings'));

    section.appendChild(card('🧠 Mental Model', `
<p>An embedding model is a trained function from text (or image, or audio) to a fixed-length
vector, trained so that texts which answer the same question land near each other. It is not a
database and not a search index: it is a <em>geometry function</em>. Everything downstream —
vector databases, semantic caches, clustering, dedup — is bookkeeping on top of the geometry
this one function defines.</p>
<p><b>The invariant:</b> similarity in the vector space is only meaningful for pairs produced by
the <em>same</em> model, at the <em>same</em> dimensionality, with the <em>same</em> preprocessing.
Mixing even two embeddings from the same family's different versions silently produces a
neighbourhood that looks plausible and is wrong, with no error anywhere.</p>
<p><b>Why cosine and not Euclidean.</b> Text length inflates vector magnitude, so a long document
is farther from everything by Euclidean distance even when it is on-topic. Cosine discards
magnitude and keeps direction. If you L2-normalise every vector at write time, cosine similarity
collapses to a plain dot product — which is why most vector databases are fastest on normalised
inputs.</p>
<p>Symmetric embedding models map query and document into the same space. Asymmetric
(question / passage) models map them into deliberately different regions, which usually ranks
better for retrieval at the cost of a separate query encoder.</p>
    `));

    const pipeCard = card('🔀 From a string to a searchable point', `
<p>The two encoder paths differ in one way that matters: a <b>document</b> is embedded once and
reused, so you can spend heavily on it (long input, batching, offline). A <b>query</b> is
embedded on every request inside the user's latency budget, so it is tokenised, sent, and
scored on the critical path. Nearly every cost optimisation in a RAG system is really an attempt
to get the query side cheaper.</p>
    `);
    pipeCard.appendChild(diagram(`
flowchart LR
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
    D5 -.->|"the index the query hits"| Q5
`, 'The offline index path and the online query path share an encoder but nothing else — mismatching them is the classic silent failure'));
    section.appendChild(pipeCard);

    const qCard = card('🧭 Which retriever handles which failure', `
<p>Read the axes as two failure pressures: moving right buys paraphrase tolerance, moving up
costs noise. No point dominates the square, which is exactly why production retrieval is hybrid
rather than a single choice.</p>
    `);
    qCard.appendChild(diagram(`
quadrantChart
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
    "Rare term, rare phrasing": [0.14, 0.16]
`, 'No single method owns a corner: exact identifiers favour sparse, paraphrases favour dense, and the top-right corner is what a reranker exists to clean up'));
    section.appendChild(qCard);

    section.appendChild(card('🔢 Worked example: computing similarity by hand', `
<p>Two 3-dimensional vectors, so the arithmetic is checkable:</p>
<pre><code class="language-python">a = [1.0, 2.0, 3.0]     # "reset my password"
b = [4.0, 5.0, 6.0]     # "forgot password, click here"
c = [-1.0, 0.0, 1.0]   # "invoice #4471 due"

# dot(a, b) = 4 + 10 + 18 = 32
# |a| = sqrt(1 + 4 + 9)  = 3.7417
# |b| = sqrt(16 + 25 + 36) = 8.7750
# cosine(a, b) = 32 / (3.7417 * 8.7750) = 0.9746
# cosine(a, c) = (-1 + 0 + 3) / (3.7417 * 1.4142) = 2 / 5.2915 = 0.3780</code></pre>
<p>Euclidean for the same pair: <code>sqrt(9 + 9 + 9) = 5.196</code>. Note what normalisation
changes: if <code>a</code> were scaled to <code>[2, 4, 6]</code> — the same meaning, a longer
document — cosine stays 0.9746 while Euclidean drops to 0. That is the entire argument for
cosine, and for normalising before you store.</p>
<p>In practice a real query lands around <b>0.4–0.8 against a relevant chunk</b> and
<b>0.1–0.3 against an irrelevant one</b>, and the margin between those bands is far more
informative than either absolute number. Set your top-k threshold on the margin you observe on
your own data, not on a number from a blog post.</p>
    `));

    section.appendChild(tableCard('⚙️ Embedding API mechanics', ['Choice', 'Effect', 'How to decide'], [
        ['Dimensionality', 'storage is <code>4 &times; d</code> bytes per vector, and a d-dimensional index is far more expensive than a lower one', 'take whatever the model emits; only shorten it if the model was trained for Matryoshka truncation'],
        ['Normalisation', 'lets the store use dot product, and makes thresholds comparable', 'always L2-normalise unless your model documentation says otherwise'],
        ['Input truncation', 'the model silently cuts past its token limit', 'measure the real distribution of your token lengths; average 0.2% of your corpus being truncated can skew results badly'],
        ['Batching', 'the only lever on embedding cost and throughput', 'batch 64&ndash;256 on the ingest path; on the query path, batch concurrent queries together'],
        ['Text preparation', 'HTML, nav bars, and cookie banners become noise vectors', 'strip boilerplate at parse time; it is far cheaper to fix than to filter later'],
        ['Asymmetric vs symmetric', 'asymmetric ranks better for query/document, symmetric halves your model count', 'use asymmetric for RAG, symmetric for clustering and dedup'],
        ['Fine-tuning', 'can beat a 3&times; larger general model on a narrow domain', 'only after you have a labelled set and a measured baseline gap'],
    ]));

    section.appendChild(tableCard('💰 Cost and latency', ['Quantity', 'Rule of thumb', 'Note'], [
        ['Ingest cost', 'proportional to total tokens, not document count', 'a 300-page PDF costs more than 300 one-page docs'],
        ['Ingest rate', 'batch size times per-batch latency', 'batching is often a 5&ndash;20&times; throughput win for free'],
        ['Query embedding', 'one network round trip plus one forward pass', 'typically 5&ndash;30 ms — a real slice of a 300 ms budget'],
        ['Query-side cost reduction', 'cache embeddings of repeated queries', 'identical user phrasing is common enough that a small LRU pays off'],
        ['Storage per vector', '<code>d &times; 4</code> bytes raw, plus graph or list overhead', '1M vectors at d=1536 is about 6 GB before index overhead'],
        ['HNSW graph overhead', 'roughly <code>M &times; 2 &times; links</code> bytes on top', 'at M=16 that is ~128 bytes per vector extra'],
        ['Re-embedding cost', 'full ingest plus a shadow index rebuild', 'budget for it before you choose the model, not after'],
    ]));

    section.appendChild(card('🚫 When NOT to use embeddings', `
<ul>
<li><strong>Exact-match filtering over known fields.</strong> A SQL <code>WHERE status = 'open'</code>
beats every vector index; use embeddings to narrow, then a filter to finish.</li>
<li><strong>Precise identifiers.</strong> Order numbers, error codes, and version strings are
exactly the tokens embeddings are worst at, and exactly the tokens users type. Keep BM25 or an
exact-match index alongside.</li>
<li><strong>A corpus under a few thousand items.</strong> Brute-force cosine over 2,000 vectors is
sub-millisecond and needs no index, no recall tuning, and no rebuild story.</li>
<li><strong>You cannot re-embed later.</strong> A model change invalidates every stored vector;
if there is no ingest pipeline to rebuild against, embeddings are a one-way door.</li>
<li><strong>High-cardinality categorical data.</strong> One-hot or hashing handles those
deterministically and is debuggable.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Mixed models in one index.</strong> The single most damaging bug here, and it produces
no exception. Store the model name and dimension on every row and assert on write.</li>
<li><strong>Normalising only the query.</strong> Cosine normalises both sides internally, but
if the store uses dot product, normalising one side turns the score into a magnitude comparison
and the ranking goes quietly wrong.</li>
<li><strong>Over-trusting near-duplicate semantics.</strong> "Refund policy" and "cancellation
policy" are topically adjacent and answer different questions. Chunk boundaries decide whether
that distinction survives.</li>
<li><strong>Silent truncation.</strong> Most APIs truncate at a few hundred tokens with no error.
Log the truncation rate as a metric.</li>
<li><strong>Symmetric models for query/document.</strong> A question and the paragraph that
answers it are not symmetric inputs; asymmetric encoders exist for a reason.</li>
<li><strong>Distance thresholds copied between models.</strong> A 0.75 cosine means nothing
until measured on your corpus with your model.</li>
<li><strong>No baseline.</strong> Dense retrieval that beats random by 5% can still lose to
BM25. Always measure the sparse baseline before committing.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['Cosine vs dot product vs Euclidean — when does it matter?',
            '<p>If you L2-normalise, all three collapse to the same ranking, because '
            + '<code>|a| = |b| = 1</code> makes Euclidean distance a monotone function of the dot '
            + 'product. It matters only in the un-normalised case, where document length leaks '
            + 'into the score: long chunks drift away from short queries, and dot product inflates '
            + 'with magnitude. The safe engineering answer is normalise at write and use dot '
            + 'product, which is also what makes the index fast.</p>'],
        ['Why is semantic search worse than keyword search for finding a specific error code?',
            '<p>Embedding models compress meaning, and compression is lossy in exactly the places '
            + 'where strings are information. "ERR_QUOTA_4471" and "ERR_QUOTA_8820" are nearly '
            + 'identical as text and encode completely different events, so they land on top of '
            + 'each other. Keyword indexes key on the exact token and separate them perfectly. The '
            + 'production answer is hybrid: sparse for the identifier, dense for the intent.</p>'],
        ['How do you choose dimensionality?',
            '<p>Start with the model default and measure. Higher dimensions almost always give '
            + 'better retrieval, so the question is really about index cost — a d-dimensional '
            + 'index has far more cells to search as d grows, so latency and memory climb faster '
            + 'than linearly. If the model was trained with Matryoshka-style truncation you can '
            + 'shorten the vector and trade a little recall for a lot of memory; if it was not, '
            + 'truncating produces vectors that are not comparable to the full-size ones.</p>'],
        ['How would you evaluate a new embedding model without user-facing tests?',
            '<p>Build a labelled set of 200&ndash;500 real query / relevant-chunk pairs from '
            + 'click logs, support tickets, or query logs with reformulations. Measure recall@k '
            + 'and nDCG@10 against that fixed set, and — critically — also report a slice by query '
            + 'type: short identifier lookups, long natural-language questions, and non-English '
            + 'queries. A model can win overall and lose badly on your identifier traffic, which '
            + 'is precisely the slice where users notice.</p>'],
        ['What breaks when you swap embedding models in production?',
            '<p>Every stored vector becomes meaningless relative to new query vectors, so recall '
            + 'collapses silently. The safe sequence is: dual-write into a new index, keep the '
            + 'old one serving, compare offline on a fixed eval set, then shadow a percentage of '
            + 'traffic, and only then cut over. Budget for a full re-embed — for 10M chunks that is '
            + 'an overnight job plus a parallel index, and it is the main reason teams hesitate to '
            + 'adopt a better model later.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Everything in the index row.</strong> Vector, model id, dimension, source document
id, chunk ordinal, and a content hash. Without the hash you cannot deduplicate re-ingests.</li>
<li><strong>Ingest is a pipeline with a dead-letter queue, not a loop.</strong> A parse failure on
one of 200k pages should not stop the run, and should be retryable.</li>
<li><strong>Track truncation rate and empty-vector rate.</strong> Both are silent and both
correlate with user-visible retrieval failures.</li>
<li><strong>Store the raw chunk text beside the vector.</strong> You will need it to build the
prompt, to display citations, and to debug a bad hit without a database round trip.</li>
<li><strong>Version the embedding step independently of the app deploy.</strong> Ingest jobs
should be resumable and idempotent, keyed by content hash.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 3. Vector databases ──────────────────────────────────────────────
export function renderAIVectorDB(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Vector Databases'));

    section.appendChild(card('🧠 Mental Model', `
<p>A vector database answers <code>find the k vectors most similar to this query, among billions,
in single-digit milliseconds</code>. Exact search is a full scan — O(N) distance computations per
query, which is 1 billion comparisons for a 1-billion-vector index. Approximate nearest neighbour
trades a little recall for orders of magnitude of speed, and the entire field is a catalogue of
ways to be approximately right cheaply.</p>
<p><b>The invariant:</b> an index is a <em>lossy summary of the space</em>, so recall@10 is a
function of the index <em>parameters</em>, not of the data alone. "95% recall" is meaningless
without the corpus size, the query distribution, and the <code>ef_search</code> / probe count
that produced it. If you cannot state those, you have not measured recall — you have measured
latency.</p>
<p><b>Filter-then-search vs search-then-filter.</b> This single distinction explains most of the
architectural variety. Pre-filtering applies metadata predicates inside the index and searches
only the survivors (correct, but the index must be able to use the filter — IVF often cannot
selectively, HNSW degrades toward a scan). Post-filtering searches first and drops non-matches
afterwards, which silently returns fewer than k results when the predicate is selective. The
"hybrid" behaviour where you get <em>fewer</em> than k results is almost always this, not a bug
in your data.</p>
    `));

    const idxCard = card('🔍 What happens on a search', `
<p>Three stages, and each index type differs only in the first one. Stage 2 is cheap, stage 3 is
where recall is finally decided, and stage 2 is the one people forget when tuning — searching
<code>ef = 200</code> candidates and keeping 10 is far more reliable than searching 10 and
hoping.</p>
    `);
    idxCard.appendChild(diagram(`
flowchart TD
    Q["Query vector arrives<br/>plus optional metadata filter"] --> NORM["L2 normalise<br/>must match how vectors were written"]
    NORM --> IDX{"Which index?"}
    IDX -->|"HNSW"| H["Greedy walk a layered graph<br/>entry point, then descend<br/>ef_search candidates per layer"]
    IDX -->|"IVF, inverted file"| I["Assign query to one or a few<br/>list centroids, scan only those lists"]
    IDX -->|"PQ compressed"| P["Decode a small code per vector<br/>then score with a lookup table"]
    H --> CAND["Candidate set, typically 10x to 50x k"]
    I --> CAND
    P --> CAND
    CAND --> RESCORE["Exact distance on the full vectors<br/>this is where recall is recovered"]
    RESCORE --> TOPK["Sort, apply post-filter, return top k<br/>plus the raw text for citation"]
`, 'Only the first box differs between index types; the candidate-set-then-rerank tail is identical and is where most of the recall comes from'));
    section.appendChild(idxCard);

    const pickCard = card('🧭 Which index, and when', `
<p>Follow the decision tree. Two rules dominate: below ~100k vectors just brute-force, and above
~10M with a memory budget that cannot hold the vectors, reach for compression. Everything in
between is HNSW, because its quality/memory knob is the most predictable.</p>
    `);
    pickCard.appendChild(diagram(`
flowchart TD
    START["How many vectors<br/>and how much RAM?"] --> SMALL{"Under about 100k?"}
    SMALL -->|"yes"| FLAT["Flat, brute-force scan<br/>exact, no tuning, no recall loss,<br/>a few ms on a modern core"]
    SMALL -->|"no"| MEM{"Does the vector set<br/>fit in RAM with<br/>graph overhead?"}
    MEM -->|"yes"| HNSW["HNSW<br/>sub-millisecond, high recall,<br/>tune M for memory and ef_search for recall"]
    MEM -->|"no"| COMP{"Do you need that<br/>much recall?"}
    COMP -->|"yes"| DISK["Disk-backed HNSW or a<br/>tiered store with a hot cache"]
    COMP -->|"no"| COMPACT["IVF plus PQ or scalar quantisation<br/>10x to 64x smaller,<br/>recall drops and must be measured"]
`, 'Below ~100k vectors brute force is the right answer; HNSW owns the middle; compression is a last resort that needs a measured recall budget'));
    section.appendChild(pickCard);

    section.appendChild(tableCard('⏱️ Index comparison', ['Index', 'Build', 'Query', 'Recall', 'Knobs that matter'], [
        ['Flat (brute force)', 'O(n) to store, nothing to build', 'O(n), embarrassingly parallel', '<b>Exact — 100%</b>', 'batch size, SIMD, GPU'],
        ['HNSW', 'O(n log n)', 'roughly O(log n) for small <code>ef_search</code>', 'High, tunable', '<code>M</code> links per node, <code>ef_construction</code>, <code>ef_search</code>'],
        ['IVF', 'O(n) to train centroids, then assign', 'O(n / nprobe)', 'Medium, collapses for outlier queries', '<code>nlist</code>, <code>nprobe</code>'],
        ['IVF + PQ', 'same, plus a codebook per subspace', 'same, cheaper per candidate', 'Noticeably lower', '<code>m</code> subspaces, codebook size'],
        ['Disk-backed graph', 'slower build', 'page reads dominate', 'High if cached well', 'cache budget vs index size'],
        ['Flat + GPU', 'same as flat', 'very fast, bandwidth-bound', 'Exact', 'batch size, VRAM'],
    ]));

    section.appendChild(card('🔢 Worked example: HNSW parameters against measured recall', `
<p>Same 1M-chunk corpus, same 200 held-out queries with a known relevant chunk, d = 1536.
Latency is p99, recall is recall@10. The numbers below are the shape of a real sweep, not
someone's vendor table — the point is that <b>memory and latency trade directly against
recall</b>, and both are yours to spend.</p>
<table class="complexity-table">
<tr><th>M</th><th>ef_search</th><th>Memory</th><th>p99 latency</th><th>Recall@10</th></tr>
<tr><td>8</td><td>50</td><td>~1.3 GB</td><td>~2 ms</td><td>0.82</td></tr>
<tr><td>16</td><td>50</td><td>~1.9 GB</td><td>~3 ms</td><td>0.91</td></tr>
<tr><td>16</td><td>200</td><td>~1.9 GB</td><td>~6 ms</td><td>0.97</td></tr>
<tr><td>32</td><td>200</td><td>~3.4 GB</td><td>~11 ms</td><td>0.99</td></tr>
<tr><td>32</td><td>500</td><td>~3.4 GB</td><td>~24 ms</td><td>0.995</td></tr>
</table>
<p>Read the two ends: <code>M</code> buys recall almost for free (1.9&nbsp;GB to 3.4&nbsp;GB for
0.91&nbsp;&rarr;&nbsp;0.99) while <code>ef_search</code> buys it expensively (6&nbsp;ms to
24&nbsp;ms for 0.97&nbsp;&rarr;&nbsp;0.995). So the tuning order is: raise <code>M</code> until
memory binds, then raise <code>ef_search</code> only for the queries that need it — which is why
per-query adaptive <code>ef_search</code> beats one global value.</p>
    `));

    section.appendChild(card('💻 Implementation: a search you can actually reason about', `
<pre><code class="language-javascript">const hits = await index.search({
  vector: normalize(queryVec),      // 1. must be the same normalisation used at write time
  topK: 20,                         // 2. over-fetch. retrieve 20, rerank, then take 5 —
                                    //    a vector index has no notion of which 5 matter,
                                    //    so it cannot be the thing that picks the final k
  filter: { tenantId: 'acme', docType: 'runbook' },
  efSearch: 200,                    // 3. search 200 candidates, not 20. recall lives in the
                                    //    candidate pool, not in the final slice
  returnMetadata: ['docId', 'chunkText', 'sourceUrl'],   // 4. return the text too, so the
                                    //    prompt build needs no second database round trip
});
if (hits.length &lt; 5) {
  // 5. pre-filtered search can legitimately return fewer than topK. that is a signal
  //    your predicate is too selective, not that the index is broken
  metrics.increment('vector.search.underfilled', { tenant: 'acme' });
}</code></pre>
<p><strong>Line notes.</strong> Over-fetching is the single highest-leverage habit here, because
it converts an approximate index into a good candidate generator for an exact reranker.
Normalisation drift between write and query is the second most common cause of mysteriously bad
recall. And a <code>returnMetadata</code> that carries the chunk text removes a whole database
query from the hot path.</p>
    `));

    section.appendChild(tableCard('💰 Cost and latency', ['Quantity', 'Rule', 'Why it matters'], [
        ['Memory', '<code>n &times; (4d bytes + M &times; 2 &times; 4 bytes)</code>', 'at 10M vectors and d=1536 with M=16 that is roughly 80 GB — this is the number that forces a sharded or compressed design'],
        ['Build time', 'seconds to minutes per million vectors, index-type dependent', 'a re-embed is also a re-build; budget the whole job'],
        ['Query cost, memory-resident', 'sub-millisecond to low single-digit ms', 'the network round trip usually dominates, not the search'],
        ['Query cost, disk-backed', 'page reads, milliseconds to tens of ms', 'an SSD and a hot cache are worth more than a cleverer index'],
        ['Write amplification', 'HNSW inserts touch several graph layers', 'bulk-load far faster than row-by-row insert — ingest in batches'],
        ['Sharding', 'partitions multiply recall losses at the boundaries', 'a query that should span 4 shards may return 4 &times; 10 results and you still take 10'],
        ['Cost control lever', 'quantise first, add a second index second', 'a smaller index buys more than a faster instance does'],
    ]));

    section.appendChild(card('🚫 When NOT to use a dedicated vector database', `
<ul>
<li><strong>You already run Postgres and have under a few million rows.</strong> <code>pgvector</code>
with an HNSW index is the same algorithm with joins, transactions, backups and no new service. Most
teams that migrate do so for scale reasons, not quality reasons.</li>
<li><strong>The queries are mostly filters, not similarity.</strong> "All open tickets for this
customer" wants a B-tree.</li>
<li><strong>The dataset fits in a brute-force scan.</strong> Do not build an index for 2,000
documents; you will add a tuning surface with no payoff.</li>
<li><strong>You cannot evaluate recall.</strong> An approximate index you cannot measure is just a
randomness source, and this is the strongest argument for starting with flat search.</li>
<li><strong>You need transactional consistency with the source data.</strong> Two stores means
eventual consistency and a reconciliation job; that is a real ongoing cost.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Post-filtering silently under-fills.</strong> Filter after a <code>topK=10</code>
search with a 5% selectivity and you get 0 or 1 result. Pre-filter, or over-fetch enough to
survive the filter.</li>
<li><strong>One global <code>ef_search</code> for every query.</strong> Head queries need 20,
tail queries need 500, and one value is wrong for both. Set it per query class.</li>
<li><strong>Deleting vectors does not reclaim memory in every engine.</strong> Tombstones are
normal; compaction has to be scheduled, and forgetting a document for GDPR reasons is not
complete until it runs.</li>
<li><strong>Multi-tenancy via metadata filter on a shared index.</strong> Either the filter is
pre-applied and you get proper isolation, or a bug leaks another tenant's data. Verify which,
per tenant, in a test.</li>
<li><strong>Rebuilding on every re-embed.</strong> Dual-write to a new index and cut over; an
in-place rebuild is a multi-hour outage in the making.</li>
<li><strong>Ignoring the dimension in the index definition.</strong> Re-embedding to a new
dimension against an old index either errors or, worse, silently truncates.</li>
<li><strong>Assuming <code>topK</code> results are the best <code>topK</code>.</strong> They are
the best <em>found</em> topK. That is what the reranker in the next page exists to fix.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['Why not just brute-force the cosine similarity?',
            '<p>Because it is O(n) per query and does not shrink. One billion float32 vectors is '
            + '4&nbsp;GB to stream per query; at 100&nbsp;GB/s that is a 40&nbsp;ms floor before '
            + 'any arithmetic, and you pay it on every single request. An approximate index turns '
            + 'that into a graph walk touching a few hundred vectors. Brute force is still the '
            + 'right answer below roughly 100k vectors, where the whole thing fits in cache and '
            + 'the exactness is worth more than the speed.</p>'],
        ['HNSW vs IVF — when do you pick which?',
            '<p>HNSW when you need high recall, low latency, and can afford the memory, and when '
            + 'the index must support selective metadata pre-filtering. IVF when the data is large '
            + 'and statistically uniform, when you will compress anyway, and when a training pass '
            + 'over centroids is acceptable. The real differentiator in practice is outlier '
            + 'queries: a query far from every centroid scans the wrong lists and recall craters, '
            + 'which is why IVF-heavy systems probe multiple lists.</p>'],
        ['How do you decide the recall/latency operating point?',
            '<p>Take a labelled set of real queries, run an exact flat search to produce the '
            + 'ground-truth top-10, then sweep <code>ef_search</code> and measure recall against '
            + 'it. Plot the curve. The knee is usually around 0.95 recall, and the curve is steep '
            + 'before it and flat after — which is the argument for accepting 0.95 rather than '
            + 'paying 4&times; the latency for 0.995. Then check whether downstream answer quality '
            + 'actually moved; often it does not past 0.9.</p>'],
        ['Product quantisation — what exactly is being lost?',
            '<p>The vector is split into <code>m</code> subspaces and each is replaced by the '
            + 'index of its nearest centroid in a learned codebook. Storage drops by roughly '
            + '<code>32 / (4m)</code> — 768&times; for m=8 at d=1536. What is lost is precision in '
            + 'the distance estimate: PQ ranks by an approximation, so near-ties get ordered '
            + 'wrongly. Rescoring the top candidates against the full vectors recovers most of it, '
            + 'which is why PQ and rescoring are almost always used together.</p>'],
        ['How would you shard one index across 50 machines?',
            '<p>Route by a partition key derived from the vector itself — a random hyperplane or '
            + 'the leading bits of the vector — so every query can be fanned out to all shards '
            + 'and each shard returns a local topK. That preserves recall but costs a fan-out to '
            + 'every shard per query. Routing by tenant or by document is much cheaper but caps '
            + 'recall at the true nearest neighbour living in another shard. The fan-out approach '
            + 'is why managed vector services price per query with a per-shard cost multiplier.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Most traffic never needs the vector index.</strong> Metadata-first resolution
(known doc, known user) beats similarity for a large share of real queries; detect that case
before you search.</li>
<li><strong>Monitor recall proxies in production.</strong> Click-through on cited chunks, answer
abandonment, and reranker score distributions catch a broken index faster than any uptime
metric.</li>
<li><strong>Keep the flat-search oracle.</strong> A periodic exact scan on a sample of queries is
the only way to know whether the index has silently degraded after compaction or deletion.</li>
<li><strong>Over-fetch and rerank as the default pattern.</strong> It makes index tuning
forgiving and pushes quality decisions into a component you can evaluate offline.</li>
<li><strong>Version the index alongside the embedding model.</strong> Records the model, dimension
and index parameters, so a bad week is traceable to a specific combination.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 4. RAG pipeline ──────────────────────────────────────────────────
export function renderAIRAG(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'RAG Pipeline'));

    section.appendChild(card('🎬 RAG Pipeline', pipelineStages([
        { name: 'Documents', desc: 'Raw data source' },
        { name: 'Loader', desc: 'Parse & extract' },
        { name: 'Chunking', desc: 'Split into chunks' },
        { name: 'Embedding', desc: 'Vectorize chunks' },
        { name: 'Vector DB', desc: 'Store + index' },
        { name: 'Retriever', desc: 'Find relevant' },
        { name: 'Reranker', desc: 'Re-rank results' },
        { name: 'LLM', desc: 'Generate answer' },
    ], (i, s) => toast(`Stage ${i+1}: ${s.name} — ${s.desc}`, 'info'))));

    section.appendChild(card('🧠 Mental Model', `
<p>RAG is <em>open-book generation</em>. Instead of asking a model to recall something from its
weights, you retrieve the relevant text at request time, put it in the context window, and
instruct the model to answer only from that text. The model's job narrows from "know the answer"
to "select and restate from the provided evidence" — a task it is far more reliable at, and one
you can evaluate and audit.</p>
<p><b>The invariant that makes it work:</b> <b>every factual claim in the answer must be
attributable to a specific retrieved span.</b> That is the contract. If you cannot cite the
span, you did not retrieve the answer, and no amount of prompt wording changes this — the model's
prior knowledge is always competing with the retrieved context for the same output
distribution.</p>
<p><b>Two halves that fail independently.</b> The <em>offline</em> half decides what exists in
your index: parsing, chunk boundaries, dedup, freshness. The <em>online</em> half decides what
reaches the prompt: query understanding, retrieval, ranking, context assembly. Almost all RAG
debugging is really the question "which half", and teams routinely over-invest in the online half
while a PDF parser has been silently producing one giant chunk for six months.</p>
    `));

    const halfCard = card('🔀 Offline ingest and online query', `
<p>The two lanes run on completely different schedules and failure models. Ingest is
batch-friendly, idempotent, and can be retried; query is latency-bound, single-shot, and cannot
be retried without the user noticing. The dashed arrow is the one thing that must stay
consistent: a chunk's vector must be written with the same model and normalisation the query
path will use.</p>
    `);
    halfCard.appendChild(diagram(`
flowchart TD
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
    S6 -.->|"the only contract between the two lanes:<br/>same model, same normalisation"| T3
`, 'Ingest is a batch job you can retry; query is a latency budget you cannot miss — and the dashed arrow is the contract that breaks silently when violated'));
    section.appendChild(halfCard);

    const seqCard = card('🔁 One query, as a sequence', `
<p>Follow the numbers. The two long bars are where the latency actually goes: embedding the query
on the critical path, and generating the answer. Retrieval and reranking are usually both
single-digit-to-tens-of-milliseconds — teams that optimise the wrong stage spend their budget on
a 5&nbsp;ms stage and keep a 2&nbsp;s generation.</p>
    `);
    seqCard.appendChild(diagram(`
sequenceDiagram
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
    API-->>U: answer with working source links
`, 'The latency budget, stage by stage — reranking and generation dominate, and citation verification happens after the user has already seen the text'));
    section.appendChild(seqCard);

    section.appendChild(card('✂️ Chunking: the decision with the largest hidden effect', `
<p>Chunking is where relevance is decided or lost. A chunk that cuts a rule away from its
"applies to" clause produces a passage that is topically perfect and semantically incomplete; a
chunk that is too large dilutes the embedding across several topics and stops matching any of
them.</p>
<table class="complexity-table">
<tr><th>Strategy</th><th>How it splits</th><th>Use when</th><th>Fails when</th></tr>
<tr><td>Fixed size</td><td>N tokens with N tokens of overlap</td><td>fast baseline, unstructured prose</td><td>splits tables, code blocks, and headings from their content</td></tr>
<tr><td>Recursive character</td><td>paragraphs, then sentences, then tokens; never mid-sentence if avoidable</td><td>the sane default for markdown and HTML</td><td>still ignores document semantics</td></tr>
<tr><td>Structure-aware</td><td>on headings, HTML sections, table rows, function boundaries</td><td>docs, wikis, code, anything with real sections</td><td>documents with no reliable structure</td></tr>
<tr><td>Semantic</td><td>split where embedding distance between adjacent sentences spikes</td><td>prose with real topic boundaries</td><td>expensive: one embedding pass per document at ingest</td></tr>
<tr><td>Parent / child</td><td>index small children, return the larger parent</td><td>specific fact inside a long section</td><td>parent may be too broad; you must store both levels</td></tr>
<tr><td>Late chunking</td><td>embed the whole document, then mean-pool per token span</td><td>cross-sentence meaning matters, long legal or narrative text</td><td>needs a long-context embedding model and a bigger ingest budget</td></tr>
</table>
<p><b>Size guidance.</b> 300&ndash;600 tokens with 10&ndash;15% overlap is the usual starting
range, but treat it as a hyperparameter you tune against retrieval recall, not a constant.
Bigger chunks give the model more context but dilute the vector; smaller chunks are precise and
starve the generator.</p>
    `));

    section.appendChild(card('🧪 Worked example: why 512-token chunks lose a question', `
<p>One section of a runbook, split at 512 tokens:</p>
<pre><code class="language-text">chunk 41, heading "API key rotation"
  Keys are rotated automatically every 90 days. To rotate manually,
  open Settings &gt; Credentials, select the key, and choose Rotate.
  The previous key remains valid for 24 hours after rotation.

chunk 42, heading "Emergency revocation"
  If a key is compromised, revoke it immediately from the Credentials
  page. Revocation is irreversible and any integration using the key
  will begin returning 401 responses within about 60 seconds.</code></pre>
<p>Query: <b>"our key leaked, what do I do?"</b> The right facts are all in chunk 42, but:</p>
<ul>
<li><b>Chunk 41</b> scores <i>higher</i> on a dense retriever, because "rotate", "key" and
"valid" dominate the vector and the embedding of the whole chunk is a blur of key-management
vocabulary. Dense similarity is topic-level, not answer-level.</li>
<li><b>Chunk 42</b> holds the answer but has one lexical hit, "key", so sparse retrieval may rank
it eighth.</li>
<li>Take the top 5 from either retriever alone and you may get both — or three chunks from an
unrelated "access control" section that also talks about keys.</li>
</ul>
<p>What fixes it, in increasing order of cost: <b>hybrid</b> retrieval (dense brings 42, sparse
brings 41, fusion keeps both), <b>structure-aware chunking</b> so the heading travels with the
text, and <b>query rewriting</b> that expands "our key leaked" into "compromised key revocation"
— which lands chunk 42 in the dense top 3 on its own. The third is the Advanced RAG page.</p>
    `));

    section.appendChild(tableCard('⚙️ Retrieval methods', ['Method', 'Strength', 'Blind spot', 'Typical use'], [
        ['Dense / vector', 'paraphrase and cross-lingual tolerance', 'exact identifiers, rare terms, and numbers it has never seen', 'natural-language questions'],
        ['Sparse / BM25', 'exact terms, identifiers, current vocabulary', 'no synonym or paraphrase handling at all', 'error codes, product names, legal citations'],
        ['Hybrid with RRF fusion', 'covers both blind spots, and needs no score calibration', 'roughly doubles retrieval cost; RRF throws away score magnitude', '<b>the production default</b>'],
        ['Filtered / metadata', 'tenancy, ACL, date ranges, document type', 'useless for relevance; selectivity can starve results', 'always applied first'],
        ['Reranking, cross-encoder', 'reorders candidates with full query-document attention', 'latency scales with candidates; only usable on the top 20&ndash;100', 'the second stage, never the first'],
        ['Multi-vector, late chunking or ColBERT', 'stores several vectors per chunk', 'much larger index and complex serving', 'long or narrative documents'],
        ['Graph traversal', 'multi-hop, entity-centric questions', 'needs an extracted and maintained graph; expensive to build', '"who reported to whom, and when"'],
    ]));

    section.appendChild(card('💻 Implementation: assembling the grounded prompt', `
<pre><code class="language-javascript">const messages = [
  { role: 'system', content:
    'Answer using ONLY the numbered sources. ' +
    'If the sources do not contain the answer, reply exactly: NOT IN SOURCES. ' +
    'Cite every factual claim as [n].' },
  { role: 'user', content:
    'Question: ' + question + '\\n\\nSources:\\n' +
    top5.map((c, i) => '[' + (i + 1) + '] ' + c.chunkText).join('\\n\\n') },
];

// The post-check is the part teams skip, and it is the part that makes the
// "cite every claim" instruction real rather than decorative.
const cited = [...answer.matchAll(/\[(\d+)\]/g)].map(m =&gt; Number(m[1]));
const bad = cited.filter(n =&gt; n &lt; 1 || n &gt; top5.length);
if (bad.length) return fallback('unsupported citation');
if (!cited.length) return fallback('no citation on a factual answer');
if (/NOT IN SOURCES/.test(answer)) return abstainWithLinks(top5);</code></pre>
<p><strong>Line notes.</strong> The regex check is cheap and catches the two dominant failure
modes — a hallucinated citation index, and a confident answer with no citation at all. Numbering
the sources is not cosmetic: it gives the model a stable handle to cite, which is what makes the
output auditable. And returning <code>abstainWithLinks</code> rather than a bare refusal is a
real product decision — users accept "I could not find that, here are the closest documents" far
better than silence.</p>
    `));

    section.appendChild(tableCard('💰 Cost and latency, per query', ['Stage', 'Latency', 'Cost', 'Lever'], [
        ['Query embedding', '5&ndash;30 ms', 'small', 'cache repeated phrasings; batch concurrent queries'],
        ['Dense retrieval', '1&ndash;10 ms', 'none', 'over-fetch, then tune <code>ef_search</code> per query class'],
        ['Sparse retrieval', '1&ndash;5 ms', 'none', 'cheap enough to always run alongside dense'],
        ['Reranking', '15&ndash;80 ms', 'the most expensive non-LLM stage', 'rerank 30&ndash;60, not 200; batch and cache'],
        ['Generation', '200 ms&ndash;2 s', 'dominant', 'stream; cut context length; route to a smaller model'],
        ['Context tokens', 'affects prefill linearly', 'proportional', 'fewer, better chunks beat more chunks'],
        ['End to end', 'target p95 under ~2 s interactive', '&mdash;', 'overlap retrieval and rerank where you can'],
    ]));

    section.appendChild(card('🚫 When NOT to build RAG', `
<ul>
<li><strong>Freshness needs are sub-minute.</strong> Retrieval over an indexed corpus cannot beat
a real-time API call, and adding it anyway just adds a stale layer.</li>
<li><strong>Exact aggregation.</strong> "How many open tickets did we close last quarter?"
wants SQL. A model reading retrieved rows will eventually miscount them.</li>
<li><strong>Answers that span the whole corpus.</strong> If the question needs 40% of the
documents, retrieval is selecting the wrong 5%. Build a summary index or hierarchical
aggregation instead.</li>
<li><strong>You have fewer than a few hundred documents and a strong baseline already.</strong>
Long-context stuffing of 30 pages will often match it, and it is far simpler to operate.</li>
<li><strong>The corpus is not yours to quote.</strong> Retrieval does not launder copyright or
PII; the obligations are identical to serving the source.</li>
<li><strong>Your data is already structured and queryable.</strong> Text-to-SQL over a schema is
the better shape for a metrics product.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Uncited answers ship anyway.</strong> Enforce the citation rule in code, not in the
prompt. A prompt-level instruction has no guarantee attached to it.</li>
<li><strong>Overlap is not free.</strong> 20% overlap on 10M chunks is 2M duplicate vectors that
inflate the index and can surface the same passage twice in one context.</li>
<li><strong>Chunk titles are discarded.</strong> Dropping the heading path during parsing removes
the single strongest relevance signal a section has.</li>
<li><strong>Freshness has no mechanism.</strong> Without a re-ingest trigger tied to the source,
the index silently rots and nothing alerts you.</li>
<li><strong>Stale chunks outrank fresh ones.</strong> Version documents in metadata and filter,
rather than trusting the index to prefer the current revision.</li>
<li><strong>Context is cropped by the window, not by the retriever.</strong> When the assembled
context exceeds the window the model silently loses the tail — usually the oldest sources, which
is not the safe default.</li>
<li><strong>ACL filtering applied after retrieval.</strong> Retrieve, then filter by tenant, and
one bug leaks another customer's document. Pre-filter, and test it as a security case.</li>
<li><strong>One global chunk size for every document type.</strong> An FAQ and a legal contract
want different sizes and different strategies.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['Why not just put the whole corpus in the context window?',
            '<p>Three reasons, in order of how often they bite. First, cost and latency: prefill '
            + 'scales linearly with tokens, so a 200k-token corpus is unusable interactively. '
            + 'Second, attention over relevance: models attend reliably to a needle but degrade '
            + 'when most of the context is noise, so you often get <em>worse</em> answers with 5 '
            + 'good passages than with a full dump. Third, freshness — a long window does not help '
            + 'if the documents behind it are a month old. Long-context stuffing is reasonable only '
            + 'when the corpus genuinely fits and genuinely changes slowly.</p>'],
        ['Fixed-size vs semantic chunking — what would you pick?',
            '<p>Recursive structure-aware, as the default, because it is predictable and cheap. '
            + 'Semantic chunking earns its cost on long narrative or legal prose where topic '
            + 'boundaries are not marked by headings. The honest answer also includes measurement: '
            + 'build a labelled set first, then compare recall@10 across three or four chunk sizes. '
            + 'Teams are routinely surprised by how flat the curve is until they try '
            + 'structure-aware, and how steep it is once the corpus has real sections.</p>'],
        ['How do you debug a bad RAG answer?',
            '<p>Determine which half failed before touching any code. (1) Does the answer contain '
            + 'the right fact anywhere in the index? Search the store with the exact phrase. If '
            + 'not, it is an ingest or chunking bug. (2) If it is in the index, did it come back? '
            + 'Log the full ranked candidate list, not just what reached the prompt. (3) If it came '
            + 'back, was it above the cutoff? Often the right chunk ranked 4th, and a reranker or '
            + 'a query rewrite fixes it. (4) If it made the prompt and the answer is still wrong, '
            + 'it is a prompt or model problem. Most teams skip to step 4 and prompt-engineer their '
            + 'way around a chunking bug.</p>'],
        ['How do you know retrieval is the bottleneck and not generation?',
            '<p>Run the pipeline against an oracle in two places. Oracle retrieval with real '
            + 'generation isolates retrieval; real retrieval with an oracle answer isolates '
            + 'grounding. There is also a cheap production signal: the rate at which users re-ask a '
            + 'question or abandon an answer correlates strongly with retrieval failure and only '
            + 'weakly with generation quality. Track the two separately, because they have '
            + 'different owners and different fixes.</p>'],
        ['How would you keep the index fresh?',
            '<p>Three triggers, in increasing order of cost. Webhooks or change-data-capture from '
            + 'the source of truth for incremental updates. A scheduled full re-crawl, diffed by '
            + 'content hash so unchanged chunks are not re-embedded. And a periodic reconciliation '
            + 'that counts indexed documents against the source, because a silent crawl failure is '
            + 'otherwise invisible. Version every chunk with its source revision and filter on it, '
            + 'so you can prefer current content and roll back.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Observability is the product.</strong> Log the query, the ranked candidate ids with
scores, the ids that reached the prompt, the model's citation ids, and per-stage latency. Without
all five, every bug report becomes archaeology.</li>
<li><strong>Ship an abstention path from day one.</strong> "Not in the sources, here are the
closest matches" is a feature and the cheapest hallucination mitigation available.</li>
<li><strong>Start with one document type.</strong> Depth on a narrow corpus beats breadth over
messy sources, and it is what produces a measurable baseline.</li>
<li><strong>Cache the retrieval, not the answer.</strong> Repeated phrasings are common in
support; caching ranked chunk ids is safe in a way that caching generated text is not.</li>
<li><strong>Make citations a product surface.</strong> Click-through on sources is the strongest
relevance feedback signal you will ever get, and it is free.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 5. Advanced RAG ──────────────────────────────────────────────────
export function renderAIAdvancedRAG(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Advanced RAG'));

    section.appendChild(card('🧠 Mental Model', `
<p>Naive RAG embeds the query, retrieves the top k, and generates. Advanced RAG is the
acknowledgement that <b>the query and the document are not the same shape</b>: a user asks a
question, the corpus speaks in declarative prose, and the mismatch is what the retriever sees.
Every "advanced" technique is a patch for one of three gaps.</p>
<p><b>The invariant:</b> <b>retrieval quality is bounded by the worst stage, and the stages are
serial.</b> A perfect reranker cannot rescue a query that was rewritten into the wrong question,
and a perfect query rewriter cannot rescue a corpus that was never chunked properly. That is why
advanced RAG work is diagnostic before it is additive — find the failing stage, then choose the
technique that targets it.</p>
<p>The three gaps, and the techniques that close them:</p>
<ul>
<li><b>Query gap</b> — the user is vague, conversational, multi-hop, or uses vocabulary the
corpus does not. Closed by query rewriting, decomposition, HyDE, and multi-query fan-out.</li>
<li><b>Ranking gap</b> — the right chunk is in the candidate set but not in the top few. Closed
by a cross-encoder reranker, which is the single highest-value addition in the whole field.</li>
<li><b>Context gap</b> — 20 retrieved chunks are too much context, so the answer gets diluted.
Closed by compression, parent-child retrieval, and sentence-level extraction.</li>
</ul>
    `));

    const cmpCard = card('🔀 Naive vs advanced, stage by stage', `
<p>Every box on the right is a decision you can make independently and measure independently. The
green boxes are the ones that reliably pay for themselves; the amber ones need a specific failure
mode to justify them.</p>
    `);
    cmpCard.appendChild(diagram(`
flowchart TD
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
    N -.->|"baseline number every<br/>technique must beat"| A
`, 'The same baseline on both sides: every technique should be justified by a failing metric, not by the technique being fashionable'));
    section.appendChild(cmpCard);

    const mapCard = card('🗺️ The technique landscape', `
<p>Use this as a menu against a diagnosis, not a shopping list. The branches are ordered roughly
by ratio of benefit to added latency and cost, within each area.</p>
    `);
    mapCard.appendChild(diagram(`
mindmap
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
        write new text back after an answer
`, 'Grouped by which gap each technique closes — diagnose first, then pick from the matching branch'));
    section.appendChild(mapCard);

    section.appendChild(tableCard('⚙️ Technique trade-offs', ['Technique', 'Fixes', 'Added latency', 'Added cost', 'Verdict'], [
        ['Query rewriting with an LLM', 'vague, conversational, follow-up questions', 'one extra generation, 100&ndash;500 ms', 'one call per query', '<b>high value</b> once you have history'],
        ['Multi-query fan-out', 'vocabulary mismatch', 'parallel, so ~1 extra generation', 'N calls per query', 'good, and it parallelises'],
        ['HyDE', 'queries too short or too abstract to embed well', 'one extra generation', 'one call per query', 'cheap to try, surprisingly effective on abstract questions'],
        ['Cross-encoder reranking', 'right chunk ranked 5th to 50th', '20&ndash;80 ms', 'one model to host', '<b>the single best value in the field</b>'],
        ['Reciprocal rank fusion', 'dense and sparse disagree', 'a few ms of arithmetic', 'nothing', 'free — always do it'],
        ['Parent-child retrieval', 'a fact too small to embed on its own', 'extra metadata lookup', 'storing two granularities', 'good for specs, tables, FAQs'],
        ['Contextual compression', 'too much irrelevant context', 'one extra model pass', 'one model to host', 'only once you have measured context dilution'],
        ['Graph RAG', 'multi-hop and entity questions', 'significant at query time', 'a hard, ongoing ingest', 'narrow: only for genuinely relational questions'],
        ['Self-refine loop', 'shallow answers', 'a second full generation', 'roughly doubles cost', 'use on a router-selected subset, not globally'],
    ]));

    section.appendChild(card('💻 Implementation: query rewriting with a hard budget', `
<pre><code class="language-javascript">const REWRITE_PROMPT =
  'Rewrite the user question as a standalone search query. ' +
  'Resolve pronouns from the conversation. Expand acronyms. ' +
  'Output ONLY the query, under 40 words, no punctuation at the end.';

async function buildQuery(question, history) {
  // 1. cheap gate. most queries in a fresh session need no rewrite at all,
  //    and an unconditional rewrite is a guaranteed extra generation per request
  if (history.length === 0 &amp;&amp; !/^(what|who|when|why|how|which)\b/i.test(question)) {
    return { variants: [question], rewritten: false };
  }
  // 2. a small, fast model is enough. this is a rewriting task, not a
  //    reasoning task, and it is on the critical path
  const rewritten = await llmSmall.generate({
    messages: [{ role: 'user', content: REWRITE_PROMPT + '\\n\\nHistory:\\n' + tail(history, 4) }],
    temperature: 0, maxOutputTokens: 64,
  }).then(r =&gt; r.text.trim());

  // 3. safety net. a rewrite that drops the entity is worse than no rewrite
  return rewritten.length &gt; 3
    ? { variants: [question, rewritten], rewritten: true }
    : { variants: [question], rewritten: false };
}

// fan out, then fuse with reciprocal rank fusion
const all = await Promise.all(variants.map(v =&gt; retrieve(v, { topK: 50 })));
const fused = reciprocalRankFusion(all, { k: 60 });
const final = await rerank(fused.slice(0, 60), question).then(r =&gt; r.slice(0, 5));</code></pre>
<p><strong>Line notes.</strong> Line 1 is the optimisation that makes the whole technique
affordable: gating on conversation history and interrogative form removes the extra generation
for most traffic. Line 2 is the reason a small model is correct here — rewriting is a short
transformation and putting a frontier model on it buys nothing. Line 3 matters more than it looks:
rewrites routinely drop the specific noun the user searched for, and keeping the original as one
of the variants makes that failure harmless.</p>
    `));

    section.appendChild(card('🧪 Worked example: what each technique fixes', `
<p>Question with conversation history: <em>"what about the other one then?"</em> The prior turns
were about a Pro plan trial and a failed payment. Relevant corpus section: "Downgrading from Pro
to Free takes effect at the end of the current billing period; annual plans are refunded pro
rata."</p>
<table class="complexity-table">
<tr><th>Configuration</th><th>Query reaching the retriever</th><th>Top-5 contains the downgrade section?</th></tr>
<tr><td>Naive</td><td><code>what about the other one then</code></td><td>No — four chunks about unrelated billing topics</td></tr>
<tr><td>+ rewriting</td><td><code>downgrade Pro plan to Free during current billing period</code></td><td><b>Yes, ranked 1</b></td></tr>
<tr><td>+ multi-query</td><td>the above, plus "annual plan refund pro rata"</td><td>Yes, ranked 1, and the refund sentence is now retrieved</td></tr>
<tr><td>+ reranking only (no rewrite)</td><td><code>what about the other one then</code></td><td>No — reranking cannot rank a document the retriever never returned</td></tr>
</table>
<p>The last row is the point worth remembering in an interview: <b>a reranker fixes ranking, never
recall.</b> If the relevant chunk is not in the candidate set, reranking is rearranging the wrong
50 documents. That is why the fix order is always rewrite/recall first, rerank second.</p>
    `));

    section.appendChild(tableCard('💰 Cost and latency of the advanced path', ['Added stage', 'Latency', 'Cost multiplier', 'Worth it when'], [
        ['Query rewriting', '100&ndash;500 ms', '+1 generation', 'there is conversation history, or the query is under ~5 words'],
        ['Multi-query fan-out', 'parallel, so ~1 generation', '&times;N calls', 'queries are short and vocabulary mismatch is measurable'],
        ['HyDE', '100&ndash;400 ms', '+1 generation', 'queries are abstract and retrieval recall@5 is low'],
        ['Reranking', '20&ndash;80 ms', 'one hosted model, per candidate', 'recall@50 is fine but recall@5 is not — the most common diagnosis'],
        ['Contextual compression', '50&ndash;200 ms', 'one model pass', 'the reranked passages are long and mostly irrelevant'],
        ['Graph retrieval', '100&ndash;500 ms', 'a whole second store', 'questions are genuinely multi-hop over entities'],
        ['Self-refine', '+100% generation', '&times;2 total', 'a cheap router says this query class is hard'],
    ]));

    section.appendChild(card('🚫 When NOT to go advanced', `
<ul>
<li><strong>You have not measured the naive baseline.</strong> Most "we need advanced RAG" requests
are unmeasured dissatisfaction. Fix the eval first; the technique list is short when you know which
number is wrong.</li>
<li><strong>Your latency budget cannot absorb it.</strong> Rewriting plus reranking plus
compression can add a second to a 900&nbsp;ms budget. Pick the one stage with the best
measured return.</li>
<li><strong>Your corpus is the problem.</strong> Bad parsing, missing headings, and un-deduplicated
mirrors will defeat every technique downstream. Fix ingest first — it is also cheaper.</li>
<li><strong>Single-hop, keyword-shaped questions dominate.</strong> A help-centre search box is
mostly identifier lookups, which BM25 handles and which HyDE actively hurts.</li>
<li><strong>You cannot afford the eval harness.</strong> Techniques chosen by vibes are usually
neutral at best and add a failure mode at worst.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Rewrites that lose the entity.</strong> "What about the refund for order 4471" becomes
"refund policy" and retrieves policy, not the order. Keep the original as a variant.</li>
<li><strong>Reranking 500 candidates.</strong> Latency goes up linearly and the marginal recall
gain past ~50 is small. Fetch wide, rerank narrow.</li>
<li><strong>Compression that drops the caveat.</strong> An extractor that keeps the headline
sentence and drops "unless you are on an annual plan" produces a confidently wrong answer.</li>
<li><strong>Recursive summarisation.</strong> Repeatedly summarising retrieved text accumulates
loss. Compress once, and always keep the original sentences for citation.</li>
<li><strong>Multi-query with a sequential loop.</strong> Three queries run one after another is
three times the latency; they are independent, so fan them out.</li>
<li><strong>HyDE on extractive questions.</strong> A hypothetical answer to "what is the timeout
value" invents a number, and the fabricated number then steers retrieval toward the wrong
document.</li>
<li><strong>Technique stacking without ablation.</strong> Four techniques at once, no per-technique
number, means no one can tell which helps — and when quality drops, no one can tell which
caused it.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['Where would you start, given a RAG system users call "dumb"?',
            '<p>With a labelled eval set and the oracle test, not with a technique. Build 100 to '
            + '200 real questions with known-correct source spans, then measure (a) the recall of '
            + 'the retriever into the top 5, and (b) whether the answer is right when the correct '
            + 'span is force-fed. If (b) is high and (a) is low, it is purely retrieval and you '
            + 'spend the budget on recall first. If (a) is high and (b) is low, no amount of '
            + 'retrieval work will help. Most systems are the first case, and the cheapest first '
            + 'move is over-fetching plus a reranker.</p>'],
        ['What is HyDE and when does it backfire?',
            '<p>You generate a hypothetical ideal answer to the question, embed that, and search '
            + 'with the answer vector instead of the question vector. It works because documents '
            + 'and hypothetical answers share a register, while questions do not. It backfires on '
            + 'extractive questions, where the hypothetical answer invents specifics — a made-up '
            + 'timeout value, a fabricated SKU — and that invented token then pulls retrieval '
            + 'toward a document that is merely about timeouts rather than the one containing your '
            + 'actual value.</p>'],
        ['Explain cross-encoder reranking and why it beats bi-encoder retrieval.',
            '<p>A bi-encoder embeds query and document independently, so at index time it never '
            + 'sees the query and the two vectors can only encode similarity through a single dot '
            + 'product. A cross-encoder takes the query and the document together and runs full '
            + 'attention between them, so it can model interactions like "this sentence is only '
            + 'relevant given that the question asked about revocation". That is far more accurate '
            + 'and far more expensive, which is why it runs on 30 to 60 candidates after recall, '
            + 'not on the whole corpus.</p>'],
        ['How do you choose between parent-child and plain chunking?',
            '<p>Look at whether the answer is a specific fact inside a broad explanation. Parent-'
            + 'child wins there: the child sentence embeds precisely, so it retrieves, and the '
            + 'parent section is what you hand the model, so the fact arrives with its context. '
            + 'Plain chunking wins when the document has no natural hierarchy, when sections are '
            + 'short enough already, or when you cannot afford to store and maintain two '
            + 'granularities. It is a corpus property, so decide it by sampling twenty real '
            + 'documents and looking at them.</p>'],
        ['How would you A/B test a new retrieval technique?',
            '<p>Offline first, on a fixed labelled set, with the naive pipeline as the control and '
            + 'one technique changed at a time. The metric that matters is end-to-end answer '
            + 'correctness and citation validity, not recall — recall can rise while answers get '
            + 'worse if the extra context is noisier. Then shadow a small slice of production '
            + 'traffic and compare on the judge metric plus latency and cost, because a technique '
            + 'that wins offline by 2% and doubles p99 latency is usually a loss.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Gate expensive stages behind a router.</strong> A cheap classifier on the query
decides whether it is short/vague enough to need a rewrite; most traffic should skip it.</li>
<li><strong>Cap every stage.</strong> A rewrite budget, a rerank candidate count, a compression
ratio floor, a hop limit for graph traversal. Unbounded loops are how a research demo becomes an
outage.</li>
<li><strong>Ablate on a schedule.</strong> Re-run the per-technique numbers quarterly. Corpus
changes shift which gap is binding, and the right technique changes with it.</li>
<li><strong>Version the whole retrieval config, not just the model.</strong> Top-k, chunk size,
rewrite prompt and reranker together, or a quality change is unattributable.</li>
<li><strong>Keep the naive path as a fallback.</strong> If the rewriter times out or the reranker
is down, degrade to plain hybrid retrieval rather than failing the request.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 6. RAG evaluation ────────────────────────────────────────────────
export function renderAIRAGEval(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'RAG Evaluation'));

    section.appendChild(card('📊 Metrics', `
<table class="complexity-table">
<tr><th>Metric</th><th>Measures</th></tr>
<tr><td>Precision</td><td>Relevant docs retrieved / all retrieved</td></tr>
<tr><td>Recall</td><td>Relevant docs retrieved / all relevant</td></tr>
<tr><td>MRR</td><td>Mean reciprocal rank of first relevant doc</td></tr>
<tr><td>NDCG</td><td>Rank-aware relevance quality</td></tr>
<tr><td>Faithfulness</td><td>Is answer grounded in context?</td></tr>
</table>
    `));

    section.appendChild(card('🧠 Mental Model', `
<p>A RAG system has three independently breakable parts, so it needs three independently
measurable numbers. Retrieval quality, generation faithfulness, and end-to-end answer quality.
<b>The invariant:</b> <b>a single blended score is worse than useless, because it always moves
when anything moves and therefore never tells you what to fix.</b> If a release drops your
composite by 4%, you cannot act on that. If <code>context recall</code> is flat and
<code>faithfulness</code> fell, you know it is a prompt or model problem and not a corpus
problem.</p>
<p>The other invariant that catches most teams: <b>retrieval metrics require ground truth;
generated-answer metrics can be judged without it.</b> That is what makes LLM-as-judge
evaluation practical — you cannot label "the correct answer" for a thousand open-ended questions,
but you <em>can</em> label whether a given answer is supported by a given context.</p>
    `));

    const layerCard = card('🧪 The three layers of a RAG eval', `
<p>Follow the two decision diamonds. They are the whole point of the diagram: <b>if context
recall is low, nothing downstream matters</b>, because a perfectly faithful answer to the wrong
context is still wrong. Fix the bottom layer first, then the middle, and only then look at
generation.</p>
    `);
    layerCard.appendChild(diagram(`
flowchart TD
    Q["Eval set: question plus<br/>known relevant source spans"] --> R["Layer 1, retriever<br/>needs labelled spans"]
    R --> RM{"Context recall@5<br/>at least the target?"}
    RM -->|"no"| FIX1["Fix parsing, chunking,<br/>recall. Stop here.<br/>No generation metric<br/>can rescue a miss"]
    RM -->|"yes"| F["Layer 2, faithfulness<br/>judge: is each claim<br/>supported by the context?"]
    F --> FM{"Faithfulness<br/>at least the target?"}
    FM -->|"no"| FIX2["Fix the prompt, the context order,<br/>or add a post-hoc<br/>citation check"]
    FM -->|"yes"| A["Layer 3, answer quality<br/>correct, relevant,<br/>complete, well cited"]
    A --> SHIP{"Correct and<br/>complete?"}
    SHIP -->|"no"| FIX3["Usually the model tier<br/>or the instruction, not retrieval"]
    SHIP -->|"yes"| REL["Release, and pin the<br/>regression test"]
`, 'Three layers with two gates: never tune generation while context recall is failing, and never chase an answer-quality drop before faithfulness is clean'));
    section.appendChild(layerCard);

    const diagCard = card('🩺 From a user complaint to the number that moved', `
<p>Work left to right along the branch you actually observe. The recurring mistake is jumping to
the last row — a bad answer reads like a generation problem — when in practice the symptom that
generates complaints most often starts two branches to the left, in the corpus.</p>
    `);
    diagCard.appendChild(diagram(`
flowchart TD
    S["Symptom reported by users"] --> Q{"What exactly<br/>is wrong?"}
    Q -->|"the answer is confidently<br/>wrong, and cites nothing"| NOCTX["No citation at all<br/>on a factual question"]
    Q -->|"cites a document that<br/>does not contain the fact"| BADCTX["Context is present<br/>but does not support it"]
    Q -->|"cites the right document<br/>but answers the wrong question"| WRONGQ["Right context,<br/>wrong question"]
    Q -->|"the right document is in<br/>the system but never surfaces"| NORANK["Found in the index,<br/>never retrieved"]
    NOCTX --> M1["Measure abstention accuracy<br/>and context recall@5"]
    BADCTX --> M2["Measure faithfulness<br/>and citation support"]
    WRONGQ --> M3["Measure answer relevance<br/>plus reranker scores"]
    NORANK --> M4["Measure recall@50 first,<br/>then recall@5 and MRR"]
    M1 --> F1["Fix: corpus coverage, then recall"]
    M2 --> F2["Fix: prompt, context order,<br/>hard citation check"]
    M3 --> F3["Fix: query rewriting,<br/>then the model tier"]
    M4 --> F4["Fix: chunking, then over-fetch<br/>plus a reranker"]
`, 'The same visible symptom has four different causes, and the metric you measure is what tells them apart — measuring faithfulness first will point you at the prompt for a chunking bug'));
    section.appendChild(diagCard);

    section.appendChild(tableCard('📐 The metric set, with what each one catches', ['Layer', 'Metric', 'Definition', 'The failure it uniquely catches'], [
        ['Retriever', 'Context recall', 'share of gold spans present in the retrieved context', 'the answer was never in the index, or the top-k was too small'],
        ['Retriever', 'Context precision', 'share of retrieved context that is relevant', 'you are burning context window on noise'],
        ['Retriever', 'MRR / nDCG@10', 'rank-aware quality of the retrieved set', 'the right chunk is at rank 9, so the generator never saw it early'],
        ['Retriever', 'Hit rate@1', 'the gold document is ranked first', 'ranking regressions a recall@k number hides'],
        ['Generator', 'Faithfulness', 'every claim entailed by the context', 'the model used its prior knowledge instead of the evidence'],
        ['Generator', 'Answer relevance', 'the answer addresses the question asked', 'the model answered the neighbouring question'],
        ['Generator', 'Citation accuracy', 'cited ids exist and support the claim', 'fabricated or mismatched references'],
        ['End to end', 'Correctness', 'the answer is right', 'a complete miss'],
        ['End to end', 'Completeness', 'it covers every part of a multi-part question', 'a correct but partial answer, which users read as wrong'],
        ['End to end', 'Abstention accuracy', 'it abstains exactly when it should', 'confidently answering from nothing, and over-refusing'],
        ['Ops', 'p95 latency and cost per query', 'engineering, not model, quality', 'a quality win that the product cannot ship'],
    ]));

    section.appendChild(card('🧮 Worked example: one release, three numbers', `
<p>Eval set: 200 real support questions with gold source spans. Before and after a release that
swapped in a new chunker and added a reranker.</p>
<table class="complexity-table">
<tr><th>Metric</th><th>Before</th><th>After</th><th>Read</th></tr>
<tr><td>Context recall@5</td><td>0.71</td><td>0.88</td><td>reranker plus wider fetch — a real win</td></tr>
<tr><td>Context precision@5</td><td>0.34</td><td>0.29</td><td>slightly worse: the reranker surfaced a fifth marginal chunk</td></tr>
<tr><td>Faithfulness</td><td>0.94</td><td>0.93</td><td>flat, as expected — the prompt did not change</td></tr>
<tr><td>Answer correctness</td><td>0.58</td><td>0.79</td><td>the number you actually care about</td></tr>
<tr><td>Correct but incomplete</td><td>0.19</td><td>0.14</td><td>still the largest single error class left</td></tr>
<tr><td>p95 latency</td><td>1.4 s</td><td>1.9 s</td><td>+0.5 s, which is the reranker plus a wider fetch</td></tr>
</table>
<p>What this tells you that a composite would not: correctness improved because recall improved,
and faithfulness did not move, so there is <b>nothing to fix in the prompt</b>. The next
iteration should target completeness — which usually means either returning more context or asking
the model to enumerate sub-questions — and the +0.5&nbsp;s is the bill for a 21-point correctness
gain, which is a good trade but a real one.</p>
    `));

    section.appendChild(card('💻 Implementation: a judge you can defend', `
<pre><code class="language-javascript">const FAITHFULNESS_JUDGE = [
  'You are grading whether an ANSWER is supported by a CONTEXT.',
  'Extract each factual claim from the ANSWER. For each claim decide:',
  '  supported    - the CONTEXT states it or directly entails it',
  '  contradicted - the CONTEXT states something incompatible',
  '  not_in_context - the CONTEXT is silent',
  'Return JSON only. An ANSWER that contradicts the CONTEXT is worse',
  'than one that is silent, because it will mislead the user.',
].join('\n');

const score = await judge({
  rubric: FAITHFULNESS_JUDGE,
  temperature: 0,        // 1. a judge is a classifier. variance here is pure noise
  repeat: 3,              // 2. majority vote over 3 samples. costs 3x, removes most
                           //    of the run-to-run wobble on borderline items
  validate: s =&gt; Array.isArray(s.claims) &amp;&amp; s.claims.every(c =&gt;
      ['supported', 'contradicted', 'not_in_context'].includes(c.verdict)),
  onInvalid: (_, raw) =&gt; retryWithRepairPrompt(raw),   // 3. always re-ask with the parse
                           //    error appended, never score a malformed response as 0
});

// 4. spot-check the judge against humans. if the judge is not at least as
//    accurate as the change you are trying to detect, you are measuring noise
await auditJudgeAgreement(humanLabels, score, { minAgreement: 0.85 });</code></pre>
<p><strong>Line notes.</strong> Line 2 is the cheapest accuracy win available: three samples at
temperature 0 plus a majority vote removes most borderline wobble, and the cost is a fraction of
the pipeline you are trying to evaluate. Line 3 is the one that bites hardest in practice — a
judge that returns malformed JSON on 3% of items will silently depress your score and look like a
quality regression. And line 4 is the habit that separates a real eval harness from a dashboard:
the judge itself needs a gold set and a known agreement rate.</p>
    `));

    section.appendChild(tableCard('🧰 Evaluation frameworks', ['Tool', 'Shape', 'Strength', 'Caveat'], [
        ['RAGAS', 'library, metric-per-component', 'the reference decomposition into context precision/recall, faithfulness, answer relevance', 'LLM-judged, so it inherits judge bias; pin model and prompt versions'],
        ['DeepEval', 'pytest-style assertions', 'fits existing CI; per-metric LLM-as-judge with few-shot control', 'the pytest framing encourages many tiny assertions and a slow suite'],
        ['TruLens', 'instrumentation at runtime', 'tripwire checks and feedback functions on live traces', 'instrumentation cost in the hot path'],
        ['LangSmith', 'tracing plus datasets plus evaluators', 'best-in-class trace inspection; datasets make regression runs easy', 'you are committing to a vendor and shipping traces off-box'],
        ['Phoenix', 'open-source, OTel-aligned', 'self-hostable; spans line up with OpenTelemetry', 'you operate it'],
        ['Hand-rolled', 'whatever you write', 'exactly the metrics and slices you care about', 'no interop, and easy to accidentally measure something subtly different from the standard definition'],
    ]));

    section.appendChild(tableCard('💰 Cost and latency of evaluation', ['Activity', 'Cost', 'Cadence'], [
        ['Building the labelled set', 'the dominant cost: 200 human-labelled questions is days of work', 'once, then grow it'],
        ['Offline eval run, 200 questions', '200 x (retrieval + 1 generation + N judge calls)', 'every change to the pipeline'],
        ['Judge calls with repeat=3', '3x the judge cost, usually still under 10% of a run', 'every run'],
        ['Production trace sampling', '1&ndash;5% of traffic, judge on the sample', 'continuous'],
        ['A/B on live traffic', 'both arms fully served', 'for changes that pass offline'],
        ['Human audit of the judge', '50&ndash;100 items per judge version', 'whenever the judge model or rubric changes'],
    ]));

    section.appendChild(card('🚫 When NOT to use an LLM judge', `
<ul>
<li><strong>When the answer is a single number or exact string.</strong> Compare directly. A
judge adds cost and error to a task a string comparison does perfectly.</li>
<li><strong>When you have human labels available.</strong> Human judgement is the ground truth
for whether the <em>judge</em> is any good, and it should be collected before the judge is
trusted.</li>
<li><strong>For safety-critical claims.</strong> Never let a judge decide whether a medical,
legal, or financial statement is acceptable. That is a rules engine plus a human.</li>
<li><strong>As the only signal.</strong> A judge score with no user signal and no latency or cost
tracking tells you the system sounds right, which is not the same as being right.</li>
<li><strong>On a 20-example set.</strong> Below roughly 100 items, the confidence interval is
wider than any effect you are trying to detect, so the number cannot support a decision.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Eval set that is not production traffic.</strong> A set built from questions you
already know the answer to measures the easy tail. Mine real logs, and keep the ugly ones.</li>
<li><strong>Averaging over everything.</strong> Slice by query length, language, document type,
and tenant. A 2% overall gain can be a 12% gain on the slice you actually care about.</li>
<li><strong>Never measuring abstention.</strong> A system that answers everything scores well on
correctness among the questions it attempts while being wrong in exactly the places users notice.
Pair every run with an abstention-accuracy check.</li>
<li><strong>Judging the answer instead of the context.</strong> Faithfulness must be judged
against the <em>retrieved context</em>, not against general knowledge — otherwise a correct
answer that the corpus did not support looks perfect.</li>
<li><strong>Changing the judge and the system in one release.</strong> You will never attribute
the movement. Change one, re-audit the judge, then change the other.</li>
<li><strong>Golden-set overfitting.</strong> Optimising directly against 200 labelled questions
produces a system tuned to those 200. Hold out a set you never look at.</li>
<li><strong>No confidence intervals.</strong> 200 items, 79% correct, has roughly a &plusmn;3.5
point interval. "Up 2 points" is not a result.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['How do you know if your retriever or your generator is the problem?',
            '<p>Run the oracle test. Force the known-correct passages into the prompt and see '
            + 'whether the answer is right; that isolates generation. Then check whether those '
            + 'passages are actually being retrieved; that isolates retrieval. Four outcomes, four '
            + 'actions: good generation with bad retrieval means fix retrieval; bad generation '
            + 'with good retrieval means fix the prompt or the model tier; bad at both means start '
            + 'with the corpus; good at both means you have a sampling artefact in the eval. It '
            + 'takes an afternoon and it removes most of the guesswork from the next quarter.</p>'],
        ['Which one metric would you put on a dashboard, and why?',
            '<p>Context recall@5 for the retriever and abstention accuracy for the system as a '
            + 'whole. Recall is the one number where an improvement almost always converts into '
            + 'answer quality, so it is the best leading indicator. Abstention accuracy is the '
            + 'one that catches the failure users actually complain about — a confident answer '
            + 'with nothing behind it. A blended "RAG score" is the wrong choice: it moves for '
            + 'every reason, so when it moves you have learned nothing about what to do next.</p>'],
        ['How reliable is LLM-as-judge, honestly?',
            '<p>Good but not neutral. Judges are systematically more generous on style than on '
            + 'substance, they share the generator\'s biases, and they drift when you swap the '
            + 'judge model. Treat the judge score as a noisy but useful signal, and make it '
            + 'trustworthy three ways: pin the model and rubric version, run repeat samples and '
            + 'majority-vote, and audit agreement against human labels on 50&ndash;100 items every '
            + 'time the judge changes. A judge that disagrees with humans 15% of the time cannot '
            + 'detect a 5% regression.</p>'],
        ['How large does an eval set need to be?',
            '<p>Enough that the confidence interval is narrower than the effect you need to '
            + 'detect. With roughly 79% correctness, 200 items gives you about a &plusmn;3.5 '
            + 'point interval, so a 5-point improvement is detectable and a 2-point one is not. '
            + 'Two ways out: more items, or paired evaluation on the same items — because both '
            + 'systems are scored on identical questions, the paired difference has far lower '
            + 'variance than the two absolute rates and can detect smaller effects with fewer '
            + 'items.</p>'],
        ['How do you evaluate without any human labels at all?',
            '<p>You can get most of the way with proxies. A strong synthetic generator produces '
            + 'questions from your corpus in a way you can verify, giving you a gold span for '
            + 'free — but it over-represents your corpus and under-represents the awkward queries '
            + 'users actually type, so treat it as a regression suite, not as truth. Pair it with '
            + 'production signals: citation click-through, re-ask rate, abandon rate, and a weekly '
            + 'human read of twenty random traces. A few dozen human reads a week will find the '
            + 'failure modes no synthetic set will ever contain.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Version the eval set alongside the pipeline.</strong> Add new hard questions every
release; a frozen set makes the score go up forever while the product does not.</li>
<li><strong>Trace everything, sample a fraction.</strong> Store the ranked candidates, the final
context, the raw completion, and the judge verdict per query. An eval that only stores a score
cannot be re-scored when the judge improves.</li>
<li><strong>Gate on the metric that maps to user pain.</strong> Recall and abstention go in the
release gate; faithfulness and correctness are reviewed but looser.</li>
<li><strong>Track latency and cost on the same chart.</strong> A 20-point quality gain that adds
a second is a different product decision than one that is free.</li>
<li><strong>Keep a canary with automatic rollback.</strong> Run the new pipeline on a small slice
and revert on either quality or p95, because offline evals systematically miss production-only
inputs.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 7. Agents ────────────────────────────────────────────────────────
export function renderAIAgents(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Agent Architecture'));

    section.appendChild(card('🎬 Agent Execution', pipelineStages([
        { name: 'User', desc: 'Input query' },
        { name: 'Agent', desc: 'Reasoning' },
        { name: 'Choose Tool', desc: 'Select action' },
        { name: 'Execute', desc: 'Run tool' },
        { name: 'Observe', desc: 'Result' },
        { name: 'Reason Again', desc: 'Iterate' },
        { name: 'Final Answer', desc: 'Response' },
    ], (_, s) => toast(`Step: ${s.name}`, 'info'))));

    section.appendChild(card('🧠 Mental Model', `
<p>An agent is a model call inside a control loop. The model is given a goal, a set of tools, and
the observations so far, and it returns either a tool call or a final answer. The <em>framework</em>
executes the tool, appends the result, and calls the model again. That loop — not the model — is
the agent.</p>
<p><b>The invariant:</b> <b>the loop must terminate under conditions you choose, not under
conditions the model chooses.</b> The model has no intrinsic notion of "enough"; it will keep
proposing actions as long as the context allows. Therefore every agent needs an explicit budget
(max steps, max tokens, max wall-clock, max spend) and a stop condition, and the loop must check
the budget <em>before</em> executing a tool, not after.</p>
<p><b>Why agents at all.</b> The value is not "smarter answers" — it is <em>reaching actions a
single call cannot</em>: the model has to see an intermediate result before it knows what to do
next. That is genuine only when the next step depends on the observation. If you can write the
sequence of steps in advance, you want a deterministic pipeline, not an agent.</p>
    `));

    const loopCard = card('🔄 The ReAct loop as a state machine', `
<p>Follow the cycle. The two guarded transitions are the entire safety story: <code>BudgetExhausted</code>
is checked before every tool execution, and <code>Failed</code> means the loop is allowed to
surface an error rather than retrying forever. An agent implementation without those two
transitions will eventually hang or spend unbounded money, and it will do so in production
rather than in a demo.</p>
    `);
    loopCard.appendChild(diagram(`
stateDiagram-v2
    [*] --> Idle
    Idle --> Reasoning: user goal arrives
    Reasoning --> FinalAnswer: model returns a text answer
    Reasoning --> ToolSelection: model returns a tool call
    ToolSelection --> BudgetExhausted: step count or spend cap reached
    ToolSelection --> Approval: tool is a write or a payment
    ToolSelection --> Executing: tool is read-only and permitted
    Approval --> Executing: human approves
    Approval --> Failed: human rejects
    Executing --> Observing
    Observing --> Reasoning: observation appended to the transcript
    Observing --> Failed: non-retryable tool error
    Observing --> Executing: retryable error, within the retry budget
    FinalAnswer --> [*]
    Failed --> [*]: surface the error, never loop
    BudgetExhausted --> [*]: return the best partial answer
`, 'Termination is a property of the loop, not the model: budget is checked before every tool, and failure is a terminal state rather than a retry loop'));
    section.appendChild(loopCard);

    const pickCard = card('🧭 Agent, pipeline, or router?', `
<p>Follow it from the top; the first "yes" is your answer. The most common design error is
answering "agent" to the second question without having asked the first, which is how a
three-step classification ends up as a twelve-step agent loop.</p>
    `);
    pickCard.appendChild(diagram(`
flowchart TD
    A["Can you write the control flow<br/>as code today?"] --> B["If yes, build a pipeline<br/>or a router, and stop there"]
    A --> C{"If no, does the next step<br/>depend on a runtime observation?"}
    C -->|"no, it is merely unknown<br/>in advance"| P["Still a pipeline<br/>the steps exist,<br/>you just cannot name them yet"]
    C -->|"yes"| D{"Is the branching<br/>bounded and nameable?"}
    D -->|"a small fixed set<br/>of branches"| R["Router plus handlers<br/>the cheapest<br/>agent-shaped design"]
    D -->|"free-form, discovered<br/>as it goes"| AG["Agent loop<br/>with budgets, tool schemas,<br/>and full tracing"]
    R -.->|"still not enough"| AG
`, 'The first question is not "is it hard" but "can I write the control flow" — an unknown step list is still a pipeline, not an agent'));
    section.appendChild(pickCard);

    section.appendChild(card('🧪 Worked example: one task, three turns', `
<p>Task: <em>"Our refund rate doubled last week — find out why and draft a reply to the customer."</em></p>
<table class="complexity-table">
<tr><th>Turn</th><th>Model emits</th><th>Framework does</th><th>Why the next step depends on this one</th></tr>
<tr><td>1</td><td><code>query_orders(date_range=last_14_days, group_by=refund_reason)</code></td><td>runs it, appends 412 rows as a compact summary</td><td>which metric is used is decided by the result</td></tr>
<tr><td>2</td><td><code>query_orders(..., filter=sku_eq_XYZ)</code></td><td>runs it; 87% of refunds are one SKU</td><td>the SKU is only known after turn 1</td></tr>
<tr><td>3</td><td><code>get_product_history(sku=XYZ)</code></td><td>discovers a price change on the 3rd</td><td>the hypothesis is formed from turns 1 and 2</td></tr>
<tr><td>4</td><td>final text: cause plus a drafted reply</td><td>sends it, citing the order ids used</td><td>&mdash;</td></tr>
</table>
<p>Contrast with the deterministic version: the same four steps are writable as a script once you
know the investigation shape. The agent earns its cost only because step 2 is a
<span class="tag blue">branching</span> decision over data the system did not have when the
request arrived — and only because the tool returns a compact summary, not 412 rows. A tool that
dumps raw records into the transcript is the most common way agent context explodes and cost goes
quadratic.</p>
    `));

    section.appendChild(card('💻 Implementation: the loop, with the invariants in code', `
<pre><code class="language-javascript">const MAX_STEPS = 12;
const MAX_SPEND_USD = 0.50;      // 1. money, not steps, is the real budget. a single
                                 //    frontier call can exceed a step-cost assumption
const transcript = [{ role: 'user', content: goal }];

for (let step = 0; step &lt; MAX_STEPS; step++) {
  const res = await llm.generate({
    messages: [{ role: 'system', content: SYSTEM }, ...transcript],
    tools: toolSchemas,                 // 2. only the tools this turn is allowed to use —
    maxOutputTokens: 512,               //    narrow the set after the first read
  });
  transcript.push(res.message);

  if (!res.toolCalls?.length) return finalise(transcript);   // 3. the model is done

  // 4. check the budget BEFORE the side effect, not after
  if (spentUsd() &gt; MAX_SPEND_USD) return finalise(transcript, { truncated: true });

  const results = await Promise.all(res.toolCalls.map(async call =&gt; {
    if (isWrite(call.name) &amp;&amp; !approved(call)) return { error: 'rejected by reviewer' };
    try {
      return { result: await tools[call.name](call.args, { timeoutMs: 8000 }) };
    } catch (err) {
      // 5. errors go BACK to the model as observations, not into a 500.
      //    a readable error message is what lets it choose a different approach
      return { error: err.code + ': ' + err.message };
    }
  }));

  // 6. truncate tool output before it lands in the transcript, or context
  //    grows superlinearly and the model starts ignoring early observations
  transcript.push({ role: 'tool', content: JSON.stringify(summarise(results)) });
}</code></pre>
<p><strong>Line notes.</strong> Line 1 is the observation teams miss: a step limit alone does not
bound spend, because one step can cost a frontier call. Line 5 is the difference between a robust
agent and a brittle one — a tool that returns <code>NOT_FOUND: no order matching 4471</code> gives
the model something to branch on, whereas an exception ends the run. Line 6 is the practical
context-bug fix: summarising at the tool boundary, not at the end, is what keeps a 12-step run
inside the window.</p>
    `));

    section.appendChild(tableCard('⚙️ Agent patterns', ['Pattern', 'Shape', 'Use when', 'Cost profile'], [
        ['ReAct', 'reason, act, observe, repeat', 'the next step genuinely depends on the last result', 'N model calls per task'],
        ['Plan and execute', 'produce a plan, then run steps, then repair on failure', 'the shape is predictable but the data is not', 'one extra planning call up front'],
        ['Router', 'classify, then dispatch to a fixed handler', 'routes exist and are stable', 'one cheap classification call'],
        ['Parallel fan-out', 'split into N independent sub-tasks, run concurrently', 'sub-tasks do not depend on each other', 'N calls, but wall-clock is one call'],
        ['Human in the loop', 'pause for approval at a defined boundary', 'irreversible or externally visible actions', 'adds real latency; needs a resume mechanism'],
        ['Reflection', 'critique the output, then revise', 'quality-drafted content where a second pass helps', 'roughly doubles generation'],
        ['Multi-agent', 'a supervisor delegates to specialists', 'genuinely different expertise or permissions', 'the most tokens and the most failure modes'],
    ]));

    section.appendChild(tableCard('💰 Cost and latency', ['Quantity', 'Rule', 'Note'], [
        ['Model calls per task', '1 + number of steps', 'a 6-step agent is 7 calls'],
        ['Token growth', 'the transcript accumulates, so each call is longer than the last', 'context cost is quadratic in steps without truncation'],
        ['Tool latency', 'adds directly to wall-clock', 'sequential tool calls are the dominant cost for I/O-bound tools'],
        ['Wall-clock, sequential', 'sum of all model and tool time', 'fan out independent calls and it becomes the max, not the sum'],
        ['Wall-clock, streamed', 'time to first useful token is what the user feels', 'narrate progress rather than showing a spinner for 30 s'],
        ['Cost control', 'a per-task spend cap plus a per-tenant daily cap', 'plus a circuit breaker on the tool, not only on the model'],
        ['Biggest optimisation', 'compacting the tool output', 'usually a larger win than a smaller model'],
    ]));

    section.appendChild(card('🚫 When NOT to build an agent', `
<ul>
<li><strong>The steps are known in advance.</strong> A deterministic pipeline is faster, cheaper,
debuggable, and testable. Use an agent only where the branch depends on an observation you do not
have until runtime.</li>
<li><strong>It needs a single model call's worth of reasoning.</strong> "Classify this ticket and
route it" is a prompt, not a loop.</li>
<li><strong>Errors are cheap to avoid but expensive to recover.</strong> A loop that guesses at
SQL and only discovers the wrong column on turn 4 is worse than a schema-constrained call.</li>
<li><strong>Actions are irreversible and approval fatigue is real.</strong> Approving every
action trains users to click approve, which removes the control entirely.</li>
<li><strong>Latency budget is a second.</strong> Five sequential model calls cannot fit, and
parallelising an agent's steps breaks the dependencies that make it an agent.</li>
<li><strong>You cannot observe it.</strong> An agent you cannot replay is an incident waiting to
happen. Log every transcript, tool call, and argument.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>No step or spend cap.</strong> The canonical agent failure. Always cap, and always
check the cap before the side effect.</li>
<li><strong>Tool errors as exceptions.</strong> A 500 ends the run; a readable error message lets
the model try something else. Return errors as observations.</li>
<li><strong>Unbounded tool output.</strong> One query returning 10,000 rows will consume the
window and bury the instructions. Truncate at the tool boundary, every time.</li>
<li><strong>All tools on every turn.</strong> A 40-tool schema measurably degrades selection.
Narrow the set once the trajectory is known.</li>
<li><strong>Trusting arguments.</strong> The model will produce a valid-looking
<code>account_id</code> that does not exist, or one belonging to another customer. Validate every
argument server-side against the authenticated user, never against the prompt.</li>
<li><strong>Retrying non-idempotent tools.</strong> A payment tool that times out may have
succeeded. Retrying on a timeout is how you charge twice.</li>
<li><strong>Loops between two tools.</strong> Detect repeated
<code>(tool, args_hash)</code> pairs and break out — this is the classic infinite agent loop and
it is trivial to detect.</li>
<li><strong>Approval on every action.</strong> Approve by class (reads automatic, writes reviewed,
payments two-person) rather than per call, or reviewers will rubber-stamp.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['What makes something an agent rather than a workflow with a model in it?',
            '<p>The loop closes on an observation. In a workflow, the sequence of steps and their '
            + 'order are known at design time; in an agent, the next step is chosen at runtime '
            + 'from what the previous step returned. The practical test is whether you can write '
            + 'the control flow as code. If you can — a chain, a router, a parallel fan-out — build '
            + 'that, because it is testable, cheap, and predictable. Reach for an agent only when '
            + 'the branching genuinely cannot be known until the data arrives.</p>'],
        ['How do you stop an agent looping forever?',
            '<p>Four independent limits, because any one of them can be the binding one. A step '
            + 'count, a token budget, a wall-clock deadline, and a spend cap — and the spend cap '
            + 'is the one people forget, because one step can be an expensive call. On top of '
            + 'that, detect repeated <code>(tool, hashed args)</code> pairs and break the loop, '
            + 'and cap the context by compacting rather than by truncating from the start, since '
            + 'the goal is at the beginning.</p>'],
        ['How do you make agent actions safe?',
            '<p>Layer it. The tool set is the allow-list — the model can only do what you exposed. '
            + 'Every argument is validated server-side against the authenticated principal, never '
            + 'against anything the model said. Reads are automatic, writes need one approval, '
            + 'irreversible actions need two or a policy check. Destructive tools are run against '
            + 'a dry-run first and the plan is diffed. And every tool has a timeout and a retry '
            + 'policy that knows which side effects are idempotent.</p>'],
        ['How do you test an agent?',
            '<p>Three layers. Deterministic unit tests on the tools, including the error paths, '
            + 'because those are the part that actually breaks. Scenario tests over recorded '
            + 'transcripts, asserting the agent reached the goal and used a permitted tool '
            + 'sequence. And a regression eval of 50&ndash;100 real tasks scored on success rate, '
            + 'tool-call validity, and cost. Full determinism is not achievable with a sampling '
            + 'model, so pin temperature and seed and assert on the properties you care about '
            + 'rather than on exact text.</p>'],
        ['When do you need multiple agents instead of one with more tools?',
            '<p>Three signals, in order. Different <em>permissions</em> — a research agent with '
            + 'read-only web access and a finance agent with write access should not share a tool '
            + 'set. Genuinely different <em>prompts and models</em> — summarising 40 pages and '
            + 'extracting a schema are different jobs with different tuning. And a tool set large '
            + 'enough that selection accuracy degrades, which is real somewhere past a few dozen '
            + 'tools. Absent those, one agent with a good router is simpler, cheaper, and easier '
            + 'to observe than three agents with a supervisor.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Replay is a hard requirement.</strong> Store the full transcript, every tool call and
its raw result, the model version, and the sampled parameters. Without replay you cannot debug a
bad run, only re-run it.</li>
<li><strong>Show progress, not a spinner.</strong> Users grant far more patience to an agent that
says "checking the last 14 days" than to one that says nothing for 30 seconds.</li>
<li><strong>Per-tenant budgets with hard stops.</strong> A runaway agent must hit a wall, and the
wall must be a billing decision rather than an alert nobody reads.</li>
<li><strong>Run agents in a sandbox with a real tool surface.</strong> Read-only credentials by
default, a separate network policy, and no access to the production database without an explicit
grant.</li>
<li><strong>Ship the deterministic path too.</strong> A router that handles 80% of requests
deterministically leaves the agent loop for the 20% where it is genuinely needed — and gives you
a fallback when the model is unavailable.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 8. Tool calling ──────────────────────────────────────────────────
export function renderAIToolCalling(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Tool Calling'));

    section.appendChild(card('🧠 Mental Model', `
<p>Tool calling is a structured-output protocol wearing a function-calling costume. You send the
model a schema describing what it may request; the model replies with a name and a JSON object
matching that schema. <b>Your application</b> executes it — the model never does — and appends the
result back into the conversation. It is a request/response loop over JSON, and every question
about its reliability is really a question about JSON validity and about who is allowed to run
what.</p>
<p><b>The invariant:</b> <b>a tool call is a request, not an action.</b> The model proposes; your
code disposes. Argument validation, permission checks, and side effects all live on your side of
the boundary, and any design where the model's output reaches the database without passing
through your validation is broken regardless of how good the prompt is.</p>
<p><b>Strict mode is the default you want.</b> When the provider supports schema-constrained
decoding, the model samples only from valid JSON structures, so malformed arguments essentially
disappear. It costs a little of the model's flexibility — enum constraints can fight a genuine
edge case — but the reliability gain is far larger than the flexibility loss.</p>
    `));

    const seqCard = card('🔁 The round trip', `
<p>Note that steps 1 to 3 are your code, not the model's, and that the model is called again with
the tool result appended. The dashed arrow is optional but important: telling the model that
<code>search_orders</code> returned nothing, and that a different identifier exists, is what lets
it self-correct instead of retrying the same call forever.</p>
    `);
    seqCard.appendChild(diagram(`
sequenceDiagram
    autonumber
    participant U as User
    participant APP as Your application
    participant LLM as Model
    participant TOOL as Tool implementation
    participant DB as Database
    U->>APP: what is the status of order 4471
    APP->>LLM: messages, plus tool schemas
    LLM-->>APP: tool_call, name get_order, args order_id 4471
    APP->>APP: validate against the JSON schema
    APP->>APP: authorise: can this user see order 4471
    APP->>TOOL: get_order, typed args
    TOOL->>DB: parameterised SELECT
    DB-->>TOOL: one row
    TOOL-->>APP: typed result, status shipped, eta tomorrow
    APP->>LLM: append the tool result
    LLM-->>APP: final text with status and eta
    APP-->>U: shipped, arriving tomorrow
`, 'The model proposes, your code disposes — schema validation and authorisation both sit on your side of the boundary'));
    section.appendChild(seqCard);

    const schemaCard = card('🧩 What a tool schema actually constrains', `
<p>Read it as a contract, not a prompt. <code>strict</code> plus explicit
<code>additionalProperties: false</code> and every field in <code>required</code> is what makes
constrained decoding reliable. Descriptions are not decoration — they are the only channel through
which the model learns when <em>not</em> to call a tool, and a tool with a vague description gets
called constantly.</p>
    `);
    schemaCard.appendChild(diagram(`
classDiagram
    class GetOrderInput {
        +string order_id
        +boolean include_events
    }
    class Order {
        +string order_id
        +string status
        +string carrier
        +string eta
        +list~Event~ events
    }
    class Event {
        +string timestamp
        +string code
        +string location
    }
    class ToolResult {
        +bool ok
        +string error_code
        +Order order
    }
    GetOrderInput ..> Order : validated into
    Order *-- Event : contains
    ToolResult *-- Order : wraps on success
    ToolResult ..> GetOrderInput : ok false returns only error_code
`, 'The tool signature, the domain type it validates into, and the result envelope — the error path is part of the return type, not an exception'));
    section.appendChild(schemaCard);

    section.appendChild(card('💻 Implementation: tools that fail safely', `
<pre><code class="language-javascript">const getOrder = {
  name: 'get_order',
  description:
    'Look up a single order by its exact order id. Use only when the user ' +
    'supplies a specific id. For a general question about recent orders, ' +
    'use list_orders instead.',
  strict: true,
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['order_id'],
    properties: {
      order_id: { type: 'string', pattern: '^ORD-[0-9]{6}$', description: 'Format ORD-000000' },
      include_events: { type: 'boolean', default: false },
    },
  },
  async execute({ order_id }, { userId }) {                 // 1. never trust the id alone.
    //    the id is user-supplied text that passed through a model. authorise it
    //    against the PRINCIPLE, not against anything the model asserted
    const row = await db.orders.findByIdAndOwner(order_id, userId);
    if (!row) return { ok: false, error_code: 'NOT_FOUND_OR_FORBIDDEN' };
    // 2. one error code for both cases. distinguishing them tells an attacker
    //    which order ids exist
    return { ok: true, order: toOrderDTO(row) };
  },
};</code></pre>
<p><strong>Line notes.</strong> The <code>description</code> is doing the heavy lifting: the
"only when the user supplies a specific id" clause is what stops the model reaching for this tool
on a vague question, and tool descriptions are the highest-leverage prompt text in the whole
system. The <code>pattern</code> on <code>order_id</code> catches typos before they reach your
database. Line 1 is the security boundary, and line 2 is the detail that gets missed: returning
<code>NOT_FOUND</code> and <code>FORBIDDEN</code> separately turns your tool into an order-id
enumeration oracle.</p>
    `));

    section.appendChild(tableCard('⚙️ Patterns', ['Pattern', 'Shape', 'Why it matters'], [
        ['Single call', 'one tool call, one result, one more generation', 'the simplest loop; use it unless the task genuinely needs more'],
        ['Parallel calls', 'several independent tool calls in one turn, executed with <code>Promise.all</code>', 'cuts wall-clock from the sum to the max'],
        ['Sequential / dependent', 'one call per turn because the next argument depends on the last result', 'unavoidable, and the main driver of agent latency'],
        ['Forced tool choice', 'a single tool with <code>tool_choice: required</code>', 'guarantees grounding for extraction tasks'],
        ['Tool result truncation', 'cap tool output and summarise large payloads', 'the main lever on context growth and cost'],
        ['Error as observation', 'return a structured error string to the model', 'lets it self-correct instead of ending the run'],
        ['Compaction / handoff', 'summarise the transcript into a fresh one at a token threshold', 'keeps long runs inside the window'],
        ['Human approval', 'pause before a write, a payment, or an external send', 'the only real control on irreversible effects'],
    ]));

    section.appendChild(card('🧪 Worked example: parallel versus sequential', `
<p>Prompt: <em>"What is the status of ORD-004471 and ORD-004472, and which is later?"</em></p>
<table class="complexity-table">
<tr><th>Approach</th><th>Model calls</th><th>Tool calls</th><th>Wall-clock, 120 ms each</th></tr>
<tr><td>Sequential, one per turn</td><td>3</td><td>2</td><td>~600 ms (120 + generation, twice over)</td></tr>
<tr><td>Parallel, both in one turn</td><td>2</td><td>2, concurrent</td><td>~300 ms</td></tr>
<tr><td>One batched tool, <code>get_orders(ids[])</code></td><td>2</td><td>1</td><td>~250 ms</td></tr>
</table>
<p>The comparison is only valid when the calls are genuinely independent, and that is the trap:
<b>if the model must see order A's status before choosing which tool to call for order B, they are
not independent.</b> The reliable way to get parallelism is to give the model a tool that accepts
a list, rather than hoping it emits multiple calls — and to execute whatever calls it does emit
with <code>Promise.allSettled</code> so one failure does not discard the successes.</p>
    `));

    section.appendChild(tableCard('💰 Cost and latency', ['Quantity', 'Rule', 'Note'],
        [
        ['Schema tokens', 'each tool schema is resent on every call', 'a 40-tool schema is thousands of tokens per turn, every turn'],
        ['Tool-definition caching', 'many providers cache a stable prefix of system + tools', 'keep the schema byte-identical across turns or you lose the cache'],
        ['Generation per turn', 'the model may emit prose alongside the call', 'prompt it to emit only the call when you are parsing the output'],
        ['Tool latency', 'added to wall-clock per call, and multiplied by turns if sequential', 'fan out independent calls'],
        ['Result tokens', 'tool output is billed as input tokens on the next turn', 'truncate at the boundary; this is the most common silent cost'],
        ['Error rate', 'each retry costs a full extra turn', 'strict schemas and validation are cheaper than retries'],
    ]));

    section.appendChild(card('🚫 When NOT to use tool calling', `
<ul>
<li><strong>Output is already JSON.</strong> Structured output or a response format constraint is
the right tool — there is no round trip and no result to feed back.</li>
<li><strong>One tool that takes a list.</strong> A single <code>search(query, filters)</code> is
better than five narrow tools, and it is far cheaper in schema tokens.</li>
<li><strong>The "tool" cannot be validated.</strong> If the arguments cannot be checked against a
schema, a parser, and an authorisation check, do not expose it to a model.</li>
<li><strong>It is a read the database can do faster.</strong> Model-in-the-loop for a single row
lookup adds hundreds of milliseconds and a failure mode to save nothing.</li>
<li><strong>The task is one well-specified transformation.</strong> "Extract the invoice number"
is a prompt with a schema, not a tool call.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Trusting the id.</strong> Model-produced identifiers are user input until you check
them against the authenticated principal. This is the most common real-world agent breach.</li>
<li><strong>Error codes that leak.</strong> Distinguishing "not found" from "not yours" turns any
tool into an enumeration oracle for ids in another tenant's space.</li>
<li><strong>Retrying a non-idempotent tool after a timeout.</strong> The call may have succeeded.
Use an idempotency key and treat a timeout as "unknown", not "failed".</li>
<li><strong>Streaming and parsing.</strong> Arguments arrive across chunks; parse after
completion or use the provider's partial-argument stream, and never buffer into a
<code>Promise.all</code> that leaks on abort.</li>
<li><strong>A tool that dumps 10,000 rows.</strong> It will silently consume the window and bury
the instructions. Summarise at the tool boundary.</li>
<li><strong>Vague descriptions.</strong> The model calls the nearest-named tool regardless of
intent. Write descriptions that say when <em>not</em> to call.</li>
<li><strong>Schema instability killing the prefix cache.</strong> Reordering tool definitions or
changing a description on each request invalidates the provider's prompt cache and quietly
doubles input cost.</li>
<li><strong>No dry-run for destructive tools.</strong> Return a plan and a diff, have it
approved, then apply. One-shot delete tools do not survive their first real invocation.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['Is tool calling just prompting?',
            '<p>It is prompting plus a parser plus constrained decoding. The model never runs the '
            + 'tool; it emits a name and a JSON object, and your code validates and executes it. '
            + 'What the model API adds over plain prompting is (1) a schema that can be enforced '
            + 'during decoding, so arguments are usually valid by construction, and (2) a '
            + 'structured channel that is easy to detect programmatically. Everything else — '
            + 'validation, authorisation, idempotency, timeouts — is ordinary application '
            + 'engineering that a prompt cannot do for you.</p>'],
        ['How do you make tool calls safe?',
            '<p>Treat model output as hostile input. Validate against the schema at the boundary, '
            + 'then validate semantically: does this order belong to this user, is this amount in '
            + 'range, is this field editable in this state. Authorise against the authenticated '
            + 'principal rather than anything in the conversation. Run destructive tools as '
            + 'plan-then-apply. Give every tool a timeout, an idempotency key, and a retry policy '
            + 'that knows which side effects are safe to repeat. And return a single error code for '
            + 'not-found and not-permitted so the tool is not an enumeration oracle.</p>'],
        ['Parallel or sequential tool calls — how do you choose?',
            '<p>Parallel when the model can specify all the calls without seeing results, because '
            + 'then they are independent. Sequential when an argument or a choice depends on a '
            + 'prior result, which is the common case in real investigations. In practice the '
            + 'reliable design is to give the model one tool that accepts a list of arguments, '
            + 'because that moves the decision into a single call rather than relying on the model '
            + 'to emit several calls in one turn. Execute with <code>allSettled</code> so a single '
            + 'failure does not discard the successful results.</p>'],
        ['How many tools should you expose?',
            '<p>Fewer than feels natural. Selection accuracy degrades measurably as the tool set '
            + 'grows, and the cost shows up twice: a wrong tool gets called, and every tool '
            + 'definition is billed on every single turn. Consolidate tools that differ only by '
            + 'arguments into one tool with a filter parameter, and narrow the exposed set once '
            + 'the trajectory is known — a few tools for the first turn, a precise set afterwards. '
            + 'Ten well-described tools beat forty overlapping ones.</p>'],
        ['What does a good tool description look like?',
            '<p>It says what the tool does, when to use it, when <em>not</em> to use it, what '
            + 'each argument means including its format, and what it returns. The "when not to use'
            + '</em>" clause is the one that gets left out and it is the one that matters most: '
            + 'it is how you tell the model that a general question about orders should use a '
            + 'listing tool rather than the single-order lookup. Also include the error semantics, '
            + 'so the model knows an empty result is data and not a failure.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Keep tool schemas byte-stable.</strong> It is the precondition for provider prompt
caching, and it makes schema diffs reviewable in code review rather than invisible at runtime.</li>
<li><strong>Version tools as an API.</strong> A tool is a public contract with a model as its
client, which means deprecation, changelogs, and a compatibility window.</li>
<li><strong>Log every call with its arguments and result class.</strong> Not the secrets, but the
shape — you need this to see which tools are called, how often they fail, and what they cost.</li>
<li><strong>One registry, typed.</strong> Generate the schema from the implementation, so the
description the model reads and the function the runtime calls cannot drift apart.</li>
<li><strong>Read-only by default.</strong> New tools start with no write scope and earn it, which
turns "should I expose this?" into a narrower and safer question.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 9. Agent memory ──────────────────────────────────────────────────
export function renderAIAgentMemory(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Agent Memory'));

    section.appendChild(card('🧠 Mental Model', `
<p>Memory is not one thing. It is at least three stores with completely different lifetimes,
access patterns, and consistency requirements, and most agent failures come from using the wrong
one or from writing to all of them indiscriminately.</p>
<p><b>The invariant:</b> <b>memory must be selective, and the selectivity has to come from a
rule rather than from the model.</b> If the model decides what to remember, it will remember
whatever is salient in its context window, which is roughly the opposite of what is useful three
turns later. The write path should be a set of narrow, typed extractors — "record a stated
preference", "record an entity the user referred to" — and the read path should retrieve against
the <em>current</em> query rather than replaying everything.</p>
<p>The three tiers, and why they are not interchangeable:</p>
<ul>
<li><b>Working (short-term)</b> — the current task's scratchpad: the transcript, intermediate
results, the plan. Lives in the context window, is discarded with the task, and is usually the
only tier that needs the full fidelity.</li>
<li><b>Episodic</b> — what happened: past sessions, past actions, past outcomes. Queried for
situations like this one. This is the tier people call "long-term memory" and mean.</li>
<li><b>Semantic</b> — what is true: durable facts, preferences, entities, relationships. Queried
and <em>updated by key</em>, so it must be idempotent — writing the same fact twice must converge,
not duplicate.</li>
</ul>
    `));

    const tierCard = card('🗂️ The three tiers and the write path', `
<p>Follow the two write paths, because they are the part people design badly. The dashed arrow is
the compaction step, and it is the difference between an agent that works on turn 40 and one that
has forgotten the goal. The solid arrow from semantic memory back into the prompt is the read
path: a small, query-shaped selection, not the whole store.</p>
    `);
    tierCard.appendChild(diagram(`
flowchart TD
    U["User input"] --> W["Working memory, in the context window<br/>goal, plan, recent turns, tool results"]
    W --> CMP{"Token budget<br/>exceeded?"}
    CMP -->|"yes"| COMPACT["Compact: summarise the<br/>decisions and open questions,<br/>drop the raw tool output"]
    COMPACT --> W
    CMP -->|"no"| MODEL["Model call"]
    MODEL --> EX["Rule-based extractors, not the model<br/>stated preference, named entity,<br/>completed action, outcome"]
    EX --> EP[("Episodic store<br/>what happened, when,<br/>queried by similarity")]
    EX --> SEM[("Semantic store<br/>keyed facts, upserted<br/>so writes are idempotent")]
    EP --> RET{"Which tier does<br/>this query need?"}
    SEM --> RET
    RET -->|"similar past situation"| EP
    RET -->|"durable facts about this user or entity"| SEM
    RET --> W
    W --> OUT["Response"]
`, 'Working memory is rewritten to fit the window; episodic and semantic memory are written by narrow rules and read by query, never replayed wholesale'));
    section.appendChild(tierCard);

    const erCard = card('🗃️ The data model', `
<p>Keep the three tiers in separate tables with separate retention rules, not in one
<code>memories</code> table with a <code>type</code> column. The write semantics, the update
semantics, and the deletion semantics are all different, and a single table forces one compromise
on all three.</p>
    `);
    erCard.appendChild(diagram(`
erDiagram
    USER ||--o{ SESSION : opens
    SESSION ||--o{ TURN : contains
    SESSION ||--o{ EPISODE : produces
    USER ||--o{ FACT : owns
    FACT }o--|| ENTITY : describes
    TURN ||--o{ FACT : supports
    EPISODE }o--o{ TOOLCALL : includes
    USER {
        string id PK
        string tenant
        string retention_policy
    }
    EPISODE {
        string id PK
        string session_id FK
        string summary
        string embedding
        datetime occurred_at
        string outcome
    }
    FACT {
        string id PK
        string subject_id FK
        string key
        string value
        datetime valid_from
        datetime expires_at
    }
    ENTITY {
        string id PK
        string type
        string name
    }
`, 'Sessions produce episodes; facts are keyed and owned by a subject, so writes upsert instead of appending duplicates'));
    section.appendChild(erCard);

    section.appendChild(card('🧪 Worked example: a preference that must survive', `
<p>Turn 1: <em>"I always deploy on Fridays afternoon — please don't schedule anything after 3pm."</em>
Turn 40 (four sessions later): <em>"Book the retro for next Thursday."</em></p>
<table class="complexity-table">
<tr><th>Approach</th><th>What happens</th><th>Result</th></tr>
<tr><td>Nothing stored</td><td>turn 40 has no idea</td><td>books 16:00 on Friday, user is annoyed</td></tr>
<tr><td>Full transcript replayed</td><td>40 sessions of text in the window</td><td>the preference is buried and out of budget</td></tr>
<tr><td>Everything embedded as episodic</td><td>the preference is retrieved by similarity only when the query is about Friday afternoons</td><td>does not fire here — no lexical or semantic hook</td></tr>
<tr><td><b>Typed semantic fact</b></td><td>extractor writes <code>FACT(user, scheduling.blackout, "Fri 15:00-23:59")</code> at turn 1; a scheduler-relevant filter injects it at turn 40</td><td><b>the booking is rejected or moved, and the agent says why</b></td></tr>
</table>
<p>The lesson is that <b>retrieval quality is not the whole problem — a fact nothing
retrieves is as good as no fact</b>. Durable constraints have to be injected by a rule tied to the
operation being performed, not left to similarity search against whatever the user happens to say
next. Retrieval-by-similarity is the right tool for "have we been here before", and the wrong tool
for a standing rule.</p>
    `));

    section.appendChild(card('💻 Implementation: writes that converge', `
<pre><code class="language-javascript">// 1. an explicit, narrow extractor. the model may SUGGEST
//    candidates, but a deterministic rule decides what is written
const candidates = await model.extractFacts(transcript, {
  schema: [{ subject, key, value, confidence, validUntil }],
});

for (const f of candidates.filter(c =&gt; c.confidence &gt; 0.9)) {
  // 2. key on (subject, key). re-extracting the same fact overwrites it, so a
  //    replayed transcript cannot duplicate rows. append-only memory is the
  //    single biggest source of self-contradiction
  await db.fact.upsert({
    where: { subjectId: f.subject, key: f.key },
    set:  { value: f.value, validFrom: now(), expiresAt: f.validUntil },
  });
}

// 3. read by operation, not by similarity. when you are about to schedule
//    something, you need constraints, not similar past sessions
const constraints = await db.fact.findMany({
  where: { subjectId: userId, key: 'scheduling.blackout', expiresAt: { gt: now() } },
});

// 4. episodic retrieval is similarity, and it is capped
const episodes = await vectorStore.query({
  vector: embed(currentTurn), topK: 5, minScore: 0.7, tenant: userId,
});</code></pre>
<p><strong>Line notes.</strong> Line 2 is the whole reason semantic memory works: a keyed upsert
makes writes idempotent, so replaying a transcript, re-running a job, or handling the same fact in
two sessions all converge to one row. Line 3 is the operational lesson from the example — some
reads must be by key, because similarity retrieval will not reliably surface a standing
constraint. Line 4 is the cap that keeps episodic memory from becoming context pollution: a
similarity floor and a small <code>topK</code> turn a memory store back into a useful signal.</p>
    `));

    section.appendChild(tableCard('⚙️ Choosing a store per tier', ['Tier', 'Store', 'Why', 'Retention'], [
        ['Working', 'the context window, plus a resumable scratchpad on disk', 'it must be handed to the model verbatim; a database round trip per turn is pure latency', 'for the task only'],
        ['Episodic', 'vector store keyed by tenant and time', 'queries are "find past situations like this one"', '30&ndash;180 days, then summarised'],
        ['Semantic', 'relational table, upserted by (subject, key)', 'needs exact updates, uniqueness, and a <code>valid_until</code>', 'until superseded or expired'],
        ['Procedural', 'versioned prompt and policy files', 'how to do a task is code, not data, and should be reviewed and tested like code', 'per release'],
        ['User-visible scratchpad', 'append-only log the user can read and edit', 'transparency, correction, and GDPR export all fall out of it', 'per user policy'],
    ]));

    section.appendChild(tableCard('💰 Cost and latency', ['Quantity', 'Rule', 'Note'], [
        ['Working memory', 'the dominant token cost, and it grows with every turn', 'compact aggressively; this is the biggest lever'],
        ['Compaction', 'one extra summarisation call per compaction', 'amortise over many turns by triggering at 80% of the window'],
        ['Episodic write', 'one embedding per episode', 'embed the summary, not the raw transcript'],
        ['Episodic read', 'one vector query per turn', '5&ndash;20 ms; cap <code>topK</code> hard'],
        ['Semantic read', 'a keyed indexed lookup', 'sub-millisecond; cheap enough to do every turn'],
        ['Storage growth', 'roughly tokens per session &times; retention', 'summarise old episodes into a rolling per-user digest'],
        ['Deletion', 'must cascade from the user across every tier', 'one forgotten store is a GDPR incident'],
    ]));

    section.appendChild(card('🚫 When NOT to build agent memory', `
<ul>
<li><strong>The task is short.</strong> A single-session workflow gains nothing from memory and pays
for it in complexity and a deletion surface.</li>
<li><strong>Users do not come back.</strong> Memory for a one-shot tool is pure cost; there is no
second session to serve.</li>
<li><strong>The assistant must not learn from the user.</strong> A system that adapts its own
behaviour to user input needs a different safety analysis, not a vector store.</li>
<li><strong>You cannot honour deletion.</strong> If you cannot enumerate and erase every tier,
do not create the memory. This is a legal question before it is an engineering one.</li>
<li><strong>The data is sensitive and unreviewed.</strong> Long-lived free-text memory is a
prompt-injection surface that persists across sessions — the injection outlives the conversation
that contained it.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Append-only memory.</strong> Re-extraction creates duplicates, duplicates create
contradictions, and the model then reasons over both. Key the upsert.</li>
<li><strong>Model decides what to remember.</strong> It will keep whatever is salient in context,
which is verbose and unhelpfully biased toward the current topic. Use typed extractors.</li>
<li><strong>Retrieval-only design.</strong> A standing constraint that nothing retrieves is
useless; constraints need key-based injection at the point of action.</li>
<li><strong>No confidence or expiry.</strong> A fact written as certainly true in March is still
being asserted in November. Carry <code>valid_until</code> and let facts expire.</li>
<li><strong>Compaction that drops the goal.</strong> Summarise decisions and open questions, never
the task statement — and keep the goal pinned in the system prompt, not the transcript.</li>
<li><strong>Cross-tenant leakage in episodic search.</strong> A vector query filtered on user id
only at read time is one bug away from mixing users. Pre-filter.</li>
<li><strong>Storing raw transcript as "memory".strong> It is unbounded, unqueryable, and it
retains everything you were hoping to forget.</li>
<li><strong>Letting users see and correct facts.</strong> The single highest-value memory feature,
and the one that catches the most extraction errors.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['What are the types of agent memory, and how do they differ operationally?',
            '<p>Working memory is the current task\'s scratchpad — the transcript, the plan, '
            + 'intermediate results. It lives in the context window, is the dominant token cost, '
            + 'and is discarded with the task. Episodic memory is what happened: past sessions and '
            + 'outcomes, stored as embeddings and queried by similarity, so "has this happened '
            + 'before". Semantic memory is what is true: durable facts about users and entities, '
            + 'stored relationally and updated by key, so a repeated fact converges instead of '
            + 'duplicating. The operational difference that matters is the write semantics — '
            + 'append for episodic, idempotent upsert for semantic.</p>'],
        ['How do you keep memory from filling the context window?',
            '<p>Three mechanisms, used together. Compact: when the transcript crosses a threshold, '
            + 'summarise it into decisions taken, open questions, and results, and drop the raw '
            + 'tool output — which is usually most of the tokens. Select: retrieve a small number '
            + 'of memories per turn, with a similarity floor, rather than the top N '
            + 'unconditionally. And inject by relevance to the operation: a rule that pulls '
            + 'scheduling constraints when a tool is about to schedule something. Together those '
            + 'keep a 40-turn run inside a window that was sized for 10.</p>'],
        ['How do you prevent a user from poisoning memory?',
            '<p>Treat memory as untrusted input on every read, because it is. Memory that survives '
            + 'across sessions is a durable prompt-injection surface — the model reads its own '
            + 'earlier transcript as instructions. Concretely: store facts as typed key-value '
            + 'rows rather than free text, so an injected instruction cannot become a "preference"; '
            + 'wrap retrieved memory in a clearly delimited, labelled block that the system prompt '
            + 'says is data and never instructions; run the same extraction validation on memory '
            + 'writes as on user input; scope every write to the authenticated user; and let users '
            + 'view and delete what has been stored. Also cap how much a single session can write.</p>'],
        ['When is memory actively harmful?',
            '<p>Three situations. When the assistant must behave consistently and identically for '
            + 'everyone — a compliance or legal answer that depends on who asked is a liability. '
            + 'When the world changes: a stored fact about a policy that was updated is worse than '
            + 'no fact, because it is confidently stale. And when the memory is not inspectable: '
            + 'if you cannot show a user why the assistant said something, you cannot debug it, and '
            + 'in high-stakes domains that is disqualifying. The rule of thumb is that memory '
            + 'should improve the experience, never the decision — a fact that changes an answer '
            + 'needs provenance and an expiry.</p>'],
        ['How do you evaluate a memory system?',
            '<p>Three targeted evals rather than one blended number. Retrieval: given a session, '
            + 'do the memories that should fire actually come back — measured against a labelled '
            + 'set of past situations? Precision: how much of what comes back is irrelevant, '
            + 'which is what drives context cost. Correctness of writes: sample extracted facts '
            + 'and have a human check them against the transcript, because a confidently wrong '
            + 'fact is worse than a missing one. Then a long-horizon task test — a 40-turn '
            + 'conversation where the success criterion is whether the goal is still intact and '
            + 'the window is not full.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Make memory user-visible from day one.</strong> A "what I know about you" screen with
edit and delete is the cheapest accuracy and trust mechanism available.</li>
<li><strong>Extraction is a separate, batched job.</strong> Do it after the session ends, not on
the critical path of the reply.</li>
<li><strong>Carry provenance on every fact.</strong> Which session and turn it came from is what
makes a wrong fact correctable.</li>
<li><strong>Tenant isolation is enforced at the store, not the query.</strong> Pass the tenant to
the store so a missing filter is a type error rather than a breach.</li>
<li><strong>Retention is a scheduled job with a metric.</strong> Count of facts past
<code>valid_until</code> is a number you should be able to see on a dashboard.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 10. Multi-agent systems ──────────────────────────────────────────
export function renderAIMultiAgent(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Multi-Agent Systems'));

    section.appendChild(card('🏗️ Architecture', `
<p>A multi-agent system splits one prompt into several specialised contexts. The pitch is that
smaller, focused contexts beat one huge one, and that different specialists want different tools
and different permissions. The cost is that you have now built a distributed system, and the
constraints of distributed systems apply whether or not you wanted them.</p>
    `));
    const archCard = section.lastChild!;
    archCard.appendChild(diagram(`
flowchart TD
    User["Supervisor receives<br/>the original request"] --> Plan["Decompose into subtasks<br/>with explicit deliverables"]
    Plan --> Research["Research agent<br/>read-only tools,<br/>returns cited findings"]
    Plan --> Code["Implementation agent<br/>sandboxed filesystem,<br/>returns a diff"]
    Plan --> Review["Review agent<br/>critique against a rubric"]
    Research --> Mem[("Shared blackboard<br/>typed findings, not prose<br/>provenance on every item")]
    Code --> Mem
    Review --> Mem
    Mem --> Synth["Synthesis step<br/>reads the blackboard,<br/>composes the final answer"]
    Synth --> User
    Mem -.->|"traces, timings, token counts,<br/>and every tool call"| Obs["Observability"]
    Obs -.-> Eval["Evaluation: did the decomposition<br/>cover the request, and did each<br/>agent's output get used?"]
`, 'A supervisor decomposes, specialists write to a typed shared blackboard, and a synthesis step composes — observability is a first-class output, not an afterthought'));
    section.appendChild(archCard);

    section.appendChild(card('🧠 Mental Model', `
<p>Multi-agent is a <em>context-management</em> technique, not an intelligence technique. The
argument is that an agent optimising a narrow objective over a narrow tool set makes better local
decisions than one agent juggling five objectives and twenty tools. That argument is real. The
failure mode is that coordinating the specialists costs more than the specialisation saves.</p>
<p><b>The invariant:</b> <b>the only thing shared between agents must be explicit and typed.</b>
Shared prose means shared ambiguity — two agents will confidently interpret the same sentence
differently, and the conflict surfaces downstream as a synthesis bug that is very hard to trace.
A typed artifact with a schema, a status, and a provenance field cannot be misread.</p>
<p><b>Start from the single-agent version.</b> If the task is solvable by one agent with a router,
build that. Multi-agent is justified by genuinely different <em>permissions</em> or genuinely
different <em>objectives</em> — not by wanting it to look impressive, and not because the single
agent's tool list felt long.</p>
    `));

    const topoCard = card('🕸️ Choosing a topology', `
<p>Follow the decision points. The dashed lines are the failure modes, and they are the reason
multi-agent projects get rolled back: <b>swarm topologies have no termination guarantee and no
error attribution</b>, so they are a research shape, not a production shape.</p>
    `);
    topoCard.appendChild(diagram(`
flowchart TD
    START["What is the shape<br/>of the work?"] --> D{"Do the subtasks<br/>depend on each other?"}
    D -->|"independent"| PAR["Parallel fan-out<br/>N specialists, one synthesis<br/>failure is isolated,<br/>cost is N times"]
    D -->|"strictly ordered"| SEQ["Pipeline<br/>research then write then review<br/>each stage validates<br/>the previous output"]
    D -->|"needs delegation<br/>by judgement"| SUP["Supervisor, the default<br/>a model routes and reviews<br/>clear ownership, bounded depth"]
    SUP --> SWARM{"Do you have an eval<br/>that can detect a bad swarm?"}
    SWARM -->|"no"| SUP
    SWARM -->|"yes"| SW["Swarm, handoff, or debate<br/>no fixed topology<br/>agents route each other.<br/>No termination guarantee,<br/>cost grows superlinearly"]
    PAR -.->|"good"| DEB["Debate or best-of-N<br/>when a single judgement call<br/>is the whole task"]
    SEQ -.->|"good"| HITL["Human approval between<br/>stages, for irreversible work"]
`, 'Start at supervisor; fan out when subtasks are independent, pipeline when strictly ordered, and treat swarm as research until you can detect its failures'));
    section.appendChild(topoCard);

    const supCard = card('🔁 One supervisor request, as a sequence', `
<p>Notice the two review steps. The supervisor checks the deliverable before accepting it, and
that check is the entire difference between a system that self-corrects and one that accumulates
plausible-looking wrong work until synthesis produces a confident mess. Also note the depth cap on
the left — without it, delegation can recurse indefinitely.</p>
    `);
    supCard.appendChild(diagram(`
sequenceDiagram
    autonumber
    participant U as User
    participant S as Supervisor
    participant R as Research agent
    participant W as Writer agent
    participant C as Critic
    U->>S: task, with a deliverable defined
    S->>S: decompose, cap delegation depth at 1
    S->>R: subtask 1, with a required output schema
    R-->>S: typed findings, each with a source
    S->>S: validate schema, reject anything without provenance
    S->>W: subtask 2, with the findings attached
    W-->>S: draft plus a self-reported confidence
    S->>C: critique the draft against the rubric
    C-->>S: gaps, specific and actionable
    S->>W: revise, addressing the named gaps
    W-->>S: final draft
    S-->>U: answer, with the provenance chain attached
`, 'Validation after each specialist, a critique round before acceptance, and a hard depth cap — without those three the coordinator just amplifies errors'));
    section.appendChild(supCard);

    section.appendChild(card('🧪 Worked example: same task, two architectures', `
<p>Task: <em>"Read these 12 incident reports, find the common cause, and draft a status update."</em></p>
<table class="complexity-table">
<tr><th>Step</th><th>Single agent</th><th>Supervisor with 2 specialists</th></tr>
<tr><td>Context</td><td>12 reports at full fidelity, ~40k tokens, plus instructions</td><td>researcher sees the reports; writer sees 8 findings at ~3k tokens</td></tr>
<tr><td>Attention</td><td>the common cause is one pattern across 12 documents — exactly the needle-in-haystack case that degrades</td><td>the cross-document comparison is the researcher's only job, at full attention</td></tr>
<tr><td>Model calls</td><td>3</td><td>5</td></tr>
<tr><td>Cost</td><td>1&times;</td><td>roughly 1.6&times; — more calls, but each with a much smaller context</td></tr>
<tr><td>Wall-clock</td><td>sequential</td><td>research and drafting cannot overlap here, so it is slower</td></tr>
<tr><td>Attribution when it fails</td><td>"the model got it wrong" — one black box</td><td>"the researcher found 8 causes, the writer picked the wrong one" — a specific fix</td></tr>
</table>
<p>The honest summary: the multi-agent version is <b>more expensive, slower, and better</b> — and
the last column is why teams keep it despite the first two. When the failure is "the model got it
wrong", you have no next move. When the failure is "the writer picked the wrong finding", you have
one. That diagnosability is usually the real justification, not raw quality.</p>
    `));

    section.appendChild(card('💻 Implementation: typed handoff', `
<pre><code class="language-javascript">const FINDING = {
  type: 'object',
  additionalProperties: false,
  required: ['claim', 'evidence', 'source_ids', 'confidence'],
  properties: {
    claim:     { type: 'string' },
    evidence:  { type: 'string', description: 'the exact sentence supporting the claim' },
    source_ids: { type: 'array', items: { type: 'string' },
                  description: 'ids of the reports this came from. never empty' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
};

// 1. validate on the boundary. a specialist returning prose instead of a
//    finding is a normal failure and must not reach the synthesis step
const raw = await researchAgent.run(subtask, { outputSchema: FINDING, maxSteps: 6 });
const findings = validate(raw, FINDING);
if (!findings.length) return askResearcherAgain(subtask, 'returned no valid findings');

// 2. attach provenance automatically. never trust a subagent to cite correctly;
//    resolve the ids yourself and reject anything you cannot resolve
const resolved = findings.map(f =&gt; ({ ...f, sources: resolveIds(f.source_ids) }));
const unresolved = resolved.filter(f =&gt; !f.sources.length);
if (unresolved.length) throw new Error('unresolvable provenance: ' + unresolved.length);

// 3. a depth cap, so delegation cannot recurse
if (depth &gt;= MAX_DEPTH) return finishLocally(subtask);</code></pre>
<p><strong>Line notes.</strong> Line 1 is the invariant made mechanical: the schema is what makes
"the only thing shared between agents is explicit" true in practice, and rejecting a malformed
subagent output is a normal control-flow path rather than an exception. Line 2 is the security
point — a subagent that cites <code>report-99</code> when only twelve reports exist is either a
hallucination or an injection attempt, and only the parent can tell. Line 3 is the termination
guarantee that swarm topologies lack entirely.</p>
    `));

    section.appendChild(tableCard('💰 Cost and latency', ['Quantity', 'Rule', 'Note'], [
        ['Model calls', 'roughly proportional to the number of specialists plus coordination', 'a 3-agent system is commonly 2&ndash;4&times; a single agent'],
        ['Token growth', 'specialists get small contexts, which is the point', 'the win is attention quality, not token count'],
        ['Coordination overhead', 'one supervisor call per subtask issued and per result accepted', 'often the largest single line item'],
        ['Wall-clock, fan-out', 'the slowest specialist, not the sum', 'the only topology that beats a single agent on latency'],
        ['Wall-clock, supervisor', 'the sum, because delegation is serial', 'slower than one agent, and that is usually accepted'],
        ['Error blast radius', 'one specialist failing should fail only its subtask', 'requires per-subtask isolation and a fallback'],
        ['Biggest cost lever', 'dropping coordination validation', 'do not — that is where the silent corruption lives'],
    ]));

    section.appendChild(card('🚫 When NOT to go multi-agent', `
<ul>
<li><strong>The single agent works.</strong> If a router plus a dozen tools gets you there, stop.
This is the correct answer far more often than the architecture diagrams suggest.</li>
<li><strong>The subtasks are independent and identical.</strong> That is a parallel fan-out of the
<em>same</em> prompt, which is a batch job with <code>Promise.all</code>, not a multi-agent system.</li>
<li><strong>You cannot trace it.</strong> If you cannot replay a full multi-agent run, you cannot
operate it. Build the observability first, then the topology.</li>
<li><strong>Latency budget under a few seconds.</strong> Supervisor-mediated coordination is
serial, and the extra model calls are usually additive.</li>
<li><strong>No eval that can detect a bad decomposition.</strong> A swarm without an eval is a
random number generator with a bill attached.</li>
<li><strong>Nobody will own it.</strong> Multi-agent systems are among the hardest things to
debug; they need a team, not a side project.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Free-form handoffs.</strong> Passing a paragraph between agents creates silent
divergence; pass a validated object.</li>
<li><strong>Unbounded delegation depth.</strong> Agents delegating to agents is how you get a
a $5,000 run. Cap it and make the cap a parameter you can lower.</li>
<li><strong>No provenance.</strong> If a claim cannot be traced to a source, the system is
generating, not synthesising.</li>
<li><strong>Reviewers that always approve.</strong> A critic that rubber-stamps is pure latency.
Measure how often it rejects; near zero means the rubric is not doing work.</li>
<li><strong>Shared mutable state between concurrent agents.</strong> Two agents writing the same
artifact produce a result that depends on scheduling. Give each its own workspace and merge
explicitly.</li>
<li><strong>Recursion with no global step budget.</strong> A per-agent cap is not a system cap.
Keep one counter for the whole run.</li>
<li><strong>Specialists with overlapping mandates.</strong> Two agents responsible for "quality"
will each assume the other handled it.</li>
<li><strong>Identity and permissions blur.</strong> If a research agent's output becomes a writer
agent's input, its read-only constraints no longer mean anything. Scope, don't trust.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['What is the actual benefit of multi-agent over a single good agent?',
            '<p>Three, in descending order of how often they are real. Better context hygiene: '
            + 'each specialist gets a small, focused context, which is the mechanism that actually '
            + 'works. Better permissions: read-only research and sandboxed writing are genuinely '
            + 'different trust levels. And diagnosability: when a system fails, multi-agent tells '
            + 'you <em>which stage</em> failed. The claimed benefit of "collective intelligence" is '
            + 'not well supported — the model quality is the same, and coordination costs extra '
            + 'calls.</p>'],
        ['How do you decompose a request across agents?',
            '<p>By deliverable, not by document. "Each agent reads some of the corpus" balances '
            + 'load but loses the cross-document comparison that was the point. "One agent '
            + 'extracts facts, one drafts, one critiques" produces a checkable interface at each '
            + 'step. Every subtask needs an explicit output schema and an explicit done condition, '
            + 'and the parent validates both. If you cannot state what a specialist returns in one '
            + 'sentence, the split is wrong.</p>'],
        ['How do you debug a system where five agents are talking?',
            '<p>Full replay, which is a hard prerequisite. Log every prompt, every response, every '
            + 'structured handoff, tool calls with arguments, and token counts, keyed by a run id. '
            + 'Then read the run as a tree rather than a transcript: the first node whose output '
            + 'was malformed or unsupported is where the failure actually is, and everything '
            + 'downstream is a symptom. Sampling 2% of production runs into a searchable store '
            + 'is what makes this a five-minute job instead of a five-day one.</p>'],
        ['How do you prevent runaway cost?',
            '<p>Four budgets, all enforced by the orchestrator rather than the agent: a global '
            + 'step counter for the whole run, a per-agent step cap, a per-run spend cap, and a '
            + 'wall-clock deadline. Check the spend before dispatching, not after. Add a depth cap '
            + 'for delegation and a circuit breaker per downstream tool. Then alert on the rate of '
            + 'hitting each cap, because a cap that is silently hit constantly is a design signal, '
            + 'not a safety mechanism working.</p>'],
        ['When is a swarm or debate topology the right answer?',
            '<p>When a single judgement call is the entire task and you have no reliable way to '
            + 'know when you are right — grading, ambiguous classification, open-ended writing '
            + 'where multiple independent attempts surface different errors. Debate helps when '
            + 'the failure mode is confident-but-wrong, because a second agent that disagrees is a '
            + 'signal. It is the wrong answer when you need determinism, a termination '
            + 'guarantee, or a latency bound, because swarm topologies have neither of the first '
            + 'two and reliably lack the third.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>Ship the single-agent version first, always.</strong> It is the fallback, the
baseline for evals, and often the final answer.</li>
<li><strong>Specialists start with fewer tools than you want to give them.</strong> Earn the
scope, like any other capability.</li>
<li><strong>Every handoff is a typed, versioned schema.</strong> Changing a handoff shape is a
breaking change to an internal API and should be reviewed like one.</li>
<li><strong>Concurrency with isolated workspaces.</strong> Parallel agents get separate
workspaces and an explicit merge, never shared mutable state.</li>
<li><strong>Track two dashboards.</strong> Cost and latency per topology, and per-stage failure
and rejection rates — the second is what tells you whether the decomposition is still
appropriate.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 11. Orchestration ────────────────────────────────────────────────
export function renderAIOrchestration(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'Agent Orchestration'));

    section.appendChild(card('🧠 Mental Model', `
<p>Orchestration is the control plane around model calls: what runs, in what order, with what
retries, timeouts, and budgets. It is the layer where the ordinary distributed-systems concerns
reappear, and the reason orchestration frameworks exist at all — because getting them right is
more work than calling a model.</p>
<p><b>The invariant:</b> <b>every outbound call must be bounded on three axes — time, attempts,
and spend — and the bound must be enforced by the orchestrator, not requested by the model.</b>
An unbounded call inside a framework is indistinguishable from a hang, and in a fan-out it
multiplies. This single rule covers timeouts, retry budgets, circuit breakers, and cost caps.</p>
<p><b>Retries are the subtle part.</b> Retry only what is idempotent, and never retry a timeout
blindly on a write: a timeout means "unknown", and retrying an unknown write is how you get
double charges and duplicate rows. Retries need jitter, or a thousand concurrent callers retry in
lockstep and re-create the outage they are recovering from.</p>
    `));

    const patCard = card('🧭 The four patterns', `
<p>Start at the top and go down. The left column is what you reach for by default; everything else
is a consequence of a specific constraint — dynamic fan-out, shared state across workers, or
unbounded iteration.</p>
    `);
    patCard.appendChild(diagram(`
flowchart TD
    REQ["Request arrives"] --> ROUTE{"Which pattern<br/>does the work need?"}
    ROUTE -->|"one known sequence"| SEQ["Sequential, a chain<br/>prompt, then tools, then summarise<br/>cheapest, easiest to debug"]
    ROUTE -->|"independent work items"| PAR["Parallelization<br/>fan out N, join at the end<br/>adds a reducer, converts<br/>max latency into sum latency"]
    ROUTE -->|"subtasks that need<br/>to be created at runtime"| OS["Orchestrator-workers<br/>a planner produces the subtask list,<br/>workers execute it,<br/>shared state between steps"]
    ROUTE -->|"state that cannot fit<br/>in one context"| SW["Swarm, handoff<br/>agents route each other.<br/>No fixed topology, no<br/>termination guarantee"]
    SEQ --> JOIN["Reduce, validate,<br/>and assemble one answer"]
    PAR --> JOIN
    OS --> JOIN
`, 'Sequential by default, parallel when items are independent, orchestrator-workers when subtasks are dynamic, and swarm only with an eval that can detect its failures'));
    section.appendChild(patCard);

    const retryCard = card('🔁 Bounded retries, as a state machine', `
<p>Every transition that can loop is guarded by an explicit budget, and the three
<code>Exhausted</code> states are terminal by design — they are what stops a partial outage from
becoming an unbounded spend. The distinction between <code>Failed</code> and
<code>Exhausted</code> is worth stating in an interview: a hard failure is a bug or a bad
request and should surface immediately, while exhaustion is a degradation that should degrade
rather than fail.</p>
    `);
    retryCard.appendChild(diagram(`
stateDiagram-v2
    [*] --> Dispatch
    Dispatch --> Succeeded
    Dispatch --> Failed: 4xx, validation error, auth. no retry, ever
    Dispatch --> Retrying: 5xx, timeout, or connection reset
    Retrying --> Retrying: attempts remain, backoff with jitter elapsed
    Retrying --> Succeeded
    Retrying --> BudgetExhausted: attempts or deadline exhausted
    Retrying --> Degraded: this step is optional and a fallback exists
    Degraded --> Succeeded: assembled without this step
    BudgetExhausted --> [*]: fail the request, or return a partial result
    Failed --> [*]
`, 'Only 5xx and transport errors are retried; 4xx is a bug or a bad request, and exhaustion degrades rather than failing the whole request'));
    section.appendChild(retryCard);

    section.appendChild(card('💻 Implementation: the pieces teams get wrong', `
<pre><code class="language-javascript">async function runNode(node, ctx) {
  const policy = {
    timeoutMs: node.timeoutMs ?? 30_000,
    maxAttempts: node.maxAttempts ?? 3,
    maxSpendUsd: node.maxSpendUsd ?? 0.25,
    idempotent: node.idempotent ?? false,   // 1. an explicit property, not a guess.
  };                                       //    without it we can never safely retry

  for (let attempt = 1; attempt &lt;= policy.maxAttempts; attempt++) {
    ctx.checkBudget(policy.maxSpendUsd);   // 2. check BEFORE the side effect
    try {
      return await withTimeout(
        () =&gt; node.run(ctx),
        policy.timeoutMs,
        { idempotencyKey: ctx.runId + ':' + node.id },  // 3. a key makes a write retryable
      );
    } catch (err) {
      // 4. 4xx is never retried. it will fail identically at 4, 7, or 40 attempts,
      //    and each one is real money spent to learn nothing
      if (err.status &amp;&amp; err.status &lt; 500) throw err;
      if (!policy.idempotent &amp;&amp; err.isTimeout) throw err;   // 5. a timed-out write
      //    is UNKNOWN, not failed. retrying it is how you double-charge someone
      if (attempt === policy.maxAttempts) break;
      const backoff = Math.min(2 ** attempt * 250, 8_000);
      await sleep(backoff + Math.random() * 250);   // 6. jitter, or every caller in the
                                                     //    fleet retries in lockstep
    }
  }
  // 7. exhaustion degrades when it can, and only then fails
  if (node.optional) return { skipped: node.id, reason: 'budget exhausted' };
  throw new NodeExhausted(node.id);
}</code></pre>
<p><strong>Line notes.</strong> Line 5 is the line that prevents double charges, and it is the
one most often missing: a timeout on a non-idempotent call must be treated as an unknown outcome
and escalated, not retried. Line 6 matters at scale — without jitter, a dependency's brief
outage produces a synchronised retry storm that is a second outage. Line 7 is the difference
between a resilient system and a brittle one: optional steps that exhaust should be skipped
with a reason, not fail the request.</p>
    `));

    section.appendChild(tableCard('🧰 Frameworks, and what to actually take from them', ['Framework', 'Model', 'Take from it', 'Skip if'], [
        ['LangGraph', 'an explicit state graph with typed state, cycles, and checkpointing', 'the state-machine-plus-checkpoint model — durable resume is genuinely hard to retrofit', 'you want a few dozen lines of straight-line code'],
        ['Temporal', 'durable workflow execution, retries and timers as first-class', 'the reliability model: activities, idempotency, replay', 'you are prototyping'],
        ['CrewAI', 'role-based agents with defined goals and backstories', 'the vocabulary of roles and delegation', 'you need fine-grained control of state transitions'],
        ['AutoGen', 'conversational agents that converse to solve a task', 'the multi-agent conversation loop', 'you need deterministic control flow'],
        ['Semantic Kernel', 'plugins, planners, and process graphs, with first-class .NET support', 'the plugin abstraction and its versioning story', 'you are not on .NET'],
        ['Plain code', 'functions, a queue, and a state column', 'nothing', 'never — this is the right default for most systems'],
    ]));

    section.appendChild(tableCard('💰 Cost and latency', ['Quantity', 'Rule', 'Note'], [
        ['Sequential chain', 'latency is the <b>sum</b> of node latencies', 'add nodes only when a node\'s output is genuinely needed'],
        ['Parallel fan-out', 'latency is the <b>max</b>, cost is the <b>sum</b>', 'the main tool for beating a latency budget'],
        ['Partial failure', 'retry budget multiplied by fan-out width', 'a 5-wide fan-out with 3 attempts is 15 calls'],
        ['Checkpointing', 'a state write per node boundary', 'usually cheap; the price you pay for durable resume'],
        ['Context handoff', 'large state passed between nodes is re-billed each time', 'pass references, not payloads, and re-fetch on demand'],
        ['Budget enforcement', 'one counter per run, checked before every node', 'not per node — per-node caps multiply'],
        ['Biggest optimisation', 'removing nodes, not tuning them', 'most orchestration latency is unnecessary steps'],
    ]));

    section.appendChild(card('🚫 When NOT to use an orchestration framework', `
<ul>
<li><strong>A straight-line chain of three or four steps.</strong> Async functions with a
<code>try</code> and a timeout are clearer, smaller, and easier to test.</li>
<li><strong>You cannot operate the state store.</strong> Durable workflows are wonderful until
you need to explain why a run is stuck in state <code>pending_review</code> from eight months ago.</li>
<li><strong>You need to understand it in an interview — or in an incident.</strong> Framework
internals add a layer between the bug and the cause.</li>
<li><strong>The workflow changes weekly.</strong> Rewriting a graph to match a changing process is
fine; migrating a persisted state machine is not.</li>
<li><strong>The fan-out is small and non-recurring.</strong> <code>Promise.allSettled</code> covers
most real cases.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Retrying 4xx.</strong> A validation error is deterministic; three retries cost 3&times;
and learn nothing.</li>
<li><strong>Retrying a timed-out write.</strong> Treat it as unknown. Reconcile by idempotency key
or a status query; do not blindly re-issue.</li>
<li><strong>No jitter.</strong> Synchronised retries turn a brief blip into a sustained outage.</li>
<li><strong>Per-node instead of per-run budgets.</strong> Ten nodes with a 0.10 cap is a 1.00 cap,
and none of them know that.</li>
<li><strong>No circuit breaker.</strong> When a dependency is genuinely down, failing fast and
returning a degraded answer beats holding every request open until it times out.</li>
<li><strong>Fan-out without a join policy.</strong> Deciding mid-flight whether a partial result is
acceptable is how you ship inconsistent answers.</li>
<li><strong>State stored in the prompt.</strong> A 40-node workflow whose entire state is a
growing transcript will blow the window and get silently truncated.</li>
<li><strong>Non-deterministic replay.</strong> A "retry" that re-runs an LLM node is not a retry,
it is a new run. Persist node outputs so a resume does not re-roll the dice.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['Sequential vs parallel — when do you fan out?',
            '<p>Only when the work items are genuinely independent, which means each can be '
            + 'specified without reference to any other result. If the model must see A\'s answer '
            + 'to decide what B should be, they are sequential and no amount of concurrency helps. '
            + 'The practical test: can you write down all N subtasks before starting? If yes, fan '
            + 'out. If not, you need a planner first — which is the orchestrator-workers pattern, '
            + 'and it costs an extra model call. Also remember fan-out is a latency trade, not a '
            + 'cost trade: you convert sum-latency into max-latency and pay N&times; the tokens.</p>'],
        ['How do you decide what can be retried?',
            '<p>By side-effect classification, not by hope. Idempotent GETs are always retryable. '
            + 'Writes are retryable only with an idempotency key, because a retry after a timeout '
            + 'replays a request whose outcome is unknown. Non-idempotent writes (payments, sends, '
            + 'anything that charges or publishes) are never retried automatically — they are '
            + 'reconciled with a status query. And 4xx is never retried at all, since it is '
            + 'deterministic. Getting this wrong is how systems double-charge customers.</p>'],
        ['How do you debug a run that is taking too long?',
            '<p>Per-node timing in a trace viewer, which means instrumenting the orchestrator '
            + 'itself rather than the handlers. Most long runs decompose into: one slow model call, '
            + 'a retry loop burning its budget, a lock or a queue wait that is not a node at all, '
            + 'or a fan-out whose width is set by a model decision nobody capped. Durable '
            + 'execution makes this worse in a useful way — you can see exactly which node the run '
            + 'is parked on, and for how long, without needing the original process to be alive.</p>'],
        ['When is a workflow engine worth it over hand-rolled code?',
            '<p>When the run must survive process death. If a step takes an hour, an agent runs '
            + 'for 30 turns, or a human approval can arrive tomorrow, then in-memory state is gone '
            + 'on the next deploy and you need durable execution with checkpointing and resume. '
            + 'That is a real requirement and it is worth the dependency. If the whole run is '
            + 'seconds long and fits in a request, hand-rolled code is smaller, clearer, and has '
            + 'no migration path to plan for.</p>'],
        ['How do you make an agent loop resumable?',
            '<p>Checkpoint the state at every boundary, and make the loop a state machine rather '
            + 'than a <code>for</code> loop. After each tool call, persist the transcript, the '
            + 'step index, the accumulated spend, and the tool results — so a resume replays '
            + 'those instead of re-executing. This matters more than it looks: without persisted '
            + 'node outputs, resuming means re-rolling the model\'s dice, so you get a different '
            + 'run, and any side effect that already happened gets repeated. Persisting the '
            + 'results is what makes a resume idempotent.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>One budget per run, enforced centrally.</strong> The orchestrator owns the counter, so
no node can opt out of it.</li>
<li><strong>Circuit breakers on every dependency.</strong> A failing dependency should produce a
fast degraded answer, not a queue of held-open requests.</li>
<li><strong>Idempotency keys generated once, at the edge.</strong> They are what make a resumed or
retried run safe, and they have to survive a process restart.</li>
<li><strong>Emit a span per node.</strong> Latency that lives in the framework and not in your
traces is latency you will argue about instead of fix.</li>
<li><strong>Have a kill switch that stops new runs and lets in-flight ones finish.</strong> Every
orchestration layer needs one, tested.</li>
</ul>
    `));

    container.appendChild(section);
}

// ── 12. AI system design ─────────────────────────────────────────────
export function renderAISystemDesign(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter' });
    section.appendChild(h('h2', {}, 'AI System Design'));

    section.appendChild(card('🧠 Mental Model', `
<p>An AI feature is a distributed system with one unusually expensive, unusually variable, and
unusually hard-to-predict component in the middle. Everything you already know about API design
still applies; what is new is that the middle component has a quality axis that ordinary backends
do not, and its cost and latency are proportional to tokens rather than to request count.</p>
<p><b>The invariant:</b> <b>quality is a measured property of a versioned configuration, never an
assumption.</b> Every layer — model, prompt, retrieval config, temperature, context assembly — is
a variable, and changing any of them changes behaviour. So the system must be able to say, for
any request, exactly which combination produced that answer, and must be able to compare two
combinations on a fixed eval set.</p>
<p><b>The second invariant:</b> <b>the guardrail path must be independent of the generation
path.</b> A model that decides whether its own output is safe is not a guardrail. Input filtering,
authorisation, output validation, and rate limits all sit outside the model, and they must be able
to reject something the model is perfectly happy to produce.</p>
    `));

    const archCard = card('🏗️ Reference architecture', `
<p>Follow the request left to right. The two boxes that people skip in a first draft are the
<em>policy</em> box before the model and the <em>validation</em> box after it — and those are the
two that make the system safe to operate. The observability rail is not optional: without it,
"the AI feels worse this week" is unanswerable.</p>
    `);
    archCard.appendChild(diagram(`
flowchart LR
    U["Client"] --> EDGE["Edge: auth, tenant,<br/>rate limit by token<br/>budget, not by request"]
    EDGE --> POL{"Policy layer, outside the model<br/>input filters, injection heuristics,<br/>PII detection, size limits"}
    POL -->|"reject"| DENY["Typed refusal with a reason code<br/>never a model-generated one"]
    POL -->|"allow"| ORCH["Orchestrator<br/>router, cache, budget,<br/>timeouts, circuit breakers"]
    ORCH --> RAG["Retrieval<br/>hybrid search, rerank,<br/>guardrails on the corpus"]
    RAG --> GEN["Model gateway<br/>routing, retries, fallbacks,<br/>streaming, cost accounting"]
    GEN --> VAL["Validation, outside the model<br/>schema check, citation check,<br/>grounding check, output filters"]
    VAL -->|"fail"| DEGRADE["Degrade: partial answer,<br/>abstain, or route to search"]
    VAL -->|"pass"| RESP["Streamed response with citations"]
    ORCH -.-> OBS["Observability<br/>per-request trace:<br/>prompt version, retrieved ids,<br/>model revision, tokens, latency,<br/>guardrail verdicts"]
    OBS -.-> EVAL["Offline eval and online signals<br/>quality, refusal rate,<br/>cost per successful answer"]
`, 'Guardrails on both sides of generation, budgets enforced at the edge, and a trace that records the exact configuration behind every answer'));
    section.appendChild(archCard);

    const seqCard = card('🔁 One request, latency budgeted', `
<p>Read the annotations as the budget. Note the two cache hits early — a semantic or exact cache
hit costs a fraction of a cent and about 10&nbsp;ms, while the model path costs dollars and
seconds. Note also that the response is streamed and that the guardrail verdict is recorded
regardless of the outcome, so a refusal is a first-class observable event rather than a gap in
the data.</p>
    `);
    seqCard.appendChild(diagram(`
sequenceDiagram
    autonumber
    participant C as Client
    participant EDGE as Edge and policy
    participant ORC as Orchestrator
    participant CA as Cache
    participant RT as Retrieval
    participant GW as Model gateway
    participant VAL as Validation
    C->>EDGE: prompt plus auth token
    EDGE->>EDGE: auth, tenant, token rate limit, PII scan
    EDGE->>ORC: accepted request
    ORC->>CA: lookup by normalised prompt hash
    alt exact hit
        CA-->>C: cached answer, about 10 ms, fraction of a cent
    else miss
        ORC->>RT: retrieve, over-fetch then rerank
        RT-->>ORC: 5 passages with provenance
        ORC->>GW: prompt, model revision pinned, maxOutputTokens set
        GW-->>ORC: streamed tokens
        ORC->>VAL: assembled answer plus the retrieved ids
        VAL->>VAL: schema, citation existence, grounding check
        alt grounded
            VAL-->>C: streamed answer with working citations
            ORC->>CA: store, keyed by prompt hash plus model revision
        else not grounded
            VAL-->>C: abstention with the closest sources
        end
    end
    ORC->>ORC: record trace, tokens, cost, latency, verdict
`, 'The cache hit is two orders of magnitude cheaper than the model path — and the trace is written either way, so refusals are measurable'));
    section.appendChild(seqCard);

    section.appendChild(tableCard('🏛️ Layer by layer', ['Layer', 'Responsibility', 'Failure it prevents', 'Key metric'], [
        ['Edge', 'auth, tenant isolation, token-based rate limits, request size caps', 'one tenant exhausting the budget; unbounded prompt cost', 'tokens per minute per tenant'],
        ['Policy', 'input filtering, injection heuristics, PII detection, prompt-injection screening', 'retrieved content instructing the model', 'block rate and false-positive rate'],
        ['Router', 'classify the request, pick a model tier or a deterministic handler', 'a frontier model being used to answer a lookup', 'routing accuracy and cost saved'],
        ['Retrieval', 'hybrid search, rerank, corpus-side guardrails', 'wrong, stale, or forbidden context', 'context recall@5 and filter-leak count'],
        ['Model gateway', 'model routing, retries, fallbacks, streaming, cost accounting', 'a provider outage; unbounded spend', 'tokens per successful answer'],
        ['Validation', 'schema, citation existence, grounding, output filters', 'hallucinated and unverifiable output leaving the system', 'grounding rate, invalid-citation rate'],
        ['Observability', 'per-request trace with every config value', '"it feels worse" with no way to attribute it', 'trace coverage, sampled-eval agreement'],
    ]));

    section.appendChild(card('🧪 Worked example: choosing a model tier per request', `
<p>Assume a support assistant: 1M requests/day, 80% are short factual lookups, 15% need the
corpus, 5% are multi-step. Latency target p95 &lt; 4&nbsp;s; today everything goes to one large
model.</p>
<table class="complexity-table">
<tr><th>Tier</th><th>Share</th><th>Handler</th><th>Latency</th><th>Relative cost</th></tr>
<tr><td>T0</td><td>62%</td><td>exact-match lookup plus a cached template answer</td><td>&lt;50 ms</td><td>~0</td></tr>
<tr><td>T1</td><td>18%</td><td>small model, no tools, short output cap</td><td>~400 ms</td><td>~0.02</td></tr>
<tr><td>T2</td><td>15%</td><td>small model plus retrieval, streamed</td><td>~1.2 s</td><td>~0.1</td></tr>
<tr><td>T3</td><td>5%</td><td>large model, retrieval, tools, longer reasoning</td><td>~6 s</td><td>~3.0</td></tr>
</table>
<p>Bill-weighted, T3 is 27% of the spend on 5% of the traffic. Routing it to a small model first
with a self-consistency or judge check, and escalating on disagreement, is the single largest
cost lever — and it is measurable before you ship it, by replaying the T3 slice through both
paths on a fixed eval set. The risk is a router that escalates too little, so log the
escalation rate and the disagreement rate together; a falling escalation rate alongside a rising
error rate is a router problem, not a model problem.</p>
    `));

    section.appendChild(card('💻 Implementation: a gateway with the invariants in it', `
<pre><code class="language-javascript">const g = new ModelGateway({
  routes: [
    { when: isExactLookup,      model: 'small',  maxOutputTokens: 64,  tools: [] },
    { when: needsCorpus,        model: 'small',  maxOutputTokens: 512, tools: [search] },
    { when: isComplex,          model: 'large',  maxOutputTokens: 2048, tools: all, approvals: true },
  ],
  // 1. per-request budget, enforced before dispatch, not measured afterwards
  budget: { maxSpendUsd: 0.25, maxInputTokens: 12_000 },
  // 2. pin the revision. the alias floats, and a float is an unreviewed change
  //    to production behaviour with no deploy and no changelog
  pinRevision: true,
  resilience: { maxAttempts: 3, timeoutMs: 20_000, jitter: true, breaker: { threshold: 0.5, window: 30 } },
  // 3. on a provider failure, degrade down the routing table rather than erroring
  onExhausted: (route) => route.model === 'large' ? fallbackTo('small') : null,
});

const out = await g.run({ messages, config });

// 4. validation lives OUTSIDE the model. the model agreeing that it is
//    correct is not evidence, it is a second opinion from the same prior
const verdict = validate(out.text, {
  schema: ANSWER_SCHEMA,
  citations: { allowed: retrieved.map(r =&gt; r.id), requireSupport: true },
});

if (!verdict.ok) return abstain(verdict.reason, retrieved);
recordTrace({ runId, route: out.route, modelRevision: out.revision, tokens: out.usage,
               retrievedIds: retrieved.map(r =&gt; r.id), verdict, costUsd: out.costUsd });</code></pre>
<p><strong>Line notes.</strong> Line 2 is the one that saves you during an incident: a floating
alias means a provider-side change reaches production with no deploy and no review, and you
cannot roll it back because you do not know what changed. Line 4 is the security boundary — the
model's own confidence is not independent evidence. And <code>recordTrace</code> is not logging
for its own sake: without the retrieved ids, the model revision, and the verdict on the same
record, you cannot compare two configurations or explain a single bad answer.</p>
    `));

    section.appendChild(tableCard('💰 Cost and latency', ['Quantity', 'Rule', 'Control'], [
        ['Input cost', 'proportional to input tokens, which is prefill work', 'prefix caching; truncate retrieved context'],
        ['Output cost', 'usually priced higher per token than input', 'cap <code>maxOutputTokens</code> per route'],
        ['Cost per <em>successful</em> answer', 'total spend divided by answers that passed validation', 'the only cost metric that does not reward failure'],
        ['Time to first token', 'queueing plus prefill plus routing', 'stream; cache the prefix; keep the route simple'],
        ['Tail latency', 'retries multiply the tail', 'bound attempts; fail fast to a degraded path'],
        ['Retrieval share of latency', 'often 10&ndash;25% of the total', 'over-fetch and rerank in parallel where you can'],
        ['Biggest levers, in order', 'routing, context size, output cap, model tier', 'all four are configuration, not engineering projects'],
    ]));

    section.appendChild(card('🚫 When NOT to build a full AI system', `
<ul>
<li><strong>Prompt plus model is enough.</strong> If a direct call with a good prompt passes your
eval, the gateway, the router, and the guardrail layer are all cost with no benefit.</li>
<li><strong>No eval exists.</strong> Every layer here needs a metric to justify it. Without one,
you are adding complexity and calling it maturity.</li>
<li><strong>The task is a lookup or a transformation.</strong> SQL, a search index, and a schema
validator beat the whole stack and are fully debuggable.</li>
<li><strong>Latency budget under a second, interactively.</strong> A single generation is already
hundreds of milliseconds; multi-layer orchestration does not fit.</li>
<li><strong>Nobody will operate it.</strong> Model routing, budget accounting, and guardrail
tuning are ongoing jobs, and a system nobody maintains degrades silently within a quarter.</li>
<li><strong>You cannot explain an answer to a regulator or a customer.</strong> That is a hard
blocker for many domains, regardless of how good the model is.</li>
</ul>
    `));

    section.appendChild(card('⚠️ Pitfalls and gotchas', `
<ul>
<li><strong>Floating model aliases.</strong> A provider change arrives with no deploy and no
rollback path. Pin the revision.</li>
<li><strong>Guardrails that call the model.</strong> A model judging its own output is not a
guardrail. Keep policy outside generation.</li>
<li><strong>Rate limits per request, not per token.</strong> One request with a 200k-token prompt
costs 200 requests' worth and passes the limit.</li>
<li><strong>Optimising the happy path only.</strong> Refusal and error paths are most of what
happens in production, and they are usually the untested ones.</li>
<li><strong>Caching across model revisions.</strong> A cache key without the revision serves
answers from a model that no longer exists.</li>
<li><strong>Prompt version not in the trace.</strong> Without it, every quality question becomes
manual log archaeology.</li>
<li><strong>Trusting self-reported confidence.</strong> A model's stated confidence is a prior,
not a measurement. Gate on an external check.</li>
<li><strong>Retrieved content treated as trusted.</strong> Anything in the corpus is
user-supplied by definition, and it lands in the prompt with full authority.</li>
<li><strong>No degraded path.</strong> When the provider degrades, a system with only success and
failure returns errors to every user simultaneously.</li>
</ul>
    `));

    section.appendChild(qaCard([
        ['How would you design an AI feature for a 1000 requests-per-second workload?',
            '<p>Start with the shape, not the model. The steady-state cost of a request is dominated '
            + 'by output tokens, so the first design question is how many of the requests need a '
            + 'generation at all — a large fraction usually do not, and those go to a lookup, a '
            + 'template, or a cache. Then: a model gateway that owns routing, retries, timeouts, '
            + 'budgets and cost accounting, so no call site has to; token-based rate limiting at '
            + 'the edge; prefix caching for the shared system prompt; a small model as the default '
            + 'tier with escalation; and a queue with backpressure in front, because an LLM call '
            + 'is a scarce resource and admission control beats queueing without limit. Add '
            + 'circuit breakers and a degraded path, because at this scale a provider blip '
            + 'becomes a full outage.</p>'],
        ['How do you reduce cost without hurting quality?',
            '<p>In this order, and measure after each. First routing: most spend is on the small '
            + 'share of hard requests, so a cheap-first tier with an external check and '
            + 'escalation is usually the largest win. Second context size: prefill scales linearly, '
            + 'so retrieving five good passages instead of thirty is a direct saving. Third the '
            + 'output cap, per route — this is routinely set far too high. Fourth the model tier '
            + 'for the easy majority. Fifth batching, which is nearly free at the serving layer. '
            + 'Last, fine-tuning or distillation for a high-volume narrow task, which has the best '
            + 'unit economics and the worst engineering cost. Track cost per <em>successful</em> '
            + 'answer, not per request, or the cheap tier that fails everything looks best.</p>'],
        ['How do you handle a model provider outage?',
            '<p>Assume it will happen weekly. The gateway holds model routing and provider state, '
            + 'so failover is a routing decision rather than a deploy: a circuit breaker per '
            + 'provider, a second provider behind the same interface, and a routing table that '
            + 'degrades down capability tiers rather than switching up. Timeouts must be shorter '
            + 'than the caller\'s patience and the whole call must be cancellable. Retries need a '
            + 'budget and jitter so a provider incident does not become a self-inflicted retry '
            + 'storm. The degraded path should be a real product answer — cached results, a '
            + 'search-results page, or a queued request that completes when the provider returns — '
            + 'because the alternative is returning an error to every user at once.</p>'],
        ['How do you put guardrails around a model?',
            '<p>Both sides, and outside the model. Before: authenticate, resolve the tenant, '
            + 'enforce token and size limits, screen for injection patterns, detect PII, and '
            + 'sanitise retrieved content — because corpus text is untrusted input that lands in '
            + 'the prompt with full authority. After: validate the response against a schema, '
            + 'verify every cited id exists and supports its claim, check grounding, and run '
            + 'output filters for the categories that matter to you. Approval gates for '
            + 'irreversible actions sit in the tool layer, not the prompt. And the guardrail must '
            + 'be able to reject something the model is confident about — a model asked whether '
            + 'its own answer is safe will almost always say yes.</p>'],
        ['How do you prove the system got better?',
            '<p>Fixed eval set, identical questions, every configuration change. Paired scoring, '
            + 'because both systems see the same items and the paired difference has far lower '
            + 'variance than two absolute rates. Slice the results by query type, language, tenant '
            + 'and document type, because an overall average hides the slice you care about. Track '
            + 'latency and cost on the same chart, since a quality win that adds a second is a '
            + 'different decision. Then validate offline against production signals — re-ask rate, '
            + 'citation click-through, abandonment — and finish with a canary and an automatic '
            + 'rollback, because offline evals systematically miss production-only inputs and a '
            + 'component you have just changed is exactly where you will find out.</p>'],
    ]));

    section.appendChild(card('🏭 In production', `
<ul>
<li><strong>The gateway is the only place that calls a model.</strong> One owner for retries,
timeouts, budgets, cost accounting and provider failover, so no call site can bypass it.</li>
<li><strong>Every response carries a trace id.</strong> Prompt version, model revision, retrieved
ids, tokens, cost, latency, guardrail verdicts — retrievable together, always.</li>
<li><strong>Degrade before you fail.</strong> Cached answers, a search-results page, or a queued
request. Design the degraded path as a product surface, not an error branch.</li>
<li><strong>Canary with automatic rollback on quality and p95.</strong> Gate on the same metrics
you eval on, evaluated on live traffic.</li>
<li><strong>Red-team the guardrails, not just the model.</strong> Injection through the corpus
and through the tool layer is a more realistic failure than a jailbreak prompt.</li>
<li><strong>Review the escalation and refusal rates weekly.</strong> A falling refusal rate is
usually a broken guardrail; a rising one is usually a broken corpus.</li>
</ul>
    `));

    container.appendChild(section);
}
