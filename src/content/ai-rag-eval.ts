// src/content/ai-rag-eval.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-rag-eval",
    title: "RAG Evaluation",
    blocks: [
        {
            kind: "card",
            title: "Metrics",
            html:
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Metric</th><th>Measures</th></tr>\n" +
                "<tr><td>Precision</td><td>Relevant docs retrieved / all retrieved</td></tr>\n" +
                "<tr><td>Recall</td><td>Relevant docs retrieved / all relevant</td></tr>\n" +
                "<tr><td>MRR</td><td>Mean reciprocal rank of first relevant doc</td></tr>\n" +
                "<tr><td>NDCG</td><td>Rank-aware relevance quality</td></tr>\n" +
                "<tr><td>Faithfulness</td><td>Is answer grounded in context?</td></tr>\n" +
"</table>",
        },
        {
            kind: "card",
            title: "Mental Model",
            html:
                "<p>A RAG system has three independently breakable parts, so it needs three independently\n" +
                "measurable numbers. Retrieval quality, generation faithfulness, and end-to-end answer quality.\n" +
                "<b>The invariant:</b> <b>a single blended score is worse than useless, because it always moves\n" +
                "when anything moves and therefore never tells you what to fix.</b> If a release drops your\n" +
                "composite by 4%, you cannot act on that. If <code>context recall</code> is flat and\n" +
                "<code>faithfulness</code> fell, you know it is a prompt or model problem and not a corpus\n" +
                "problem.</p>\n" +
                "<p>The other invariant that catches most teams: <b>retrieval metrics require ground truth;\n" +
                "generated-answer metrics can be judged without it.</b> That is what makes LLM-as-judge\n" +
                "evaluation practical — you cannot label \"the correct answer\" for a thousand open-ended questions,\n" +
"but you <em>can</em> label whether a given answer is supported by a given context.</p>",
        },
        {
            kind: "card",
            title: "The three layers of a RAG eval",
            html:
                "<p>Follow the two decision diamonds. They are the whole point of the diagram: <b>if context\n" +
                "recall is low, nothing downstream matters</b>, because a perfectly faithful answer to the wrong\n" +
                "context is still wrong. Fix the bottom layer first, then the middle, and only then look at\n" +
"generation.</p>",
        },
        {
            kind: "diagram",
            caption: "Three layers with two gates: never tune generation while context recall is failing, and never chase an answer-quality drop before faithfulness is clean",
            source: `flowchart TD
    Q["Eval set: question plus<br/>known relevant source spans"] --> R["Layer 1, retriever<br/>needs labelled spans"]
    R --> RM{"Context recall@5<br/>at least the target?"}
    RM -->|"no"| FIX1["Fix parsing, chunking,<br/>recall. Stop here.<br/>No generation metric<br/>can rescue a miss"]
    RM -->|"yes"| F["Layer 2, faithfulness<br/>judge: is each claim<br/>supported by the context?"]
    F --> FM{"Faithfulness<br/>at least the target?"}
    FM -->|"no"| FIX2["Fix the prompt, the context order,<br/>or add a post-hoc<br/>citation check"]
    FM -->|"yes"| A["Layer 3, answer quality<br/>correct, relevant,<br/>complete, well cited"]
    A --> SHIP{"Correct and<br/>complete?"}
    SHIP -->|"no"| FIX3["Usually the model tier<br/>or the instruction, not retrieval"]
    SHIP -->|"yes"| REL["Release, and pin the<br/>regression test"]`,
        },
        {
            kind: "card",
            title: "From a user complaint to the number that moved",
            html:
                "<p>Work left to right along the branch you actually observe. The recurring mistake is jumping to\n" +
                "the last row — a bad answer reads like a generation problem — when in practice the symptom that\n" +
"generates complaints most often starts two branches to the left, in the corpus.</p>",
        },
        {
            kind: "diagram",
            caption: "The same visible symptom has four different causes, and the metric you measure is what tells them apart — measuring faithfulness first will point you at the prompt for a chunking bug",
            source: `flowchart TD
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
    M4 --> F4["Fix: chunking, then over-fetch<br/>plus a reranker"]`,
        },
        {
            kind: "table",
            title: "The metric set, with what each one catches",
            headers: ["Layer","Metric","Definition","The failure it uniquely catches"],
            rows: [
                ["Retriever","Context recall","share of gold spans present in the retrieved context","the answer was never in the index, or the top-k was too small"],
                ["Retriever","Context precision","share of retrieved context that is relevant","you are burning context window on noise"],
                ["Retriever","MRR / nDCG@10","rank-aware quality of the retrieved set","the right chunk is at rank 9, so the generator never saw it early"],
                ["Retriever","Hit rate@1","the gold document is ranked first","ranking regressions a recall@k number hides"],
                ["Generator","Faithfulness","every claim entailed by the context","the model used its prior knowledge instead of the evidence"],
                ["Generator","Answer relevance","the answer addresses the question asked","the model answered the neighbouring question"],
                ["Generator","Citation accuracy","cited ids exist and support the claim","fabricated or mismatched references"],
                ["End to end","Correctness","the answer is right","a complete miss"],
                ["End to end","Completeness","it covers every part of a multi-part question","a correct but partial answer, which users read as wrong"],
                ["End to end","Abstention accuracy","it abstains exactly when it should","confidently answering from nothing, and over-refusing"],
                ["Ops","p95 latency and cost per query","engineering, not model, quality","a quality win that the product cannot ship"],
            ],
        },
        {
            kind: "card",
            title: "Worked example: one release, three numbers",
            html:
                "<p>Eval set: 200 real support questions with gold source spans. Before and after a release that\n" +
                "swapped in a new chunker and added a reranker.</p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Metric</th><th>Before</th><th>After</th><th>Read</th></tr>\n" +
                "<tr><td>Context recall@5</td><td>0.71</td><td>0.88</td><td>reranker plus wider fetch — a real win</td></tr>\n" +
                "<tr><td>Context precision@5</td><td>0.34</td><td>0.29</td><td>slightly worse: the reranker surfaced a fifth marginal chunk</td></tr>\n" +
                "<tr><td>Faithfulness</td><td>0.94</td><td>0.93</td><td>flat, as expected — the prompt did not change</td></tr>\n" +
                "<tr><td>Answer correctness</td><td>0.58</td><td>0.79</td><td>the number you actually care about</td></tr>\n" +
                "<tr><td>Correct but incomplete</td><td>0.19</td><td>0.14</td><td>still the largest single error class left</td></tr>\n" +
                "<tr><td>p95 latency</td><td>1.4 s</td><td>1.9 s</td><td>+0.5 s, which is the reranker plus a wider fetch</td></tr>\n" +
                "</table>\n" +
                "<p>What this tells you that a composite would not: correctness improved because recall improved,\n" +
                "and faithfulness did not move, so there is <b>nothing to fix in the prompt</b>. The next\n" +
                "iteration should target completeness — which usually means either returning more context or asking\n" +
                "the model to enumerate sub-questions — and the +0.5&nbsp;s is the bill for a 21-point correctness\n" +
"gain, which is a good trade but a real one.</p>",
        },
        {
            kind: "card",
            title: "Implementation: a judge you can defend",
            html:
                "<pre><code class=\"language-javascript\">const FAITHFULNESS_JUDGE = [\n" +
                "  'You are grading whether an ANSWER is supported by a CONTEXT.',\n" +
                "  'Extract each factual claim from the ANSWER. For each claim decide:',\n" +
                "  '  supported    - the CONTEXT states it or directly entails it',\n" +
                "  '  contradicted - the CONTEXT states something incompatible',\n" +
                "  '  not_in_context - the CONTEXT is silent',\n" +
                "  'Return JSON only. An ANSWER that contradicts the CONTEXT is worse',\n" +
                "  'than one that is silent, because it will mislead the user.',\n" +
                "].join('\n" +
                "');\n" +
                "\n" +
                "const score = await judge({\n" +
                "  rubric: FAITHFULNESS_JUDGE,\n" +
                "  temperature: 0,        // 1. a judge is a classifier. variance here is pure noise\n" +
                "  repeat: 3,              // 2. majority vote over 3 samples. costs 3x, removes most\n" +
                "                           //    of the run-to-run wobble on borderline items\n" +
                "  validate: s =&gt; Array.isArray(s.claims) &amp;&amp; s.claims.every(c =&gt;\n" +
                "      ['supported', 'contradicted', 'not_in_context'].includes(c.verdict)),\n" +
                "  onInvalid: (_, raw) =&gt; retryWithRepairPrompt(raw),   // 3. always re-ask with the parse\n" +
                "                           //    error appended, never score a malformed response as 0\n" +
                "});\n" +
                "\n" +
                "// 4. spot-check the judge against humans. if the judge is not at least as\n" +
                "//    accurate as the change you are trying to detect, you are measuring noise\n" +
                "await auditJudgeAgreement(humanLabels, score, { minAgreement: 0.85 });</code></pre>\n" +
                "<p><strong>Line notes.</strong> Line 2 is the cheapest accuracy win available: three samples at\n" +
                "temperature 0 plus a majority vote removes most borderline wobble, and the cost is a fraction of\n" +
                "the pipeline you are trying to evaluate. Line 3 is the one that bites hardest in practice — a\n" +
                "judge that returns malformed JSON on 3% of items will silently depress your score and look like a\n" +
                "quality regression. And line 4 is the habit that separates a real eval harness from a dashboard:\n" +
"the judge itself needs a gold set and a known agreement rate.</p>",
        },
        {
            kind: "table",
            title: "Evaluation frameworks",
            headers: ["Tool","Shape","Strength","Caveat"],
            rows: [
                ["RAGAS","library, metric-per-component","the reference decomposition into context precision/recall, faithfulness, answer relevance","LLM-judged, so it inherits judge bias; pin model and prompt versions"],
                ["DeepEval","pytest-style assertions","fits existing CI; per-metric LLM-as-judge with few-shot control","the pytest framing encourages many tiny assertions and a slow suite"],
                ["TruLens","instrumentation at runtime","tripwire checks and feedback functions on live traces","instrumentation cost in the hot path"],
                ["LangSmith","tracing plus datasets plus evaluators","best-in-class trace inspection; datasets make regression runs easy","you are committing to a vendor and shipping traces off-box"],
                ["Phoenix","open-source, OTel-aligned","self-hostable; spans line up with OpenTelemetry","you operate it"],
                ["Hand-rolled","whatever you write","exactly the metrics and slices you care about","no interop, and easy to accidentally measure something subtly different from the standard definition"],
            ],
        },
        {
            kind: "table",
            title: "Cost and latency of evaluation",
            headers: ["Activity","Cost","Cadence"],
            rows: [
                ["Building the labelled set","the dominant cost: 200 human-labelled questions is days of work","once, then grow it"],
                ["Offline eval run, 200 questions","200 x (retrieval + 1 generation + N judge calls)","every change to the pipeline"],
                ["Judge calls with repeat=3","3x the judge cost, usually still under 10% of a run","every run"],
                ["Production trace sampling","1&ndash;5% of traffic, judge on the sample","continuous"],
                ["A/B on live traffic","both arms fully served","for changes that pass offline"],
                ["Human audit of the judge","50&ndash;100 items per judge version","whenever the judge model or rubric changes"],
            ],
        },
        {
            kind: "card",
            title: "When NOT to use an LLM judge",
            html:
                "<ul>\n" +
                "<li><strong>When the answer is a single number or exact string.</strong> Compare directly. A\n" +
                "judge adds cost and error to a task a string comparison does perfectly.</li>\n" +
                "<li><strong>When you have human labels available.</strong> Human judgement is the ground truth\n" +
                "for whether the <em>judge</em> is any good, and it should be collected before the judge is\n" +
                "trusted.</li>\n" +
                "<li><strong>For safety-critical claims.</strong> Never let a judge decide whether a medical,\n" +
                "legal, or financial statement is acceptable. That is a rules engine plus a human.</li>\n" +
                "<li><strong>As the only signal.</strong> A judge score with no user signal and no latency or cost\n" +
                "tracking tells you the system sounds right, which is not the same as being right.</li>\n" +
                "<li><strong>On a 20-example set.</strong> Below roughly 100 items, the confidence interval is\n" +
                "wider than any effect you are trying to detect, so the number cannot support a decision.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Eval set that is not production traffic.</strong> A set built from questions you\n" +
                "already know the answer to measures the easy tail. Mine real logs, and keep the ugly ones.</li>\n" +
                "<li><strong>Averaging over everything.</strong> Slice by query length, language, document type,\n" +
                "and tenant. A 2% overall gain can be a 12% gain on the slice you actually care about.</li>\n" +
                "<li><strong>Never measuring abstention.</strong> A system that answers everything scores well on\n" +
                "correctness among the questions it attempts while being wrong in exactly the places users notice.\n" +
                "Pair every run with an abstention-accuracy check.</li>\n" +
                "<li><strong>Judging the answer instead of the context.</strong> Faithfulness must be judged\n" +
                "against the <em>retrieved context</em>, not against general knowledge — otherwise a correct\n" +
                "answer that the corpus did not support looks perfect.</li>\n" +
                "<li><strong>Changing the judge and the system in one release.</strong> You will never attribute\n" +
                "the movement. Change one, re-audit the judge, then change the other.</li>\n" +
                "<li><strong>Golden-set overfitting.</strong> Optimising directly against 200 labelled questions\n" +
                "produces a system tuned to those 200. Hold out a set you never look at.</li>\n" +
                "<li><strong>No confidence intervals.</strong> 200 items, 79% correct, has roughly a &plusmn;3.5\n" +
                "point interval. \"Up 2 points\" is not a result.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "How do you know if your retriever or your generator is the problem?",
                    a:
"<p>Run the oracle test. Force the known-correct passages into the prompt and see whether the answer is right; that isolates generation. Then check whether those passages are actually being retrieved; that isolates retrieval. Four outcomes, four actions: good generation with bad retrieval means fix retrieval; bad generation with good retrieval means fix the prompt or the model tier; bad at both means start with the corpus; good at both means you have a sampling artefact in the eval. It takes an afternoon and it removes most of the guesswork from the next quarter.</p>",
                },
                {
                    q: "Which one metric would you put on a dashboard, and why?",
                    a:
"<p>Context recall@5 for the retriever and abstention accuracy for the system as a whole. Recall is the one number where an improvement almost always converts into answer quality, so it is the best leading indicator. Abstention accuracy is the one that catches the failure users actually complain about — a confident answer with nothing behind it. A blended \"RAG score\" is the wrong choice: it moves for every reason, so when it moves you have learned nothing about what to do next.</p>",
                },
                {
                    q: "How reliable is LLM-as-judge, honestly?",
                    a:
"<p>Good but not neutral. Judges are systematically more generous on style than on substance, they share the generator's biases, and they drift when you swap the judge model. Treat the judge score as a noisy but useful signal, and make it trustworthy three ways: pin the model and rubric version, run repeat samples and majority-vote, and audit agreement against human labels on 50&ndash;100 items every time the judge changes. A judge that disagrees with humans 15% of the time cannot detect a 5% regression.</p>",
                },
                {
                    q: "How large does an eval set need to be?",
                    a:
"<p>Enough that the confidence interval is narrower than the effect you need to detect. With roughly 79% correctness, 200 items gives you about a &plusmn;3.5 point interval, so a 5-point improvement is detectable and a 2-point one is not. Two ways out: more items, or paired evaluation on the same items — because both systems are scored on identical questions, the paired difference has far lower variance than the two absolute rates and can detect smaller effects with fewer items.</p>",
                },
                {
                    q: "How do you evaluate without any human labels at all?",
                    a:
"<p>You can get most of the way with proxies. A strong synthetic generator produces questions from your corpus in a way you can verify, giving you a gold span for free — but it over-represents your corpus and under-represents the awkward queries users actually type, so treat it as a regression suite, not as truth. Pair it with production signals: citation click-through, re-ask rate, abandon rate, and a weekly human read of twenty random traces. A few dozen human reads a week will find the failure modes no synthetic set will ever contain.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "In production",
            html:
                "<ul>\n" +
                "<li><strong>Version the eval set alongside the pipeline.</strong> Add new hard questions every\n" +
                "release; a frozen set makes the score go up forever while the product does not.</li>\n" +
                "<li><strong>Trace everything, sample a fraction.</strong> Store the ranked candidates, the final\n" +
                "context, the raw completion, and the judge verdict per query. An eval that only stores a score\n" +
                "cannot be re-scored when the judge improves.</li>\n" +
                "<li><strong>Gate on the metric that maps to user pain.</strong> Recall and abstention go in the\n" +
                "release gate; faithfulness and correctness are reviewed but looser.</li>\n" +
                "<li><strong>Track latency and cost on the same chart.</strong> A 20-point quality gain that adds\n" +
                "a second is a different product decision than one that is free.</li>\n" +
                "<li><strong>Keep a canary with automatic rollback.</strong> Run the new pipeline on a small slice\n" +
                "and revert on either quality or p95, because offline evals systematically miss production-only\n" +
                "inputs.</li>\n" +
"</ul>",
        },
    ],
});
