// src/content/ai-agents.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-agents",
    title: "Agent Architecture",
    blocks: [
        {
            // Legacy card title: "🎬 Agent Execution".
            // The stages fired a toast on click; that is the only
            // interactivity dropped.
            kind: "pipeline",
            stages: [
                { name: "User", desc: "Input query" },
                { name: "Agent", desc: "Reasoning" },
                { name: "Choose Tool", desc: "Select action" },
                { name: "Execute", desc: "Run tool" },
                { name: "Observe", desc: "Result" },
                { name: "Reason Again", desc: "Iterate" },
                { name: "Final Answer", desc: "Response" },
            ],
        },
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>An agent is a model call inside a control loop. The model is given a goal, a set of tools, and\n" +
                "the observations so far, and it returns either a tool call or a final answer. The <em>framework</em>\n" +
                "executes the tool, appends the result, and calls the model again. That loop — not the model — is\n" +
                "the agent.</p>\n" +
                "<p><b>The invariant:</b> <b>the loop must terminate under conditions you choose, not under\n" +
                "conditions the model chooses.</b> The model has no intrinsic notion of \"enough\"; it will keep\n" +
                "proposing actions as long as the context allows. Therefore every agent needs an explicit budget\n" +
                "(max steps, max tokens, max wall-clock, max spend) and a stop condition, and the loop must check\n" +
                "the budget <em>before</em> executing a tool, not after.</p>\n" +
                "<p><b>Why agents at all.</b> The value is not \"smarter answers\" — it is <em>reaching actions a\n" +
                "single call cannot</em>: the model has to see an intermediate result before it knows what to do\n" +
                "next. That is genuine only when the next step depends on the observation. If you can write the\n" +
"sequence of steps in advance, you want a deterministic pipeline, not an agent.</p>",
        },
        {
            kind: "card",
            title: "🔄 The ReAct loop as a state machine",
            html:
                "<p>Follow the cycle. The two guarded transitions are the entire safety story: <code>BudgetExhausted</code>\n" +
                "is checked before every tool execution, and <code>Failed</code> means the loop is allowed to\n" +
                "surface an error rather than retrying forever. An agent implementation without those two\n" +
                "transitions will eventually hang or spend unbounded money, and it will do so in production\n" +
"rather than in a demo.</p>",
        },
        {
            kind: "diagram",
            caption: "Termination is a property of the loop, not the model: budget is checked before every tool, and failure is a terminal state rather than a retry loop",
            source: `stateDiagram-v2
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
    BudgetExhausted --> [*]: return the best partial answer`,
        },
        {
            kind: "card",
            title: "🧭 Agent, pipeline, or router?",
            html:
                "<p>Follow it from the top; the first \"yes\" is your answer. The most common design error is\n" +
                "answering \"agent\" to the second question without having asked the first, which is how a\n" +
"three-step classification ends up as a twelve-step agent loop.</p>",
        },
        {
            kind: "diagram",
            caption: "The first question is not \"is it hard\" but \"can I write the control flow\" — an unknown step list is still a pipeline, not an agent",
            source: `flowchart TD
    A["Can you write the control flow<br/>as code today?"] --> B["If yes, build a pipeline<br/>or a router, and stop there"]
    A --> C{"If no, does the next step<br/>depend on a runtime observation?"}
    C -->|"no, it is merely unknown<br/>in advance"| P["Still a pipeline<br/>the steps exist,<br/>you just cannot name them yet"]
    C -->|"yes"| D{"Is the branching<br/>bounded and nameable?"}
    D -->|"a small fixed set<br/>of branches"| R["Router plus handlers<br/>the cheapest<br/>agent-shaped design"]
    D -->|"free-form, discovered<br/>as it goes"| AG["Agent loop<br/>with budgets, tool schemas,<br/>and full tracing"]
    R -.->|"still not enough"| AG`,
        },
        {
            kind: "card",
            title: "🧪 Worked example: one task, three turns",
            html:
                "<p>Task: <em>\"Our refund rate doubled last week — find out why and draft a reply to the customer.\"</em></p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Turn</th><th>Model emits</th><th>Framework does</th><th>Why the next step depends on this one</th></tr>\n" +
                "<tr><td>1</td><td><code>query_orders(date_range=last_14_days, group_by=refund_reason)</code></td><td>runs it, appends 412 rows as a compact summary</td><td>which metric is used is decided by the result</td></tr>\n" +
                "<tr><td>2</td><td><code>query_orders(..., filter=sku_eq_XYZ)</code></td><td>runs it; 87% of refunds are one SKU</td><td>the SKU is only known after turn 1</td></tr>\n" +
                "<tr><td>3</td><td><code>get_product_history(sku=XYZ)</code></td><td>discovers a price change on the 3rd</td><td>the hypothesis is formed from turns 1 and 2</td></tr>\n" +
                "<tr><td>4</td><td>final text: cause plus a drafted reply</td><td>sends it, citing the order ids used</td><td>&mdash;</td></tr>\n" +
                "</table>\n" +
                "<p>Contrast with the deterministic version: the same four steps are writable as a script once you\n" +
                "know the investigation shape. The agent earns its cost only because step 2 is a\n" +
                "<span class=\"tag blue\">branching</span> decision over data the system did not have when the\n" +
                "request arrived — and only because the tool returns a compact summary, not 412 rows. A tool that\n" +
                "dumps raw records into the transcript is the most common way agent context explodes and cost goes\n" +
"quadratic.</p>",
        },
        {
            kind: "card",
            title: "💻 Implementation: the loop, with the invariants in code",
            html:
                "<pre><code class=\"language-javascript\">const MAX_STEPS = 12;\n" +
                "const MAX_SPEND_USD = 0.50;      // 1. money, not steps, is the real budget. a single\n" +
                "                                 //    frontier call can exceed a step-cost assumption\n" +
                "const transcript = [{ role: 'user', content: goal }];\n" +
                "\n" +
                "for (let step = 0; step &lt; MAX_STEPS; step++) {\n" +
                "  const res = await llm.generate({\n" +
                "    messages: [{ role: 'system', content: SYSTEM }, ...transcript],\n" +
                "    tools: toolSchemas,                 // 2. only the tools this turn is allowed to use —\n" +
                "    maxOutputTokens: 512,               //    narrow the set after the first read\n" +
                "  });\n" +
                "  transcript.push(res.message);\n" +
                "\n" +
                "  if (!res.toolCalls?.length) return finalise(transcript);   // 3. the model is done\n" +
                "\n" +
                "  // 4. check the budget BEFORE the side effect, not after\n" +
                "  if (spentUsd() &gt; MAX_SPEND_USD) return finalise(transcript, { truncated: true });\n" +
                "\n" +
                "  const results = await Promise.all(res.toolCalls.map(async call =&gt; {\n" +
                "    if (isWrite(call.name) &amp;&amp; !approved(call)) return { error: 'rejected by reviewer' };\n" +
                "    try {\n" +
                "      return { result: await tools[call.name](call.args, { timeoutMs: 8000 }) };\n" +
                "    } catch (err) {\n" +
                "      // 5. errors go BACK to the model as observations, not into a 500.\n" +
                "      //    a readable error message is what lets it choose a different approach\n" +
                "      return { error: err.code + ': ' + err.message };\n" +
                "    }\n" +
                "  }));\n" +
                "\n" +
                "  // 6. truncate tool output before it lands in the transcript, or context\n" +
                "  //    grows superlinearly and the model starts ignoring early observations\n" +
                "  transcript.push({ role: 'tool', content: JSON.stringify(summarise(results)) });\n" +
                "}</code></pre>\n" +
                "<p><strong>Line notes.</strong> Line 1 is the observation teams miss: a step limit alone does not\n" +
                "bound spend, because one step can cost a frontier call. Line 5 is the difference between a robust\n" +
                "agent and a brittle one — a tool that returns <code>NOT_FOUND: no order matching 4471</code> gives\n" +
                "the model something to branch on, whereas an exception ends the run. Line 6 is the practical\n" +
                "context-bug fix: summarising at the tool boundary, not at the end, is what keeps a 12-step run\n" +
"inside the window.</p>",
        },
        {
            kind: "table",
            title: "⚙️ Agent patterns",
            headers: ["Pattern","Shape","Use when","Cost profile"],
            rows: [
                ["ReAct","reason, act, observe, repeat","the next step genuinely depends on the last result","N model calls per task"],
                ["Plan and execute","produce a plan, then run steps, then repair on failure","the shape is predictable but the data is not","one extra planning call up front"],
                ["Router","classify, then dispatch to a fixed handler","routes exist and are stable","one cheap classification call"],
                ["Parallel fan-out","split into N independent sub-tasks, run concurrently","sub-tasks do not depend on each other","N calls, but wall-clock is one call"],
                ["Human in the loop","pause for approval at a defined boundary","irreversible or externally visible actions","adds real latency; needs a resume mechanism"],
                ["Reflection","critique the output, then revise","quality-drafted content where a second pass helps","roughly doubles generation"],
                ["Multi-agent","a supervisor delegates to specialists","genuinely different expertise or permissions","the most tokens and the most failure modes"],
            ],
        },
        {
            kind: "table",
            title: "💰 Cost and latency",
            headers: ["Quantity","Rule","Note"],
            rows: [
                ["Model calls per task","1 + number of steps","a 6-step agent is 7 calls"],
                ["Token growth","the transcript accumulates, so each call is longer than the last","context cost is quadratic in steps without truncation"],
                ["Tool latency","adds directly to wall-clock","sequential tool calls are the dominant cost for I/O-bound tools"],
                ["Wall-clock, sequential","sum of all model and tool time","fan out independent calls and it becomes the max, not the sum"],
                ["Wall-clock, streamed","time to first useful token is what the user feels","narrate progress rather than showing a spinner for 30 s"],
                ["Cost control","a per-task spend cap plus a per-tenant daily cap","plus a circuit breaker on the tool, not only on the model"],
                ["Biggest optimisation","compacting the tool output","usually a larger win than a smaller model"],
            ],
        },
        {
            kind: "card",
            title: "🚫 When NOT to build an agent",
            html:
                "<ul>\n" +
                "<li><strong>The steps are known in advance.</strong> A deterministic pipeline is faster, cheaper,\n" +
                "debuggable, and testable. Use an agent only where the branch depends on an observation you do not\n" +
                "have until runtime.</li>\n" +
                "<li><strong>It needs a single model call's worth of reasoning.</strong> \"Classify this ticket and\n" +
                "route it\" is a prompt, not a loop.</li>\n" +
                "<li><strong>Errors are cheap to avoid but expensive to recover.</strong> A loop that guesses at\n" +
                "SQL and only discovers the wrong column on turn 4 is worse than a schema-constrained call.</li>\n" +
                "<li><strong>Actions are irreversible and approval fatigue is real.</strong> Approving every\n" +
                "action trains users to click approve, which removes the control entirely.</li>\n" +
                "<li><strong>Latency budget is a second.</strong> Five sequential model calls cannot fit, and\n" +
                "parallelising an agent's steps breaks the dependencies that make it an agent.</li>\n" +
                "<li><strong>You cannot observe it.</strong> An agent you cannot replay is an incident waiting to\n" +
                "happen. Log every transcript, tool call, and argument.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>No step or spend cap.</strong> The canonical agent failure. Always cap, and always\n" +
                "check the cap before the side effect.</li>\n" +
                "<li><strong>Tool errors as exceptions.</strong> A 500 ends the run; a readable error message lets\n" +
                "the model try something else. Return errors as observations.</li>\n" +
                "<li><strong>Unbounded tool output.</strong> One query returning 10,000 rows will consume the\n" +
                "window and bury the instructions. Truncate at the tool boundary, every time.</li>\n" +
                "<li><strong>All tools on every turn.</strong> A 40-tool schema measurably degrades selection.\n" +
                "Narrow the set once the trajectory is known.</li>\n" +
                "<li><strong>Trusting arguments.</strong> The model will produce a valid-looking\n" +
                "<code>account_id</code> that does not exist, or one belonging to another customer. Validate every\n" +
                "argument server-side against the authenticated user, never against the prompt.</li>\n" +
                "<li><strong>Retrying non-idempotent tools.</strong> A payment tool that times out may have\n" +
                "succeeded. Retrying on a timeout is how you charge twice.</li>\n" +
                "<li><strong>Loops between two tools.</strong> Detect repeated\n" +
                "<code>(tool, args_hash)</code> pairs and break out — this is the classic infinite agent loop and\n" +
                "it is trivial to detect.</li>\n" +
                "<li><strong>Approval on every action.</strong> Approve by class (reads automatic, writes reviewed,\n" +
                "payments two-person) rather than per call, or reviewers will rubber-stamp.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "What makes something an agent rather than a workflow with a model in it?",
                    a:
"<p>The loop closes on an observation. In a workflow, the sequence of steps and their order are known at design time; in an agent, the next step is chosen at runtime from what the previous step returned. The practical test is whether you can write the control flow as code. If you can — a chain, a router, a parallel fan-out — build that, because it is testable, cheap, and predictable. Reach for an agent only when the branching genuinely cannot be known until the data arrives.</p>",
                },
                {
                    q: "How do you stop an agent looping forever?",
                    a:
"<p>Four independent limits, because any one of them can be the binding one. A step count, a token budget, a wall-clock deadline, and a spend cap — and the spend cap is the one people forget, because one step can be an expensive call. On top of that, detect repeated <code>(tool, hashed args)</code> pairs and break the loop, and cap the context by compacting rather than by truncating from the start, since the goal is at the beginning.</p>",
                },
                {
                    q: "How do you make agent actions safe?",
                    a:
"<p>Layer it. The tool set is the allow-list — the model can only do what you exposed. Every argument is validated server-side against the authenticated principal, never against anything the model said. Reads are automatic, writes need one approval, irreversible actions need two or a policy check. Destructive tools are run against a dry-run first and the plan is diffed. And every tool has a timeout and a retry policy that knows which side effects are idempotent.</p>",
                },
                {
                    q: "How do you test an agent?",
                    a:
"<p>Three layers. Deterministic unit tests on the tools, including the error paths, because those are the part that actually breaks. Scenario tests over recorded transcripts, asserting the agent reached the goal and used a permitted tool sequence. And a regression eval of 50&ndash;100 real tasks scored on success rate, tool-call validity, and cost. Full determinism is not achievable with a sampling model, so pin temperature and seed and assert on the properties you care about rather than on exact text.</p>",
                },
                {
                    q: "When do you need multiple agents instead of one with more tools?",
                    a:
"<p>Three signals, in order. Different <em>permissions</em> — a research agent with read-only web access and a finance agent with write access should not share a tool set. Genuinely different <em>prompts and models</em> — summarising 40 pages and extracting a schema are different jobs with different tuning. And a tool set large enough that selection accuracy degrades, which is real somewhere past a few dozen tools. Absent those, one agent with a good router is simpler, cheaper, and easier to observe than three agents with a supervisor.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🏭 In production",
            html:
                "<ul>\n" +
                "<li><strong>Replay is a hard requirement.</strong> Store the full transcript, every tool call and\n" +
                "its raw result, the model version, and the sampled parameters. Without replay you cannot debug a\n" +
                "bad run, only re-run it.</li>\n" +
                "<li><strong>Show progress, not a spinner.</strong> Users grant far more patience to an agent that\n" +
                "says \"checking the last 14 days\" than to one that says nothing for 30 seconds.</li>\n" +
                "<li><strong>Per-tenant budgets with hard stops.</strong> A runaway agent must hit a wall, and the\n" +
                "wall must be a billing decision rather than an alert nobody reads.</li>\n" +
                "<li><strong>Run agents in a sandbox with a real tool surface.</strong> Read-only credentials by\n" +
                "default, a separate network policy, and no access to the production database without an explicit\n" +
                "grant.</li>\n" +
                "<li><strong>Ship the deterministic path too.</strong> A router that handles 80% of requests\n" +
                "deterministically leaves the agent loop for the 20% where it is genuinely needed — and gives you\n" +
                "a fallback when the model is unavailable.</li>\n" +
"</ul>",
        },
    ],
});
