// src/content/dsa-backtracking.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-backtracking",
    title: "Backtracking",
    blocks: [
        {
            kind: "card",
            title: "🧠 Core Idea",
            id: "dsa-backtrack-core",
            html:
                `
        <p>Backtracking is DFS over a <strong>decision tree</strong> that is too large to build up
        front. The tree only exists implicitly: you materialise one level by making a choice, you
        cut a whole subtree by rejecting an illegal choice, and you climb back by undoing your
        mutation. Unlike graph DFS, there is no <code>visited</code> set — the state is the path,
        and every branch is legitimately a fresh state.</p>
        <p><strong>Brute-force baseline:</strong> enumerating all subsets of an n-element set by
        checking all 2<sup>n</sup> subsets against an O(n) validity test is O(n&nbsp;&middot;&nbsp;2<sup>n</sup>).
        Backtracking gets the same worst case — some instance genuinely needs every subset — but
        the branching factor drops from n to the number of <em>legal</em> choices at each level, so
        the tree is pruned to the subtrees that can still reach a solution. That ratio, explored /
        total, is the only thing that separates a fast backtracker from a timeout.</p>
        <p>It is the algorithm for constraint satisfaction: choose, constrain, recurse, undo. The
        moment a problem has a "valid combination" or "all arrangements" in its statement, it is
        a backtracking problem until proven otherwise.</p>
    `,
        },
        {
            kind: "card",
            title: "🌳 The Four-Step Loop",
            html:
                `
        <p>Every backtracking function has the same skeleton, and the invariant is that
        <strong>state on entry to a call equals state on exit from that call</strong>. Break that and
        results silently depend on traversal order.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "Pruning at SAFE is what separates backtracking from a timeout",
            source:
                `
flowchart TD
    CALL["Enter level k with<br/>path = partial solution"] --> BASE{"Is the path<br/>a full solution?"}
    BASE -->|"yes"| SAVE["Record a COPY of the path"]
    BASE -->|"no"| LOOP["For each candidate choice"]
    LOOP --> SAFE{"Is this choice<br/>consistent with all<br/>constraints so far?"}
    SAFE -->|"no"| SKIP["Skip — the entire subtree<br/>below this choice is unreachable"]
    SAFE -->|"yes"| PUSH["1. CHOOSE<br/>mutate the state"]
    PUSH --> REC["2. RECURSE<br/>one level deeper"]
    REC --> POP["3. UNDO<br/>restore the exact prior state"]
    POP --> LOOP
    POP --> RET["Return with state<br/>identical to on entry"]
`,
        },
        {
            kind: "card",
            title: "🎬 Worked Trace — subsets of {1, 2, 3}",
            id: "dsa-backtrack-trace",
            html:
                `
        <p>Find every subset. The tree has one level per element; the constraint is simply that an
        element may be chosen at most once, enforced by iterating from <code>start</code> rather
        than from 0.</p>
        <table class="complexity-table">
            <tr><th>Depth</th><th>Path</th><th>Choices offered</th><th>Solutions emitted</th></tr>
            <tr><td>0</td><td><code>[]</code></td><td>1, 2, 3</td><td>&mdash;</td></tr>
            <tr><td>1</td><td><code>[1]</code></td><td>2, 3</td><td>&mdash;</td></tr>
            <tr><td>2</td><td><code>[1,2]</code></td><td>3</td><td><code>[1,2,3]</code></td></tr>
            <tr><td>2</td><td><code>[1,3]</code></td><td>none (start is past the end)</td><td><code>[1,3]</code></td></tr>
            <tr><td>1</td><td><code>[2]</code></td><td>3</td><td><code>[2,3]</code></td></tr>
            <tr><td>1</td><td><code>[3]</code></td><td>none</td><td><code>[3]</code></td></tr>
            <tr><td>0</td><td><code>[]</code></td><td>&mdash;</td><td><code>[]</code> the empty set</td></tr>
            <tr><td colspan="4"><strong>8 solutions, 15 nodes visited</strong> — 2<sup>3</sup> = 8 leaves,
            and 1 + 2 + 4 + 8 = 15 nodes. The empty set is a solution; forgetting to emit it is a
            common off-by-one.</td></tr>
        </table>
    `,
        },
        {
            kind: "interactive",
            algo: "backtracking",
            html:
                `Walk the maze with DFS and watch the path get popped off when it hits a wall. Backtracking is the pop.`,
        },
        {
            kind: "code",
            title: "💻 Implementation",
            language: "python",
            code:
                `def backtrack(path, choices):
    if is_valid_solution(path):
        result.append(path[:])     # COPY, not a reference to the live list
        return
    for c in choices:
        if not is_safe(path, c):    # constraint check BEFORE mutating
            continue
        path.append(c)              # 1. make the choice  (mutate)
        backtrack(path, ...)        # 2. recurse
        path.pop()                  # 3. undo the choice  (restore)

# ---- N-Queens, with the pruning that makes n=8 finish instantly -------
def solve_n_queens(n):
    queens = []                     # one column index per row

    def safe(col, row):
        for r, c in enumerate(queens):
            if c == col:            return False   # same column
            if r - c == row - col:  return False   # main diagonal
            if r + c == row + col:  return False   # anti diagonal
        return True

    def place(row):
        if row == n:
            return list(queens)     # a fresh list: later pops must not corrupt it
        for col in range(n):
            if safe(col, row):
                queens.append(col)
                place(row + 1)      # branch
                queens.pop()        # undo — restores the caller's state exactly
        return None
    return place(0)

# ---- Symmetry pruning: halve the search by fixing row 0 to a
#      column and only mirroring when the column is off-centre.
#      A solution with queen[0] == c reflects to one with queen[0] == n - 1 - c.
#      That single symmetry cut takes n-Queens from ~15M nodes to a few thousand.`,
        },
        {
            kind: "card",
            title: "🎯 N-Queens: how pruning does the real work",
            html:
                `
        <p>Naive N-Queens with no pruning visits roughly 15 million nodes at n = 8. Three cheap
        prunings cut that to a few thousand:</p>
        <table class="complexity-table">
            <tr><th>Pruning</th><th>What it removes</th><th>Effect at n = 8</th></tr>
            <tr><td>Row-by-row construction</td><td>Never place two queens in a row — the search space shrinks from 8<sup>8</sup> arrangements to one-per-row</td><td>15M &rarr; 2057 nodes</td></tr>
            <tr><td>Column + diagonal check on placement</td><td>Every subtree containing a conflict</td><td>2057 &rarr; 92 nodes</td></tr>
            <tr><td>Row-0 symmetry (mirror)</td><td>Half the tree: any solution with queen[0] = c mirrors to queen[0] = n &minus; 1 &minus; c, so only one half needs searching</td><td>92 &rarr; ~46 nodes</td></tr>
        </table>
        <p>The general lesson: <strong>prune as early as possible, and check the cheapest constraint
        first</strong>. Column conflicts are one integer compare; diagonals are O(n) per check. Testing
        the cheap constraint first and only then the expensive one is worth several times the node
        count.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "Each row's legal columns shrink, so the constraint check replaces brute force",
            source:
                `
flowchart LR
    R0["Row 0<br/>try col 0"] --> R1["Row 1<br/>4 legal columns after the column and diagonal checks"]
    R1 --> R2["Row 2<br/>fewer still — both diagonals now constrain"]
    R2 --> R3["Row 3<br/>1 or 0 legal columns"]
    R3 -->|"0 legal"| PRUNE["Backtrack immediately<br/>this row never gets a queen"]
    R3 -->|"1 legal"| NEXT["Place and recurse"]
    R1 -.->|"undo on return"| R0
    R2 -.->|"undo on return"| R1
    R3 -.->|"undo on return"| R2
`,
        },
        {
            kind: "card",
            title: "🧠 Memoization — and Its Exact Precondition",
            html:
                `
        <p>Backtracking has exponential time because it re-derives the same state many times. Adding a
        memo over the state collapses it — but only when two facts hold:</p>
        <ul>
            <li><strong>The state is hashable</strong>: everything that determines the set of
            continuations is in the key. For N-Queens that is the bitmask of occupied columns; for
            word break it is the index; for a grid it is (row, col, blocked-set) — but only if the
            blocked set is in the key, not just (row, col).</li>
            <li><strong>You only need the value, not every path.</strong> "Can this be completed?"
            is memoizable. "List every path" is not, unless the paths themselves are the state —
            and then you have not reduced the problem, you have paid for a hash map to store an
            exponential set.</li>
        </ul>
        <p>The classical failure is memoizing on the path when the path has duplicates and only the
        <em>set</em> matters: N-Queens explodes faster with a full-path memo than without one. The
        fix is to memoize on the compressed state (bitmask of columns), not on the board array.</p>
    `,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls",
            html:
                `
        <ul>
            <li><strong>Storing a reference instead of a copy.</strong>
            <code>result.append(path)</code> records a live list that the loop then mutates and pops,
            so every "solution" ends up equal to the last one. Push <code>path[:]</code> or
            <code>list(path)</code>.</li>
            <li><strong>Mutating while iterating.</strong> If the loop iterates over the same list the
            recursion mutates, removing elements during the walk skips entries or raises
            <code>RuntimeError</code>. Snapshot first: <code>for c in list(board):</code>.</li>
            <li><strong>Missing the undo.</strong> Any mutation must have a matching restore on
            every exit path, including the early return on success. The robust pattern is to mutate
            before the recursive call and pop immediately after it, never inside an
            <code>if</code> that can be skipped.</li>
            <li><strong>Reusing a shared board across levels without a count.</strong> Placing and
            unplacing a cell must be exactly symmetric — set on entry, unset on exit, no exceptions
            in between, or a stale marker survives to corrupt a later branch.</li>
            <li><strong>Integer overflow in bitmask tricks.</strong> A 64-bit column mask silently
            truncates for n &gt; 64 boards, and <code>1 &lt;&lt; 63</code> is negative in JS while
            positive in Python. Above 64 columns, use Python (arbitrary precision) or a
            <code>bool[]</code> plus explicit bounds checks.</li>
            <li><strong>Non-contiguous input.</strong> Backtracking assumes the choices are a bounded,
            enumerable set at each level. If candidates come from an unsorted, deduplicated-needed
            source, sort and dedupe first — otherwise the same subset is explored once per ordering.</li>
            <li><strong>Off-by-one on the base case.</strong> <code>if len(path) == n</code> rather than
            <code>&gt;=</code>, and handle n = 0 explicitly: some formulations emit the empty solution,
            others must not, and the two conventions are indistinguishable until a test hits it.</li>
        </ul>
    `,
        },
        {
            kind: "table",
            title: "⏱️ Complexity, and What Actually Bounds It",
            headers: ["Variant", "Time", "Notes"],
            rows:
                                    [
                        [
                            "All subsets / combinations, no constraint",
                            "O(2<sup>n</sup>) leaves, O(2<sup>n</sup>) nodes total",
                            "Unavoidable: the output itself is 2<sup>n</sup> solutions",
                        ],
                        [
                            "Permutations",
                            "O(n &times; n!)",
                            "Swap-based generation avoids re-copying at each level",
                        ],
                        [
                            "Subsets with duplicates",
                            "O(2<sup>n</sup>) worst case",
                            "Skipping equal values at the same depth collapses duplicates; degrades on all-identical input without that skip",
                        ],
                        [
                            "N-Queens n = 8",
                            "O(n!) naive, ~46 nodes after symmetry",
                            "The bound does not improve — only the pruning constant does",
                        ],
                        [
                            "Memoized decision problem",
                            "O(states &times; choices)",
                            "Replaces exponential time with an exponential <em>state space</em> that is usually far smaller than the tree",
                        ],
                        [
                            "Enumerating paths (no memo)",
                            "exponential output, no improvement possible",
                            "If the caller needs every path, DP cannot help",
                        ],
                        [
                            "Space",
                            "O(depth) for the path, plus O(solutions) if you collect them",
                            "An unbounded result set is the real limit — 8-queens has 92, 12-queens has 14200, 14-queens has 365596",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🔥 Real-World Usage",
            html:
                `
        <ul>
            <li><strong>Constraint solvers</strong> — Sudoku, crosswords, and the general CSP solvers
            behind product configurators (choose finish, size, and rules; get only combinations that
            are manufacturable).</li>
            <li><strong>Scheduling</strong> — the traveller-salesperson variants and crew scheduling,
            where any exact solution is a heuristic search with pruning.</li>
            <li><strong>Regex engines</strong> — backtracking matchers walk the decision tree of
            alternations and quantifiers, and the classic exponential-blowup (ReDoS) is precisely an
            unpruned backtracker.</li>
            <li><strong>Compilers</strong> — peephole and register allocation search, and
            combinatorial AST expansion of macros.</li>
            <li><strong>Board and puzzle games</strong> — chess move generation, minesweeper, Wordle's
            consistent-hint solvers.</li>
        </ul>
    `,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "How is backtracking different from plain DFS?",
                    a: "Same traversal, different graph. DFS walks an existing graph with a visited set; backtracking walks a decision tree that only exists because you build it, so \"visited\" is meaningless and the state must be explicitly undone on the way out. If a problem is phrased as \"find all arrangements that satisfy these constraints\", it is backtracking; if it is \"given this graph, reach X\", it is DFS.",
                },
                {
                    q: "N-Queens looks exponential. Is it polynomial?",
                    a: "No, and saying otherwise is the mistake. It is O(n!) worst case even after pruning; the bitmask version has an exponential state space of about 2^n and is usually faster in practice. What makes n = 8 and n = 20 solvable is the symmetry and diagonal pruning shrinking the constant by four orders of magnitude, not an asymptotic improvement.",
                },
                {
                    q: "When is memoization valid in backtracking, and when is it harmful?",
                    a: "Valid when two visits to the same state have identical continuations and you need only the outcome — then it turns exponential time into O(states &times; choices). Harmful when you need every path, because you store an exponential set of paths instead of an exponential set of nodes; and it is actively a bug when the memo key includes more than the state that matters, such as the full board path rather than the column bitmask, which can make it slower than no memo at all.",
                },
                {
                    q: "The classic \"generate combinations\" bug — what is it?",
                    a: "Passing an index down and iterating from there, so each subset is generated exactly once and in sorted order. The buggy version iterates from 0 at every level, producing {1,2} and {2,1} and every other permutation of the same subset — 2^n times too much work. On an array with duplicates you additionally skip values equal to the previous one at the same depth, which is what keeps an all-duplicates input at n unique choices instead of 2^n.",
                },
                {
                    q: "How do you prune effectively in a generic constraint problem?",
                    a: "Three techniques in order of value: check the cheapest constraint first and return early; order the candidate list by how likely it is to succeed so a solution is found early if you only need one; and add forward checking — after each placement, remove candidates that are now impossible, which prunes the frontier before it is ever explored. Symmetry breaking (N-Queens row 0, sudoku digit order) is the fourth and is often the biggest single win.",
                },
                {
                    q: "Why does a regex engine blow up exponentially?",
                    a: "Because a backtracking matcher explores every way to satisfy a nested quantifier. A pattern like (a+)+b against a long run of a with no trailing b makes the engine try every possible split of the run before failing — the decision tree is O(2^n) on the length of the run. The fixes are all constraint-based: make the inner quantifier possessive, nest the ambiguity out of the pattern, or — the real one — switch to a non-backtracking automaton (DFA or Thompson NFA), which is linear and is what RE2 does instead of PCRE.",
                },
            ],
        },
    ],
});
