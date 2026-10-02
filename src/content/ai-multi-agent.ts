// src/content/ai-multi-agent.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-multi-agent",
    title: "Multi-Agent Systems",
    blocks: [
        {
            kind: "card",
            title: "🏗️ Architecture",
            html:
                "<p>A multi-agent system splits one prompt into several specialised contexts. The pitch is that\n" +
                "smaller, focused contexts beat one huge one, and that different specialists want different tools\n" +
                "and different permissions. The cost is that you have now built a distributed system, and the\n" +
"constraints of distributed systems apply whether or not you wanted them.</p>",
        },
        {
            kind: "diagram",
            caption: "A supervisor decomposes, specialists write to a typed shared blackboard, and a synthesis step composes — observability is a first-class output, not an afterthought",
            source: `flowchart TD
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
    Obs -.-> Eval["Evaluation: did the decomposition<br/>cover the request, and did each<br/>agent's output get used?"]`,
        },
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>Multi-agent is a <em>context-management</em> technique, not an intelligence technique. The\n" +
                "argument is that an agent optimising a narrow objective over a narrow tool set makes better local\n" +
                "decisions than one agent juggling five objectives and twenty tools. That argument is real. The\n" +
                "failure mode is that coordinating the specialists costs more than the specialisation saves.</p>\n" +
                "<p><b>The invariant:</b> <b>the only thing shared between agents must be explicit and typed.</b>\n" +
                "Shared prose means shared ambiguity — two agents will confidently interpret the same sentence\n" +
                "differently, and the conflict surfaces downstream as a synthesis bug that is very hard to trace.\n" +
                "A typed artifact with a schema, a status, and a provenance field cannot be misread.</p>\n" +
                "<p><b>Start from the single-agent version.</b> If the task is solvable by one agent with a router,\n" +
                "build that. Multi-agent is justified by genuinely different <em>permissions</em> or genuinely\n" +
                "different <em>objectives</em> — not by wanting it to look impressive, and not because the single\n" +
"agent's tool list felt long.</p>",
        },
        {
            kind: "card",
            title: "🕸️ Choosing a topology",
            html:
                "<p>Follow the decision points. The dashed lines are the failure modes, and they are the reason\n" +
                "multi-agent projects get rolled back: <b>swarm topologies have no termination guarantee and no\n" +
"error attribution</b>, so they are a research shape, not a production shape.</p>",
        },
        {
            kind: "diagram",
            caption: "Start at supervisor; fan out when subtasks are independent, pipeline when strictly ordered, and treat swarm as research until you can detect its failures",
            source: `flowchart TD
    START["What is the shape<br/>of the work?"] --> D{"Do the subtasks<br/>depend on each other?"}
    D -->|"independent"| PAR["Parallel fan-out<br/>N specialists, one synthesis<br/>failure is isolated,<br/>cost is N times"]
    D -->|"strictly ordered"| SEQ["Pipeline<br/>research then write then review<br/>each stage validates<br/>the previous output"]
    D -->|"needs delegation<br/>by judgement"| SUP["Supervisor, the default<br/>a model routes and reviews<br/>clear ownership, bounded depth"]
    SUP --> SWARM{"Do you have an eval<br/>that can detect a bad swarm?"}
    SWARM -->|"no"| SUP
    SWARM -->|"yes"| SW["Swarm, handoff, or debate<br/>no fixed topology<br/>agents route each other.<br/>No termination guarantee,<br/>cost grows superlinearly"]
    PAR -.->|"good"| DEB["Debate or best-of-N<br/>when a single judgement call<br/>is the whole task"]
    SEQ -.->|"good"| HITL["Human approval between<br/>stages, for irreversible work"]`,
        },
        {
            kind: "card",
            title: "🔁 One supervisor request, as a sequence",
            html:
                "<p>Notice the two review steps. The supervisor checks the deliverable before accepting it, and\n" +
                "that check is the entire difference between a system that self-corrects and one that accumulates\n" +
                "plausible-looking wrong work until synthesis produces a confident mess. Also note the depth cap on\n" +
"the left — without it, delegation can recurse indefinitely.</p>",
        },
        {
            kind: "diagram",
            caption: "Validation after each specialist, a critique round before acceptance, and a hard depth cap — without those three the coordinator just amplifies errors",
            source: `sequenceDiagram
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
    S-->>U: answer, with the provenance chain attached`,
        },
        {
            kind: "card",
            title: "🧪 Worked example: same task, two architectures",
            html:
                "<p>Task: <em>\"Read these 12 incident reports, find the common cause, and draft a status update.\"</em></p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Step</th><th>Single agent</th><th>Supervisor with 2 specialists</th></tr>\n" +
                "<tr><td>Context</td><td>12 reports at full fidelity, ~40k tokens, plus instructions</td><td>researcher sees the reports; writer sees 8 findings at ~3k tokens</td></tr>\n" +
                "<tr><td>Attention</td><td>the common cause is one pattern across 12 documents — exactly the needle-in-haystack case that degrades</td><td>the cross-document comparison is the researcher's only job, at full attention</td></tr>\n" +
                "<tr><td>Model calls</td><td>3</td><td>5</td></tr>\n" +
                "<tr><td>Cost</td><td>1&times;</td><td>roughly 1.6&times; — more calls, but each with a much smaller context</td></tr>\n" +
                "<tr><td>Wall-clock</td><td>sequential</td><td>research and drafting cannot overlap here, so it is slower</td></tr>\n" +
                "<tr><td>Attribution when it fails</td><td>\"the model got it wrong\" — one black box</td><td>\"the researcher found 8 causes, the writer picked the wrong one\" — a specific fix</td></tr>\n" +
                "</table>\n" +
                "<p>The honest summary: the multi-agent version is <b>more expensive, slower, and better</b> — and\n" +
                "the last column is why teams keep it despite the first two. When the failure is \"the model got it\n" +
                "wrong\", you have no next move. When the failure is \"the writer picked the wrong finding\", you have\n" +
"one. That diagnosability is usually the real justification, not raw quality.</p>",
        },
        {
            kind: "card",
            title: "💻 Implementation: typed handoff",
            html:
                "<pre><code class=\"language-javascript\">const FINDING = {\n" +
                "  type: 'object',\n" +
                "  additionalProperties: false,\n" +
                "  required: ['claim', 'evidence', 'source_ids', 'confidence'],\n" +
                "  properties: {\n" +
                "    claim:     { type: 'string' },\n" +
                "    evidence:  { type: 'string', description: 'the exact sentence supporting the claim' },\n" +
                "    source_ids: { type: 'array', items: { type: 'string' },\n" +
                "                  description: 'ids of the reports this came from. never empty' },\n" +
                "    confidence: { type: 'number', minimum: 0, maximum: 1 },\n" +
                "  },\n" +
                "};\n" +
                "\n" +
                "// 1. validate on the boundary. a specialist returning prose instead of a\n" +
                "//    finding is a normal failure and must not reach the synthesis step\n" +
                "const raw = await researchAgent.run(subtask, { outputSchema: FINDING, maxSteps: 6 });\n" +
                "const findings = validate(raw, FINDING);\n" +
                "if (!findings.length) return askResearcherAgain(subtask, 'returned no valid findings');\n" +
                "\n" +
                "// 2. attach provenance automatically. never trust a subagent to cite correctly;\n" +
                "//    resolve the ids yourself and reject anything you cannot resolve\n" +
                "const resolved = findings.map(f =&gt; ({ ...f, sources: resolveIds(f.source_ids) }));\n" +
                "const unresolved = resolved.filter(f =&gt; !f.sources.length);\n" +
                "if (unresolved.length) throw new Error('unresolvable provenance: ' + unresolved.length);\n" +
                "\n" +
                "// 3. a depth cap, so delegation cannot recurse\n" +
                "if (depth &gt;= MAX_DEPTH) return finishLocally(subtask);</code></pre>\n" +
                "<p><strong>Line notes.</strong> Line 1 is the invariant made mechanical: the schema is what makes\n" +
                "\"the only thing shared between agents is explicit\" true in practice, and rejecting a malformed\n" +
                "subagent output is a normal control-flow path rather than an exception. Line 2 is the security\n" +
                "point — a subagent that cites <code>report-99</code> when only twelve reports exist is either a\n" +
                "hallucination or an injection attempt, and only the parent can tell. Line 3 is the termination\n" +
"guarantee that swarm topologies lack entirely.</p>",
        },
        {
            kind: "table",
            title: "💰 Cost and latency",
            headers: ["Quantity","Rule","Note"],
            rows: [
                ["Model calls","roughly proportional to the number of specialists plus coordination","a 3-agent system is commonly 2&ndash;4&times; a single agent"],
                ["Token growth","specialists get small contexts, which is the point","the win is attention quality, not token count"],
                ["Coordination overhead","one supervisor call per subtask issued and per result accepted","often the largest single line item"],
                ["Wall-clock, fan-out","the slowest specialist, not the sum","the only topology that beats a single agent on latency"],
                ["Wall-clock, supervisor","the sum, because delegation is serial","slower than one agent, and that is usually accepted"],
                ["Error blast radius","one specialist failing should fail only its subtask","requires per-subtask isolation and a fallback"],
                ["Biggest cost lever","dropping coordination validation","do not — that is where the silent corruption lives"],
            ],
        },
        {
            kind: "card",
            title: "🚫 When NOT to go multi-agent",
            html:
                "<ul>\n" +
                "<li><strong>The single agent works.</strong> If a router plus a dozen tools gets you there, stop.\n" +
                "This is the correct answer far more often than the architecture diagrams suggest.</li>\n" +
                "<li><strong>The subtasks are independent and identical.</strong> That is a parallel fan-out of the\n" +
                "<em>same</em> prompt, which is a batch job with <code>Promise.all</code>, not a multi-agent system.</li>\n" +
                "<li><strong>You cannot trace it.</strong> If you cannot replay a full multi-agent run, you cannot\n" +
                "operate it. Build the observability first, then the topology.</li>\n" +
                "<li><strong>Latency budget under a few seconds.</strong> Supervisor-mediated coordination is\n" +
                "serial, and the extra model calls are usually additive.</li>\n" +
                "<li><strong>No eval that can detect a bad decomposition.</strong> A swarm without an eval is a\n" +
                "random number generator with a bill attached.</li>\n" +
                "<li><strong>Nobody will own it.</strong> Multi-agent systems are among the hardest things to\n" +
                "debug; they need a team, not a side project.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Free-form handoffs.</strong> Passing a paragraph between agents creates silent\n" +
                "divergence; pass a validated object.</li>\n" +
                "<li><strong>Unbounded delegation depth.</strong> Agents delegating to agents is how you get a\n" +
                "a $5,000 run. Cap it and make the cap a parameter you can lower.</li>\n" +
                "<li><strong>No provenance.</strong> If a claim cannot be traced to a source, the system is\n" +
                "generating, not synthesising.</li>\n" +
                "<li><strong>Reviewers that always approve.</strong> A critic that rubber-stamps is pure latency.\n" +
                "Measure how often it rejects; near zero means the rubric is not doing work.</li>\n" +
                "<li><strong>Shared mutable state between concurrent agents.</strong> Two agents writing the same\n" +
                "artifact produce a result that depends on scheduling. Give each its own workspace and merge\n" +
                "explicitly.</li>\n" +
                "<li><strong>Recursion with no global step budget.</strong> A per-agent cap is not a system cap.\n" +
                "Keep one counter for the whole run.</li>\n" +
                "<li><strong>Specialists with overlapping mandates.</strong> Two agents responsible for \"quality\"\n" +
                "will each assume the other handled it.</li>\n" +
                "<li><strong>Identity and permissions blur.</strong> If a research agent's output becomes a writer\n" +
                "agent's input, its read-only constraints no longer mean anything. Scope, don't trust.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "What is the actual benefit of multi-agent over a single good agent?",
                    a:
"<p>Three, in descending order of how often they are real. Better context hygiene: each specialist gets a small, focused context, which is the mechanism that actually works. Better permissions: read-only research and sandboxed writing are genuinely different trust levels. And diagnosability: when a system fails, multi-agent tells you <em>which stage</em> failed. The claimed benefit of \"collective intelligence\" is not well supported — the model quality is the same, and coordination costs extra calls.</p>",
                },
                {
                    q: "How do you decompose a request across agents?",
                    a:
"<p>By deliverable, not by document. \"Each agent reads some of the corpus\" balances load but loses the cross-document comparison that was the point. \"One agent extracts facts, one drafts, one critiques\" produces a checkable interface at each step. Every subtask needs an explicit output schema and an explicit done condition, and the parent validates both. If you cannot state what a specialist returns in one sentence, the split is wrong.</p>",
                },
                {
                    q: "How do you debug a system where five agents are talking?",
                    a:
"<p>Full replay, which is a hard prerequisite. Log every prompt, every response, every structured handoff, tool calls with arguments, and token counts, keyed by a run id. Then read the run as a tree rather than a transcript: the first node whose output was malformed or unsupported is where the failure actually is, and everything downstream is a symptom. Sampling 2% of production runs into a searchable store is what makes this a five-minute job instead of a five-day one.</p>",
                },
                {
                    q: "How do you prevent runaway cost?",
                    a:
"<p>Four budgets, all enforced by the orchestrator rather than the agent: a global step counter for the whole run, a per-agent step cap, a per-run spend cap, and a wall-clock deadline. Check the spend before dispatching, not after. Add a depth cap for delegation and a circuit breaker per downstream tool. Then alert on the rate of hitting each cap, because a cap that is silently hit constantly is a design signal, not a safety mechanism working.</p>",
                },
                {
                    q: "When is a swarm or debate topology the right answer?",
                    a:
"<p>When a single judgement call is the entire task and you have no reliable way to know when you are right — grading, ambiguous classification, open-ended writing where multiple independent attempts surface different errors. Debate helps when the failure mode is confident-but-wrong, because a second agent that disagrees is a signal. It is the wrong answer when you need determinism, a termination guarantee, or a latency bound, because swarm topologies have neither of the first two and reliably lack the third.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🏭 In production",
            html:
                "<ul>\n" +
                "<li><strong>Ship the single-agent version first, always.</strong> It is the fallback, the\n" +
                "baseline for evals, and often the final answer.</li>\n" +
                "<li><strong>Specialists start with fewer tools than you want to give them.</strong> Earn the\n" +
                "scope, like any other capability.</li>\n" +
                "<li><strong>Every handoff is a typed, versioned schema.</strong> Changing a handoff shape is a\n" +
                "breaking change to an internal API and should be reviewed like one.</li>\n" +
                "<li><strong>Concurrency with isolated workspaces.</strong> Parallel agents get separate\n" +
                "workspaces and an explicit merge, never shared mutable state.</li>\n" +
                "<li><strong>Track two dashboards.</strong> Cost and latency per topology, and per-stage failure\n" +
                "and rejection rates — the second is what tells you whether the decomposition is still\n" +
                "appropriate.</li>\n" +
"</ul>",
        },
    ],
});
