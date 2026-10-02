// src/content/ai-llm.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-llm",
    title: "LLM Fundamentals",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>A decoder-only LLM does exactly one thing, repeatedly: given a prefix of tokens, emit a\n" +
                "probability distribution over the vocabulary for the token that comes next. Everything else —\n" +
                "reasoning, code, JSON, tool calls, refusals, multilingual ability — is a regular pattern that\n" +
                "survives in that distribution. Sampling from it and appending the winner <em>is</em> the\n" +
                "generation loop.</p>\n" +
                "<p><b>The invariant the rest of the field depends on:</b> the model never stores anything you can\n" +
                "point at and never performs a lookup. So anything you want from it has to be sampled out and then\n" +
                "verified externally. That is why temperature is a <em>reproducibility</em> knob and not a\n" +
                "<em>correctness</em> knob, and why retrieval beats \"just prompting harder\".</p>\n" +
                "<p>Three independent axes that get conflated in interviews:</p>\n" +
                "<ul>\n" +
                "<li><b>Context window</b> — how many tokens attention can attend over at once. A hard ceiling,\n" +
                "not a memory size; anything older is gone and re-adding it costs a full re-read of the prefix.</li>\n" +
                "<li><b>Parameter count</b> — capacity for patterns, and the cost of every token you decode.</li>\n" +
                "<li><b>Training cutoff</b> — the only thing that bounds freshness. Retrieval and fine-tuning\n" +
                "exist precisely to move this boundary without retraining.</li>\n" +
                "</ul>\n" +
                "<p><b>Prefill vs decode.</b> The prompt is processed in one batched pass (prefill) that writes the\n" +
                "KV cache; the answer is then produced one token at a time (decode), each step reading that whole\n" +
                "cache. Prefill is compute-bound and parallelises to the last core. Decode is memory-bandwidth\n" +
                "bound, cannot be parallelised within a single request, and is where your per-user latency\n" +
"actually lives.</p>",
        },
        {
            kind: "card",
            title: "🔀 One request, end to end",
            html:
                "<p>Trace the loop. The two arrows that return to <code>Token ids</code> are the whole generation\n" +
                "process: everything else is setup. Note that the <code>Embedding table lookup</code> is a pure\n" +
                "dictionary lookup — token ids are not learned from scratch per request, which is why prompt\n" +
"caching can reuse them across calls.</p>",
        },
        {
            kind: "diagram",
            caption: "Tokenize, embed, run the decoder stack, project to logits, sample, append — and repeat",
            source: `flowchart TD
    TXT["Prompt text"] --> TOK["Tokenizer, usually BPE<br/>4 characters is often 1 token, other 4 are 7"]
    TOK --> IDS["Token ids<br/>15339, 1917, 30071, 13"]
    IDS --> EMB["Embedding table lookup<br/>one cached vector per id"]
    EMB --> BLK["Decoder block repeated L times<br/>attention plus MLP, residual"]
    BLK --> NORM["Final RMSNorm"]
    NORM --> LOGITS["Logits<br/>one score per vocabulary item"]
    LOGITS --> SAMP{"Sampling step"}
    SAMP -->|"argmax, temperature 0"| IDS
    SAMP -->|"temperature above 0"| NUC["Top-k and top-p filter,<br/>softmax over survivors, draw"]
    NUC -->|"chosen token is appended"| IDS`,
        },
        {
            kind: "table",
            title: "⚙️ Decoding knobs",
            headers: ["Knob","What it changes","Failure mode","Use it when"],
            rows: [
                ["<code>argmax</code> / T = 0","always the highest-logit token","repeats and loops; cannot escape a bad prefix","classification, extraction, tests, anything compared by string"],
                ["Temperature","scales logits before softmax; 1 is the model default","below ~0.4 collapses into loops; above ~1.2 produces non-sequiturs","creative drafting where you re-read the output"],
                ["Top-k","keeps only the k best tokens","k too small reintroduces the argmax loop","you know the answer lives in a small candidate set"],
                ["Top-p (nucleus)","keeps the smallest set whose probability mass is at least p","non-deterministic set membership; awkward to unit test","general open-ended generation"],
                ["Min-p","keeps tokens within a fixed log-prob ratio of the top token","a scale-free alternative to p; less popular in tooling","you want one stable cutoff across easy and hard prompts"],
                ["Repetition penalty","down-weights already-seen tokens","breaks legitimate repetition — code, quotes, names","long generations only, and set below ~1.05"],
                ["Beam search","keeps several partial sequences","worse quality than sampling on open-ended text, still 3&times; the cost","speech transcription and translation with a real scoring metric"],
            ],
        },
        {
            kind: "card",
            title: "💻 Implementation: one client, the settings that matter",
            html:
                "<pre><code class=\"language-javascript\">const res = await llm.generate({\n" +
                "  model: 'some-model-id',\n" +
                "  messages: [{ role: 'user', content: 'Translate to French: \"The meeting is moved to Thursday.\"' }],\n" +
                "  maxOutputTokens: 128,     // 1. hard ceiling. If it truncates, you get half a JSON object\n" +
                "                            //    with no error, so treat a finish_reason other than\n" +
                "                            //    'stop' as a failure in the caller, never as an answer\n" +
                "  temperature: 0,           // 2. 0 means argmax through the provider's sampler\n" +
                "  seed: 42,                 // 3. reproducibility only WITH a pinned model version\n" +
                "                            //    and identical prompt bytes — providers silently\n" +
                "                            //    re-rank, and aliases float to new snapshots\n" +
                "  stop: ['\\n\\nHuman:'],   // 4. must be escaped as a literal, and must not occur in the data\n" +
                "});\n" +
                "\n" +
                "if (res.finishReason !== 'stop') throw new Error('truncated: ' + res.finishReason);</code></pre>\n" +
                "<p><strong>Line notes.</strong> <code>maxOutputTokens</code> is the single most common silent\n" +
                "failure: with JSON tool calls the truncation lands mid-argument and the parse error surfaces\n" +
                "three layers away from the cause. The <code>seed</code> comment is the production lesson —\n" +
                "seeding pins sampling, not the model, so a snapshot bump under the same alias still changes\n" +
                "outputs. That is why regression tests need the resolved model revision recorded alongside the\n" +
"expected output.</p>",
        },
        {
            kind: "card",
            title: "🧪 Worked example: one prompt, three temperatures",
            html:
                "<p>Prompt: <code>Translate to French: \"The meeting is moved to Thursday.\"</code> Greedy picks\n" +
                "<code>à</code> because it is the marginally likelier bigram after <em>déplacée</em>, and once\n" +
                "<code>à</code> is committed the model continues down a path where the next-highest token is a\n" +
                "bare weekday, with no article. It is <b>stable and confidently wrong</b>, which is exactly the\n" +
                "failure shape temperature cannot fix.</p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Setting</th><th>Output</th><th>Verdict</th></tr>\n" +
                "<tr><td>T = 0 (greedy)</td><td><code>La réunion est déplacée à jeudi.</code></td><td>reproducible, wrong article — identical every run</td></tr>\n" +
                "<tr><td>T = 0.7 (default-ish)</td><td><code>La réunion a été déplacée au jeudi.</code></td><td>usually right; varies between runs at the same seed across revisions</td></tr>\n" +
                "<tr><td>T = 1.2</td><td><code>Réunion déplacée jeudi svp</code></td><td>creative, unusable for a translation field</td></tr>\n" +
                "</table>\n" +
                "<p>The interview lesson: if the task has a single correct output, sample at 0 and move the\n" +
                "variance into your own retry or self-consistency loop, where you can measure it. If the task has\n" +
                "many acceptable outputs, sample above 0 and judge the output. Do not set a mid temperature\n" +
"\"because it sounds reasonable\".</p>",
        },
        {
            kind: "card",
            title: "🗄️ Prefill and decode, and what the KV cache costs",
            html:
                "<p>Follow the two lanes. Prefill touches every prompt token at once and writes a cache entry per\n" +
                "layer per token. Decode re-reads the entire cache on every single step — which is why a 4,000\n" +
                "token prompt makes the <em>first output token</em> slow and the <em>rest</em> fast, and why long\n" +
"contexts fight concurrency rather than just costing more.</p>",
        },
        {
            kind: "diagram",
            caption: "Prefill parallelises across tokens; decode cannot, so its cost is a function of how many requests share the cache at once",
            source: `flowchart LR
    subgraph PF["Prefill, one batched pass, compute bound"]
        P1["3200 prompt tokens<br/>all positions computed together"] --> P2["Write one KV entry<br/>per layer per token"]
    end
    subgraph DC["Decode, one token per step, bandwidth bound"]
        D1["Output token 1<br/>reads the whole cache"] --> D2["Output token 2<br/>reads a slightly larger cache"]
        D2 --> D3["Output token N"]
    end
    P2 --> D1`,
        },
        {
            kind: "table",
            title: "💰 Cost and latency, derived not guessed",
            headers: ["Quantity","Formula","Worked number"],
            rows: [
                ["Prefill FLOPs","roughly <code>2 &times; params &times; prompt tokens</code>","2 &times; 7e9 &times; 3,200 &asymp; 4.5e13 FLOPs"],
                ["Weight bytes read per decode step","<code>params &times; bytes per param</code>","7e9 &times; 2 (bf16) = 14 GB, read <b>per token per sequence</b>"],
                ["Time per output token","<code>weight bytes / memory bandwidth</code>","14 GB / 1 TB/s &asymp; 14 ms, before overhead"],
                ["KV bytes per token","<code>2 &times; layers &times; kv heads &times; head dim &times; bytes</code>","2 &times; 32 &times; 8 &times; 128 &times; 2 B = 128 KiB per token"],
                ["KV for an 8k context","per-token cost &times; context","128 KiB &times; 8,192 &asymp; 1 GiB for one sequence"],
                ["KV at batch 32","&times; concurrent sequences","&asymp; 32 GiB — the real reason context and concurrency trade off"],
                ["Throughput from batching","weight read is amortised across the batch","batch 32 is nearly free per token until KV capacity binds"],
                ["Biggest latency lever","usually not the model","prefix caching, smaller max output tokens, a faster model tier"],
            ],
        },
        {
            kind: "card",
            title: "🚫 When NOT to reach for an LLM",
            html:
                "<ul>\n" +
                "<li><strong>Exact lookup over known data.</strong> \"Row for order 8812\" is a SQL query. An LLM\n" +
                "adds hallucination risk, latency and cost for zero gain.</li>\n" +
                "<li><strong>Deterministic transformation with a spec.</strong> A JSON Schema validator is faster,\n" +
                "free, and correct. Reserve the model for the parts a schema cannot express.</li>\n" +
                "<li><strong>High-volume classification into a small label set.</strong> A fine-tuned encoder\n" +
                "classifier is typically an order of magnitude cheaper per item, and a threshold plus a logit is\n" +
                "auditable where a sampled string is not.</li>\n" +
                "<li><strong>Fresh facts.</strong> Anything after the training cutoff, unless you retrieve it.</li>\n" +
                "<li><strong>Sub-100ms interactive latency budgets.</strong> A single decode step at 7B is\n" +
                "already ~14 ms of pure weight reads before any queueing.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Tokens, not characters.</strong> Budget the context in tokens and measure with the\n" +
                "model's own tokenizer. <code>len(text) / 4</code> is a decent English approximation and a\n" +
                "terrible one for code, JSON, or non-Latin scripts, where it can be off by 2&times;.</li>\n" +
                "<li><strong>Long-context dilution.</strong> A needle is retrievable in a 100k window; reasoning\n" +
                "across 30 pages of mixed relevance is not. Put the instruction at the top, repeat the key\n" +
                "constraint at the bottom, and put the retrieved evidence adjacent to the question.</li>\n" +
                "<li><strong>Truncation is silent.</strong> When <code>maxOutputTokens</code> cuts the response you\n" +
                "usually get a parse error or a half-sentence, not an exception. Check the finish reason.</li>\n" +
                "<li><strong>T = 0 loops.</strong> Repetition is the canonical failure. If the model repeats a\n" +
                "phrase three times, add a repetition penalty or a stop sequence rather than raising temperature.</li>\n" +
                "<li><strong>Stop sequences in the data.</strong> A stop string that occurs in retrieved documents\n" +
                "terminates the answer mid-sentence. Prefer a model-provided stop reason over a hand-rolled one.</li>\n" +
                "<li><strong>Reasoning effort is a dial, not a slider to max.</strong> Longer thinking traces\n" +
                "raise quality on hard problems and cost latency on easy ones. Route by difficulty, not globally.</li>\n" +
                "<li><strong>Logprobs for exact match.</strong> If you need \"did it say exactly <code>42</code>\",\n" +
                "compare logprobs of the alternative tokens rather than string-comparing sampled text.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Why is decoding memory-bandwidth bound rather than compute bound?",
                    a:
"<p>Arithmetic intensity drops as the batch shrinks. At batch 1 a decode step does one matrix-vector product per layer: it reads every weight exactly once to produce one output token, so almost all the time is spent streaming 14 GB of bf16 weights over the memory bus, and the multiplies are hidden underneath. Prefill has the opposite profile — thousands of tokens of independent work per weight read — so it saturates the FLOPs. This is also why batching is nearly free: the second sequence in a batch reuses the same weight read.</p>",
                },
                {
                    q: "How would you cut p99 latency for a chat endpoint without changing the model?",
                    a:
"<p>In rough order of payoff: (1) stream the response so time-to-first-token is what the user feels, (2) prefix-cache the system prompt and any long shared context — the prefill is the dominant cost and it is identical across every request in a conversation, (3) cut <code>maxOutputTokens</code> to what answers actually need, (4) reduce the retrieved context, which shrinks prefill linearly, and (5) route to a smaller model and escalate only when a cheap classifier or a self-consistency check says it was hard.</p>",
                },
                {
                    q: "KV cache in one sentence, plus when you would drop it.",
                    a:
"<p>It stores the per-layer key and value vectors for every previous token so attention over the prefix is not recomputed at each step; without it, generating N tokens costs O(N&sup2;) instead of O(N). Drop it when the prefix is long and reused by few requests — a one-shot summarisation job spends more memory on cache than on compute — or when the sequence is about to end anyway. Grouped-query attention and quantised KV are the two ways to make it smaller rather than absent.</p>",
                },
                {
                    q: "When is a bigger model actually the right call?",
                    a:
"<p>When the failure is a missing capability, not a missing fact. A model that cannot hold a multi-step constraint in mind will not be fixed by a longer prompt; a model that knows the answer but was not shown it is fixed by retrieval. Before upgrading, check the eval set for whether errors cluster on capability or on grounding — they have completely different fixes and completely different costs.</p>",
                },
                {
                    q: "Why do people still say \"the model is just a next-token predictor\"?",
                    a:
"<p>Because it is a precise statement of the training objective and a bad description of the system. Enough capability is a property of the distribution, not of any single sample from it. The practical reading is not \"it cannot reason\" but \"nothing it produces is checked\" — so the engineering work is verification, tool use, and evals, not persuading it to try harder.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🏭 In production",
            html:
                "<ul>\n" +
                "<li><strong>Everything is a state machine around a sampling loop.</strong> Real systems add\n" +
                "stop conditions, tool round-trips, retry budgets, and cancellation — the token loop is the\n" +
                "smallest part.</li>\n" +
                "<li><strong>Pin the model revision, not the alias.</strong> Record the resolved version in every\n" +
                "log line and in the eval run, or you cannot attribute a regression.</li>\n" +
                "<li><strong>Cache on the prefix, not the answer.</strong> Semantic caching of whole responses\n" +
                "fails on the long tail; a prefix cache is exact and hits on the system prompt plus history.</li>\n" +
                "<li><strong>Budget tokens, not requests.</strong> Rate limits and cost caps belong on input and\n" +
                "output tokens per tenant, since that is what actually moves the bill.</li>\n" +
                "<li><strong>Log finish reasons and token counts as first-class metrics.</strong> A rise in\n" +
                "truncation rate is the earliest signal that a prompt change got too long.</li>\n" +
"</ul>",
        },
    ],
});
