// src/content/ai-system-design.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-system-design",
    title: "AI System Design",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html:
                "<p>An AI feature is a distributed system with one unusually expensive, unusually variable, and\n" +
                "unusually hard-to-predict component in the middle. Everything you already know about API design\n" +
                "still applies; what is new is that the middle component has a quality axis that ordinary backends\n" +
                "do not, and its cost and latency are proportional to tokens rather than to request count.</p>\n" +
                "<p><b>The invariant:</b> <b>quality is a measured property of a versioned configuration, never an\n" +
                "assumption.</b> Every layer — model, prompt, retrieval config, temperature, context assembly — is\n" +
                "a variable, and changing any of them changes behaviour. So the system must be able to say, for\n" +
                "any request, exactly which combination produced that answer, and must be able to compare two\n" +
                "combinations on a fixed eval set.</p>\n" +
                "<p><b>The second invariant:</b> <b>the guardrail path must be independent of the generation\n" +
                "path.</b> A model that decides whether its own output is safe is not a guardrail. Input filtering,\n" +
                "authorisation, output validation, and rate limits all sit outside the model, and they must be able\n" +
"to reject something the model is perfectly happy to produce.</p>",
        },
        {
            kind: "card",
            title: "Reference architecture",
            html:
                "<p>Follow the request left to right. The two boxes that people skip in a first draft are the\n" +
                "<em>policy</em> box before the model and the <em>validation</em> box after it — and those are the\n" +
                "two that make the system safe to operate. The observability rail is not optional: without it,\n" +
"\"the AI feels worse this week\" is unanswerable.</p>",
        },
        {
            kind: "diagram",
            caption: "Guardrails on both sides of generation, budgets enforced at the edge, and a trace that records the exact configuration behind every answer",
            source: `flowchart LR
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
    OBS -.-> EVAL["Offline eval and online signals<br/>quality, refusal rate,<br/>cost per successful answer"]`,
        },
        {
            kind: "card",
            title: "One request, latency budgeted",
            html:
                "<p>Read the annotations as the budget. Note the two cache hits early — a semantic or exact cache\n" +
                "hit costs a fraction of a cent and about 10&nbsp;ms, while the model path costs dollars and\n" +
                "seconds. Note also that the response is streamed and that the guardrail verdict is recorded\n" +
                "regardless of the outcome, so a refusal is a first-class observable event rather than a gap in\n" +
"the data.</p>",
        },
        {
            kind: "diagram",
            caption: "The cache hit is two orders of magnitude cheaper than the model path — and the trace is written either way, so refusals are measurable",
            source: `sequenceDiagram
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
    ORC->>ORC: record trace, tokens, cost, latency, verdict`,
        },
        {
            kind: "table",
            title: "Layer by layer",
            headers: ["Layer","Responsibility","Failure it prevents","Key metric"],
            rows: [
                ["Edge","auth, tenant isolation, token-based rate limits, request size caps","one tenant exhausting the budget; unbounded prompt cost","tokens per minute per tenant"],
                ["Policy","input filtering, injection heuristics, PII detection, prompt-injection screening","retrieved content instructing the model","block rate and false-positive rate"],
                ["Router","classify the request, pick a model tier or a deterministic handler","a frontier model being used to answer a lookup","routing accuracy and cost saved"],
                ["Retrieval","hybrid search, rerank, corpus-side guardrails","wrong, stale, or forbidden context","context recall@5 and filter-leak count"],
                ["Model gateway","model routing, retries, fallbacks, streaming, cost accounting","a provider outage; unbounded spend","tokens per successful answer"],
                ["Validation","schema, citation existence, grounding, output filters","hallucinated and unverifiable output leaving the system","grounding rate, invalid-citation rate"],
                ["Observability","per-request trace with every config value","\"it feels worse\" with no way to attribute it","trace coverage, sampled-eval agreement"],
            ],
        },
        {
            kind: "card",
            title: "Worked example: choosing a model tier per request",
            html:
                "<p>Assume a support assistant: 1M requests/day, 80% are short factual lookups, 15% need the\n" +
                "corpus, 5% are multi-step. Latency target p95 &lt; 4&nbsp;s; today everything goes to one large\n" +
                "model.</p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Tier</th><th>Share</th><th>Handler</th><th>Latency</th><th>Relative cost</th></tr>\n" +
                "<tr><td>T0</td><td>62%</td><td>exact-match lookup plus a cached template answer</td><td>&lt;50 ms</td><td>~0</td></tr>\n" +
                "<tr><td>T1</td><td>18%</td><td>small model, no tools, short output cap</td><td>~400 ms</td><td>~0.02</td></tr>\n" +
                "<tr><td>T2</td><td>15%</td><td>small model plus retrieval, streamed</td><td>~1.2 s</td><td>~0.1</td></tr>\n" +
                "<tr><td>T3</td><td>5%</td><td>large model, retrieval, tools, longer reasoning</td><td>~6 s</td><td>~3.0</td></tr>\n" +
                "</table>\n" +
                "<p>Bill-weighted, T3 is 27% of the spend on 5% of the traffic. Routing it to a small model first\n" +
                "with a self-consistency or judge check, and escalating on disagreement, is the single largest\n" +
                "cost lever — and it is measurable before you ship it, by replaying the T3 slice through both\n" +
                "paths on a fixed eval set. The risk is a router that escalates too little, so log the\n" +
                "escalation rate and the disagreement rate together; a falling escalation rate alongside a rising\n" +
"error rate is a router problem, not a model problem.</p>",
        },
        {
            kind: "card",
            title: "Implementation: a gateway with the invariants in it",
            html:
                "<pre><code class=\"language-javascript\">const g = new ModelGateway({\n" +
                "  routes: [\n" +
                "    { when: isExactLookup,      model: 'small',  maxOutputTokens: 64,  tools: [] },\n" +
                "    { when: needsCorpus,        model: 'small',  maxOutputTokens: 512, tools: [search] },\n" +
                "    { when: isComplex,          model: 'large',  maxOutputTokens: 2048, tools: all, approvals: true },\n" +
                "  ],\n" +
                "  // 1. per-request budget, enforced before dispatch, not measured afterwards\n" +
                "  budget: { maxSpendUsd: 0.25, maxInputTokens: 12_000 },\n" +
                "  // 2. pin the revision. the alias floats, and a float is an unreviewed change\n" +
                "  //    to production behaviour with no deploy and no changelog\n" +
                "  pinRevision: true,\n" +
                "  resilience: { maxAttempts: 3, timeoutMs: 20_000, jitter: true, breaker: { threshold: 0.5, window: 30 } },\n" +
                "  // 3. on a provider failure, degrade down the routing table rather than erroring\n" +
                "  onExhausted: (route) => route.model === 'large' ? fallbackTo('small') : null,\n" +
                "});\n" +
                "\n" +
                "const out = await g.run({ messages, config });\n" +
                "\n" +
                "// 4. validation lives OUTSIDE the model. the model agreeing that it is\n" +
                "//    correct is not evidence, it is a second opinion from the same prior\n" +
                "const verdict = validate(out.text, {\n" +
                "  schema: ANSWER_SCHEMA,\n" +
                "  citations: { allowed: retrieved.map(r =&gt; r.id), requireSupport: true },\n" +
                "});\n" +
                "\n" +
                "if (!verdict.ok) return abstain(verdict.reason, retrieved);\n" +
                "recordTrace({ runId, route: out.route, modelRevision: out.revision, tokens: out.usage,\n" +
                "               retrievedIds: retrieved.map(r =&gt; r.id), verdict, costUsd: out.costUsd });</code></pre>\n" +
                "<p><strong>Line notes.</strong> Line 2 is the one that saves you during an incident: a floating\n" +
                "alias means a provider-side change reaches production with no deploy and no review, and you\n" +
                "cannot roll it back because you do not know what changed. Line 4 is the security boundary — the\n" +
                "model's own confidence is not independent evidence. And <code>recordTrace</code> is not logging\n" +
                "for its own sake: without the retrieved ids, the model revision, and the verdict on the same\n" +
"record, you cannot compare two configurations or explain a single bad answer.</p>",
        },
        {
            kind: "table",
            title: "Cost and latency",
            headers: ["Quantity","Rule","Control"],
            rows: [
                ["Input cost","proportional to input tokens, which is prefill work","prefix caching; truncate retrieved context"],
                ["Output cost","usually priced higher per token than input","cap <code>maxOutputTokens</code> per route"],
                ["Cost per <em>successful</em> answer","total spend divided by answers that passed validation","the only cost metric that does not reward failure"],
                ["Time to first token","queueing plus prefill plus routing","stream; cache the prefix; keep the route simple"],
                ["Tail latency","retries multiply the tail","bound attempts; fail fast to a degraded path"],
                ["Retrieval share of latency","often 10&ndash;25% of the total","over-fetch and rerank in parallel where you can"],
                ["Biggest levers, in order","routing, context size, output cap, model tier","all four are configuration, not engineering projects"],
            ],
        },
        {
            kind: "card",
            title: "When NOT to build a full AI system",
            html:
                "<ul>\n" +
                "<li><strong>Prompt plus model is enough.</strong> If a direct call with a good prompt passes your\n" +
                "eval, the gateway, the router, and the guardrail layer are all cost with no benefit.</li>\n" +
                "<li><strong>No eval exists.</strong> Every layer here needs a metric to justify it. Without one,\n" +
                "you are adding complexity and calling it maturity.</li>\n" +
                "<li><strong>The task is a lookup or a transformation.</strong> SQL, a search index, and a schema\n" +
                "validator beat the whole stack and are fully debuggable.</li>\n" +
                "<li><strong>Latency budget under a second, interactively.</strong> A single generation is already\n" +
                "hundreds of milliseconds; multi-layer orchestration does not fit.</li>\n" +
                "<li><strong>Nobody will operate it.</strong> Model routing, budget accounting, and guardrail\n" +
                "tuning are ongoing jobs, and a system nobody maintains degrades silently within a quarter.</li>\n" +
                "<li><strong>You cannot explain an answer to a regulator or a customer.</strong> That is a hard\n" +
                "blocker for many domains, regardless of how good the model is.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Floating model aliases.</strong> A provider change arrives with no deploy and no\n" +
                "rollback path. Pin the revision.</li>\n" +
                "<li><strong>Guardrails that call the model.</strong> A model judging its own output is not a\n" +
                "guardrail. Keep policy outside generation.</li>\n" +
                "<li><strong>Rate limits per request, not per token.</strong> One request with a 200k-token prompt\n" +
                "costs 200 requests' worth and passes the limit.</li>\n" +
                "<li><strong>Optimising the happy path only.</strong> Refusal and error paths are most of what\n" +
                "happens in production, and they are usually the untested ones.</li>\n" +
                "<li><strong>Caching across model revisions.</strong> A cache key without the revision serves\n" +
                "answers from a model that no longer exists.</li>\n" +
                "<li><strong>Prompt version not in the trace.</strong> Without it, every quality question becomes\n" +
                "manual log archaeology.</li>\n" +
                "<li><strong>Trusting self-reported confidence.</strong> A model's stated confidence is a prior,\n" +
                "not a measurement. Gate on an external check.</li>\n" +
                "<li><strong>Retrieved content treated as trusted.</strong> Anything in the corpus is\n" +
                "user-supplied by definition, and it lands in the prompt with full authority.</li>\n" +
                "<li><strong>No degraded path.</strong> When the provider degrades, a system with only success and\n" +
                "failure returns errors to every user simultaneously.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "How would you design an AI feature for a 1000 requests-per-second workload?",
                    a:
"<p>Start with the shape, not the model. The steady-state cost of a request is dominated by output tokens, so the first design question is how many of the requests need a generation at all — a large fraction usually do not, and those go to a lookup, a template, or a cache. Then: a model gateway that owns routing, retries, timeouts, budgets and cost accounting, so no call site has to; token-based rate limiting at the edge; prefix caching for the shared system prompt; a small model as the default tier with escalation; and a queue with backpressure in front, because an LLM call is a scarce resource and admission control beats queueing without limit. Add circuit breakers and a degraded path, because at this scale a provider blip becomes a full outage.</p>",
                },
                {
                    q: "How do you reduce cost without hurting quality?",
                    a:
"<p>In this order, and measure after each. First routing: most spend is on the small share of hard requests, so a cheap-first tier with an external check and escalation is usually the largest win. Second context size: prefill scales linearly, so retrieving five good passages instead of thirty is a direct saving. Third the output cap, per route — this is routinely set far too high. Fourth the model tier for the easy majority. Fifth batching, which is nearly free at the serving layer. Last, fine-tuning or distillation for a high-volume narrow task, which has the best unit economics and the worst engineering cost. Track cost per <em>successful</em> answer, not per request, or the cheap tier that fails everything looks best.</p>",
                },
                {
                    q: "How do you handle a model provider outage?",
                    a:
"<p>Assume it will happen weekly. The gateway holds model routing and provider state, so failover is a routing decision rather than a deploy: a circuit breaker per provider, a second provider behind the same interface, and a routing table that degrades down capability tiers rather than switching up. Timeouts must be shorter than the caller's patience and the whole call must be cancellable. Retries need a budget and jitter so a provider incident does not become a self-inflicted retry storm. The degraded path should be a real product answer — cached results, a search-results page, or a queued request that completes when the provider returns — because the alternative is returning an error to every user at once.</p>",
                },
                {
                    q: "How do you put guardrails around a model?",
                    a:
"<p>Both sides, and outside the model. Before: authenticate, resolve the tenant, enforce token and size limits, screen for injection patterns, detect PII, and sanitise retrieved content — because corpus text is untrusted input that lands in the prompt with full authority. After: validate the response against a schema, verify every cited id exists and supports its claim, check grounding, and run output filters for the categories that matter to you. Approval gates for irreversible actions sit in the tool layer, not the prompt. And the guardrail must be able to reject something the model is confident about — a model asked whether its own answer is safe will almost always say yes.</p>",
                },
                {
                    q: "How do you prove the system got better?",
                    a:
"<p>Fixed eval set, identical questions, every configuration change. Paired scoring, because both systems see the same items and the paired difference has far lower variance than two absolute rates. Slice the results by query type, language, tenant and document type, because an overall average hides the slice you care about. Track latency and cost on the same chart, since a quality win that adds a second is a different decision. Then validate offline against production signals — re-ask rate, citation click-through, abandonment — and finish with a canary and an automatic rollback, because offline evals systematically miss production-only inputs and a component you have just changed is exactly where you will find out.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "In production",
            html:
                "<ul>\n" +
                "<li><strong>The gateway is the only place that calls a model.</strong> One owner for retries,\n" +
                "timeouts, budgets, cost accounting and provider failover, so no call site can bypass it.</li>\n" +
                "<li><strong>Every response carries a trace id.</strong> Prompt version, model revision, retrieved\n" +
                "ids, tokens, cost, latency, guardrail verdicts — retrievable together, always.</li>\n" +
                "<li><strong>Degrade before you fail.</strong> Cached answers, a search-results page, or a queued\n" +
                "request. Design the degraded path as a product surface, not an error branch.</li>\n" +
                "<li><strong>Canary with automatic rollback on quality and p95.</strong> Gate on the same metrics\n" +
                "you eval on, evaluated on live traffic.</li>\n" +
                "<li><strong>Red-team the guardrails, not just the model.</strong> Injection through the corpus\n" +
                "and through the tool layer is a more realistic failure than a jailbreak prompt.</li>\n" +
                "<li><strong>Review the escalation and refusal rates weekly.</strong> A falling refusal rate is\n" +
                "usually a broken guardrail; a rising one is usually a broken corpus.</li>\n" +
"</ul>",
        },
    ],
});
