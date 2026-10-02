// src/content/ai-orchestration.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-orchestration",
    title: "Agent Orchestration",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>Orchestration is the control plane around model calls: what runs, in what order, with what\n" +
                "retries, timeouts, and budgets. It is the layer where the ordinary distributed-systems concerns\n" +
                "reappear, and the reason orchestration frameworks exist at all — because getting them right is\n" +
                "more work than calling a model.</p>\n" +
                "<p><b>The invariant:</b> <b>every outbound call must be bounded on three axes — time, attempts,\n" +
                "and spend — and the bound must be enforced by the orchestrator, not requested by the model.</b>\n" +
                "An unbounded call inside a framework is indistinguishable from a hang, and in a fan-out it\n" +
                "multiplies. This single rule covers timeouts, retry budgets, circuit breakers, and cost caps.</p>\n" +
                "<p><b>Retries are the subtle part.</b> Retry only what is idempotent, and never retry a timeout\n" +
                "blindly on a write: a timeout means \"unknown\", and retrying an unknown write is how you get\n" +
                "double charges and duplicate rows. Retries need jitter, or a thousand concurrent callers retry in\n" +
"lockstep and re-create the outage they are recovering from.</p>",
        },
        {
            kind: "card",
            title: "🧭 The four patterns",
            html:
                "<p>Start at the top and go down. The left column is what you reach for by default; everything else\n" +
                "is a consequence of a specific constraint — dynamic fan-out, shared state across workers, or\n" +
"unbounded iteration.</p>",
        },
        {
            kind: "diagram",
            caption: "Sequential by default, parallel when items are independent, orchestrator-workers when subtasks are dynamic, and swarm only with an eval that can detect its failures",
            source: `flowchart TD
    REQ["Request arrives"] --> ROUTE{"Which pattern<br/>does the work need?"}
    ROUTE -->|"one known sequence"| SEQ["Sequential, a chain<br/>prompt, then tools, then summarise<br/>cheapest, easiest to debug"]
    ROUTE -->|"independent work items"| PAR["Parallelization<br/>fan out N, join at the end<br/>adds a reducer, converts<br/>max latency into sum latency"]
    ROUTE -->|"subtasks that need<br/>to be created at runtime"| OS["Orchestrator-workers<br/>a planner produces the subtask list,<br/>workers execute it,<br/>shared state between steps"]
    ROUTE -->|"state that cannot fit<br/>in one context"| SW["Swarm, handoff<br/>agents route each other.<br/>No fixed topology, no<br/>termination guarantee"]
    SEQ --> JOIN["Reduce, validate,<br/>and assemble one answer"]
    PAR --> JOIN
    OS --> JOIN`,
        },
        {
            kind: "card",
            title: "🔁 Bounded retries, as a state machine",
            html:
                "<p>Every transition that can loop is guarded by an explicit budget, and the three\n" +
                "<code>Exhausted</code> states are terminal by design — they are what stops a partial outage from\n" +
                "becoming an unbounded spend. The distinction between <code>Failed</code> and\n" +
                "<code>Exhausted</code> is worth stating in an interview: a hard failure is a bug or a bad\n" +
                "request and should surface immediately, while exhaustion is a degradation that should degrade\n" +
"rather than fail.</p>",
        },
        {
            kind: "diagram",
            caption: "Only 5xx and transport errors are retried; 4xx is a bug or a bad request, and exhaustion degrades rather than failing the whole request",
            source: `stateDiagram-v2
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
    Failed --> [*]`,
        },
        {
            kind: "card",
            title: "💻 Implementation: the pieces teams get wrong",
            html:
                "<pre><code class=\"language-javascript\">async function runNode(node, ctx) {\n" +
                "  const policy = {\n" +
                "    timeoutMs: node.timeoutMs ?? 30_000,\n" +
                "    maxAttempts: node.maxAttempts ?? 3,\n" +
                "    maxSpendUsd: node.maxSpendUsd ?? 0.25,\n" +
                "    idempotent: node.idempotent ?? false,   // 1. an explicit property, not a guess.\n" +
                "  };                                       //    without it we can never safely retry\n" +
                "\n" +
                "  for (let attempt = 1; attempt &lt;= policy.maxAttempts; attempt++) {\n" +
                "    ctx.checkBudget(policy.maxSpendUsd);   // 2. check BEFORE the side effect\n" +
                "    try {\n" +
                "      return await withTimeout(\n" +
                "        () =&gt; node.run(ctx),\n" +
                "        policy.timeoutMs,\n" +
                "        { idempotencyKey: ctx.runId + ':' + node.id },  // 3. a key makes a write retryable\n" +
                "      );\n" +
                "    } catch (err) {\n" +
                "      // 4. 4xx is never retried. it will fail identically at 4, 7, or 40 attempts,\n" +
                "      //    and each one is real money spent to learn nothing\n" +
                "      if (err.status &amp;&amp; err.status &lt; 500) throw err;\n" +
                "      if (!policy.idempotent &amp;&amp; err.isTimeout) throw err;   // 5. a timed-out write\n" +
                "      //    is UNKNOWN, not failed. retrying it is how you double-charge someone\n" +
                "      if (attempt === policy.maxAttempts) break;\n" +
                "      const backoff = Math.min(2 ** attempt * 250, 8_000);\n" +
                "      await sleep(backoff + Math.random() * 250);   // 6. jitter, or every caller in the\n" +
                "                                                     //    fleet retries in lockstep\n" +
                "    }\n" +
                "  }\n" +
                "  // 7. exhaustion degrades when it can, and only then fails\n" +
                "  if (node.optional) return { skipped: node.id, reason: 'budget exhausted' };\n" +
                "  throw new NodeExhausted(node.id);\n" +
                "}</code></pre>\n" +
                "<p><strong>Line notes.</strong> Line 5 is the line that prevents double charges, and it is the\n" +
                "one most often missing: a timeout on a non-idempotent call must be treated as an unknown outcome\n" +
                "and escalated, not retried. Line 6 matters at scale — without jitter, a dependency's brief\n" +
                "outage produces a synchronised retry storm that is a second outage. Line 7 is the difference\n" +
                "between a resilient system and a brittle one: optional steps that exhaust should be skipped\n" +
"with a reason, not fail the request.</p>",
        },
        {
            kind: "table",
            title: "🧰 Frameworks, and what to actually take from them",
            headers: ["Framework","Model","Take from it","Skip if"],
            rows: [
                ["LangGraph","an explicit state graph with typed state, cycles, and checkpointing","the state-machine-plus-checkpoint model — durable resume is genuinely hard to retrofit","you want a few dozen lines of straight-line code"],
                ["Temporal","durable workflow execution, retries and timers as first-class","the reliability model: activities, idempotency, replay","you are prototyping"],
                ["CrewAI","role-based agents with defined goals and backstories","the vocabulary of roles and delegation","you need fine-grained control of state transitions"],
                ["AutoGen","conversational agents that converse to solve a task","the multi-agent conversation loop","you need deterministic control flow"],
                ["Semantic Kernel","plugins, planners, and process graphs, with first-class .NET support","the plugin abstraction and its versioning story","you are not on .NET"],
                ["Plain code","functions, a queue, and a state column","nothing","never — this is the right default for most systems"],
            ],
        },
        {
            kind: "table",
            title: "💰 Cost and latency",
            headers: ["Quantity","Rule","Note"],
            rows: [
                ["Sequential chain","latency is the <b>sum</b> of node latencies","add nodes only when a node's output is genuinely needed"],
                ["Parallel fan-out","latency is the <b>max</b>, cost is the <b>sum</b>","the main tool for beating a latency budget"],
                ["Partial failure","retry budget multiplied by fan-out width","a 5-wide fan-out with 3 attempts is 15 calls"],
                ["Checkpointing","a state write per node boundary","usually cheap; the price you pay for durable resume"],
                ["Context handoff","large state passed between nodes is re-billed each time","pass references, not payloads, and re-fetch on demand"],
                ["Budget enforcement","one counter per run, checked before every node","not per node — per-node caps multiply"],
                ["Biggest optimisation","removing nodes, not tuning them","most orchestration latency is unnecessary steps"],
            ],
        },
        {
            kind: "card",
            title: "🚫 When NOT to use an orchestration framework",
            html:
                "<ul>\n" +
                "<li><strong>A straight-line chain of three or four steps.</strong> Async functions with a\n" +
                "<code>try</code> and a timeout are clearer, smaller, and easier to test.</li>\n" +
                "<li><strong>You cannot operate the state store.</strong> Durable workflows are wonderful until\n" +
                "you need to explain why a run is stuck in state <code>pending_review</code> from eight months ago.</li>\n" +
                "<li><strong>You need to understand it in an interview — or in an incident.</strong> Framework\n" +
                "internals add a layer between the bug and the cause.</li>\n" +
                "<li><strong>The workflow changes weekly.</strong> Rewriting a graph to match a changing process is\n" +
                "fine; migrating a persisted state machine is not.</li>\n" +
                "<li><strong>The fan-out is small and non-recurring.</strong> <code>Promise.allSettled</code> covers\n" +
                "most real cases.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Retrying 4xx.</strong> A validation error is deterministic; three retries cost 3&times;\n" +
                "and learn nothing.</li>\n" +
                "<li><strong>Retrying a timed-out write.</strong> Treat it as unknown. Reconcile by idempotency key\n" +
                "or a status query; do not blindly re-issue.</li>\n" +
                "<li><strong>No jitter.</strong> Synchronised retries turn a brief blip into a sustained outage.</li>\n" +
                "<li><strong>Per-node instead of per-run budgets.</strong> Ten nodes with a 0.10 cap is a 1.00 cap,\n" +
                "and none of them know that.</li>\n" +
                "<li><strong>No circuit breaker.</strong> When a dependency is genuinely down, failing fast and\n" +
                "returning a degraded answer beats holding every request open until it times out.</li>\n" +
                "<li><strong>Fan-out without a join policy.</strong> Deciding mid-flight whether a partial result is\n" +
                "acceptable is how you ship inconsistent answers.</li>\n" +
                "<li><strong>State stored in the prompt.</strong> A 40-node workflow whose entire state is a\n" +
                "growing transcript will blow the window and get silently truncated.</li>\n" +
                "<li><strong>Non-deterministic replay.</strong> A \"retry\" that re-runs an LLM node is not a retry,\n" +
                "it is a new run. Persist node outputs so a resume does not re-roll the dice.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Sequential vs parallel — when do you fan out?",
                    a:
"<p>Only when the work items are genuinely independent, which means each can be specified without reference to any other result. If the model must see A's answer to decide what B should be, they are sequential and no amount of concurrency helps. The practical test: can you write down all N subtasks before starting? If yes, fan out. If not, you need a planner first — which is the orchestrator-workers pattern, and it costs an extra model call. Also remember fan-out is a latency trade, not a cost trade: you convert sum-latency into max-latency and pay N&times; the tokens.</p>",
                },
                {
                    q: "How do you decide what can be retried?",
                    a:
"<p>By side-effect classification, not by hope. Idempotent GETs are always retryable. Writes are retryable only with an idempotency key, because a retry after a timeout replays a request whose outcome is unknown. Non-idempotent writes (payments, sends, anything that charges or publishes) are never retried automatically — they are reconciled with a status query. And 4xx is never retried at all, since it is deterministic. Getting this wrong is how systems double-charge customers.</p>",
                },
                {
                    q: "How do you debug a run that is taking too long?",
                    a:
"<p>Per-node timing in a trace viewer, which means instrumenting the orchestrator itself rather than the handlers. Most long runs decompose into: one slow model call, a retry loop burning its budget, a lock or a queue wait that is not a node at all, or a fan-out whose width is set by a model decision nobody capped. Durable execution makes this worse in a useful way — you can see exactly which node the run is parked on, and for how long, without needing the original process to be alive.</p>",
                },
                {
                    q: "When is a workflow engine worth it over hand-rolled code?",
                    a:
"<p>When the run must survive process death. If a step takes an hour, an agent runs for 30 turns, or a human approval can arrive tomorrow, then in-memory state is gone on the next deploy and you need durable execution with checkpointing and resume. That is a real requirement and it is worth the dependency. If the whole run is seconds long and fits in a request, hand-rolled code is smaller, clearer, and has no migration path to plan for.</p>",
                },
                {
                    q: "How do you make an agent loop resumable?",
                    a:
"<p>Checkpoint the state at every boundary, and make the loop a state machine rather than a <code>for</code> loop. After each tool call, persist the transcript, the step index, the accumulated spend, and the tool results — so a resume replays those instead of re-executing. This matters more than it looks: without persisted node outputs, resuming means re-rolling the model's dice, so you get a different run, and any side effect that already happened gets repeated. Persisting the results is what makes a resume idempotent.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🏭 In production",
            html:
                "<ul>\n" +
                "<li><strong>One budget per run, enforced centrally.</strong> The orchestrator owns the counter, so\n" +
                "no node can opt out of it.</li>\n" +
                "<li><strong>Circuit breakers on every dependency.</strong> A failing dependency should produce a\n" +
                "fast degraded answer, not a queue of held-open requests.</li>\n" +
                "<li><strong>Idempotency keys generated once, at the edge.</strong> They are what make a resumed or\n" +
                "retried run safe, and they have to survive a process restart.</li>\n" +
                "<li><strong>Emit a span per node.</strong> Latency that lives in the framework and not in your\n" +
                "traces is latency you will argue about instead of fix.</li>\n" +
                "<li><strong>Have a kill switch that stops new runs and lets in-flight ones finish.</strong> Every\n" +
                "orchestration layer needs one, tested.</li>\n" +
"</ul>",
        },
    ],
});
