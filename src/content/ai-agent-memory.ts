// src/content/ai-agent-memory.ts
import { registerContent } from "./registry";

registerContent({
    id: "ai-agent-memory",
    title: "Agent Memory",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>Memory is not one thing. It is at least three stores with completely different lifetimes,\n" +
                "access patterns, and consistency requirements, and most agent failures come from using the wrong\n" +
                "one or from writing to all of them indiscriminately.</p>\n" +
                "<p><b>The invariant:</b> <b>memory must be selective, and the selectivity has to come from a\n" +
                "rule rather than from the model.</b> If the model decides what to remember, it will remember\n" +
                "whatever is salient in its context window, which is roughly the opposite of what is useful three\n" +
                "turns later. The write path should be a set of narrow, typed extractors — \"record a stated\n" +
                "preference\", \"record an entity the user referred to\" — and the read path should retrieve against\n" +
                "the <em>current</em> query rather than replaying everything.</p>\n" +
                "<p>The three tiers, and why they are not interchangeable:</p>\n" +
                "<ul>\n" +
                "<li><b>Working (short-term)</b> — the current task's scratchpad: the transcript, intermediate\n" +
                "results, the plan. Lives in the context window, is discarded with the task, and is usually the\n" +
                "only tier that needs the full fidelity.</li>\n" +
                "<li><b>Episodic</b> — what happened: past sessions, past actions, past outcomes. Queried for\n" +
                "situations like this one. This is the tier people call \"long-term memory\" and mean.</li>\n" +
                "<li><b>Semantic</b> — what is true: durable facts, preferences, entities, relationships. Queried\n" +
                "and <em>updated by key</em>, so it must be idempotent — writing the same fact twice must converge,\n" +
                "not duplicate.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "🗂️ The three tiers and the write path",
            html:
                "<p>Follow the two write paths, because they are the part people design badly. The dashed arrow is\n" +
                "the compaction step, and it is the difference between an agent that works on turn 40 and one that\n" +
                "has forgotten the goal. The solid arrow from semantic memory back into the prompt is the read\n" +
"path: a small, query-shaped selection, not the whole store.</p>",
        },
        {
            kind: "diagram",
            caption: "Working memory is rewritten to fit the window; episodic and semantic memory are written by narrow rules and read by query, never replayed wholesale",
            source: `flowchart TD
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
    W --> OUT["Response"]`,
        },
        {
            kind: "card",
            title: "🗃️ The data model",
            html:
                "<p>Keep the three tiers in separate tables with separate retention rules, not in one\n" +
                "<code>memories</code> table with a <code>type</code> column. The write semantics, the update\n" +
                "semantics, and the deletion semantics are all different, and a single table forces one compromise\n" +
"on all three.</p>",
        },
        {
            kind: "diagram",
            caption: "Sessions produce episodes; facts are keyed and owned by a subject, so writes upsert instead of appending duplicates",
            source: `erDiagram
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
    }`,
        },
        {
            kind: "card",
            title: "🧪 Worked example: a preference that must survive",
            html:
                "<p>Turn 1: <em>\"I always deploy on Fridays afternoon — please don't schedule anything after 3pm.\"</em>\n" +
                "Turn 40 (four sessions later): <em>\"Book the retro for next Thursday.\"</em></p>\n" +
                "<table class=\"complexity-table\">\n" +
                "<tr><th>Approach</th><th>What happens</th><th>Result</th></tr>\n" +
                "<tr><td>Nothing stored</td><td>turn 40 has no idea</td><td>books 16:00 on Friday, user is annoyed</td></tr>\n" +
                "<tr><td>Full transcript replayed</td><td>40 sessions of text in the window</td><td>the preference is buried and out of budget</td></tr>\n" +
                "<tr><td>Everything embedded as episodic</td><td>the preference is retrieved by similarity only when the query is about Friday afternoons</td><td>does not fire here — no lexical or semantic hook</td></tr>\n" +
                "<tr><td><b>Typed semantic fact</b></td><td>extractor writes <code>FACT(user, scheduling.blackout, \"Fri 15:00-23:59\")</code> at turn 1; a scheduler-relevant filter injects it at turn 40</td><td><b>the booking is rejected or moved, and the agent says why</b></td></tr>\n" +
                "</table>\n" +
                "<p>The lesson is that <b>retrieval quality is not the whole problem — a fact nothing\n" +
                "retrieves is as good as no fact</b>. Durable constraints have to be injected by a rule tied to the\n" +
                "operation being performed, not left to similarity search against whatever the user happens to say\n" +
                "next. Retrieval-by-similarity is the right tool for \"have we been here before\", and the wrong tool\n" +
"for a standing rule.</p>",
        },
        {
            kind: "card",
            title: "💻 Implementation: writes that converge",
            html:
                "<pre><code class=\"language-javascript\">// 1. an explicit, narrow extractor. the model may SUGGEST\n" +
                "//    candidates, but a deterministic rule decides what is written\n" +
                "const candidates = await model.extractFacts(transcript, {\n" +
                "  schema: [{ subject, key, value, confidence, validUntil }],\n" +
                "});\n" +
                "\n" +
                "for (const f of candidates.filter(c =&gt; c.confidence &gt; 0.9)) {\n" +
                "  // 2. key on (subject, key). re-extracting the same fact overwrites it, so a\n" +
                "  //    replayed transcript cannot duplicate rows. append-only memory is the\n" +
                "  //    single biggest source of self-contradiction\n" +
                "  await db.fact.upsert({\n" +
                "    where: { subjectId: f.subject, key: f.key },\n" +
                "    set:  { value: f.value, validFrom: now(), expiresAt: f.validUntil },\n" +
                "  });\n" +
                "}\n" +
                "\n" +
                "// 3. read by operation, not by similarity. when you are about to schedule\n" +
                "//    something, you need constraints, not similar past sessions\n" +
                "const constraints = await db.fact.findMany({\n" +
                "  where: { subjectId: userId, key: 'scheduling.blackout', expiresAt: { gt: now() } },\n" +
                "});\n" +
                "\n" +
                "// 4. episodic retrieval is similarity, and it is capped\n" +
                "const episodes = await vectorStore.query({\n" +
                "  vector: embed(currentTurn), topK: 5, minScore: 0.7, tenant: userId,\n" +
                "});</code></pre>\n" +
                "<p><strong>Line notes.</strong> Line 2 is the whole reason semantic memory works: a keyed upsert\n" +
                "makes writes idempotent, so replaying a transcript, re-running a job, or handling the same fact in\n" +
                "two sessions all converge to one row. Line 3 is the operational lesson from the example — some\n" +
                "reads must be by key, because similarity retrieval will not reliably surface a standing\n" +
                "constraint. Line 4 is the cap that keeps episodic memory from becoming context pollution: a\n" +
"similarity floor and a small <code>topK</code> turn a memory store back into a useful signal.</p>",
        },
        {
            kind: "table",
            title: "⚙️ Choosing a store per tier",
            headers: ["Tier","Store","Why","Retention"],
            rows: [
                ["Working","the context window, plus a resumable scratchpad on disk","it must be handed to the model verbatim; a database round trip per turn is pure latency","for the task only"],
                ["Episodic","vector store keyed by tenant and time","queries are \"find past situations like this one\"","30&ndash;180 days, then summarised"],
                ["Semantic","relational table, upserted by (subject, key)","needs exact updates, uniqueness, and a <code>valid_until</code>","until superseded or expired"],
                ["Procedural","versioned prompt and policy files","how to do a task is code, not data, and should be reviewed and tested like code","per release"],
                ["User-visible scratchpad","append-only log the user can read and edit","transparency, correction, and GDPR export all fall out of it","per user policy"],
            ],
        },
        {
            kind: "table",
            title: "💰 Cost and latency",
            headers: ["Quantity","Rule","Note"],
            rows: [
                ["Working memory","the dominant token cost, and it grows with every turn","compact aggressively; this is the biggest lever"],
                ["Compaction","one extra summarisation call per compaction","amortise over many turns by triggering at 80% of the window"],
                ["Episodic write","one embedding per episode","embed the summary, not the raw transcript"],
                ["Episodic read","one vector query per turn","5&ndash;20 ms; cap <code>topK</code> hard"],
                ["Semantic read","a keyed indexed lookup","sub-millisecond; cheap enough to do every turn"],
                ["Storage growth","roughly tokens per session &times; retention","summarise old episodes into a rolling per-user digest"],
                ["Deletion","must cascade from the user across every tier","one forgotten store is a GDPR incident"],
            ],
        },
        {
            kind: "card",
            title: "🚫 When NOT to build agent memory",
            html:
                "<ul>\n" +
                "<li><strong>The task is short.</strong> A single-session workflow gains nothing from memory and pays\n" +
                "for it in complexity and a deletion surface.</li>\n" +
                "<li><strong>Users do not come back.</strong> Memory for a one-shot tool is pure cost; there is no\n" +
                "second session to serve.</li>\n" +
                "<li><strong>The assistant must not learn from the user.</strong> A system that adapts its own\n" +
                "behaviour to user input needs a different safety analysis, not a vector store.</li>\n" +
                "<li><strong>You cannot honour deletion.</strong> If you cannot enumerate and erase every tier,\n" +
                "do not create the memory. This is a legal question before it is an engineering one.</li>\n" +
                "<li><strong>The data is sensitive and unreviewed.</strong> Long-lived free-text memory is a\n" +
                "prompt-injection surface that persists across sessions — the injection outlives the conversation\n" +
                "that contained it.</li>\n" +
"</ul>",
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls and gotchas",
            html:
                "<ul>\n" +
                "<li><strong>Append-only memory.</strong> Re-extraction creates duplicates, duplicates create\n" +
                "contradictions, and the model then reasons over both. Key the upsert.</li>\n" +
                "<li><strong>Model decides what to remember.</strong> It will keep whatever is salient in context,\n" +
                "which is verbose and unhelpfully biased toward the current topic. Use typed extractors.</li>\n" +
                "<li><strong>Retrieval-only design.</strong> A standing constraint that nothing retrieves is\n" +
                "useless; constraints need key-based injection at the point of action.</li>\n" +
                "<li><strong>No confidence or expiry.</strong> A fact written as certainly true in March is still\n" +
                "being asserted in November. Carry <code>valid_until</code> and let facts expire.</li>\n" +
                "<li><strong>Compaction that drops the goal.</strong> Summarise decisions and open questions, never\n" +
                "the task statement — and keep the goal pinned in the system prompt, not the transcript.</li>\n" +
                "<li><strong>Cross-tenant leakage in episodic search.</strong> A vector query filtered on user id\n" +
                "only at read time is one bug away from mixing users. Pre-filter.</li>\n" +
                "<li><strong>Storing raw transcript as \"memory\".strong> It is unbounded, unqueryable, and it\n" +
                "retains everything you were hoping to forget.</li>\n" +
                "<li><strong>Letting users see and correct facts.</strong> The single highest-value memory feature,\n" +
                "and the one that catches the most extraction errors.</li>\n" +
"</ul>",
        },
        {
            kind: "qa",
            items: [
                {
                    q: "What are the types of agent memory, and how do they differ operationally?",
                    a:
"<p>Working memory is the current task's scratchpad — the transcript, the plan, intermediate results. It lives in the context window, is the dominant token cost, and is discarded with the task. Episodic memory is what happened: past sessions and outcomes, stored as embeddings and queried by similarity, so \"has this happened before\". Semantic memory is what is true: durable facts about users and entities, stored relationally and updated by key, so a repeated fact converges instead of duplicating. The operational difference that matters is the write semantics — append for episodic, idempotent upsert for semantic.</p>",
                },
                {
                    q: "How do you keep memory from filling the context window?",
                    a:
"<p>Three mechanisms, used together. Compact: when the transcript crosses a threshold, summarise it into decisions taken, open questions, and results, and drop the raw tool output — which is usually most of the tokens. Select: retrieve a small number of memories per turn, with a similarity floor, rather than the top N unconditionally. And inject by relevance to the operation: a rule that pulls scheduling constraints when a tool is about to schedule something. Together those keep a 40-turn run inside a window that was sized for 10.</p>",
                },
                {
                    q: "How do you prevent a user from poisoning memory?",
                    a:
"<p>Treat memory as untrusted input on every read, because it is. Memory that survives across sessions is a durable prompt-injection surface — the model reads its own earlier transcript as instructions. Concretely: store facts as typed key-value rows rather than free text, so an injected instruction cannot become a \"preference\"; wrap retrieved memory in a clearly delimited, labelled block that the system prompt says is data and never instructions; run the same extraction validation on memory writes as on user input; scope every write to the authenticated user; and let users view and delete what has been stored. Also cap how much a single session can write.</p>",
                },
                {
                    q: "When is memory actively harmful?",
                    a:
"<p>Three situations. When the assistant must behave consistently and identically for everyone — a compliance or legal answer that depends on who asked is a liability. When the world changes: a stored fact about a policy that was updated is worse than no fact, because it is confidently stale. And when the memory is not inspectable: if you cannot show a user why the assistant said something, you cannot debug it, and in high-stakes domains that is disqualifying. The rule of thumb is that memory should improve the experience, never the decision — a fact that changes an answer needs provenance and an expiry.</p>",
                },
                {
                    q: "How do you evaluate a memory system?",
                    a:
"<p>Three targeted evals rather than one blended number. Retrieval: given a session, do the memories that should fire actually come back — measured against a labelled set of past situations? Precision: how much of what comes back is irrelevant, which is what drives context cost. Correctness of writes: sample extracted facts and have a human check them against the transcript, because a confidently wrong fact is worse than a missing one. Then a long-horizon task test — a 40-turn conversation where the success criterion is whether the goal is still intact and the window is not full.</p>",
                },
            ],
        },
        {
            kind: "card",
            title: "🏭 In production",
            html:
                "<ul>\n" +
                "<li><strong>Make memory user-visible from day one.</strong> A \"what I know about you\" screen with\n" +
                "edit and delete is the cheapest accuracy and trust mechanism available.</li>\n" +
                "<li><strong>Extraction is a separate, batched job.</strong> Do it after the session ends, not on\n" +
                "the critical path of the reply.</li>\n" +
                "<li><strong>Carry provenance on every fact.</strong> Which session and turn it came from is what\n" +
                "makes a wrong fact correctable.</li>\n" +
                "<li><strong>Tenant isolation is enforced at the store, not the query.</strong> Pass the tenant to\n" +
                "the store so a missing filter is a type error rather than a breach.</li>\n" +
                "<li><strong>Retention is a scheduled job with a metric.</strong> Count of facts past\n" +
                "<code>valid_until</code> is a number you should be able to see on a dashboard.</li>\n" +
"</ul>",
        },
    ],
});
