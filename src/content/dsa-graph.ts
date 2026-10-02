// src/content/dsa-graph.ts
import { registerContent } from "./registry";

registerContent({
    id: "dsa-graph",
    title: "Graph",
    blocks: [
        {
            kind: "card",
            title: "🧠 Core Idea",
            id: "dsa-graph-core",
            html:
                `
        <p>A graph is a set of vertices and edges. The two things that make graphs harder than trees
        are <strong>cycles</strong> (there is no root, so "visited" has to be explicit) and
        <strong>weights</strong> (a path's cost is no longer its length, so "shortest" needs a
        definition).</p>
        <p><strong>Brute-force baseline:</strong> representing the graph as an adjacency matrix and
        scanning row <em>i</em> to find the next frontier node costs O(V) per step, so a single
        source reaches every vertex in O(V&sup2;), and scanning all V rows per step costs O(V&sup2;),
        which is also what naive Dijkstra costs. Switching to an adjacency list makes "look at the
        neighbours" proportional to the degree, so traversal drops to O(V + E) — linear in the size
        of the graph itself. For a sparse graph with E = O(V) that is the difference between
        quadratic and linear.</p>
    `,
        },
        {
            kind: "table",
            title: "📊 Adjacency List vs Adjacency Matrix",
            headers: ["Dimension", "Adjacency list", "Adjacency matrix"],
            rows:
                                    [
                        [
                            "Space",
                            "O(V + E) — one entry per edge",
                            "O(V&sup2;) regardless of E, which is pure waste for a sparse graph",
                        ],
                        [
                            "Is A connected to B?",
                            "O(degree of A) — walk A's neighbours",
                            "O(1) direct index",
                        ],
                        [
                            "List all neighbours of A",
                            "O(degree of A)",
                            "O(V) — you must scan the whole row",
                        ],
                        [
                            "Add an edge",
                            "O(1) append",
                            "O(1) set a bit",
                        ],
                        [
                            "Add a vertex",
                            "O(1)",
                            "O(V&sup2;) — reallocate the whole table",
                        ],
                        [
                            "Cache behaviour",
                            "excellent — the neighbour list is contiguous",
                            "a row is contiguous, but you read V of it to find k edges",
                        ],
                        [
                            "When it wins",
                            "traversal, BFS/DFS, Dijkstra, anything that walks edges — the default",
                            "dense graphs, or algorithms that ask the same reachability question many times: Floyd-Warshall, transitive closure, bitset-based neighbour sets",
                        ],
                        [
                            "Hidden constant",
                            "pointer chasing across many small arrays",
                            "2 cache misses per row access, but perfectly predictable stride",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🌊 BFS vs DFS — What the Frontier Looks Like",
            html:
                `
        <p>Both traverse the same graph and both reach every reachable vertex. They differ in
        <em>what order</em>, and that single difference decides which problems they can solve.
        BFS keeps a queue, so it explores by <strong>distance</strong> — the first time it reaches a
        node is via a shortest path, which makes it the only correct choice for unweighted shortest
        path and for level-order or min-depth answers. DFS keeps a stack, so it commits to one branch
        as deep as it can go, which makes it the right tool for cycle detection, topological order,
        connected components, and anything where the answer is a <em>property of the whole
        traversal</em> rather than of any individual path.</p>
        <p>Practical note: in a graph with V vertices and E edges, both are O(V + E) — the choice is
        never about speed, only about which answer you get.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "Same graph, same O(V + E) cost — the frontier discipline is what selects the answer",
            source:
                `
flowchart TD
    S["Start at A"] --> Q{"Which frontier<br/>discipline?"}
    Q -->|"FIFO queue"| BFSD["BFS<br/>expands in distance order<br/>first arrival = shortest path"]
    Q -->|"LIFO stack"| DFSD["DFS<br/>dives down one branch<br/>recursion depth up to V"]
    BFSD --> B1["Level 0: A<br/>level 1: B, C<br/>level 2: D, E<br/>level 3: F"]
    BFSD --> BUSE["Unweighted shortest path, min depth,<br/>level order, fewest hops, bipartite check"]
    DFSD --> D1["Order: A, B, D, C, E, F"]
    DFSD --> DUSE["Cycle detection, topological sort,<br/>components, Euler/Hamiltonian search"]
`,
        },
        {
            kind: "card",
            title: "🎬 Worked Trace — BFS and DFS on one graph",
            html:
                `
        <p>Graph with edges A&ndash;B, A&ndash;C, B&ndash;D, C&ndash;D, C&ndash;E, D&ndash;F, E&ndash;F.
        Start at A.</p>
        <table class="complexity-table">
            <tr><th>Step</th><th>BFS frontier (queue)</th><th>Newly discovered</th><th>Distance</th></tr>
            <tr><td>0</td><td><code>[A]</code></td><td>A</td><td>A = 0</td></tr>
            <tr><td>1</td><td><code>[B, C]</code></td><td>B, C</td><td>B = 1, C = 1</td></tr>
            <tr><td>2</td><td><code>[D, E]</code></td><td>D, E</td><td>D = 2, E = 2</td></tr>
            <tr><td>3</td><td><code>[F]</code></td><td>F</td><td>F = 3</td></tr>
            <tr><td colspan="4"><strong>DFS order (recursive, neighbours in adjacency order):</strong>
            A &rarr; B &rarr; D &rarr; C &rarr; E &rarr; F. Note D at depth 2 is expanded before C, and
            E&ndash;F is only reached from the far end of the tree — DFS distance from A is
            <em>not</em> the shortest distance.</td></tr>
        </table>
    `,
        },
        {
            kind: "code",
            title: "💻 Implementation",
            language: "python",
            code:
                `from collections import deque

def bfs(graph, start):
    """Unweighted shortest path: returns {node: distance}."""
    dist = {start: 0}
    q = deque([start])                  # the queue IS the frontier
    while q:
        node = q.popleft()
        for nxt in graph[node]:
            if nxt not in dist:         # dist doubles as the visited set
                dist[nxt] = dist[node] + 1
                q.append(nxt)
    return dist

def dfs_iterative(graph, start):
    """Iterative DFS: stack replaces recursion, so a 1M-node path will not blow the call stack."""
    seen, stack = {start}, [start]
    while stack:
        node = stack.pop()
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)
                stack.append(nxt)       # mark on push, not on pop — else you push duplicates

def topological_sort(graph, indegree):
    """Kahn's algorithm: peel off nodes with indegree 0. Returns None if the graph has a cycle."""
    from collections import deque
    q = deque(n for n, d in indegree.items() if d == 0)
    order = []
    while q:
        node = q.popleft()
        order.append(node)
        for nxt in graph[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)
    return order if len(order) == len(indegree) else None   # short output means a cycle`,
        },
        {
            kind: "card",
            title: "🧭 Which Shortest-Path Algorithm",
            html:
                `
        <p>Shortest path is not one algorithm, it is three, selected by the properties of the
        weights. Interviewers are testing whether you ask about negative edges before you write code.</p>
    `,
        },
        {
            kind: "table",
            title: "Pick by weight and graph size",
            headers: ["Algorithm", "Weights", "Time", "Use when"],
            rows:
                                    [
                        [
                            "BFS",
                            "all equal",
                            "O(V + E)",
                            "Unweighted: hops, grid moves, friend-of-a-friend distance, \"fewest links\"",
                        ],
                        [
                            "Dijkstra",
                            "non-negative",
                            "O((V + E) log V) with a heap, O(V&sup2;) with a plain array",
                            "Road networks, network routing (OSPF), shortest job schedule, any non-negative cost",
                        ],
                        [
                            "Bellman-Ford",
                            "may be negative",
                            "O(V &times; E)",
                            "You actually have a negative edge: currency arbitrage, gain/loss graphs, detecting a negative cycle",
                        ],
                        [
                            "Floyd-Warshall",
                            "any sign",
                            "O(V&sup3;)",
                            "V in the low hundreds and you want every pair, or you want to reconstruct paths, or you want transitive closure",
                        ],
                        [
                            "Topological DP",
                            "DAG only",
                            "O(V + E)",
                            "Compile order, course prerequisites, task dependencies with durations",
                        ],
                        [
                            "Union-Find",
                            "connectivity only, no paths",
                            "O(E &alpha;V))",
                            "Adding edges and asking whether two nodes are connected — Kruskal, redundant-connection removal, accounts/dsu-style grouping",
                        ],
                    ],
        },
        {
            kind: "card",
            title: "🎯 Dijkstra — the relaxation trace",
            id: "dsa-graph-dijkstra",
            html:
                `
        <p>Weighted graph: S&rarr;A = 1, S&rarr;B = 4, A&rarr;B = 2, A&rarr;C = 5, B&rarr;C = 1.
        Dijkstra always finalises the smallest tentative distance, and <em>finalising</em> a node is
        the irreversible step that is only sound because every edge weight is non-negative.</p>
        <table class="complexity-table">
            <tr><th>Popped</th><th>dist A</th><th>dist B</th><th>dist C</th><th>Relaxations performed</th></tr>
            <tr><td>init</td><td>&infin;</td><td>&infin;</td><td>&infin;</td><td>dist[S] = 0</td></tr>
            <tr><td>S (0)</td><td>1</td><td>4</td><td>&infin;</td><td>S&rarr;A gives 0 + 1 = 1; S&rarr;B gives 0 + 4 = 4</td></tr>
            <tr><td>A (1)</td><td>final</td><td>3</td><td>6</td><td>A&rarr;B gives 1 + 2 = 3, beats 4; A&rarr;C gives 1 + 5 = 6</td></tr>
            <tr><td>B (3)</td><td>final</td><td>final</td><td>4</td><td>B&rarr;C gives 3 + 1 = 4, beats 6</td></tr>
            <tr><td>C (4)</td><td>final</td><td>final</td><td>final</td><td>no outgoing edges needed</td></tr>
        </table>
        <p><strong>Why negative weights break it:</strong> if B&rarr;C were &minus;5 instead of +1,
        C would be settled at 6, then discovering the &minus;5 would imply a cheaper path
        <em>backwards</em> in the order you already committed. Bellman-Ford fixes this by relaxing
        every edge V &minus; 1 times and looking for a V-th possible improvement, which is also how it
        detects a negative cycle.</p>
    `,
        },
        {
            kind: "card",
            title: "🕸️ Cycle Detection, Union-Find, and Topological Sort",
            html:
                `
        <p>These three share one setup step: <strong>indegree</strong> for directed graphs, or a
        union-find partition for undirected ones. Getting that preprocessing right is most of the
        problem.</p>
    `,
        },
        {
            kind: "diagram",
            caption: "One graph, five questions — each maps to exactly one algorithm",
            source:
                `
flowchart TD
    Q{"What question are you<br/>actually asking?"}
    Q -->|"Is there a cycle?"| DFS["DFS with colours<br/>white, grey on stack, black done<br/>an edge into grey means a cycle"]
    Q -->|"Are these two nodes<br/>connected?"| UF["Union-Find with path compression<br/>and union by rank<br/>O alpha of V, effectively constant"]
    Q -->|"What order must<br/>things happen in?"| TOPO["Topological sort<br/>needs a DAG<br/>Kahn indegree peel, or DFS post-order"]
    Q -->|"Cheapest route<br/>between two nodes?"| DIJ["Dijkstra, non-negative weights<br/>Bellman-Ford if any edge is negative"]
    Q -->|"Every pair of<br/>distances?"| FW["Floyd-Warshall<br/>O of V cubed,<br/>V in the low hundreds"]
`,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls",
            html:
                `
        <ul>
            <li><strong>Marking visited on pop, not on push</strong>, in iterative DFS. A node with
            three undiscovered parents gets pushed three times and expanded three times: exponential
            blow-up on a dense-ish graph, and the classic cause of "my DFS is slow".</li>
            <li><strong>Recursion depth on DFS.</strong> The call stack is O(V) deep on a path graph;
            100,000 vertices overflows it. Use an explicit stack, or raise the limit knowingly.</li>
            <li><strong>Self-loops and parallel edges.</strong> A self-loop is a cycle in every sense.
            Parallel edges break naive cycle detection on an undirected graph, because the edge back
            to the parent is not a cycle — you must compare edge identity, not endpoints.</li>
            <li><strong>Reusing the parent array for the visited set in Dijkstra.</strong> Once a node
            is settled it must never be relaxed again; the code reads more cleanly if you skip
            settled nodes explicitly.</li>
            <li><strong>Assuming the graph is connected.</strong> BFS from one source reaches only its
            component; to cover the graph, loop over all unvisited vertices and restart.</li>
            <li><strong>Non-contiguous input.</strong> Adjacency lists must be built from edge tuples
            first, and for a graph larger than RAM you need an on-disk edge list (CSR format) —
            building an in-memory adjacency list is the step that will not fit.</li>
        </ul>
    `,
        },
        {
            kind: "card",
            title: "🔥 Real-World Usage",
            html:
                `
        <ul>
            <li><strong>Dependency and build systems</strong> — topological sort is the build order;
            cycle detection is what reports a circular dependency instead of looping forever.</li>
            <li><strong>Service maps and blast radius</strong> — union-find and BFS answer "which
            services does this deploy reach?" and "what breaks if this one dies?".</li>
            <li><strong>Linked data</strong> — social graphs, co-purchase recommendations, fraud rings:
            strongly connected components and BFS over a user's neighbourhood.</li>
            <li><strong>Networking</strong> — OSPF is Dijkstra over an adjacency list; traceroute is
            BFS on hop count; BGP path vectors are Bellman-Ford with negative-flavoured policies.</li>
            <li><strong>Route planning and logistics</strong> — Dijkstra over a road graph; BFS for
            "fewest transfers" in transit networks.</li>
            <li><strong>Databases</strong> — query planners represent joins as hypergraphs and pick
            join order with DP over subtrees, not graph search.</li>
        </ul>
    `,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Adjacency list or adjacency matrix — how do you decide?",
                    a: "List by default. It is O(V + E) space, so it is the only option for a sparse graph, and every traversal algorithm reads a neighbour list contiguously. Matrix when the graph is genuinely dense (E close to V&sup2;) or when you ask the same reachability question over and over: Floyd-Warshall, transitive closure, or a bitset adjacency set where a row is one machine word per 64 neighbours.",
                },
                {
                    q: "How do you detect a cycle, directed and undirected?",
                    a: "Directed: DFS with three colours. White is unvisited, grey is on the current stack, black is finished. An edge pointing at a grey node closes a cycle. Undirected: colour the start, and during DFS skip only the exact edge you arrived on, not the parent vertex — otherwise a triangle is misreported as a cycle. If parallel edges exist you must compare edge identity.",
                },
                {
                    q: "Why is Dijkstra wrong with negative weights, in one sentence?",
                    a: "Because it finalises the minimum-distance vertex permanently, and a negative edge can later produce a cheaper path to a vertex that was already finalised. Example: S&rarr;A = 1, S&rarr;B = 4, A&rarr;C = 1, C&rarr;B = &minus;8. Dijkstra settles B at 4, but the true shortest B path is S&rarr;A&rarr;C&rarr;B = &minus;6. Bellman-Ford handles it by relaxing every edge V &minus; 1 times and checking whether a V-th relaxation is still possible, which doubles as negative-cycle detection.",
                },
                {
                    q: "Dijkstra versus Bellman-Ford: what do you actually say in an interview?",
                    a: "Both need me to know whether weights can be negative — so I ask that first, then say the time. Heap Dijkstra is O(E log V) and is the production answer for routing and road networks. Bellman-Ford is O(V &times; E) and buys negative-weight support and cycle detection. If the graph is a DAG, I skip both and run a topological-order DP, which is O(V + E) and handles negative weights for free.",
                },
                {
                    q: "How do you build a shortest path in an unweighted graph with unequal edge costs?",
                    a: "You do not use BFS — that would minimise hop count, not cost. Either make the costs uniform by expanding expensive edges into unit-cost dummy edges, or accept that the question is really \"fewest hops\". The distinction is worth stating explicitly in an interview because BFS returning the wrong answer to a cost question is a classic mistake.",
                },
                {
                    q: "When is union-find better than BFS for connectivity?",
                    a: "When edges arrive and queries are only \"are these two in the same set?\". Union-find is O(alpha(V)) per operation, effectively constant, with no adjacency storage at all, and it does not need the graph to be connected or traversable — so it wins on memory and on streaming input. BFS wins when you also need to enumerate members, distances, or paths.",
                },
            ],
        },
    ],
});
