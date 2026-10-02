// src/content/ai-tool-calling.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-tool-calling",
    title: "Tool Calling",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>Tool calling is a structured-output protocol wearing a function-calling costume. You send the\n" +
                "model a schema describing what it may request; the model replies with a name and a JSON object\n" +
                "matching that schema. <b>Your application</b> executes it — the model never does — and appends the\n" +
                "result back into the conversation. It is a request/response loop over JSON, and every question\n" +
                "about its reliability is really a question about JSON validity and about who is allowed to run\n" +
                "what.</p>\n" +
                "<p><b>The invariant:</b> <b>a tool call is a request, not an action.</b> The model proposes; your\n" +
                "code disposes. Argument validation, permission checks, and side effects all live on your side of\n" +
                "the boundary, and any design where the model's output reaches the database without passing\n" +
                "through your validation is broken regardless of how good the prompt is.</p>\n" +
                "<p><b>Strict mode is the default you want.</b> When the provider supports schema-constrained\n" +
                "decoding, the model samples only from valid JSON structures, so malformed arguments essentially\n" +
                "disappear. It costs a little of the model's flexibility — enum constraints can fight a genuine\n" +
"edge case — but the reliability gain is far larger than the flexibility loss.</p>",
        },
        {
            kind: "card",
            title: "🔁 The round trip",
            html:
                "<p>Note that steps 1 to 3 are your code, not the model's, and that the model is called again with\n" +
                "the tool result appended. The dashed arrow is optional but important: telling the model that\n" +
                "<code>search_orders</code> returned nothing, and that a different identifier exists, is what lets\n" +
"it self-correct instead of retrying the same call forever.</p>",
        },
        {
            kind: "diagram",
            caption: "The model proposes, your code disposes — schema validation and authorisation both sit on your side of the boundary",
            source: `sequenceDiagram
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
    APP-->>U: shipped, arriving tomorrow`,
        },
        {
            kind: "card",
            title: "🧩 What a tool schema actually constrains",
            html:
                "<p>Read it as a contract, not a prompt. <code>strict</code> plus explicit\n" +
                "<code>additionalProperties: false</code> and every field in <code>required</code> is what makes\n" +
                "constrained decoding reliable. Descriptions are not decoration — they are the only channel through\n" +
                "which the model learns when <em>not</em> to call a tool, and a tool with a vague description gets\n" +
"called constantly.</p>",
        },
        {
            kind: "diagram",
            caption: "The tool signature, the domain type it validates into, and the result envelope — the error path is part of the return type, not an exception",
            source: `classDiagram
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
    ToolResult ..> GetOrderInput : ok false returns only error_code`,
        },
        {
            kind: "card",
            title: "💻 Implementation: tools that fail safely",
            html:
                "<pre><code class=\"language-javascript\">const getOrder = {\n" +
                "  name: 'get_order',\n" +
                "  description:\n" +
                "    'Look up a single order by its exact order id. Use only when the user ' +\n" +
                "    'supplies a specific id. For a general question about recent orders, ' +\n" +
                "    'use list_orders instead.',\n" +
                "  strict: true,\n" +
                "  parameters: {\n" +
                "    type: 'object',\n" +
                "    additionalProperties: false,\n" +
                "    required: ['order_id'],\n" +
                "    properties: {\n" +
                "      order_id: { type: 'string', pattern: '^ORD-[0-9]{6}$', description: 'Format ORD-000000' },\n" +
                "      include_events: { type: 'boolean', default: false },\n" +
                "    },\n" +
                "  },\n" +
                "  async execute({ order_id }, { userId }) {                 // 1. never trust the id alone.\n" +
                "    //    the id is user-supplied text that passed through a model. authorise it\n" +
                "    //    against the PRINCIPLE, not against anything the model asserted\n" +
                "    const row = await db.orders.findByIdAndOwner(order_id, userId);\n" +
                "    if (!row) return { ok: false, error_code: 'NOT_FOUND_OR_FORBIDDEN' };\n" +
                "    // 2. one error code for both cases. distinguishing them tells an attacker\n" +
                "    //    which order ids exist\n" +
                "    return { ok: true, order: toOrderDTO(row) };\n" +
                "  },\n" +
                "};</code></pre>\n" +
                "<p><strong>Line notes.</strong> The <code>description</code> is doing the heavy lifting: the\n" +
                "\"only when the user supplies a specific id\" clause is what stops the model reaching for this tool\n" +
                "on a vague question, and tool descriptions are the highest-leverage prompt text in the whole\n" +
                "system. The <code>pattern</code> on <code>order_id</code> catches typos before they reach your\n" +
                "database. Line 1 is the security boundary, and line 2 is the detail that gets missed: returning\n" +
                "<code>NOT_FOUND</code> and <code>FORBIDDEN</code> separately turns your tool into an order-id\n" +
"enumeration oracle.</p>",
        },
        {
            kind: "table",
            title: "⚙️ Patterns",
            headers: ["Pattern","Shape","Why it matters"],
            rows: [
                ["Single call","one tool call, one result, one more generation","the simplest loop; use it unless the task genuinely needs more"],
                ["Parallel calls","several independent tool calls in one turn, executed with <code>Promise.all</code>","cuts wall-clock from the sum to the max"],
                ["Sequential / dependent","one call per turn because the next argument depends on the last result","unavoidable, and the main driver of agent latency"],
                ["Forced tool choice","a single tool with <code>tool_choice: required</code>","guarantees grounding for extraction tasks"],
                ["Tool result truncation","cap tool output and summarise large payloads","the main lever on context growth and cost"],
                ["Error as observation","return a structured error string to the model","lets it self-correct instead of ending the run"],
                ["Compaction / handoff","summarise the transcript into a fresh one at a token threshold","keeps long runs inside the window"],
                ["Human approval","pause before a write, a payment, or an external send","the only real control on irreversible effects"],
            ],
        },
        {
            kind: "card",
            title: "🧪 Worked example: parallel versus sequential",
            html:
                "<p>Prompt: <em>\"What is the status of ORD-004471 and ORD-004472, and which is later?\"</em></p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Approach</th><th>Model calls</th><th>Tool calls</th><th>Wall-clock, 120 ms each</th></tr>\n" +
                "<tr><td>Sequential, one per turn</td><td>3</td><td>2</td><td>~600 ms (120 + generation, twice over)</td></tr>\n" +
                "<tr><td>Parallel, both in one turn</td><td>2</td><td>2, concurrent</td><td>~300 ms</td></tr>\n" +
                "<tr><td>One batched tool, <code>get_orders(ids[])</code></td><td>2</td><td>1</td><td>~250 ms</td></tr>\n" +
                "</table>\n" +
                "<p>The comparison is only valid when the calls are genuinely independent, and that is the trap:\n" +
                "<b>if the model must see order A's status before choosing which tool to call for order B, they are\n" +
                "not independent.</b> The reliable way to get parallelism is to give the model a tool that accepts\n" +
                "a list, rather than hoping it emits multiple calls — and to execute whatever calls it does emit\n" +
"with <code>Promise.allSettled</code> so one failure does not discard the successes.</p>",
        },
        {
            kind: "table",
            title: "💰 Cost and latency",
            headers: ["Quantity","Rule","Note"],
            rows: [
                ["Schema tokens","each tool schema is resent on every call","a 40-tool schema is thousands of tokens per turn, every turn"],
                ["Tool-definition caching","many providers cache a stable prefix of system + tools","keep the schema byte-identical across turns or you lose the cache"],
                ["Generation per turn","the model may emit prose alongside the call","prompt it to emit only the call when you are parsing the output"],
                ["Tool latency","added to wall-clock per call, and multiplied by turns if sequential","fan out independent calls"],
                ["Result tokens","tool output is billed as input tokens on the next turn","truncate at the boundary; this is the most common silent cost"],
                ["Error rate","each retry costs a full extra turn","strict schemas and validation are cheaper than retries"],
            ],
        },
        {
            kind: "card",
            title: "🚫 When NOT to use tool calling",
            html:
                "<ul>\n" +
                "<li><strong>Output is already JSON.</strong> Structured output or a response format constraint is\n" +
                "the right tool — there is no round trip and no result to feed back.</li>\n" +
                "<li><strong>One tool that takes a list.</strong> A single <code>search(query, filters)</code> is\n" +
                "better than five narrow tools, and it is far cheaper in schema tokens.</li>\n" +
                "<li><strong>The \"tool\" cannot be validated.</strong> If the arguments cannot be checked against a\n" +
                "schema, a parser, and an authorisation check, do not expose it to a model.</li>\n" +
                "<li><strong>It is a read the database can do faster.</strong> Model-in-the-loop for a single row\n" +
                "lookup adds hundreds of milliseconds and a failure mode to save nothing.</li>\n" +
                "<li><strong>The task is one well-specified transformation.</strong> \"Extract the invoice number\"\n" +
                "is a prompt with a schema, not a tool call.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Trusting the id.</strong> Model-produced identifiers are user input until you check\n" +
                "them against the authenticated principal. This is the most common real-world agent breach.</li>\n" +
                "<li><strong>Error codes that leak.</strong> Distinguishing \"not found\" from \"not yours\" turns any\n" +
                "tool into an enumeration oracle for ids in another tenant's space.</li>\n" +
                "<li><strong>Retrying a non-idempotent tool after a timeout.</strong> The call may have succeeded.\n" +
                "Use an idempotency key and treat a timeout as \"unknown\", not \"failed\".</li>\n" +
                "<li><strong>Streaming and parsing.</strong> Arguments arrive across chunks; parse after\n" +
                "completion or use the provider's partial-argument stream, and never buffer into a\n" +
                "<code>Promise.all</code> that leaks on abort.</li>\n" +
                "<li><strong>A tool that dumps 10,000 rows.</strong> It will silently consume the window and bury\n" +
                "the instructions. Summarise at the tool boundary.</li>\n" +
                "<li><strong>Vague descriptions.</strong> The model calls the nearest-named tool regardless of\n" +
                "intent. Write descriptions that say when <em>not</em> to call.</li>\n" +
                "<li><strong>Schema instability killing the prefix cache.</strong> Reordering tool definitions or\n" +
                "changing a description on each request invalidates the provider's prompt cache and quietly\n" +
                "doubles input cost.</li>\n" +
                "<li><strong>No dry-run for destructive tools.</strong> Return a plan and a diff, have it\n" +
                "approved, then apply. One-shot delete tools do not survive their first real invocation.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Is tool calling just prompting?",
                    a:
"<p>It is prompting plus a parser plus constrained decoding. The model never runs the tool; it emits a name and a JSON object, and your code validates and executes it. What the model API adds over plain prompting is (1) a schema that can be enforced during decoding, so arguments are usually valid by construction, and (2) a structured channel that is easy to detect programmatically. Everything else — validation, authorisation, idempotency, timeouts — is ordinary application engineering that a prompt cannot do for you.</p>",
                },
                {
                    q: "How do you make tool calls safe?",
                    a:
"<p>Treat model output as hostile input. Validate against the schema at the boundary, then validate semantically: does this order belong to this user, is this amount in range, is this field editable in this state. Authorise against the authenticated principal rather than anything in the conversation. Run destructive tools as plan-then-apply. Give every tool a timeout, an idempotency key, and a retry policy that knows which side effects are safe to repeat. And return a single error code for not-found and not-permitted so the tool is not an enumeration oracle.</p>",
                },
                {
                    q: "Parallel or sequential tool calls — how do you choose?",
                    a:
"<p>Parallel when the model can specify all the calls without seeing results, because then they are independent. Sequential when an argument or a choice depends on a prior result, which is the common case in real investigations. In practice the reliable design is to give the model one tool that accepts a list of arguments, because that moves the decision into a single call rather than relying on the model to emit several calls in one turn. Execute with <code>allSettled</code> so a single failure does not discard the successful results.</p>",
                },
                {
                    q: "How many tools should you expose?",
                    a:
"<p>Fewer than feels natural. Selection accuracy degrades measurably as the tool set grows, and the cost shows up twice: a wrong tool gets called, and every tool definition is billed on every single turn. Consolidate tools that differ only by arguments into one tool with a filter parameter, and narrow the exposed set once the trajectory is known — a few tools for the first turn, a precise set afterwards. Ten well-described tools beat forty overlapping ones.</p>",
                },
                {
                    q: "What does a good tool description look like?",
                    a:
"<p>It says what the tool does, when to use it, when <em>not</em> to use it, what each argument means including its format, and what it returns. The \"when not to use</em>\" clause is the one that gets left out and it is the one that matters most: it is how you tell the model that a general question about orders should use a listing tool rather than the single-order lookup. Also include the error semantics, so the model knows an empty result is data and not a failure.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🏭 In production",
            html:
                "<ul>\n" +
                "<li><strong>Keep tool schemas byte-stable.</strong> It is the precondition for provider prompt\n" +
                "caching, and it makes schema diffs reviewable in code review rather than invisible at runtime.</li>\n" +
                "<li><strong>Version tools as an API.</strong> A tool is a public contract with a model as its\n" +
                "client, which means deprecation, changelogs, and a compatibility window.</li>\n" +
                "<li><strong>Log every call with its arguments and result class.</strong> Not the secrets, but the\n" +
                "shape — you need this to see which tools are called, how often they fail, and what they cost.</li>\n" +
                "<li><strong>One registry, typed.</strong> Generate the schema from the implementation, so the\n" +
                "description the model reads and the function the runtime calls cannot drift apart.</li>\n" +
                "<li><strong>Read-only by default.</strong> New tools start with no write scope and earn it, which\n" +
                "turns \"should I expose this?\" into a narrower and safer question.</li>\n" +
"</ul>",
        },
    ],
});
