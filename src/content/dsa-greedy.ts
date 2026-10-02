// src/content/dsa-greedy.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-greedy",
    title: "Greedy",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                `
<p>A greedy algorithm commits to a locally optimal choice and never revisits it. That is
legal only when you can prove that some globally optimal solution exists that <em>contains</em>
this choice — the exchange argument (or an equivalent matroid / greedy-choice proof).</p>
<p>Sorting is usually the first move: sort intervals by end time, jobs by deadline, edges
by weight. After the sort, a single scan decides. If you find yourself needing to "try
both" at a position, you have left greedy and entered DP or backtracking.</p>`,
        },
        {
            kind: "card",
            title: "🔁 Exchange argument, pictured",
            html:
                `
<p>Suppose OPT does not include the greedy pick <code>g</code>. Swap the conflicting piece
of OPT for <code>g</code>. If the new solution is still feasible and no worse, you may
assume OPT contains <code>g</code>, and induction does the rest. If the swap can make OPT
worse, greedy is wrong — that is 0/1 knapsack and most coin systems.</p>`,
        },
        {
            kind: "diagram",
            caption: "If you cannot finish this picture, do not ship a greedy solution",
            source:
                `
flowchart TD
    G["Greedy picks g first"] --> OPT["Some optimal solution OPT"]
    OPT --> Has{"Does OPT contain g?"}
    Has -->|"yes"| Ind["Induct on the remaining instance"]
    Has -->|"no"| Swap["Swap the conflicting item in OPT for g"]
    Swap --> Feas{"Still feasible and not worse?"}
    Feas -->|"yes"| Ind
    Feas -->|"no"| Fail["Greedy is incorrect for this problem"]
`,
        },
        {
            kind: "card",
            title: "⚔️ Greedy vs DP vs backtracking",
        },
        {
            kind: "diagram",
            caption: "Greedy is the special case of DP where the recurrence collapses to one surviving choice",
            source:
                `
flowchart TD
    Q["Can a local choice be proven safe?"] --> Y["yes: greedy"]
    Q --> N["no"]
    N --> Over{"Overlapping subproblems?"}
    Over -->|"yes"| DP["DP"]
    Over -->|"no"| BT["Backtracking / brute with prune"]
`,
        },
        {
            kind: "table",
            title: "⚡ Common Patterns",
            headers: ["Pattern", "Sort / pick rule", "Proof flavour"],
            rows:
                                    [
                        [
                            "Interval scheduling",
                            "earliest finishing time first",
                            "exchange: the greedy finish frees the most room",
                        ],
                        [
                            "Interval merging",
                            "sort by start, extend or push",
                            "linear scan after sort",
                        ],
                        [
                            "Jump game I",
                            "track farthest reachable",
                            "monotonic reachability",
                        ],
                        [
                            "Huffman coding",
                            "always merge two lightest",
                            "exchange on the tree",
                        ],
                        [
                            "MST (Kruskal / Prim)",
                            "lightest edge that does not cycle",
                            "cut property",
                        ],
                        [
                            "Gas station / circular tour",
                            "start after the worst prefix deficit",
                            "unique start if total gas ≥ total cost",
                        ],
                    ],
        },
        {
            kind: "code",
            title: "💻 Interval scheduling",
            language: "python",
            code:
                `def max_non_overlapping(intervals):
    intervals.sort(key=lambda x: x[1])  # end time
    count, end = 0, float("-inf")
    for s, e in intervals:
        if s &gt;= end:
            count += 1
            end = e
    return count

def merge(intervals):
    intervals.sort()
    out = []
    for s, e in intervals:
        if not out or s &gt; out[-1][1]:
            out.append([s, e])
        else:
            out[-1][1] = max(out[-1][1], e)
    return out`,
        },
        {
            kind: "card",
            title: "⚠️ When NOT to use",
            html:
                `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>0/1 knapsack</b> — highest value/weight first can pack a mediocre item and block a
better pair. Needs DP.</li>
<li><b>Coin change</b> with arbitrary denominations — 1, 3, 4 and amount 6: greedy 4+1+1
loses to 3+3.</li>
<li><b>Shortest path with negative edges</b> — Dijkstra is greedy and wrong; use Bellman–Ford.</li>
<li><b>Any "must try subsets"</b> problem (subset sum, partition) — no local rule survives.</li>
</ul>`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "How do you prove greedy in an interview?",
                    a: "<p><b>A:</b> State the choice, state the invariant after k choices, then the exchange: take an optimal solution that disagrees at the first index, swap, show it is still optimal. If you cannot sketch that in two minutes, switch to DP.</p>",
                },
                {
                    q: "Activity selection vs interval covering?",
                    a: "<p><b>A:</b> Selection (max number of non-overlapping) sorts by end time. Covering a timeline with intervals is a different greedy: always pick the interval that extends coverage farthest. Same family, different sort key. Mixing them is a common fail.</p>",
                },
                {
                    q: "Is Dijkstra greedy?",
                    a: "<p><b>A:</b> Yes — it settles the closest unsettled node. The proof is an exchange on non-negative weights. Negative edges break the \"settled means final\" invariant, which is why you mention Bellman–Ford unprompted.</p>",
                },
            ],
        },
    ],
});
