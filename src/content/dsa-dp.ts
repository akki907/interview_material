// src/content/dsa-dp.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-dp",
    title: "Dynamic Programming",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html: `
<p>DP is recursion plus memory, on a DAG of subproblems. You only reach for it when
(1) the problem has <b>optimal substructure</b> — an optimal answer is composed of
optimal answers to smaller instances — and (2) those instances <b>overlap</b>, so a naive
recursion recomputes the same state exponentially often.</p>
<p>The work is naming the state. A state is the tuple of variables that makes the
subproblem well defined. The transition is how a state is built from strictly smaller
states. The base case is the state you can answer without looking anything up. Memoization
fills the DAG top-down; tabulation fills it bottom-up in an order that respects edges.</p>`,
        },
        // The legacy pipeline was clickable: clicking a stage toasted its name and
        // description. The stages are data, so that interaction is dropped.
        {
            kind: "pipeline",
            stages: [
                {
                    name: "Problem",
                    desc: "Define what we are solving",
                },
                {
                    name: "State",
                    desc: "What variables define subproblems",
                },
                {
                    name: "Transition",
                    desc: "How to build from smaller subproblems",
                },
                {
                    name: "Base Case",
                    desc: "Trivial case(s)",
                },
                {
                    name: "Memo/Tabulation",
                    desc: "Store and reuse results",
                },
            ],
        },
        {
            kind: "card",
            title: "🕸️ Overlapping subproblems are a DAG, not a tree",
            html: `
<p>Fibonacci without memo is a binary tree of depth n — Θ(φⁿ) calls. With memo it is n
nodes and n edges. That picture is the whole pitch: identify the nodes, then decide
whether to DFS them (memo) or iterate in topological order (table).</p>`,
        },
        {
            kind: "diagram",
            caption:
                "The recursive tree collapses into a DAG the moment you cache by state",
            source: `
flowchart TD
    F5["F(5)"] --> F4["F(4)"]
    F5 --> F3a["F(3)"]
    F4 --> F3b["F(3)"]
    F4 --> F2a["F(2)"]
    F3a --> F2b["F(2)"]
    F3a --> F1a["F(1)"]
    NOTE["Without memo F(3) and F(2) are computed many times<br/>With memo each oval is filled once"]
`,
        },
        {
            kind: "table",
            title: "⚡ Common Patterns",
            headers: ["Pattern", "State (typical)", "Transition sketch"],
            rows: [
                [
                    "1D reach",
                    "<code>dp[i]</code> = best using first i items",
                    "house robber, climb stairs, max subarray",
                ],
                [
                    "0/1 knapsack",
                    "<code>dp[i][w]</code> take or skip item i",
                    "<code>max(skip, take + dp[i-1][w-weight])</code>",
                ],
                [
                    "Unbounded knapsack",
                    "same, but item may repeat",
                    "coin change, rod cutting",
                ],
                [
                    "LCS / edit distance",
                    "<code>dp[i][j]</code> prefixes of two strings",
                    "match → diagonal; else min/max of left/up",
                ],
                [
                    "LIS",
                    "patience sorting / <code>dp[i]</code> ending at i",
                    "O(n²) naive, O(n log n) with tails array",
                ],
                [
                    "Interval DP",
                    "<code>dp[l][r]</code> on a subarray",
                    "burst balloons, matrix chain",
                ],
                ["Bitmask DP", "<code>dp[mask][i]</code>", "TSP-style, n ≤ 20"],
            ],
        },
        {
            kind: "card",
            title: "🎒 0/1 knapsack decision",
        },
        {
            kind: "diagram",
            caption:
                "Each item is a binary choice; the table size is items times capacity",
            source: `
flowchart TD
    S["dp at item i, capacity w"] --> Skip["skip item: dp[i-1][w]"]
    S --> Fit{"weight[i] less or equal w?"}
    Fit -->|"no"| Skip
    Fit -->|"yes"| Take["take: value[i] + dp[i-1][w - weight[i]]"]
    Skip --> M["dp[i][w] = max of skip and take"]
    Take --> M
`,
        },
        {
            kind: "card",
            title: "💻 Example — coin change (unbounded)",
            html: `<pre><code class="language-python">def coin_change(coins, amount):
    inf = amount + 1
    dp = [inf] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c &lt;= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != inf else -1</code></pre>
<p>Order matters: iterating amounts in the outer loop lets a coin be reused (unbounded).
Swap to "for each coin, for a from coin to amount" still unbounded. 0/1 requires iterating
the capacity <em>downward</em> so each item is spent at most once in a rolling array.</p>`,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls",
            html: `
<ul style="padding-left:20px;line-height:1.9;">
<li>State missing a dimension (forgot remaining capacity, or "did I use the previous house").</li>
<li>Off-by-one on prefixes: <code>dp[i]</code> meaning "first i chars" vs "index i".</li>
<li>Greedy when the DAG needs DP (canonical: coin systems that are not canonical, 0/1 knapsack).</li>
<li>Memoizing on a mutable list used as a key — freeze it to a tuple.</li>
<li>Modifying a rolling 1D array in the wrong direction and accidentally turning 0/1 into unbounded.</li>
</ul>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Top-down or bottom-up?",
                    a: "<p><b>A:</b> Top-down (memo) only computes reachable states and matches the recurrence you would write on a whiteboard. Bottom-up has no recursion-depth risk and better cache behavior. Start top-down in an interview, then mention how you would fill the table if they ask for space tricks.</p>",
                },
                {
                    q: "How do you know it is DP and not greedy?",
                    a: "<p><b>A:</b> If a local best choice can block a better global one, it is not greedy. 0/1 knapsack, coin change with arbitrary denominations, and edit distance all fail exchange arguments. If you can prove an exchange argument, prefer greedy — it is simpler and usually faster.</p>",
                },
                {
                    q: "Space optimization?",
                    a: "<p><b>A:</b> If <code>dp[i]</code> depends only on <code>dp[i-1]</code>, keep two rows or one rolling row. Knapsack 0/1 rolls in one array of size capacity, iterating capacity downward. Never optimize space until the 2D solution is correct.</p>",
                },
            ],
        },
    ],
});
